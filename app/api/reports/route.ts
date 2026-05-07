import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import BranchInventory from '@/models/BranchInventory';
import Customer from '@/models/Customer';
import Category from '@/models/Category';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner, manager, and super_admin can view reports
    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const range    = searchParams.get('range')    || 'month';
    const branchId = searchParams.get('branchId') || null;

    // Calculate date range
    let startDate = new Date();
    if (range === 'week')  startDate.setDate(startDate.getDate() - 7);
    else if (range === 'month') startDate.setDate(startDate.getDate() - 30);
    else if (range === 'year')  startDate.setFullYear(startDate.getFullYear() - 1);

    // Super admin can see all data, others only their tenant
    const tenantQuery = session.role === 'super_admin' ? {} : { tenantId: session.tenantId };
    const salesQuery: any = {
      ...tenantQuery,
      status: 'completed',
      createdAt: { $gte: startDate },
    };
    if (branchId && session.role !== 'super_admin') salesQuery.branchId = branchId;

    // Fetch all sales for the period
    const sales = await Sale.find(salesQuery).populate('customer', 'name');

    // SALES REPORT
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Sales by payment method
    const paymentMethodMap: Record<string, { count: number; total: number }> = {};
    sales.forEach(sale => {
      if (!paymentMethodMap[sale.paymentMethod]) {
        paymentMethodMap[sale.paymentMethod] = { count: 0, total: 0 };
      }
      paymentMethodMap[sale.paymentMethod].count++;
      paymentMethodMap[sale.paymentMethod].total += sale.total;
    });

    const salesByPaymentMethod = Object.entries(paymentMethodMap).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total
    }));

    // Top selling products
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.product.toString();
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            name: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSalesMap[key].quantity += item.quantity;
        productSalesMap[key].revenue += item.subtotal;
      });
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // INVENTORY REPORT
    const products = await Product.find({ ...tenantQuery, isActive: true });

    // Use branch-specific stock when branchId is provided
    let stockMap: Map<string, number>;
    if (branchId && session.role !== 'super_admin') {
      const branchInventory = await BranchInventory.find({
        tenantId: session.tenantId,
        branch:   branchId,
      });
      stockMap = new Map(branchInventory.map(bi => [bi.product.toString(), bi.stock]));
    } else {
      stockMap = new Map(products.map(p => [p._id.toString(), p.stock]));
    }
    const getStock = (id: string) => stockMap.get(id) ?? 0;

    const totalProducts   = products.length;
    const totalValue      = products.reduce((sum, p) => sum + getStock(p._id.toString()) * p.cost, 0);
    const lowStockItems   = products.filter(p => { const s = getStock(p._id.toString()); return s > 0 && s <= p.lowStockThreshold; }).length;
    const outOfStockItems = products.filter(p => getStock(p._id.toString()) === 0).length;

    // Category breakdown
    const categories = await Category.find({ ...tenantQuery, isActive: true });
    const categoryMap: Record<string, { count: number; value: number }> = {};
    
    for (const category of categories) {
      const categoryProducts = products.filter(p => p.category.toString() === category._id.toString());
      categoryMap[category.name] = {
        count: categoryProducts.length,
        value: categoryProducts.reduce((sum, p) => sum + getStock(p._id.toString()) * p.cost, 0)
      };
    }

    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      count: data.count,
      value: data.value
    }));

    // Stock movement (top products)
    const stockMovement = Object.entries(productSalesMap)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10)
      .map(([id, data]) => {
        const product = products.find(p => p._id.toString() === id);
        return {
          product: data.name,
          sold: data.quantity,
          remaining: product ? getStock(product._id.toString()) : 0
        };
      });

    // PROFIT ANALYSIS
    const totalCost = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0);
    }, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Profit by product
    const productProfitMap: Record<string, { name: string; profit: number; revenue: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.product.toString();
        const itemProfit = (item.price - item.cost) * item.quantity;
        if (!productProfitMap[key]) {
          productProfitMap[key] = {
            name: item.productName,
            profit: 0,
            revenue: 0
          };
        }
        productProfitMap[key].profit += itemProfit;
        productProfitMap[key].revenue += item.subtotal;
      });
    });

    const profitByProduct = Object.values(productProfitMap)
      .map(data => ({
        name: data.name,
        profit: data.profit,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // CUSTOMER INSIGHTS
    const customers = await Customer.find(tenantQuery);
    const totalCustomers = customers.length;
    
    const newCustomersStartDate = new Date();
    newCustomersStartDate.setDate(newCustomersStartDate.getDate() - 30);
    const newCustomers = customers.filter(c => new Date(c.createdAt) >= newCustomersStartDate).length;
    
    const returningCustomers = customers.filter(c => c.visitCount > 1).length;
    const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    const topCustomers = customers
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
      .slice(0, 10)
      .map(c => ({
        name: c.name,
        purchases: c.totalPurchases,
        lifetime: c.lifetimeValue
      }));

    const averageLifetimeValue = totalCustomers > 0
      ? customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / totalCustomers
      : 0;

    return NextResponse.json({
      salesReport: {
        totalSales,
        totalRevenue,
        averageOrderValue,
        salesByDay: [], // TODO: Implement daily breakdown
        salesByPaymentMethod,
        topSellingProducts
      },
      inventoryReport: {
        totalProducts,
        totalValue,
        lowStockItems,
        outOfStockItems,
        categoryBreakdown,
        stockMovement
      },
      profitAnalysis: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        profitByProduct,
        monthlyTrend: [] // TODO: Implement monthly trend
      },
      customerInsights: {
        totalCustomers,
        newCustomers,
        returningCustomers,
        retentionRate,
        topCustomers,
        averageLifetimeValue
      }
    });
  } catch (error: any) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
