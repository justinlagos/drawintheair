
import { redirect } from 'next/navigation';
import { CreditCard, Calendar, ArrowUpRight } from 'lucide-react';
import { requireAuth, getTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

async function SchoolBilling() {
  const session = await requireAuth();
  if (!session) {
    redirect('/auth/login');
  }

  const teacher = await getTeacher();
  if (!teacher || !teacher.school_id) {
    redirect('/');
  }

  const supabase = createClient();

  // Fetch school billing info
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', teacher.school_id)
    .single();

  const subscriptionTier = school?.subscription_tier || 'free';
  const maxSeats = school?.settings?.max_seats || 10;
  const nextBillingDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toLocaleDateString();

  // Sample invoice data (would come from Stripe API)
  const invoices = [
    {
      id: 'inv-2025-001',
      date: '2025-03-01',
      amount: 29.99,
      status: 'paid',
    },
    {
      id: 'inv-2025-002',
      date: '2025-02-01',
      amount: 29.99,
      status: 'paid',
    },
    {
      id: 'inv-2025-003',
      date: '2025-01-01',
      amount: 29.99,
      status: 'paid',
    },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-slate-600 mt-1">Manage your school's subscription and billing</p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {subscriptionTier === 'pro' ? 'Pro School License' : 'Free Plan'}
                </p>
                <p className="text-slate-600 mt-2">
                  {subscriptionTier === 'pro'
                    ? 'Unlimited teachers and advanced features'
                    : 'Get started with basic features'}
                </p>
              </div>
              <Badge variant={subscriptionTier === 'pro' ? 'success' : 'secondary'}>
                {subscriptionTier === 'pro' ? 'Active' : 'Free'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-600">Seats</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{maxSeats}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Price</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {subscriptionTier === 'pro' ? '$29.99' : 'Free'} /mo
                </p>
              </div>
            </div>

            {subscriptionTier === 'free' && (
              <Button variant="primary" className="w-full">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Management */}
      {subscriptionTier === 'pro' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Access your billing portal to update payment methods, view detailed
                invoices, and manage your subscription.
              </p>
              <Button variant="secondary" className="w-full">
                Open Stripe Billing Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seat Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seat Upgrades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-700">
                  Upgrade your teacher seats
                </p>
                <span className="text-xs text-slate-600">
                  Current: {maxSeats} seats
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[15, 25, 50].map((seats) => (
                  <button
                    key={seats}
                    className="p-3 rounded-lg border border-slate-300 hover:border-orange-500 hover:bg-slate-100/50 transition"
                  >
                    <p className="font-semibold text-slate-900">{seats}</p>
                    <p className="text-xs text-slate-600 mt-1">seats</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100/30">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Next Billing Date
                  </p>
                  <p className="text-sm text-slate-600">{nextBillingDate}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100/30">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Payment Method
                  </p>
                  <p className="text-sm text-slate-600">
                    Visa ending in 4242
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-slate-600 text-sm">No invoices yet</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-100/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Invoice ID
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Date
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Amount
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-200 hover:bg-slate-100/50 transition-colors"
                    >
                      <td className="px-6 py-3 text-slate-700 font-medium">
                        {invoice.id}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="success">Paid</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <button className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card className="bg-slate-100/30">
        <CardContent className="pt-6">
          <h3 className="font-medium text-slate-900 mb-3">Have questions?</h3>
          <p className="text-sm text-slate-600">
            Contact our support team at{' '}
            <a href="mailto:support@drawintheair.com" className="text-orange-500 hover:text-orange-600">
              support@drawintheair.com
            </a>{' '}
            for billing inquiries or subscription assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SchoolBilling;
