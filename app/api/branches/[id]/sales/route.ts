import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Branch from '@/models/Branch';
import Sale from '@/models/Sale';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id: branchId } = await params;

    const branch = await Branch.findOne({ _id: branchId, tenantId: session.tenantId });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: Record<string, unknown> = {
      tenantId: session.tenantId,
      branchId,
      status: 'completed',
    };

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const sales = await Sale.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(limit);

    const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
    const totalProfit  = sales.reduce((s, sale) => s + sale.profit, 0);

    return NextResponse.json({ sales, branch, totalRevenue, totalProfit, count: sales.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
