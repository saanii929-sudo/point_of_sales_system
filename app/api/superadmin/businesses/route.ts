import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Business from '@/models/Business';
import User from '@/models/User';
import Sale from '@/models/Sale';
import Product from '@/models/Product';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    // Only super admin can access
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const businesses = await Business.find(query).sort({ createdAt: -1 });

    // Get stats for each business
    const businessesWithStats = await Promise.all(
      businesses.map(async (business) => {
        const [userCount, productCount, salesCount, totalRevenue] = await Promise.all([
          User.countDocuments({ tenantId: business._id }),
          Product.countDocuments({ tenantId: business._id }),
          Sale.countDocuments({ tenantId: business._id, status: 'completed' }),
          Sale.aggregate([
            { $match: { tenantId: business._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
          ])
        ]);

        return {
          id: business._id,
          name: business.name,
          email: business.email,
          phone: business.phone,
          subscriptionPlan: business.subscriptionPlan,
          subscriptionStatus: business.subscriptionStatus,
          subscriptionExpiry: business.subscriptionExpiry,
          isActive: business.isActive,
          createdAt: business.createdAt,
          stats: {
            users: userCount,
            products: productCount,
            sales: salesCount,
            revenue: totalRevenue[0]?.total || 0
          }
        };
      })
    );

    return NextResponse.json({ businesses: businessesWithStats });
  } catch (error: any) {
    console.error('Super admin businesses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { 
        businessName, 
        ownerName, 
        ownerEmail, 
        ownerPassword,
        phone,
        address,
        subscriptionPlanId,
        subscriptionExpiry
      } = body;

      // Validate required fields
      if (!businessName || !ownerName || !ownerEmail || !ownerPassword || !subscriptionPlanId || !subscriptionExpiry) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: ownerEmail.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }

      // Get subscription plan details
      const SubscriptionPlan = (await import('@/models/SubscriptionPlan')).default;
      const plan = await SubscriptionPlan.findById(subscriptionPlanId);
      if (!plan) {
        return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
      }

      // Create business
      const business = await Business.create({
        name: businessName,
        email: ownerEmail.toLowerCase(),
        phone: phone || '',
        address: address || '',
        subscriptionPlan: plan.name,
        subscriptionStatus: 'active',
        subscriptionExpiry: new Date(subscriptionExpiry),
        limits: plan.limits,
        isActive: true
      });

      // Hash password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(ownerPassword, 10);

      // Create business owner user
      const owner = await User.create({
        tenantId: business._id,
        email: ownerEmail.toLowerCase(),
        password: hashedPassword,
        name: ownerName,
        role: 'business_owner',
        phone: phone || '',
        isActive: true
      });

      return NextResponse.json({ 
        success: true, 
        business: {
          id: business._id,
          name: business.name,
          email: business.email
        },
        owner: {
          id: owner._id,
          name: owner.name,
          email: owner.email
        }
      });
    }

    if (action === 'toggle-status') {
      const { businessId } = body;
      const business = await Business.findById(businessId);
      if (!business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      business.isActive = !business.isActive;
      await business.save();

      return NextResponse.json({ 
        success: true, 
        business: {
          id: business._id,
          isActive: business.isActive
        }
      });
    }

    if (action === 'update-subscription') {
      const { businessId, data } = body;
      const business = await Business.findById(businessId);
      if (!business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }

      // If updating subscription plan, fetch plan details
      if (data.subscriptionPlanId) {
        const SubscriptionPlan = (await import('@/models/SubscriptionPlan')).default;
        const plan = await SubscriptionPlan.findById(data.subscriptionPlanId);
        if (!plan) {
          return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
        }
        business.subscriptionPlan = plan.name;
        business.limits = plan.limits;
      }

      if (data.subscriptionStatus) business.subscriptionStatus = data.subscriptionStatus;
      if (data.subscriptionExpiry) business.subscriptionExpiry = new Date(data.subscriptionExpiry);

      await business.save();

      return NextResponse.json({ success: true, business });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Super admin action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
