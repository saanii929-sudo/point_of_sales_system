import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Return from '@/models/Return';
import Product from '@/models/Product';

function generateReturnNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RET-${timestamp}${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query: any = { tenantId: session.tenantId };

    if (status) {
      query.status = status;
    }

    const returns = await Return.find(query)
      .populate('customerId', 'name phone')
      .populate('createdBy', 'name')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ returns });
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

    await connectDB();

    const body = await req.json();
    const { items, reason, refundMethod, customerId, notes } = body;

    // Validate items
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items to return' }, { status: 400 });
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    const returnDoc = await Return.create({
      tenantId: session.tenantId,
      returnNumber: generateReturnNumber(),
      customerId: customerId || undefined,
      items,
      subtotal,
      tax,
      total,
      reason,
      refundMethod,
      status: 'pending',
      notes,
      createdBy: session.userId
    });

    const populatedReturn = await Return.findById(returnDoc._id)
      .populate('customerId', 'name phone')
      .populate('createdBy', 'name');

    return NextResponse.json({ return: populatedReturn });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
