import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Business from '@/models/Business';
import User from '@/models/User';
import Sale from '@/models/Sale';
import Product from '@/models/Product';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const [
      totalBusinesses,
      activeBusinesses,
      totalUsers,
      totalProducts,
      totalSales,
      revenueData,
      recentBusinesses
    ] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $ne: 'super_admin' } }),
      Product.countDocuments(),
      Sale.countDocuments({ status: 'completed' }),
      Sale.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' }, profit: { $sum: '$profit' } } }
      ]),
      Business.find().sort({ createdAt: -1 }).limit(5)
    ]);

    // Subscription breakdown
    const subscriptionBreakdown = await Business.aggregate([
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }
    ]);

    // Monthly growth
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newBusinessesThisMonth = await Business.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    return NextResponse.json({
      overview: {
        totalBusinesses,
        activeBusinesses,
        inactiveBusinesses: totalBusinesses - activeBusinesses,
        totalUsers,
        totalProducts,
        totalSales,
        totalRevenue: revenueData[0]?.total || 0,
        totalProfit: revenueData[0]?.profit || 0,
        newBusinessesThisMonth
      },
      subscriptionBreakdown: subscriptionBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentBusinesses: recentBusinesses.map(b => ({
        id: b._id,
        name: b.name,
        email: b.email,
        subscriptionPlan: b.subscriptionPlan,
        createdAt: b.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Super admin stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
