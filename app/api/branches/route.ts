import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Branch from '@/models/Branch';
import Business from '@/models/Business';
import { emitToTenant } from '@/lib/socket';

// ── Helpers ────────────────────────────────────────────────
async function generateBranchCode(tenantId: string, name: string): Promise<string> {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 8);

  let counter = 1;
  while (counter <= 999) {
    const code = `${slug}-${String(counter).padStart(3, '0')}`;
    const exists = await Branch.findOne({ tenantId, code });
    if (!exists) return code;
    counter++;
  }
  return `${slug}-${Date.now()}`;
}

// ── GET /api/branches ─────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const branches = await Branch.find({ tenantId: session.tenantId })
      .populate('manager', 'name email')
      .sort({ createdAt: 1 });

    return NextResponse.json({ branches, branchCount: branches.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

// ── POST /api/branches ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['business_owner', 'manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    // ── Subscription / limit checks ─────────────────────
    const business = await Business.findById(session.tenantId);
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const maxBranches = business.limits?.maxBranches ?? 1;
    const hasMultiBranch = (business.limits as any)?.hasMultiBranch !== false; // default allow if field missing

    const currentCount = await Branch.countDocuments({ tenantId: session.tenantId, isActive: true });

    if (!hasMultiBranch && currentCount >= 1) {
      return NextResponse.json(
        { error: 'Multi-branch is not available on your current plan. Upgrade to add more branches.' },
        { status: 403 }
      );
    }

    if (currentCount >= maxBranches) {
      return NextResponse.json(
        { error: `Your plan allows a maximum of ${maxBranches} branch${maxBranches === 1 ? '' : 'es'}. Upgrade to add more.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, address, phone, email, managerId, code: customCode, settings } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    if (!address?.trim()) return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: 'Phone is required' }, { status: 400 });

    // Generate or validate code
    let code = customCode?.trim().toUpperCase();
    if (!code) {
      code = await generateBranchCode(session.tenantId, name);
    } else {
      const exists = await Branch.findOne({ tenantId: session.tenantId, code });
      if (exists) return NextResponse.json({ error: `Branch code "${code}" is already in use` }, { status: 400 });
    }

    const branch = await Branch.create({
      tenantId: session.tenantId,
      name: name.trim(),
      code,
      address: address.trim(),
      phone: phone.trim(),
      email: email?.trim() || undefined,
      manager: managerId || undefined,
      settings: {
        allowNegativeStock: settings?.allowNegativeStock ?? false,
        autoReorder: settings?.autoReorder ?? false,
        reorderThreshold: settings?.reorderThreshold ?? 10,
      },
    });

    const populated = await Branch.findById(branch._id).populate('manager', 'name email');

    emitToTenant(session.tenantId, 'branch-created', { branch: populated });

    return NextResponse.json({ branch: populated }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
