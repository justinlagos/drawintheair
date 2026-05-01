import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface CheckoutRequest {
  redirectTo?: string
}

interface StripeSession {
  url: string | null
}

async function getStripe() {
  const stripeModule = await import('stripe')
  return new stripeModule.default(process.env.STRIPE_SECRET_KEY || '')
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const supabase = await createClient()

    // Verify token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      )
    }

    // Get teacher profile
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, email, name')
      .eq('id', user.id)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      )
    }

    const body: CheckoutRequest = await request.json()

    // Validate required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not defined')
      return NextResponse.json(
        { error: 'Stripe configuration error' },
        { status: 500 }
      )
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      console.error('STRIPE_PRO_PRICE_ID is not defined')
      return NextResponse.json(
        { error: 'Stripe configuration error' },
        { status: 500 }
      )
    }

    // SECURITY FIX: Never derive URLs from Host header — use env var only
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      console.error('NEXT_PUBLIC_APP_URL is not defined')
      return NextResponse.json(
        { error: 'Application configuration error' },
        { status: 500 }
      )
    }

    const stripe = await getStripe()

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/dashboard/upgrade`,
      customer_email: teacher.email,
      metadata: {
        teacher_id: teacher.id,
      },
    }) as StripeSession

    if (!session.url) {
      console.error('Failed to generate Stripe checkout URL')
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Checkout error:', errorMessage)
    // SECURITY FIX: Do not expose internal error details to clients
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
