import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { logActivity } from '@/lib/logActivity';

// ── Simple CSV parser (handles quoted fields) ─────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        fields.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

// ── POST /api/products/import ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['super_admin', 'business_owner', 'manager', 'inventory_staff'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    // ── Parse multipart form data ─────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    // ── Validate required columns ─────────────────────────────────────────
    const required = ['name', 'price', 'cost'];
    const firstRow = rows[0];
    const missing  = required.filter(f => !(f in firstRow));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // ── Category cache: name → ObjectId ──────────────────────────────────
    const categoryCache = new Map<string, string>();
    const existingCats  = await Category.find({ tenantId: session.tenantId }).select('_id name');
    for (const c of existingCats) categoryCache.set(c.name.toLowerCase(), c._id.toString());

    // ── Process rows ──────────────────────────────────────────────────────
    const results = { imported: 0, skipped: 0, errors: [] as { row: number; name: string; error: string }[] };

    for (let i = 0; i < rows.length; i++) {
      const row  = rows[i];
      const rowN = i + 2; // 1-indexed, +1 for header

      // Required fields
      const name  = row.name?.trim();
      const price = parseFloat(row.price ?? '');
      const cost  = parseFloat(row.cost ?? '');

      if (!name) {
        results.errors.push({ row: rowN, name: '(empty)', error: 'Name is required' });
        results.skipped++;
        continue;
      }
      if (isNaN(price) || price < 0) {
        results.errors.push({ row: rowN, name, error: 'Invalid price' });
        results.skipped++;
        continue;
      }
      if (isNaN(cost) || cost < 0) {
        results.errors.push({ row: rowN, name, error: 'Invalid cost' });
        results.skipped++;
        continue;
      }

      // Category: look up by name, create if missing
      let categoryId: string | null = null;
      const catName = row.category?.trim() || row.category_name?.trim();
      if (catName) {
        const key = catName.toLowerCase();
        if (categoryCache.has(key)) {
          categoryId = categoryCache.get(key)!;
        } else {
          // Create new category with a random colour
          const COLORS = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];
          const color  = COLORS[categoryCache.size % COLORS.length];
          const newCat = await Category.create({ tenantId: session.tenantId, name: catName, color });
          categoryId = newCat._id.toString();
          categoryCache.set(key, categoryId);
        }
      }

      if (!categoryId) {
        results.errors.push({ row: rowN, name, error: 'Category is required' });
        results.skipped++;
        continue;
      }

      // Optional fields
      const stock             = parseInt(row.stock ?? '0') || 0;
      const lowStockThreshold = parseInt(row.low_stock_threshold ?? row.lowstockthreshold ?? '10') || 10;
      const barcode           = row.barcode?.trim()     || undefined;
      const description       = row.description?.trim() || undefined;
      const sku               = row.sku?.trim()         || undefined;

      let expiryDate: Date | undefined;
      if (row.expiry_date?.trim() || row.expirydate?.trim()) {
        const d = new Date(row.expiry_date?.trim() || row.expirydate?.trim());
        if (!isNaN(d.getTime())) expiryDate = d;
      }

      // Skip exact duplicates (same name in same tenant)
      const exists = await Product.findOne({ tenantId: session.tenantId, name, isActive: true });
      if (exists) {
        results.errors.push({ row: rowN, name, error: 'Product already exists (skipped)' });
        results.skipped++;
        continue;
      }

      try {
        await Product.create({
          tenantId: session.tenantId,
          name,
          sku: sku || `SKU-${Date.now()}-${i}`,
          category:  categoryId,
          price,
          cost,
          stock,
          lowStockThreshold,
          ...(barcode     && { barcode }),
          ...(description && { description }),
          ...(expiryDate  && { expiryDate }),
          isActive: true,
        });
        results.imported++;
      } catch (err: any) {
        results.errors.push({ row: rowN, name, error: err.message || 'Insert failed' });
        results.skipped++;
      }
    }

    if (results.imported > 0) {
      logActivity({
        tenantId: session.tenantId,
        userId:   session.userId,
        action:   'csv_import_products',
        entity:   'Product',
        details:  { imported: results.imported, skipped: results.skipped, total: rows.length },
      });
    }

    return NextResponse.json({ ...results, total: rows.length });
  } catch (err: any) {
    console.error('CSV import error:', err);
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
  }
}
