
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { requireAuth, getTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

async function SchoolSettings() {
  const session = await requireAuth();
  if (!session) {
    redirect('/auth/login');
  }

  const teacher = await getTeacher();
  if (!teacher || !teacher.school_id) {
    redirect('/');
  }

  const supabase = createClient();

  // Fetch school details
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', teacher.school_id)
    .single();

  const schoolName = school?.name || '';
  const adminEmail = school?.admin_teacher_id ? teacher.email : '';
  const subscriptionTier = school?.subscription_tier || 'free';
  const academicYearEnd = school?.settings?.academic_year_end || '';

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">School Settings</h1>
        <p className="text-slate-600 mt-1">Configure your school preferences and account</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">School Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                School Name
              </label>
              <Input
                type="text"
                defaultValue={schoolName}
                placeholder="Your School Name"
                className="w-full"
              />
              <p className="text-xs text-slate-600 mt-1">
                This name appears in teacher invitations and school reports
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Admin Email
              </label>
              <Input
                type="email"
                value={adminEmail}
                disabled
                className="w-full opacity-50"
              />
              <p className="text-xs text-slate-600 mt-1">
                Read-only. This is the account that created the school.
              </p>
            </div>

            <Button variant="secondary" className="w-full">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Scoreboard Mode
              </label>
              <select className="w-full px-4 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 focus:border-orange-500 focus:outline-none">
                <option value="individual">Individual Scores</option>
                <option value="team">Team Scores</option>
                <option value="hidden">Hidden (Teacher Only)</option>
              </select>
              <p className="text-xs text-slate-600 mt-1">
                Default setting for new sessions created by teachers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Timer Duration
              </label>
              <select className="w-full px-4 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 focus:border-orange-500 focus:outline-none">
                <option value="30">30 seconds</option>
                <option value="45">45 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
              </select>
              <p className="text-xs text-slate-600 mt-1">
                Default gesture recognition time per round
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Academic Year End Date
              </label>
              <Input
                type="date"
                defaultValue={academicYearEnd}
                className="w-full"
              />
              <p className="text-xs text-slate-600 mt-1">
                Used for reports and license term calculations
              </p>
            </div>

            <Button variant="secondary" className="w-full">
              Save Preferences
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100/50">
              <div>
                <p className="font-medium text-slate-900 text-sm">Subscription Tier</p>
                <p className="text-xs text-slate-600 mt-1">
                  {subscriptionTier === 'pro' ? 'Pro School License' : 'Free Plan'}
                </p>
              </div>
              <span className="text-sm font-semibold text-orange-500 uppercase">
                {subscriptionTier === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100/50">
              <div>
                <p className="font-medium text-slate-900 text-sm">Account Status</p>
                <p className="text-xs text-slate-600 mt-1">Active and in good standing</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                Active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50">
        <CardHeader className="border-b border-red-900/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <CardTitle className="text-lg text-red-300">Danger Zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <button className="w-full px-4 py-3 rounded-lg border border-red-700/50 hover:bg-red-950/20 text-red-300 font-medium transition text-sm">
              Transfer Admin Account
            </button>
            <button className="w-full px-4 py-3 rounded-lg border border-red-700/50 hover:bg-red-950/20 text-red-300 font-medium transition text-sm">
              Delete School Account
            </button>
            <p className="text-xs text-slate-400 mt-3">
              Destructive actions. Transfer admin before deleting to ensure another admin
              has access. Deletion is permanent and cannot be undone.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SchoolSettings;
