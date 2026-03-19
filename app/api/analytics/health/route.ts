import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Sales Trend
    const currentMonthSales = await Sale.aggregate([
      {
        $match: {
          tenantId: session.tenantId,
          createdAt: { $gte: lastMonth },
          status: 'completed'
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const previousMonthSales = await Sale.aggregate([
      {
        $match: {
          tenantId: session.tenantId,
          createdAt: { $gte: twoMonthsAgo, $lt: lastMonth },
          status: 'completed'
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const currentTotal = currentMonthSales[0]?.total || 0;
    const previousTotal = previousMonthSales[0]?.total || 1;
    const salesTrend = ((currentTotal - previousTotal) / previousTotal) * 100;

    // Stock Health
    const products = await Product.find({
      tenantId: session.tenantId,
      isActive: true
    });

    const totalProducts = products.length;
    const inStockProducts = products.filter(p => p.stock > p.lowStockThreshold).length;
    const stockHealth = totalProducts > 0 ? (inStockProducts / totalProducts) * 100 : 100;

    // Customer Retention
    const customers = await Customer.find({
      tenantId: session.tenantId
    });

    const returningCustomers = customers.filter(c => c.visitCount > 1).length;
    const customerRetention = customers.length > 0 
      ? (returningCustomers / customers.length) * 100 
      : 0;

    // Profit Margin
    const recentSales = await Sale.find({
      tenantId: session.tenantId,
      createdAt: { $gte: lastMonth },
      status: 'completed'
    });

    const totalRevenue = recentSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = recentSales.reduce((sum, sale) => sum + sale.profit, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Overall Score (weighted average)
    const overallScore = (
      (Math.max(0, Math.min(100, salesTrend + 50)) * 0.3) + // Sales trend normalized
      (stockHealth * 0.25) +
      (customerRetention * 0.25) +
      (profitMargin * 0.2)
    );

    return NextResponse.json({
      metrics: {
        salesTrend: Math.round(salesTrend * 10) / 10,
        stockHealth: Math.round(stockHealth * 10) / 10,
        customerRetention: Math.round(customerRetention * 10) / 10,
        profitMargin: Math.round(profitMargin * 10) / 10
      },
      overallScore: Math.round(overallScore)
    });
  } catch (error: any) {
    console.error('Health metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
