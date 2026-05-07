import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Branch from '@/models/Branch';
import BranchInventory from '@/models/BranchInventory';
import Product from '@/models/Product';
import ActivityLog from '@/models/ActivityLog';

type Params = { params: Promise<{ id: string }> };

// ── GET /api/branches/[id]/inventory ─────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id: branchId } = await params;

    // Validate branch belongs to tenant
    const branch = await Branch.findOne({ _id: branchId, tenantId: session.tenantId });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    // Fetch all active products for this tenant
    const allProducts = await Product.find({ tenantId: session.tenantId, isActive: true })
      .populate('category', 'name color')
      .select('name sku price cost category lowStockThreshold')
      .sort({ name: 1 });

    // Fetch all BranchInventory records for this branch
    const branchInventory = await BranchInventory.find({ tenantId: session.tenantId, branch: branchId });
    const invMap = new Map(branchInventory.map(bi => [bi.product.toString(), bi]));

    // Merge: every product gets a branch stock entry
    const inventory = allProducts.map(product => {
      const bi = invMap.get(product._id.toString());
      return {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          cost: product.cost,
          category: product.category,
          lowStockThreshold: product.lowStockThreshold,
        },
        stock: bi?.stock ?? 0,
        reservedStock: bi?.reservedStock ?? 0,
        reorderPoint: bi?.reorderPoint ?? product.lowStockThreshold ?? 10,
        maxStock: bi?.maxStock ?? 1000,
        lastRestocked: bi?.lastRestocked ?? null,
        lastSold: bi?.lastSold ?? null,
        branchInventoryId: bi?._id ?? null,
        isLow: (bi?.stock ?? 0) <= (bi?.reorderPoint ?? product.lowStockThreshold ?? 10),
      };
    });

    return NextResponse.json({ inventory, branch });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

// ── POST /api/branches/[id]/inventory — stock adjustment ──
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['business_owner', 'manager', 'inventory_staff'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();
    const { id: branchId } = await params;

    const branch = await Branch.findOne({ _id: branchId, tenantId: session.tenantId });
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    const body = await req.json();
    const { productId, quantity, type, reason } = body as {
      productId: string;
      quantity: number;
      type: 'add' | 'set' | 'subtract';
      reason?: string;
    };

    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    if (typeof quantity !== 'number' || quantity < 0)
      return NextResponse.json({ error: 'quantity must be a non-negative number' }, { status: 400 });
    if (!['add', 'set', 'subtract'].includes(type))
      return NextResponse.json({ error: 'type must be add, set, or subtract' }, { status: 400 });

    // Validate product exists for tenant
    const product = await Product.findOne({ _id: productId, tenantId: session.tenantId });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Find or create BranchInventory record
    let bi = await BranchInventory.findOne({ tenantId: session.tenantId, branch: branchId, product: productId });
    const prevStock = bi?.stock ?? 0;

    let newStock: number;
    if (type === 'set') {
      newStock = quantity;
    } else if (type === 'add') {
      newStock = prevStock + quantity;
    } else {
      newStock = Math.max(0, prevStock - quantity);
      if (!branch.settings.allowNegativeStock && prevStock - quantity < 0) {
        return NextResponse.json({ error: 'Insufficient stock for this adjustment' }, { status: 400 });
      }
      newStock = branch.settings.allowNegativeStock ? prevStock - quantity : Math.max(0, prevStock - quantity);
    }

    if (!bi) {
      bi = await BranchInventory.create({
        tenantId: session.tenantId,
        branch: branchId,
        product: productId,
        stock: newStock,
        lastRestocked: type !== 'subtract' ? new Date() : undefined,
      });
    } else {
      bi.stock = newStock;
      if (type !== 'subtract') bi.lastRestocked = new Date();
      await bi.save();
    }

    // Log activity
    await ActivityLog.create({
      tenantId: session.tenantId,
      user: session.userId,
      action: `stock_${type}`,
      entity: 'BranchInventory',
      entityId: bi._id,
      details: {
        branchId,
        branchName: branch.name,
        productId,
        productName: product.name,
        previousStock: prevStock,
        newStock,
        quantity,
        reason: reason || 'Manual adjustment',
      },
    });

    return NextResponse.json({ branchInventory: bi, previousStock: prevStock, newStock });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
