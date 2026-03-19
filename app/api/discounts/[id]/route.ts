import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Discount from '@/models/Discount';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const discount = await Discount.findOne({
      _id: id,
      business: session.tenantId
    });

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    // Update fields
    Object.keys(body).forEach(key => {
      if (key !== 'business' && key !== 'createdBy' && key !== 'usageCount') {
        discount[key] = body[key];
      }
    });

    await discount.save();

    return NextResponse.json({ discount });
  } catch (error: any) {
    console.error('Error updating discount:', error);
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

    if (!['business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const discount = await Discount.findOneAndDelete({
      _id: id,
      business: session.tenantId
    });

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Discount deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting discount:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
