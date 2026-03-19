import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Business from '@/models/Business';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Super admin doesn't have branding, return default
    if (session.role === 'super_admin') {
      return NextResponse.json({
        branding: {
          businessName: 'SaaS POS Platform',
          primaryColor: '#10b981',
          secondaryColor: '#059669',
          accentColor: '#34d399',
          logoUrl: null,
          faviconUrl: null,
          companyTagline: 'Platform Administration'
        }
      });
    }

    const business = await Business.findById(session.tenantId);
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({
      branding: {
        businessName: business.name,
        primaryColor: business.branding?.primaryColor || '#10b981',
        secondaryColor: business.branding?.secondaryColor || '#059669',
        accentColor: business.branding?.accentColor || '#34d399',
        logoUrl: business.branding?.logoUrl || business.logo || null,
        faviconUrl: business.branding?.faviconUrl || null,
        companyTagline: business.branding?.companyTagline || ''
      }
    });
  } catch (error: any) {
    console.error('Get branding error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only business owner can update branding
    if (!['business_owner', 'super_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { primaryColor, secondaryColor, accentColor, logoUrl, faviconUrl, companyTagline } = body;

    const business = await Business.findByIdAndUpdate(
      session.tenantId,
      {
        $set: {
          'branding.primaryColor': primaryColor,
          'branding.secondaryColor': secondaryColor,
          'branding.accentColor': accentColor,
          'branding.logoUrl': logoUrl,
          'branding.faviconUrl': faviconUrl,
          'branding.companyTagline': companyTagline
        }
      },
      { new: true }
    );

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({
      branding: {
        businessName: business.name,
        primaryColor: business.branding.primaryColor,
        secondaryColor: business.branding.secondaryColor,
        accentColor: business.branding.accentColor,
        logoUrl: business.branding.logoUrl,
        faviconUrl: business.branding.faviconUrl,
        companyTagline: business.branding.companyTagline
      }
    });
  } catch (error: any) {
    console.error('Update branding error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
