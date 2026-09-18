import { getCurrentUser } from '@/lib/auth/current-user';
import { PlatformShell } from '@/components/platform/platform-shell';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getCurrentUser();

  if (!context) {
    redirect('/login?redirectTo=/platform/dashboard');
  }

  // Enforce Super-Admin Only Check -> Return 403 for regular staff/owners
  const isPlatformAdmin =
    context.user.role === 'super_admin' || context.realUser?.role === 'super_admin';

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mb-5 border border-red-500/20">
            <ShieldX className="h-8 w-8" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-red-400 bg-red-950/60 px-2.5 py-1 rounded-full border border-red-800/40">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-bold mt-3 mb-2 text-white">Access Denied</h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            You do not have platform super-administrator privileges to access the multi-tenant platform console.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-600/20"
          >
            Return to Clinic Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <PlatformShell user={context.realUser || context.user}>{children}</PlatformShell>;
}
