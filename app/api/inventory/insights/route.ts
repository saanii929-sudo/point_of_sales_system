import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';
import Sale from '@/models/Sale';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fast Moving Products (high sales velocity)
    const recentSales = await Sale.find({
      tenantId: session.tenantId,
      createdAt: { $gte: thirtyDaysAgo },
      status: 'completed'
    });

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    recentSales.forEach(sale => {
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

    const fastMoving = Object.entries(productSalesMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Dead Stock (no sales in 30 days)
    const allProducts = await Product.find({
      tenantId: session.tenantId,
      isActive: true
    });

    const soldProductIds = new Set(Object.keys(productSalesMap));
    const deadStock = allProducts
      .filter(p => !soldProductIds.has(p._id.toString()) && p.stock > 0)
      .map(p => ({
        id: p._id,
        name: p.name,
        stock: p.stock,
        value: p.stock * p.cost
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Stock Predictions (simple linear regression based on last 30 days)
    const predictions = fastMoving.slice(0, 5).map(item => {
      const dailyAverage = item.quantity / 30;
      const product = allProducts.find(p => p._id.toString() === item.id);
      
      if (!product) return null;

      const daysUntilStockout = product.stock > 0 
        ? Math.floor(product.stock / dailyAverage)
        : 0;

      const reorderSuggestion = dailyAverage * 14; // 2 weeks supply

      return {
        id: item.id,
        name: item.name,
        currentStock: product.stock,
        dailyAverage: Math.round(dailyAverage * 10) / 10,
        daysUntilStockout,
        reorderSuggestion: Math.ceil(reorderSuggestion),
        urgency: daysUntilStockout < 7 ? 'high' : daysUntilStockout < 14 ? 'medium' : 'low'
      };
    }).filter(Boolean);

    // Restock Suggestions
    const restockSuggestions = allProducts
      .filter(p => p.stock <= p.lowStockThreshold)
      .map(p => {
        const salesData = productSalesMap[p._id.toString()];
        const dailyAverage = salesData ? salesData.quantity / 30 : 0;
        const suggestedQuantity = Math.max(
          p.lowStockThreshold * 2,
          Math.ceil(dailyAverage * 30)
        );

        return {
          id: p._id,
          name: p.name,
          currentStock: p.stock,
          lowStockThreshold: p.lowStockThreshold,
          suggestedQuantity,
          estimatedCost: suggestedQuantity * p.cost,
          priority: p.stock === 0 ? 'critical' : p.stock < p.lowStockThreshold / 2 ? 'high' : 'medium'
        };
      })
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - 
               priorityOrder[b.priority as keyof typeof priorityOrder];
      })
      .slice(0, 10);

    return NextResponse.json({
      fastMoving,
      deadStock,
      predictions,
      restockSuggestions,
      summary: {
        totalProducts: allProducts.length,
        fastMovingCount: fastMoving.length,
        deadStockCount: deadStock.length,
        needsRestockCount: restockSuggestions.length
      }
    });
  } catch (error: any) {
    console.error('Inventory insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
