import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner, manager, and inventory_staff can update products
    if (!['super_admin', 'business_owner', 'manager', 'inventory_staff'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { name, category, price, cost, stock, lowStockThreshold, barcode, description, image, expiryDate, supplier } = body;

    const { id } = await params;
    const product = await Product.findById(id);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product belongs to user's tenant (unless super admin)
    if (session.role !== 'super_admin' && product.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update product fields
    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (supplier !== undefined) {
      // Handle empty string or null for supplier
      product.supplier = supplier && supplier !== '' ? supplier : null;
    }
    if (price !== undefined) product.price = price;
    if (cost !== undefined) product.cost = cost;
    if (stock !== undefined) product.stock = stock;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
    if (barcode !== undefined) product.barcode = barcode;
    if (description !== undefined) product.description = description;
    if (image !== undefined) product.image = image;
    if (expiryDate !== undefined) {
      // Handle empty string or null for expiryDate
      product.expiryDate = expiryDate && expiryDate !== '' ? new Date(expiryDate) : undefined;
    }

    await product.save();

    const updatedProduct = await Product.findById(id)
      .populate('category', 'name color');

    return NextResponse.json({ product: updatedProduct });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner and manager can delete products
    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const product = await Product.findById(id);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product belongs to user's tenant (unless super admin)
    if (session.role !== 'super_admin' && product.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete by setting isActive to false
    product.isActive = false;
    await product.save();

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
