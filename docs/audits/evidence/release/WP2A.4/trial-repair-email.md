# Email to the parents whose trial never started

**Send only after the WP2A.4 backfill is applied to production.** The email says
their trial is running. If it is sent first, they click through and hit the
paywall again, which is worse than not writing at all.

**Recipients: 9 accounts, not 5.** See the note at the bottom.

**From:** hello@drawintheair.com (send through MailerLite, which is the verified
sender; the Cloudflare address is forward-only and cannot send)
**Reply-to:** an address Justin actually reads. The email asks for a reply, so
it must land somewhere.

---

**Subject:** Your Draw in the Air trial never started. That was our fault.

Hi {{first_name}},

You signed up to Draw in the Air back in {{signup_month}}, and you should have
had a free trial from that day. You did not. A fault on our side meant the
trial was never created on your account, so you would have hit a payment screen
where the activities should have been.

Nobody told us. We found it ourselves last week while going through the
accounts one by one, and yours was one of nine.

It is fixed, and your trial is now running from today. Nothing to claim and
nothing to enter. Sign in with the same Google account and the activities are
open.

drawintheair.com

If you have a few minutes, it is worth doing this on a laptop rather than a
phone, because the camera needs to see your child's hand and arm. Stand them
about an arm and a half back from the screen. They wave to start, then pinch
their finger and thumb together to draw. Most children work it out faster than
the adult watching them does.

One ask. When your child has had a go, hit reply and tell me what happened.
Whether they took to it, where they got stuck, whether it held their attention
past the first minute. Bad news is more useful to me than good news. I am
building this and I read every reply myself.

Sorry it took this long.

Justin
Draw in the Air

---

## Why 9 recipients and not 5

The rehearsal reported that 5 of the 9 affected accounts had reached Stripe
checkout. That was checked again against production before drafting this and it
does not hold up:

- `billing_events` contains **zero rows** for all 9 account ids. None of them
  reached a completed Stripe interaction.
- The only checkout-shaped event in the product is `parent_checkout_started`:
  18 events across **3 distinct devices**, spanning 28 May to 28 July, and its
  `meta` carries no `parent_id`. There is no way to attribute those events to
  any of the 9, and 3 devices is not 5 people.

So the "5" cannot be identified and probably never existed as a distinct group.
All 9 lost their trial to the same fault and all 9 should hear about it.

The 9, by signup date: 25 Jun (x2), 26 Jun (x2), 30 Jun, 1 Jul, 19 Jul, 27 Jul,
28 Jul. All Google sign-ins. All have a parent profile. None has a subscription
row. Eight are consumer mail domains, one is a company domain
(`manoeuvre.co.id`), which may be a business or press signup rather than a
parent, so that one is worth a glance before sending.

Account ids are in the WP2A.4 evidence. Email addresses are deliberately not
written into any file here.

## Sequencing

1. Apply `20260914000004_parent_trial_anchor.sql` to production on Justin's
   written go. Expected: 9 candidates to 0, and the teacher control account
   gets no subscription.
2. Verify the 9 now hold a trial with an end date 7 days out.
3. Only then send.
