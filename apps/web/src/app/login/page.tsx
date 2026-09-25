'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  Bot,
  Layers,
  ArrowRight,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const [showQuickFill, setShowQuickFill] = useState(true);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Invalid email or password');
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
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const quickFill = (userEmail: string, pass = 'DevPassword123!') => {
    setEmail(userEmail);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 font-sans">
      {/* Left Branding / Hero Side (Hidden on small screens, prominent on lg) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border-r border-slate-800/80">
        {/* Background glow & dental motifs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30">
            <span className="text-2xl">🦷</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Bright Smile Dental</h2>
            <p className="text-xs text-blue-300/80 font-medium">Practice Management & AI Suite</p>
          </div>
        </div>

        {/* Center Content & Feature Highlights */}
        <div className="relative z-10 my-auto max-w-lg space-y-8 py-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-400/20 text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Next-Gen Dental Management</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Streamline your practice with intelligent automation.
            </h1>
            <p className="text-sm text-slate-300/80 leading-relaxed">
              From interactive 3D dental charting to 24/7 AI-powered patient scheduling, manage your entire clinic with precision and ease.
            </p>
          </div>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Interactive Charting</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Adult & pediatric odontogram with instant treatment planning.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">24/7 AI Receptionist</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated multi-channel booking via WhatsApp & Voice.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Smart Scheduling</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Real-time availability, conflict prevention, and queue triage.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">HIPAA & Audit Trail</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Immutable audit logs and enterprise data protection.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Secure Multi-Tenant Healthcare Cloud</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">v2.4.0-prod</span>
        </div>
      </div>

      {/* Right Login Card Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header Logo (Visible only on small screens) */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl text-white shadow-lg shadow-blue-500/25 border border-blue-400/30">
              🦷
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Bright Smile Dental
            </h1>
            <p className="text-xs text-slate-400">
              Sign in to access your clinic management portal
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-7 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-6 space-y-1.5">
              <h2 className="text-xl font-bold text-white tracking-tight">Staff Portal Login</h2>
              <p className="text-xs text-slate-400">Enter your credentials to securely access clinic data.</p>
            </div>

            {errorMsg && (
              <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@brightsmile.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition"
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
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Clinic'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Quick Demo Accounts Switcher */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowQuickFill(!showQuickFill)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition mb-3"
              >
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>Demo Roles (1-Click Fill)</span>
                </span>
                {showQuickFill ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showQuickFill && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => quickFill('owner@brightsmile.com')}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-purple-500/50 hover:bg-purple-950/20 text-left transition group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white group-hover:text-purple-300">Dr. Tariq</span>
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">Owner</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">owner@brightsmile.com</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => quickFill('dentist@brightsmile.com')}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-blue-500/50 hover:bg-blue-950/20 text-left transition group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white group-hover:text-blue-300">Dr. Ayesha</span>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Dentist</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">dentist@brightsmile.com</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => quickFill('receptionist@brightsmile.com')}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-emerald-950/20 text-left transition group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white group-hover:text-emerald-300">Sana Ali</span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Reception</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">receptionist@brightsmile.com</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => quickFill('assistant@brightsmile.com')}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-amber-500/50 hover:bg-amber-950/20 text-left transition group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white group-hover:text-amber-300">Bilal Ahmed</span>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Assistant</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">assistant@brightsmile.com</span>
                    </button>
                  </div>

                  {/* Super-Admin Access Button */}
                  <button
                    type="button"
                    onClick={() => quickFill('superadmin@dentalpms.platform', 'SuperAdminDev123!')}
                    className="w-full p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-900/40 text-left transition flex items-center justify-between group cursor-pointer mt-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">⚡</span>
                        <span className="font-bold text-xs text-indigo-300 group-hover:text-indigo-200">
                          Platform Super-Admin
                        </span>
                      </div>
                      <span className="text-slate-400 text-[10px] font-mono block mt-0.5">
                        superadmin@dentalpms.platform
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider group-hover:bg-indigo-500 transition">
                      Auto-Fill
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-500">
            Protected by multi-tenant cryptographic row-level security & HIPAA data standards.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
          Loading portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
