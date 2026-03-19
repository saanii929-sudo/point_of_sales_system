import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Sale from '@/models/Sale';
import Product from '@/models/Product';

/**
 * POST /api/admin/recalculate-profits
 *
 * Recalculates the stored `profit` field on every completed sale for this
 * business, using the **current** cost price from the Product collection.
 *
 * Use-case: you edited a product's cost price after the sale was created and
 * want the analytics to reflect the corrected values.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only the business owner can trigger a bulk recalculation
    if (session.role !== 'business_owner') {
      return NextResponse.json({ error: 'Only business owners can recalculate profits' }, { status: 403 });
    }

    await connectDB();

    const tenantOid = new mongoose.Types.ObjectId(session.tenantId as string);

    // Fetch all completed sales for this tenant
    const sales = await Sale.find({ tenantId: tenantOid, status: 'completed' });

    if (sales.length === 0) {
      return NextResponse.json({ message: 'No sales to recalculate', updated: 0 });
    }

    // Build a product-cost lookup to avoid N×M database calls
    const productIds  = [...new Set(sales.flatMap(s => s.items.map(i => i.product.toString())))];
    const products    = await Product.find({ _id: { $in: productIds } }).select('_id cost');
    const costMap     = new Map(products.map(p => [p._id.toString(), p.cost]));

    let updated      = 0;
    let totalFixed   = 0;

    const bulkOps = sales.map(sale => {
      // Recalculate profit using current product costs (fallback to stored cost if product deleted)
      const newProfit = sale.items.reduce((sum: number, item: any) => {
        const currentCost = costMap.get(item.product.toString()) ?? item.cost;
        return sum + (item.price - currentCost) * item.quantity;
      }, 0) - (sale.discount || 0);

      const oldProfit = sale.profit;
      const delta     = newProfit - oldProfit;

      if (Math.abs(delta) > 0.001) {
        totalFixed++;
        return {
          updateOne: {
            filter: { _id: sale._id },
            update: { $set: { profit: Math.round(newProfit * 100) / 100 } },
          },
        };
      }
      return null;
    }).filter(Boolean);

    if (bulkOps.length > 0) {
      const result = await Sale.bulkWrite(bulkOps as any[]);
      updated = result.modifiedCount;
    }

    return NextResponse.json({
      message: updated > 0
        ? `Recalculated profits for ${updated} sale${updated > 1 ? 's' : ''}`
        : 'All profits were already correct — nothing changed',
      total:   sales.length,
      updated,
      fixed:   totalFixed,
    });
  } catch (error: any) {
    console.error('Recalculate profits error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
