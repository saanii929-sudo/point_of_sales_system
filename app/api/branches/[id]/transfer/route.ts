import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Branch from '@/models/Branch';
import BranchInventory from '@/models/BranchInventory';
import Product from '@/models/Product';
import ActivityLog from '@/models/ActivityLog';
import { emitToTenant } from '@/lib/socket';

type Params = { params: Promise<{ id: string }> };

// ── POST /api/branches/[id]/transfer ──────────────────────
// Body: { productId, quantity, toBranchId, notes }
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['business_owner', 'manager', 'inventory_staff'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();
    const { id: fromBranchId } = await params;

    const body = await req.json();
    const { productId, quantity, toBranchId, notes } = body as {
      productId: string;
      quantity: number;
      toBranchId: string;
      notes?: string;
    };

    // ── Validate inputs ──────────────────────────────────
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    if (!toBranchId) return NextResponse.json({ error: 'toBranchId is required' }, { status: 400 });
    if (fromBranchId === toBranchId)
      return NextResponse.json({ error: 'Source and destination branches must be different' }, { status: 400 });
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0)
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });

    // ── Validate both branches belong to tenant ──────────
    const [fromBranch, toBranch] = await Promise.all([
      Branch.findOne({ _id: fromBranchId, tenantId: session.tenantId, isActive: true }),
      Branch.findOne({ _id: toBranchId,   tenantId: session.tenantId, isActive: true }),
    ]);

    if (!fromBranch) return NextResponse.json({ error: 'Source branch not found or inactive' }, { status: 404 });
    if (!toBranch)   return NextResponse.json({ error: 'Destination branch not found or inactive' }, { status: 404 });

    // ── Validate product ─────────────────────────────────
    const product = await Product.findOne({ _id: productId, tenantId: session.tenantId, isActive: true });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // ── Check source stock ───────────────────────────────
    const sourceInv = await BranchInventory.findOne({
      tenantId: session.tenantId,
      branch: fromBranchId,
      product: productId,
    });

    const sourceStock = sourceInv?.stock ?? 0;
    if (sourceStock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${sourceStock}, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    // ── Subtract from source ─────────────────────────────
    const newSourceStock = sourceStock - quantity;
    if (sourceInv) {
      sourceInv.stock = newSourceStock;
      await sourceInv.save();
    } else {
      // Edge case: shouldn't happen (stock check above), but safe fallback
      await BranchInventory.create({
        tenantId: session.tenantId,
        branch: fromBranchId,
        product: productId,
        stock: 0,
      });
    }

    // ── Add to destination ───────────────────────────────
    let destInv = await BranchInventory.findOne({
      tenantId: session.tenantId,
      branch: toBranchId,
      product: productId,
    });

    const prevDestStock = destInv?.stock ?? 0;
    const newDestStock  = prevDestStock + quantity;

    if (destInv) {
      destInv.stock = newDestStock;
      destInv.lastRestocked = new Date();
      await destInv.save();
    } else {
      destInv = await BranchInventory.create({
        tenantId: session.tenantId,
        branch: toBranchId,
        product: productId,
        stock: newDestStock,
        lastRestocked: new Date(),
      });
    }

    // ── Log activity ─────────────────────────────────────
    await ActivityLog.create({
      tenantId: session.tenantId,
      user: session.userId,
      action: 'stock_transfer',
      entity: 'BranchInventory',
      entityId: sourceInv?._id ?? destInv._id,
      details: {
        fromBranchId,
        fromBranchName: fromBranch.name,
        toBranchId,
        toBranchName: toBranch.name,
        productId,
        productName: product.name,
        quantity,
        sourceStockBefore: sourceStock,
        sourceStockAfter: newSourceStock,
        destStockBefore: prevDestStock,
        destStockAfter: newDestStock,
        notes: notes || '',
      },
    });

    // ── Emit real-time events ────────────────────────────
    emitToTenant(session.tenantId, 'stock-transferred', {
      fromBranchId,
      toBranchId,
      productId,
      quantity,
    });

    return NextResponse.json({
      message: 'Stock transferred successfully',
      transfer: {
        product: { _id: product._id, name: product.name, sku: product.sku },
        quantity,
        from: { branch: fromBranch.name, stockBefore: sourceStock, stockAfter: newSourceStock },
        to:   { branch: toBranch.name,   stockBefore: prevDestStock, stockAfter: newDestStock },
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
