import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';
import BranchInventory from '@/models/BranchInventory';
import Sale from '@/models/Sale';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ── Sales for velocity calculations ─────────────────────
    const salesQuery: any = {
      tenantId: session.tenantId,
      createdAt: { $gte: thirtyDaysAgo },
      status: 'completed',
    };
    if (branchId) salesQuery.branchId = branchId;

    const recentSales = await Sale.find(salesQuery);

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    recentSales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.product.toString();
        if (!productSalesMap[key]) {
          productSalesMap[key] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productSalesMap[key].quantity += item.quantity;
        productSalesMap[key].revenue  += item.subtotal;
      });
    });

    const fastMoving = Object.entries(productSalesMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // ── Stock levels: branch-specific or global ──────────────
    const allProducts = await Product.find({
      tenantId: session.tenantId,
      isActive: true,
    });

    // Build a stock-level map: branchId → use BranchInventory, else use Product.stock
    let stockMap: Map<string, number>;
    if (branchId) {
      const branchInventory = await BranchInventory.find({
        tenantId: session.tenantId,
        branch:   branchId,
      });
      stockMap = new Map(branchInventory.map(bi => [bi.product.toString(), bi.stock]));
    } else {
      stockMap = new Map(allProducts.map(p => [p._id.toString(), p.stock]));
    }

    // Helper: get effective stock for a product
    const getStock = (productId: string) => stockMap.get(productId) ?? 0;

    // ── Dead stock ───────────────────────────────────────────
    const soldProductIds = new Set(Object.keys(productSalesMap));
    const deadStock = allProducts
      .filter(p => !soldProductIds.has(p._id.toString()) && getStock(p._id.toString()) > 0)
      .map(p => ({
        id:    p._id,
        name:  p.name,
        stock: getStock(p._id.toString()),
        value: getStock(p._id.toString()) * p.cost,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // ── Stock predictions ────────────────────────────────────
    const predictions = fastMoving.slice(0, 5).map(item => {
      const dailyAverage = item.quantity / 30;
      const product = allProducts.find(p => p._id.toString() === item.id);
      if (!product) return null;

      const currentStock = getStock(item.id);
      const daysUntilStockout = currentStock > 0
        ? Math.floor(currentStock / dailyAverage)
        : 0;

      return {
        id: item.id,
        name: item.name,
        currentStock,
        dailyAverage:     Math.round(dailyAverage * 10) / 10,
        daysUntilStockout,
        reorderSuggestion: Math.ceil(dailyAverage * 14),
        urgency: daysUntilStockout < 7 ? 'high' : daysUntilStockout < 14 ? 'medium' : 'low',
      };
    }).filter(Boolean);

    // ── Restock suggestions ──────────────────────────────────
    const restockSuggestions = allProducts
      .filter(p => {
        const stock = getStock(p._id.toString());
        return stock <= p.lowStockThreshold;
      })
      .map(p => {
        const stock       = getStock(p._id.toString());
        const salesData   = productSalesMap[p._id.toString()];
        const dailyAvg    = salesData ? salesData.quantity / 30 : 0;
        const suggested   = Math.max(p.lowStockThreshold * 2, Math.ceil(dailyAvg * 30));

        return {
          id:               p._id,
          name:             p.name,
          currentStock:     stock,
          lowStockThreshold: p.lowStockThreshold,
          suggestedQuantity: suggested,
          estimatedCost:    suggested * p.cost,
          priority: stock === 0 ? 'critical' : stock < p.lowStockThreshold / 2 ? 'high' : 'medium',
        };
      })
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2 };
        return order[a.priority as keyof typeof order] - order[b.priority as keyof typeof order];
      })
      .slice(0, 10);

    return NextResponse.json({
      fastMoving,
      deadStock,
      predictions,
      restockSuggestions,
      branchId: branchId ?? null,
      summary: {
        totalProducts:     allProducts.length,
        fastMovingCount:   fastMoving.length,
        deadStockCount:    deadStock.length,
        needsRestockCount: restockSuggestions.length,
      },
    });
  } catch (error: any) {
    console.error('Inventory insights error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
