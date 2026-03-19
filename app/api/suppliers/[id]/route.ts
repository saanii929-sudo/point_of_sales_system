import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Supplier from '@/models/Supplier';

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
    const { name, contactPerson, email, phone, address, website, notes } = body;

    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    if (session.role !== 'super_admin' && supplier.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (name !== undefined) supplier.name = name;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (email !== undefined) supplier.email = email;
    if (phone !== undefined) supplier.phone = phone;
    if (address !== undefined) supplier.address = address;
    if (website !== undefined) supplier.website = website;
    if (notes !== undefined) supplier.notes = notes;

    await supplier.save();

    return NextResponse.json({ supplier });
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
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    if (session.role !== 'super_admin' && supplier.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    supplier.isActive = false;
    await supplier.save();

    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
