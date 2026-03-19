import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Sale from '@/models/Sale';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? 'month';

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week':  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'year':  startDate = new Date(now.getFullYear(), 0, 1); break;
      default:      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const sales = await Sale.find({
      tenantId:  session.tenantId,
      createdAt: { $gte: startDate },
    }).select('total profit createdAt').lean();

    const totalRevenue = (sales as any[]).reduce((s, sale) => s + (sale.total  ?? 0), 0);
    const totalProfit  = (sales as any[]).reduce((s, sale) => s + (sale.profit ?? 0), 0);

    return NextResponse.json({ totalRevenue, totalProfit, salesCount: sales.length, period });
  } catch (error) {
    console.error('Profit report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
