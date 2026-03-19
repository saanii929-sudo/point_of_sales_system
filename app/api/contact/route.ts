import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ContactSubmission from '@/models/ContactSubmission';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, subject, message, phone, businessName } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Create contact submission
    const submission = await ContactSubmission.create({
      name,
      email,
      phone,
      businessName,
      subject: subject || 'General Inquiry',
      message,
      status: 'pending',
      submittedAt: new Date()
    });

    // TODO: Send email notification to super admin
    // You can integrate with SendGrid, AWS SES, or other email service

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you within 24 hours.',
      submissionId: submission._id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Contact submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
