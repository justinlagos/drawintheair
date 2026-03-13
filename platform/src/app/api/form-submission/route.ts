/**
 * Unified Form Submission API
 *
 * Receives form submissions from the Vite SPA (drawintheair.com),
 * stores them in Supabase, and sends email notifications.
 *
 * POST /api/form-submission
 * Body: { type, email, name, school, role, message, ... }
 *
 * Flow:
 *   1. Validate payload
 *   2. Store in Supabase `form_submissions` table
 *   3. Send notification email to partnership@drawintheair.com
 *   4. Send auto-reply to submitter (if email provided)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PARTNERSHIP_EMAIL = 'partnership@drawintheair.com';

const VALID_TYPES = [
  'school_pack_request',
  'school_pilot',
  'parent_trial',
  'feedback',
  'newsletter',
  'contact',
  'pilot_list',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, name, school, role, message, ...rest } = body;

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid form type' }, { status: 400 });
    }

    // Store in Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: dbError } = await supabase.from('form_submissions').insert({
      form_type: type,
      email: email || null,
      name: name || null,
      school: school || null,
      role: role || null,
      message: message || null,
      metadata: rest,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.warn('[FormSubmission] DB insert failed:', dbError.message);
      // Don't fail the request — still send email
    }

    // Send notification email to partnership team
    if (RESEND_API_KEY) {
      try {
        await sendNotificationEmail(type, { email, name, school, role, message, ...rest });
      } catch (emailErr) {
        console.warn('[FormSubmission] Notification email failed:', emailErr);
      }

      // Send auto-reply to submitter
      if (email && type !== 'feedback') {
        try {
          await sendAutoReply(email, name || 'there', type);
        } catch (replyErr) {
          console.warn('[FormSubmission] Auto-reply failed:', replyErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[FormSubmission] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Allow CORS from drawintheair.com
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function sendNotificationEmail(type: string, data: Record<string, unknown>) {
  const friendlyType: Record<string, string> = {
    school_pack_request: 'School Pack Request',
    school_pilot: 'School Pilot Application',
    parent_trial: 'Parent Trial Signup',
    feedback: 'Feedback',
    newsletter: 'Newsletter Signup',
    contact: 'Contact Form',
    pilot_list: 'Pilot List Signup',
  };

  const subject = `New ${friendlyType[type] || type} — Draw in the Air`;
  const rows = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<tr><td style="padding:8px 12px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9;text-transform:capitalize">${k.replace(/([A-Z])/g, ' $1')}</td><td style="padding:8px 12px;color:#0f172a;border-bottom:1px solid #f1f5f9">${String(v)}</td></tr>`)
    .join('');

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#f97316;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:1.1rem">${subject}</h2>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <p style="margin:20px 0 0;font-size:0.85rem;color:#94a3b8">Submitted at ${new Date().toISOString()}</p>
      </div>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Draw in the Air <notifications@drawintheair.com>',
      to: [PARTNERSHIP_EMAIL],
      subject,
      html,
    }),
  });
}

async function sendAutoReply(toEmail: string, name: string, type: string) {
  const isSchool = type.includes('school') || type.includes('pilot');

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="margin:0;font-size:1.4rem">Draw in the Air</h1>
        <p style="margin:8px 0 0;opacity:0.9;font-size:0.9rem">Camera-based learning for early years</p>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        <p style="color:#0f172a;font-size:1rem;margin:0 0 16px">Hi ${name},</p>
        <p style="color:#475569;line-height:1.7;margin:0 0 16px">
          Thank you for your interest in Draw in the Air! We've received your ${isSchool ? 'application' : 'message'} and our team will be in touch shortly.
        </p>
        ${isSchool ? `
        <p style="color:#475569;line-height:1.7;margin:0 0 16px">
          In the meantime, you can try all 9 activities for free at <a href="https://drawintheair.com/play" style="color:#f97316;font-weight:600">drawintheair.com/play</a> — no account needed.
        </p>
        ` : ''}
        <p style="color:#475569;line-height:1.7;margin:0 0 16px">
          If you have any questions, reply to this email or contact us at <a href="mailto:partnership@drawintheair.com" style="color:#f97316">partnership@drawintheair.com</a>.
        </p>
        <p style="color:#475569;margin:24px 0 0">Best wishes,<br><strong style="color:#0f172a">The Draw in the Air Team</strong></p>
      </div>
      <p style="text-align:center;font-size:0.75rem;color:#94a3b8;margin:16px 0 0">
        Draw in the Air Ltd &middot; <a href="https://drawintheair.com/privacy" style="color:#94a3b8">Privacy Policy</a>
      </p>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Draw in the Air <hello@drawintheair.com>',
      to: [toEmail],
      subject: 'Thanks for your interest — Draw in the Air',
      html,
    }),
  });
}
