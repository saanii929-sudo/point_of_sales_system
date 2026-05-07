import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';
import BranchInventory from '@/models/BranchInventory';
import { generateSKU } from '@/lib/utils';
import { logActivity } from '@/lib/logActivity';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search   = searchParams.get('search');
    const category = searchParams.get('category');
    const barcode  = searchParams.get('barcode');
    const branchId = searchParams.get('branchId');

    // Super admin can see all products, others only their tenant's products
    let query: any = session.role === 'super_admin'
      ? { isActive: true }
      : { tenantId: session.tenantId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku:  { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (barcode)  query.barcode  = barcode;

    const products = await Product.find(query)
      .populate('category', 'name color')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    // When a branchId is provided, overlay branch-specific stock onto each product
    if (branchId && session.role !== 'super_admin') {
      const branchInventory = await BranchInventory.find({
        tenantId: session.tenantId,
        branch: branchId,
      });
      const stockMap = new Map(branchInventory.map(bi => [bi.product.toString(), bi.stock]));

      const merged = products.map(p => {
        const obj: any = p.toObject();
        const globalStock  = p.stock;
        const branchStock  = stockMap.get(p._id.toString()) ?? 0;
        obj.stock          = branchStock;
        obj.branchStock    = branchStock;
        obj.globalStock    = globalStock;
        obj.branchId       = branchId;
        return obj;
      });
      return NextResponse.json({ products: merged, branchId });
    }

    return NextResponse.json({ products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner, manager, and inventory_staff can create products
    if (!['super_admin', 'business_owner', 'manager', 'inventory_staff'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { name, category, price, cost, stock, lowStockThreshold, barcode, description, image, expiryDate, supplier } = body;

    if (!name || !category || price === undefined || cost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sku = generateSKU(name);

    const productData: any = {
      tenantId: session.tenantId,
      name,
      sku,
      category,
      price,
      cost,
      stock: stock || 0,
      lowStockThreshold: lowStockThreshold || 10
    };

    // Only add optional fields if they have values
    if (barcode && barcode !== '') productData.barcode = barcode;
    if (description && description !== '') productData.description = description;
    if (supplier && supplier !== '') productData.supplier = supplier;
    if (expiryDate && expiryDate !== '') productData.expiryDate = new Date(expiryDate);
    if (image && image !== '') productData.image = image;

    const product = await Product.create(productData);

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name color');

    logActivity({
      tenantId: session.tenantId,
      userId:   session.userId,
      action:   'create_product',
      entity:   'Product',
      entityId: product._id.toString(),
      details:  { name: product.name, sku: product.sku, price: product.price, stock: product.stock },
    });

    return NextResponse.json({ product: populatedProduct }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
