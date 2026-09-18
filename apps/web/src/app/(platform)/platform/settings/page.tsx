import { getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { users } from '@dental-pms/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ShieldCheck, Database, Lock, Server, Cpu } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlatformSettingsPage() {
  const context = await getCurrentUser();
  const actorId = context?.realUser?.id || context?.user.id;

  const superAdmins = await withPlatformAdmin(
    db,
    async (tx) => {
      const rows = await tx
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          active: users.active,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.role, 'super_admin'))
        .orderBy(desc(users.createdAt));

      return rows;
    },
    { actorId }
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Global multi-tenant configuration, security parameters, and platform administrators.
        </p>
      </div>

      {/* Security & Isolation Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Security Isolation Boundary</h3>
              <span className="text-[11px] text-slate-400 font-mono">PostgreSQL Row-Level Security</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-tenant tenant isolation is strictly enforced at the database level using session variables (<code className="text-indigo-300">app.clinic_id</code>) and <code className="text-indigo-300">SECURITY DEFINER</code> functions (<code className="text-indigo-300">is_super_admin()</code>).
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            <span>RLS Active & Verified</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Support Mode Protocol</h3>
              <span className="text-[11px] text-slate-400 font-mono">HMAC-SHA256 • 60-min TTL</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Support mode generates time-limited, cryptographically signed tokens. Re-verified on every server request. Destructive actions blocked during active sessions.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            <span>Server Verification Enforced</span>
          </div>
        </div>
      </div>

      {/* Super-Admins Section */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm space-y-4">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-sm">Platform Super-Administrators</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Users with unrestricted platform management privileges.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            {superAdmins.length} Super-Admins
          </span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {superAdmins.map((admin) => (
            <div key={admin.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{admin.fullName || 'Platform Admin'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-600 text-white">
                    Super-Admin
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{admin.email}</span>
              </div>

              <div className="text-right text-slate-400 font-mono text-[11px]">
                Joined: {new Date(admin.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
