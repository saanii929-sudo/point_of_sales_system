import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Sale from '@/models/Sale';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner, manager can view reports
    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const days = parseInt(period);

    const startDate = subDays(new Date(), days);
    const query: any = session.role === 'super_admin'
      ? { status: 'completed', createdAt: { $gte: startDate } }
      : { tenantId: session.tenantId, status: 'completed', createdAt: { $gte: startDate } };

    // Get all sales for the period
    const sales = await Sale.find(query)
      .populate('cashier', 'name')
      .sort({ createdAt: 1 });

    // Daily sales breakdown
    const dailySales: Record<string, { date: string; sales: number; revenue: number; profit: number; count: number }> = {};
    
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      dailySales[dateKey] = {
        date: format(date, 'MMM dd'),
        sales: 0,
        revenue: 0,
        profit: 0,
        count: 0
      };
    }

    sales.forEach(sale => {
      const dateKey = format(new Date(sale.createdAt), 'yyyy-MM-dd');
      if (dailySales[dateKey]) {
        dailySales[dateKey].revenue += sale.total;
        dailySales[dateKey].profit += sale.profit;
        dailySales[dateKey].count += 1;
      }
    });

    const dailyData = Object.values(dailySales).reverse();

    // Payment method breakdown
    const paymentMethods: Record<string, { count: number; total: number }> = {};
    sales.forEach(sale => {
      const method = sale.paymentMethod || 'cash';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].total += sale.total;
    });

    // Top selling products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.product.toString();
        if (!productSales[key]) {
          productSales[key] = {
            name: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.subtotal;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Hourly sales pattern
    const hourlySales: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlySales[i] = 0;
    }

    sales.forEach(sale => {
      const hour = new Date(sale.createdAt).getHours();
      hourlySales[hour] += sale.total;
    });

    const hourlyData = Object.entries(hourlySales).map(([hour, total]) => ({
      hour: `${hour}:00`,
      sales: total
    }));

    // Summary statistics
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
    const totalSales = sales.length;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalProfit,
        totalSales,
        averageOrderValue,
        profitMargin
      },
      dailyData,
      paymentMethods,
      topProducts,
      hourlyData
    });
  } catch (error: any) {
    console.error('Sales report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
