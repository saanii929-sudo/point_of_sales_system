import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Business from '@/models/Business';
import User from '@/models/User';
import Sale from '@/models/Sale';
import Product from '@/models/Product';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    // Only super admin can access
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;
    const business = await Business.findById(id);
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get detailed stats for this business
    const [userCount, productCount, salesData, totalRevenue, totalCost] = await Promise.all([
      User.countDocuments({ tenantId: business._id }),
      Product.countDocuments({ tenantId: business._id }),
      Sale.countDocuments({ tenantId: business._id, status: 'completed' }),
      Sale.aggregate([
        { $match: { tenantId: business._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Sale.aggregate([
        { $match: { tenantId: business._id, status: 'completed' } },
        { $unwind: '$items' },
        { $group: { _id: null, total: { $sum: { $multiply: ['$items.cost', '$items.quantity'] } } } }
      ])
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const cost = totalCost[0]?.total || 0;
    const profit = revenue - cost;

    const businessDetail = {
      id: business._id,
      name: business.name,
      email: business.email,
      phone: business.phone,
      address: business.address,
      subscriptionPlan: business.subscriptionPlan,
      subscriptionStatus: business.subscriptionStatus,
      subscriptionExpiry: business.subscriptionExpiry,
      isActive: business.isActive,
      createdAt: business.createdAt,
      limits: business.limits,
      stats: {
        users: userCount,
        products: productCount,
        sales: salesData,
        revenue,
        profit
      }
    };

    return NextResponse.json({ business: businessDetail });
  } catch (error: any) {
    console.error('Business detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
