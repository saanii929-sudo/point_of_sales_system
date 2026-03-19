import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Discount from '@/models/Discount';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // active, expired, all

    let query: any = { business: session.tenantId };

    if (status === 'active') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === 'expired') {
      const now = new Date();
      query.endDate = { $lt: now };
    }

    const discounts = await Discount.find(query)
      .populate('products', 'name')
      .populate('categories', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ discounts });
  } catch (error: any) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!['business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const {
      code,
      name,
      description,
      type,
      value,
      minPurchaseAmount,
      maxDiscountAmount,
      applicableTo,
      products,
      categories,
      usageLimit,
      usagePerCustomer,
      startDate,
      endDate
    } = body;

    // Validation
    if (!code || !name || !type || value === undefined || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'percentage' && (value < 0 || value > 100)) {
      return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Check if code already exists
    const existing = await Discount.findOne({
      business: session.tenantId,
      code: code.toUpperCase()
    });

    if (existing) {
      return NextResponse.json({ error: 'Discount code already exists' }, { status: 400 });
    }

    const discount = await Discount.create({
      business: session.tenantId,
      code: code.toUpperCase(),
      name,
      description,
      type,
      value,
      minPurchaseAmount: minPurchaseAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      applicableTo: applicableTo || 'all',
      products: products || [],
      categories: categories || [],
      usageLimit: usageLimit || null,
      usagePerCustomer: usagePerCustomer || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: session.userId
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
