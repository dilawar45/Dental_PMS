'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { completeFirstLoginPasswordChangeAction } from '@/app/(app)/settings/users/actions';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, KeyRound } from 'lucide-react';

interface ForcePasswordChangeModalProps {
  mustChange: boolean;
  userName: string;
  userEmail: string;
}

export function ForcePasswordChangeModal({
  mustChange,
  userName,
  userEmail,
}: ForcePasswordChangeModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(mustChange);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8 || password.length > 12) {
      setErrorMsg('Password must be between 8 and 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    startTransition(async () => {
      const res = await completeFirstLoginPasswordChangeAction(password);
      if (res.success) {
        try {
          // Re-authenticate client to establish a fresh session cookie with the new password
          const supabase = createClient();
          await supabase.auth.signInWithPassword({
            email: userEmail,
            password,
          });
        } catch {
          // Fallback if re-auth throws
        }
        setIsOpen(false);
        window.location.href = '/dashboard';
      } else {
        setErrorMsg(res.error || 'Failed to update password. Please try again.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-sky-200 dark:border-slate-800 shadow-2xl p-7 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
              Set Your Private Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Welcome, {userName}! For your privacy and security, please create your personal password.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 animate-in fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Private Password *
              </label>
              <span className="text-[10px] text-slate-400 font-medium">8–12 characters</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Your password is completely private. No one else has access to it.</span>
          </div>

          <button
            type="submit"
            disabled={isPending || !password || !confirmPassword}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-sky-600/20 disabled:opacity-50 transition cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Password...</span>
              </>
            ) : (
              <span>Set Password & Enter Portal</span>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer"
            >
              Sign out & return to login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
