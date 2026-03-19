import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Discount from '@/models/Discount';
import Sale from '@/models/Sale';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { code, subtotal, items, customerId } = body;

    if (!code || subtotal === undefined || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find discount
    const discount = await Discount.findOne({
      business: session.tenantId,
      code: code.toUpperCase()
    }).populate('products categories');

    if (!discount) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid discount code' 
      }, { status: 404 });
    }

    // Check if discount is valid
    const validityCheck = discount.isValid();
    if (!validityCheck.valid) {
      return NextResponse.json({ 
        valid: false, 
        error: validityCheck.reason 
      }, { status: 400 });
    }

    // Check usage per customer if applicable
    if (customerId && discount.usagePerCustomer !== null) {
      const customerUsage = await Sale.countDocuments({
        tenantId: session.tenantId,
        customer: customerId,
        discountCode: code.toUpperCase()
      });

      if (customerUsage >= discount.usagePerCustomer) {
        return NextResponse.json({ 
          valid: false, 
          error: 'You have reached the usage limit for this discount' 
        }, { status: 400 });
      }
    }

    // Calculate discount
    const discountResult = discount.calculateDiscount(subtotal, items);
    
    if (discountResult.reason) {
      return NextResponse.json({ 
        valid: false, 
        error: discountResult.reason 
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      discount: {
        id: discount._id,
        code: discount.code,
        name: discount.name,
        type: discount.type,
        value: discount.value,
        amount: discountResult.amount,
        applicableTo: discount.applicableTo
      }
    });
  } catch (error: any) {
    console.error('Error verifying discount:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
