import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ActivityLog from '@/models/ActivityLog';

// ── Derive a typed action category from the raw action code + entity ──────────
function deriveActionType(action: string, entity: string): string {
  const a = action.toLowerCase();
  const e = entity.toLowerCase();
  if (a === 'login' || a === 'logout')                        return 'login';
  if (e === 'sale' || a === 'process_sale')                   return 'sale';
  if (e === 'system' || a === 'system_backup')                return 'system';
  if (a.startsWith('create_') || a.startsWith('add_'))       return 'create';
  if (a.startsWith('delete_') || a.startsWith('remove_'))    return 'delete';
  return 'update'; // stock_transfer, update_*, adjust_* all map here
}

// ── Build a human-readable sentence from raw log fields ───────────────────────
function humanizeAction(action: string, entity: string, details: any): string {
  const d = details || {};
  switch (action) {
    case 'login':            return `Logged in to the system`;
    case 'logout':           return `Logged out`;
    case 'create_product':   return `Created product '${d.name}'`;
    case 'update_product':   return `Updated product '${d.name}'`;
    case 'delete_product':   return `Deleted product '${d.name}'`;
    case 'adjust_stock':     return `Adjusted stock for '${d.name}' (${d.adjustment > 0 ? '+' : ''}${d.adjustment} units)`;
    case 'create_employee':  return `Added employee '${d.name}' as ${d.role}`;
    case 'update_employee':  return `Updated employee '${d.name}'`;
    case 'delete_employee':  return `Removed employee '${d.name}'`;
    case 'process_sale':     return `Processed sale ${d.saleNumber} — GH₵${Number(d.total || 0).toFixed(2)} (${d.itemCount || 0} item${d.itemCount !== 1 ? 's' : ''})`;
    case 'create_discount':  return `Created discount code '${d.code}'`;
    case 'update_discount':  return `Updated discount code '${d.code}'`;
    case 'delete_discount':  return `Deleted discount code '${d.code}'`;
    case 'create_supplier':  return `Added supplier '${d.name}'`;
    case 'delete_supplier':  return `Removed supplier '${d.name}'`;
    case 'create_branch':    return `Created branch '${d.name}'`;
    case 'update_branch':    return `Updated branch '${d.name}'`;
    case 'delete_branch':    return `Deleted branch '${d.name}'`;
    case 'stock_transfer':   return `Transferred ${d.quantity} units of '${d.productName}' from ${d.fromBranchName} to ${d.toBranchName}`;
    case 'process_return':   return `Processed return for sale ${d.saleNumber} — GH₵${Number(d.total || 0).toFixed(2)}`;
    case 'system_backup':    return `System backup completed`;
    default: {
      // Generic prettifier: "create_product" → "Create Product"
      const readable = action
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return d.name ? `${readable}: '${d.name}'` : `${readable} (${entity})`;
    }
  }
}

// ── GET /api/activity ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners and managers can view the activity log
    if (!['super_admin', 'business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit    = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo   = searchParams.get('dateTo');
    const userId   = searchParams.get('userId');
    const type     = searchParams.get('type'); // e.g. "stock_transfer"

    const query: any =
      session.role === 'super_admin'
        ? {}
        : { tenantId: session.tenantId };

    if (userId) query.user = userId;
    if (type)   query.action = type;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const rawLogs = await ActivityLog.find(query)
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const logs = rawLogs.map(log => {
      const user = log.user as any;
      return {
        _id:        log._id.toString(),
        user: {
          name: user?.name ?? 'Unknown',
          role: user?.role ?? 'cashier',
        },
        action:     humanizeAction(log.action, log.entity, log.details),
        actionType: deriveActionType(log.action, log.entity),
        details:    log.details ?? {},
        ipAddress:  log.ipAddress ?? undefined,
        createdAt:  (log.createdAt as Date).toISOString(),
      };
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Activity log error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
