import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import { subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business_owner, manager, inventory_staff can view inventory reports
    if (!['super_admin', 'business_owner', 'manager', 'inventory_staff'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30';
    const days = parseInt(period);

    const startDate = subDays(new Date(), days);

    // Get all products
    const productQuery = session.role === 'super_admin'
      ? { isActive: true }
      : { tenantId: session.tenantId, isActive: true };

    const products = await Product.find(productQuery).populate('category', 'name');

    // Get sales for the period
    const salesQuery: any = session.role === 'super_admin'
      ? { status: 'completed', createdAt: { $gte: startDate } }
      : { tenantId: session.tenantId, status: 'completed', createdAt: { $gte: startDate } };

    const sales = await Sale.find(salesQuery);

    // Calculate stock movement
    const stockMovement: Record<string, { name: string; sold: number; remaining: number; value: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.product.toString();
        if (!stockMovement[key]) {
          stockMovement[key] = {
            name: item.productName,
            sold: 0,
            remaining: 0,
            value: 0
          };
        }
        stockMovement[key].sold += item.quantity;
      });
    });

    // Add current stock levels
    products.forEach(product => {
      const key = product._id.toString();
      if (stockMovement[key]) {
        stockMovement[key].remaining = product.stock;
        stockMovement[key].value = product.stock * product.cost;
      } else {
        stockMovement[key] = {
          name: product.name,
          sold: 0,
          remaining: product.stock,
          value: product.stock * product.cost
        };
      }
    });

    // Stock status breakdown
    const stockStatus = {
      inStock: products.filter(p => p.stock > p.lowStockThreshold).length,
      lowStock: products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
      outOfStock: products.filter(p => p.stock === 0).length
    };

    // Category-wise inventory
    const categoryInventory: Record<string, { name: string; products: number; totalValue: number; totalStock: number }> = {};
    
    products.forEach(product => {
      const categoryName = (product.category as any)?.name || 'Uncategorized';
      if (!categoryInventory[categoryName]) {
        categoryInventory[categoryName] = {
          name: categoryName,
          products: 0,
          totalValue: 0,
          totalStock: 0
        };
      }
      categoryInventory[categoryName].products += 1;
      categoryInventory[categoryName].totalValue += product.stock * product.cost;
      categoryInventory[categoryName].totalStock += product.stock;
    });

    // Top movers (most sold)
    const topMovers = Object.entries(stockMovement)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    // Slow movers (least sold but have stock)
    const slowMovers = Object.entries(stockMovement)
      .map(([id, data]) => ({ id, ...data }))
      .filter(item => item.remaining > 0)
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 10);

    // Stock value analysis
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);
    const totalStockQuantity = products.reduce((sum, p) => sum + p.stock, 0);
    const averageStockValue = products.length > 0 ? totalStockValue / products.length : 0;

    // Low stock alerts
    const lowStockAlerts = products
      .filter(p => p.stock <= p.lowStockThreshold && p.stock > 0)
      .map(p => ({
        id: p._id,
        name: p.name,
        currentStock: p.stock,
        threshold: p.lowStockThreshold,
        category: (p.category as any)?.name || 'Uncategorized'
      }))
      .slice(0, 10);

    // Out of stock items
    const outOfStockItems = products
      .filter(p => p.stock === 0)
      .map(p => ({
        id: p._id,
        name: p.name,
        category: (p.category as any)?.name || 'Uncategorized',
        lastSold: p.updatedAt
      }))
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalProducts: products.length,
        totalStockValue,
        totalStockQuantity,
        averageStockValue
      },
      stockStatus,
      categoryInventory: Object.values(categoryInventory),
      topMovers,
      slowMovers,
      lowStockAlerts,
      outOfStockItems
    });
  } catch (error: any) {
    console.error('Inventory report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
