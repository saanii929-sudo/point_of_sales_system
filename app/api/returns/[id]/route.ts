import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Return from '@/models/Return';
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

    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { action, notes } = body;

    const returnDoc = await Return.findById(id);
    
    if (!returnDoc) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    if (returnDoc.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'approve') {
      returnDoc.status = 'approved';
      returnDoc.processedBy = session.userId as any;
      returnDoc.processedDate = new Date();
    } else if (action === 'complete') {
      if (returnDoc.status !== 'approved') {
        return NextResponse.json({ error: 'Return must be approved first' }, { status: 400 });
      }

      // Restore stock for returned items
      for (const item of returnDoc.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }

      returnDoc.status = 'completed';
      returnDoc.processedBy = session.userId as any;
      returnDoc.processedDate = new Date();
    } else if (action === 'reject') {
      returnDoc.status = 'rejected';
      returnDoc.processedBy = session.userId as any;
      returnDoc.processedDate = new Date();
    }

    if (notes !== undefined) {
      returnDoc.notes = notes;
    }

    await returnDoc.save();

    const updatedReturn = await Return.findById(id)
      .populate('customerId', 'name phone')
      .populate('createdBy', 'name')
      .populate('processedBy', 'name');

    return NextResponse.json({ return: updatedReturn });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const returnDoc = await Return.findById(id);
    
    if (!returnDoc) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    if (returnDoc.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (returnDoc.status === 'completed') {
      return NextResponse.json({ error: 'Cannot delete completed return' }, { status: 400 });
    }

    await Return.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Return deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
