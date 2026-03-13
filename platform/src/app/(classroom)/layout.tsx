'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ClassroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Placeholder state - these would come from context/props in real implementation
  const [sessionCode] = useState('ABC123');
  const [activityName] = useState('Shape Recognition');
  const [studentCount] = useState(24);
  const [timeElapsed] = useState('12:45');

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="px-6 py-4">
          {/* Top Row: Logo + Quick Stats */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600" />
              <span className="text-sm font-bold text-slate-900">Draw in the Air</span>
            </Link>

            <div className="flex items-center gap-6">
              {/* Student Count */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-slate-900">
                  {studentCount} students
                </span>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Time:</span>
                <span className="text-sm font-mono font-semibold text-cyan-400">
                  {timeElapsed}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Session Code + Activity */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1">Session Code</p>
              <p className="text-2xl font-bold font-mono text-cyan-400">
                {sessionCode}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-600 mb-1">Current Activity</p>
              <p className="text-lg font-semibold text-slate-900">
                {activityName}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
