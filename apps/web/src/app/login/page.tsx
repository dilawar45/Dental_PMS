'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Heart,
  Calendar,
  Shield,
  PhoneCall,
  Smile,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (cleanEmail.length > 35) {
      setErrorMsg('Email address cannot exceed 35 characters.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password.length > 32) {
      setErrorMsg('Password cannot exceed 32 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const isSuperAdmin =
          data.user.user_metadata?.role === 'super_admin' ||
          data.user.email === 'superadmin@dentalpms.platform';

        const target =
          redirectTo === '/dashboard' && isSuperAdmin
            ? '/platform/dashboard'
            : redirectTo;

        router.refresh();
        router.push(target);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50/50 p-4 sm:p-6 md:p-8 font-sans">
      {/* Background Decorative Circles */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-200/25 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-xl shadow-sky-900/5 border border-sky-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Friendly Dental Clinic Hero */}
        <div className="md:w-1/2 bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Graphic Curves */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-sky-400/30 blur-xl pointer-events-none" />

          {/* Clinic Brand */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-medium mb-6">
              <span className="text-base">🦷</span>
              <span>Bright Smile Dental Clinic</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
              Caring for Healthy, Confident Smiles.
            </h1>
            <p className="text-sky-100 text-sm mt-2 leading-relaxed">
              Welcome to the clinic management and patient care portal. Access your daily schedule, patient charts, and dental records.
            </p>
          </div>

          {/* Simple Clinic Features */}
          <div className="relative z-10 my-8 space-y-3.5">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <Smile className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">Patient-Centered Care</div>
                <div className="text-sky-100 text-[11px]">Comprehensive dental charts and treatment history</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">Daily Appointments</div>
                <div className="text-sky-100 text-[11px]">Organized clinic scheduling and patient flow</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white">Confidential & Secure</div>
                <div className="text-sky-100 text-[11px]">Protected healthcare data and clinical records</div>
              </div>
            </div>
          </div>

          {/* Bottom Friendly Note */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-sky-100">
            <span>Clinical Staff Portal</span>
            <span className="flex items-center gap-1 font-medium">
              <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300" /> Bright Smile Team
            </span>
          </div>
        </div>

        {/* Right Side: Clean Light Login Form */}
        <div className="md:w-1/2 p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            {/* Form Header */}
            <div className="mb-6">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-3 shadow-xs">
                <span className="text-xl">🦷</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                Staff Sign In
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your registered clinic email and password to access the portal.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={35}
                    value={email}
                    onChange={(e) => setEmail(e.target.value.slice(0, 35))}
                    placeholder=""
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    maxLength={32}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 32))}
                    placeholder=""
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 py-2.5 px-4 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to Clinic'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {/* Simple Contact / Help Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
              <span>Need help logging in? Contact your clinic administrator.</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-sky-50/50 text-sm text-slate-500">
          Loading portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
