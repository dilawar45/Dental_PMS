'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInviteAction } from './actions';
import { Building2, Lock, User, AlertCircle, Sparkles } from 'lucide-react';

interface InviteFormClientProps {
  token: string;
  clinicName: string;
  email: string;
  role: string;
}

export function InviteFormClient({
  token,
  clinicName,
  email,
  role,
}: InviteFormClientProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await acceptInviteAction({
        token,
        fullName,
        password,
      });

      if (!res.success) {
        setError(res.error || 'Failed to accept invitation.');
      } else {
        // Redirect to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome to {clinicName}
          </h1>
          <p className="text-xs text-slate-400">
            Complete your onboarding as <span className="text-indigo-400 font-semibold uppercase">{role}</span> to activate your clinic workspace.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Registered Email</label>
            <input
              type="email"
              readOnly
              disabled
              value={email}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-mono select-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="Dr. Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Set Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer mt-2"
          >
            {isSubmitting ? 'Activating Workspace...' : 'Activate Clinic & Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
