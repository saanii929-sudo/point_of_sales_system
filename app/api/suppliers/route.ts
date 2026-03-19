import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Supplier from '@/models/Supplier';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let query: any = session.role === 'super_admin' ? {} : { tenantId: session.tenantId };
    query.isActive = true;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    return NextResponse.json({ suppliers });
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

    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { name, contactPerson, email, phone, address, website, notes } = body;

    const supplier = await Supplier.create({
      tenantId: session.tenantId,
      name,
      contactPerson,
      email,
      phone,
      address,
      website,
      notes
    });

    return NextResponse.json({ supplier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
