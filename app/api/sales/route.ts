import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Discount from '@/models/Discount';
import { generateSaleNumber, calculateProfit } from '@/lib/utils';
import { emitToTenant } from '@/lib/socket';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Super admin can see all sales, others only their tenant's sales
    let query: any = session.role === 'super_admin'
      ? { status: 'completed' }
      : { tenantId: session.tenantId, status: 'completed' };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await Sale.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ sales });
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

    // Only cashier, manager, and business_owner can create sales
    if (!['cashier', 'manager', 'business_owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { items, discount, discountCode, discountId, tax, paymentMethod, paymentDetails, customerInfo } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      );
    }

    // Validate stock and prepare sale items
    const saleItems = [];
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.id,
        tenantId: session.tenantId
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.name} not found` },
          { status: 400 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      saleItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        cost: product.cost,
        subtotal: item.price * item.quantity
      });

      // Update stock
      product.stock -= item.quantity;
      product.salesCount += item.quantity;
      await product.save();
    }

    // Handle customer
    let customerId = null;
    if (customerInfo && customerInfo.phone) {
      let customer = await Customer.findOne({
        tenantId: session.tenantId,
        phone: customerInfo.phone
      });

      if (!customer) {
        customer = await Customer.create({
          tenantId: session.tenantId,
          name: customerInfo.name || 'Walk-in Customer',
          phone: customerInfo.phone,
          email: customerInfo.email
        });
      }

      const saleTotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0) + tax - discount;
      customer.totalPurchases += 1;
      customer.lifetimeValue += saleTotal;
      customer.visitCount += 1;
      customer.lastVisit = new Date();
      await customer.save();

      customerId = customer._id;
    }

    // Create sale
    const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + tax - discount;
    const profit = calculateProfit(saleItems);

    const sale = await Sale.create({
      tenantId: session.tenantId,
      saleNumber: generateSaleNumber(),
      items: saleItems,
      subtotal,
      tax,
      discount,
      discountCode: discountCode || undefined,
      discountId: discountId || undefined,
      total,
      profit,
      paymentMethod,
      paymentDetails,
      customer: customerId,
      cashier: session.userId,
      status: 'completed'
    });

    // Increment discount usage count if discount was applied
    if (discountId) {
      try {
        await Discount.findByIdAndUpdate(discountId, {
          $inc: { usageCount: 1 }
        });
      } catch (error) {
        console.error('Failed to increment discount usage:', error);
        // Don't fail the sale if discount update fails
      }
    }

    // Emit real-time event
    emitToTenant(session.tenantId, 'sale-created', {
      sale: {
        id: sale._id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        items: sale.items.length,
        cashier: session.userId
      }
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    console.error('Sale creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
