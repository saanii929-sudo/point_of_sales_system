import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { updates } = body; // Array of { productId, field, value }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      );
    }

    const results = [];

    for (const update of updates) {
      const { productId, field, value } = update;

      if (!productId || !field) {
        results.push({
          productId,
          success: false,
          error: 'Missing productId or field'
        });
        continue;
      }

      try {
        const product = await Product.findOneAndUpdate(
          { _id: productId, tenantId: session.tenantId },
          { $set: { [field]: value } },
          { new: true }
        );

        if (product) {
          results.push({
            productId,
            success: true,
            product: {
              id: product._id,
              name: product.name,
              [field]: value
            }
          });
        } else {
          results.push({
            productId,
            success: false,
            error: 'Product not found'
          });
        }
      } catch (error: any) {
        results.push({
          productId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: updates.length,
        successful: successCount,
        failed: failCount
      },
      results
    });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
