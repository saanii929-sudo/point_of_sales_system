import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Product from '@/models/Product';
import Return from '@/models/Return';
import Payroll from '@/models/Payroll';
import Business from '@/models/Business';

export interface Notification {
  id: string;
  type: 'low_stock' | 'expiring_product' | 'pending_return' | 'pending_payroll' | 'subscription_expiry';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  link?: string;
  read: boolean;
  createdAt: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const tenantId = session.tenantId;
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const notifications: Notification[] = [];

    // ── Low stock products ────────────────────────────────
    const lowStockProducts = await Product.find({
      tenantId,
      isActive: true,
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }).select('name stock lowStockThreshold').limit(10);

    lowStockProducts.forEach((p) => {
      notifications.push({
        id: `low_stock_${p._id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${p.name} — ${p.stock <= 0 ? 'Out of stock' : `${p.stock} units left (threshold: ${p.lowStockThreshold})`}`,
        severity: p.stock <= 0 ? 'error' : 'warning',
        link: '/dashboard/inventory',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    // ── Expiring products (within 7 days) ─────────────────
    const expiringProducts = await Product.find({
      tenantId,
      isActive: true,
      expiryDate: { $gte: now, $lte: in7Days },
    }).select('name expiryDate').limit(10);

    expiringProducts.forEach((p) => {
      const daysLeft = Math.ceil((new Date(p.expiryDate as string | Date).getTime() - now.getTime()) / 86400000);
      notifications.push({
        id: `expiry_${p._id}`,
        type: 'expiring_product',
        title: 'Product Expiring Soon',
        message: `${p.name} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        severity: daysLeft <= 2 ? 'error' : 'warning',
        link: '/dashboard/expiring',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    // ── Pending returns ───────────────────────────────────
    const pendingReturnsCount = await Return.countDocuments({ tenantId, status: 'pending' });
    if (pendingReturnsCount > 0) {
      notifications.push({
        id: 'pending_returns',
        type: 'pending_return',
        title: 'Pending Returns',
        message: `${pendingReturnsCount} return${pendingReturnsCount > 1 ? 's' : ''} waiting for approval`,
        severity: 'info',
        link: '/dashboard/returns',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    // ── Pending payrolls ──────────────────────────────────
    const pendingPayrollCount = await Payroll.countDocuments({ tenantId, status: 'pending' });
    if (pendingPayrollCount > 0) {
      notifications.push({
        id: 'pending_payroll',
        type: 'pending_payroll',
        title: 'Pending Payroll',
        message: `${pendingPayrollCount} payroll record${pendingPayrollCount > 1 ? 's' : ''} awaiting approval`,
        severity: 'info',
        link: '/dashboard/payroll',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    // ── Subscription expiry warning ───────────────────────
    const business = await Business.findById(tenantId).select('subscriptionExpiry subscriptionStatus');
    if (business?.subscriptionExpiry) {
      const daysToExpiry = Math.ceil(
        (new Date(business.subscriptionExpiry).getTime() - now.getTime()) / 86400000
      );
      if (daysToExpiry <= 14 && daysToExpiry > 0 && business.subscriptionStatus !== 'expired') {
        notifications.push({
          id: 'subscription_expiry',
          type: 'subscription_expiry',
          title: 'Subscription Expiring',
          message: `Your subscription expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}`,
          severity: daysToExpiry <= 3 ? 'error' : 'warning',
          link: '/dashboard/settings',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Sort by severity: error first, then warning, then info
    const severityOrder = { error: 0, warning: 1, info: 2 };
    notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
