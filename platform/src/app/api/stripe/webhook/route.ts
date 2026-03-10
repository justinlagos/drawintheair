import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Stripe webhook secret
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not defined')
}

// Type for Stripe event
interface StripeEvent {
  type: string
  data: {
    object: Record<string, unknown>
  }
}

// Dynamic import Stripe to avoid server-only issues
async function getStripe() {
  const stripeModule = await import('stripe')
  return new stripeModule.default(process.env.STRIPE_SECRET_KEY || '')
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify signature and construct event
    const stripe = await getStripe()
    let event: StripeEvent

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      ) as StripeEvent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signature verification failed'
      console.error('Webhook signature verification failed:', errorMessage)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Record<string, unknown>
        const customerId = session.customer as string
        const metadata = session.metadata as Record<string, unknown>
        const teacherId = metadata?.teacher_id as string

        if (!teacherId) {
          console.warn('checkout.session.completed: No teacher_id in metadata')
          break
        }

        const subscriptionId = session.subscription as string

        // Update teacher profile
        const { error: updateError } = await supabase
          .from('teachers')
          .update({
            tier: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', teacherId)

        if (updateError) {
          console.error('Failed to update teacher after checkout:', updateError)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Record<string, unknown>
        const customerId = subscription.customer as string
        const status = subscription.status as string

        // Find teacher by stripe_customer_id
        const { data: teacher, error: fetchError } = await supabase
          .from('teachers')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (fetchError) {
          console.error('Failed to find teacher by customer ID:', fetchError)
          break
        }

        // Update tier based on subscription status
        let newTier: 'pro' | 'trial' | 'free' = 'free'
        if (status === 'active') {
          newTier = 'pro'
        }

        const { error: updateError } = await supabase
          .from('teachers')
          .update({ tier: newTier })
          .eq('id', teacher.id)

        if (updateError) {
          console.error('Failed to update teacher subscription status:', updateError)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Record<string, unknown>
        const customerId = subscription.customer as string

        // Find teacher by stripe_customer_id
        const { data: teacher, error: fetchError } = await supabase
          .from('teachers')
          .select('id, school_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (fetchError) {
          console.error('Failed to find teacher by customer ID:', fetchError)
          break
        }

        // Set tier to 'free' (unless part of a school)
        const { error: updateError } = await supabase
          .from('teachers')
          .update({ tier: 'free' })
          .eq('id', teacher.id)
          .is('school_id', null)

        if (updateError) {
          console.error('Failed to update teacher after subscription deletion:', updateError)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Record<string, unknown>
        const customerId = invoice.customer as string

        // Find teacher by stripe_customer_id
        const { data: teacher, error: fetchError } = await supabase
          .from('teachers')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (fetchError) {
          console.error('Failed to find teacher for payment failure:', fetchError)
          break
        }

        // Log payment failure alert
        console.warn(`Payment failed for teacher: ${teacher.id}`, {
          customerId,
          invoiceNumber: invoice.number,
        })

        // Optionally: send notification or update status
        // For now, just log for visibility
        break
      }

      default:
        // Ignore unhandled event types
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook error:', errorMessage)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
