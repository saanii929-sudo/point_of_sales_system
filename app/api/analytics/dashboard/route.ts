import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner, manager can view analytics
    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today';

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Super admin can see all data, others only their tenant
    const query: any = session.role === 'super_admin'
      ? { status: 'completed', createdAt: { $gte: startDate } }
      : { tenantId: session.tenantId, status: 'completed', createdAt: { $gte: startDate } };

    // Get sales data
    const sales = await Sale.find(query);
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
    const salesCount = sales.length;

    // Get top products
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
      .slice(0, 5);

    // Get low stock products
    const lowStockQuery = session.role === 'super_admin'
      ? { isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }
      : { tenantId: session.tenantId, isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } };
    
    const lowStockProducts = await Product.find(lowStockQuery).limit(10);

    // Get employee performance
    const employeePerformance = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$cashier',
          totalSales: { $sum: '$total' },
          salesCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 }
    ]);

    const employeeIds = employeePerformance.map(e => e._id);
    const employees = await User.find({ _id: { $in: employeeIds } }).select('name');
    
    const employeeMap = employees.reduce((acc, emp) => {
      acc[emp._id.toString()] = emp.name;
      return acc;
    }, {} as Record<string, string>);

    const topEmployees = employeePerformance.map(e => ({
      name: employeeMap[e._id.toString()] || 'Unknown',
      totalSales: e.totalSales,
      salesCount: e.salesCount
    }));

    // Get customer stats
    const customerQuery = session.role === 'super_admin' ? {} : { tenantId: session.tenantId };
    const totalCustomers = await Customer.countDocuments(customerQuery);

    // Generate sales trend data
    const salesTrend = [];
    const days = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const interval = period === 'year' ? 30 : 1; // Group by month for year view
    
    for (let i = days - 1; i >= 0; i -= interval) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + interval);
      
      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= date && saleDate < nextDate;
      });
      
      const dayTotal = daySales.reduce((sum, sale) => sum + sale.total, 0);
      const dayProfit = daySales.reduce((sum, sale) => sum + sale.profit, 0);
      
      salesTrend.push({
        date: period === 'year' 
          ? date.toLocaleDateString('en-US', { month: 'short' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: Math.round(dayTotal * 100) / 100,
        profit: Math.round(dayProfit * 100) / 100
      });
    }

    // Get category breakdown
    const categoryBreakdown: Record<string, number> = {};
    
    for (const sale of sales) {
      for (const item of sale.items) {
        try {
          const product = await Product.findById(item.product).populate('category', 'name');
          if (product && product.category) {
            const categoryName = (product.category as any).name;
            categoryBreakdown[categoryName] = (categoryBreakdown[categoryName] || 0) + item.subtotal;
          }
        } catch (e) {
          // Skip if product not found
        }
      }
    }

    const categoryData = Object.entries(categoryBreakdown)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return NextResponse.json({
      summary: {
        totalSales,
        totalProfit,
        salesCount,
        totalCustomers
      },
      topProducts,
      lowStockProducts,
      topEmployees,
      salesTrend,
      categoryBreakdown: categoryData
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
