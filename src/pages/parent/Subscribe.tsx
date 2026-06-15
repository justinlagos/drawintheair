/**
 * /subscribe and /trial. redirect to Stripe Checkout with the requested plan.
 * If the visitor isn't signed in, we send them to signup first with a ?next=...
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ParentShell, Card, I } from './_shared';
import { startStripeCheckout } from '../../lib/parentApi';
import { logEvent } from '../../lib/analytics';
import { newEventId, rememberCheckoutEventId } from '../../lib/observability';

export default function ParentSubscribe() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = (params.get('plan') === 'year' ? 'year' : 'month') as 'month' | 'year';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = `/subscribe?plan=${plan}`;
      navigate(`/parent/signup?next=${encodeURIComponent(next)}`);
      return;
    }
    (async () => {
      logEvent('parent_checkout_started');
      // Shared dedup id for Subscribe (Pixel mirror ↔ server CAPI).
      const metaEventId = newEventId();
      rememberCheckoutEventId(metaEventId);
      const url = await startStripeCheckout(plan, metaEventId);
      if (url) {
        window.location.href = url;
      } else {
        navigate('/parent/billing');
      }
    })();
  }, [user, loading, plan, navigate]);

  return (
    <ParentShell hideNav>
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div style={{ minWidth: 320, maxWidth: 360, textAlign: 'center' }}>
          <Card hero tint="lav">
            <span className="itile itile-grad" style={{ margin: '0 auto var(--space-4)', width: 56, height: 56 }}>
              <I.Sparkle size={26} strokeWidth={2} />
            </span>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>Taking you to Stripe...</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>A secure window will open in a moment.</p>
          </Card>
        </div>
      </div>
    </ParentShell>
  );
}
