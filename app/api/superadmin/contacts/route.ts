import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import ContactSubmission from '@/models/ContactSubmission';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const submissions = await ContactSubmission.find(query)
      .sort({ submittedAt: -1 })
      .limit(100);

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error('Get contact submissions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { submissionId, status, notes } = body;

    if (!submissionId || !status) {
      return NextResponse.json(
        { error: 'Submission ID and status are required' },
        { status: 400 }
      );
    }

    const submission = await ContactSubmission.findByIdAndUpdate(
      submissionId,
      {
        status,
        notes,
        respondedAt: new Date(),
        respondedBy: session.userId
      },
      { new: true }
    );

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error: any) {
    console.error('Update contact submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
