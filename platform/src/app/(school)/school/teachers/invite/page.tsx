'use client';

import { useState } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Mail, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function InviteTeacher() {
  const [email, setEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [useBulk, setUseBulk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [seatsRemaining, setSeatsRemaining] = useState(5);

  const handleSingleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/school/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      setEmail('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = bulkEmails
      .split('\n')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    if (emails.length > seatsRemaining) {
      setError(`Only ${seatsRemaining} seats available`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/school/invite-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitations');
      }

      setBulkEmails('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Invite Teachers</h1>
        <p className="text-slate-400 mt-1">Add new teachers to your school</p>
      </div>

      {/* Seats Status */}
      <Card className="border-l-2 border-l-cyan-400">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Seats Available</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {seatsRemaining}
              </p>
            </div>
            <Badge variant="success">{seatsRemaining} / 10 open</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-600 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-emerald-200">Invitation sent!</p>
            <p className="text-sm text-emerald-300 mt-0.5">
              Teachers will receive an email with setup instructions.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-600 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-200">Error</p>
            <p className="text-sm text-red-300 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Toggle Tabs */}
      <div className="flex gap-2 bg-slate-800/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setUseBulk(false)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            !useBulk
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Single Invite
        </button>
        <button
          onClick={() => setUseBulk(true)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            useBulk
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Bulk Invite
        </button>
      </div>

      {/* Single Invite Form */}
      {!useBulk && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite a Single Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSingleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="teacher@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk Invite Form */}
      {useBulk && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Invite Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Addresses (one per line)
                </label>
                <textarea
                  placeholder={`teacher1@school.edu\nteacher2@school.edu\nteacher3@school.edu`}
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none"
                  rows={8}
                />
                <p className="text-xs text-slate-400 mt-2">
                  You can invite up to {seatsRemaining} teachers
                </p>
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !bulkEmails.trim()}
              >
                {loading ? 'Sending...' : 'Send Invitations'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-slate-800/30">
        <CardContent className="pt-6">
          <h4 className="font-medium text-slate-100 text-sm mb-3">
            What happens next?
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-3">
              <Mail className="w-4 h-4 flex-shrink-0 text-violet-400 mt-0.5" />
              <span>Invited teachers receive an email with a setup link</span>
            </li>
            <li className="flex gap-3">
              <Mail className="w-4 h-4 flex-shrink-0 text-violet-400 mt-0.5" />
              <span>They create an account and join your school automatically</span>
            </li>
            <li className="flex gap-3">
              <Mail className="w-4 h-4 flex-shrink-0 text-violet-400 mt-0.5" />
              <span>Invitation expires after 30 days if not accepted</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Link href="/school/teachers">
        <Button variant="ghost" className="w-full">
          Back to Teachers
        </Button>
      </Link>
    </div>
  );
}
