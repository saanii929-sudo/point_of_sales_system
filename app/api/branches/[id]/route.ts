import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Branch from '@/models/Branch';
import { emitToTenant } from '@/lib/socket';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/branches/[id] ────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const branch = await Branch.findOne({ _id: id, tenantId: session.tenantId })
      .populate('manager', 'name email');

    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    return NextResponse.json({ branch });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

// ── PUT /api/branches/[id] ────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const body = await req.json();
    const { name, address, phone, email, managerId, settings } = body;

    const branch = await Branch.findOne({ _id: id, tenantId: session.tenantId });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    if (name?.trim()) branch.name = name.trim();
    if (address?.trim()) branch.address = address.trim();
    if (phone?.trim()) branch.phone = phone.trim();
    branch.email = email?.trim() || undefined;
    branch.manager = managerId || undefined;

    if (settings) {
      branch.settings.allowNegativeStock = settings.allowNegativeStock ?? branch.settings.allowNegativeStock;
      branch.settings.autoReorder = settings.autoReorder ?? branch.settings.autoReorder;
      branch.settings.reorderThreshold = settings.reorderThreshold ?? branch.settings.reorderThreshold;
    }

    await branch.save();

    const populated = await Branch.findById(branch._id).populate('manager', 'name email');
    emitToTenant(session.tenantId, 'branch-updated', { branch: populated });

    return NextResponse.json({ branch: populated });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

// ── DELETE /api/branches/[id] — soft delete ───────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.role !== 'business_owner') {
      return NextResponse.json({ error: 'Only business owners can deactivate branches' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    // Cannot deactivate the only active branch
    const activeCount = await Branch.countDocuments({ tenantId: session.tenantId, isActive: true });
    if (activeCount <= 1) {
      return NextResponse.json({ error: 'Cannot deactivate your only active branch' }, { status: 400 });
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: id, tenantId: session.tenantId },
      { isActive: false },
      { new: true }
    );

    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    emitToTenant(session.tenantId, 'branch-updated', { branch });

    return NextResponse.json({ message: 'Branch deactivated', branch });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
