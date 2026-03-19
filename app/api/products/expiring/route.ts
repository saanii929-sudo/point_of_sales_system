import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Find products expiring within 30 days or already expired
    const query: any = {
      tenantId: session.tenantId,
      isActive: true,
      expiryDate: { $exists: true, $lte: thirtyDaysFromNow }
    };

    const expiringProducts = await Product.find(query)
      .populate('category', 'name color')
      .sort({ expiryDate: 1 })
      .limit(50);

    // Categorize products
    const expired = expiringProducts.filter(p => p.expiryDate && p.expiryDate < now);
    const expiringSoon = expiringProducts.filter(p => {
      if (!p.expiryDate) return false;
      const daysUntilExpiry = Math.ceil((p.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    });
    const expiringThisMonth = expiringProducts.filter(p => {
      if (!p.expiryDate) return false;
      const daysUntilExpiry = Math.ceil((p.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 7 && daysUntilExpiry <= 30;
    });

    return NextResponse.json({
      expired,
      expiringSoon,
      expiringThisMonth,
      total: expiringProducts.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
