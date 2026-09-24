import { getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { clinics, users, platformAuditLog } from '@dental-pms/db/schema';
import { sql, desc } from 'drizzle-orm';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users as UsersIcon,
  ShieldAlert,
  ArrowRight,
  Plus,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlatformDashboardPage() {
  const context = await getCurrentUser();
  const actorId = context?.realUser?.id || context?.user.id;

  const data = await withPlatformAdmin(
    db,
    async (tx) => {
      // 1. Fetch clinic counts by status
      const allClinics = await tx
        .select({
          id: clinics.id,
          name: clinics.name,
          slug: clinics.slug,
          status: clinics.status,
          createdAt: clinics.createdAt,
        })
        .from(clinics)
        .orderBy(desc(clinics.createdAt));

      // 2. Fetch total users
      const [userCountRes] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(users);

      // 3. Fetch recent platform audit logs (last 10)
      const recentAudit = await tx
        .select({
          id: platformAuditLog.id,
          action: platformAuditLog.action,
          targetClinicId: platformAuditLog.targetClinicId,
          meta: platformAuditLog.meta,
          at: platformAuditLog.at,
        })
        .from(platformAuditLog)
        .orderBy(desc(platformAuditLog.at))
        .limit(10);

      return {
        clinics: allClinics,
        totalUsers: userCountRes?.count ?? 0,
        recentAudit,
      };
    },
    { actorId }
  );

  const totalClinics = data.clinics.length;
  const activeClinics = data.clinics.filter((c) => c.status === 'active').length;
  const pendingClinics = data.clinics.filter((c) => c.status === 'pending').length;
  const suspendedClinics = data.clinics.filter((c) => c.status === 'suspended').length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Platform Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global multi-tenant metrics, clinic statuses, and platform-wide audit trail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/platform/clinics/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Clinic</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Clinics
            </span>
            <Building2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {totalClinics}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Provisioned tenants</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Active
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
            {activeClinics}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Fully operational</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Pending
            </span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
            {pendingClinics}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting invite acceptance</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Suspended
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-2">
            {suspendedClinics}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Locked by super-admin</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Total Users
            </span>
            <UsersIcon className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {data.totalUsers}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Cross-tenant accounts</span>
        </div>
      </div>

      {/* Main Grid: Recent Clinics & Recent Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Clinics (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <h2 className="font-bold text-base text-white">Recent Clinics</h2>
            </div>
            <Link
              href="/platform/clinics"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {data.clinics.slice(0, 5).map((clinic) => (
              <div
                key={clinic.id}
                className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-800/30 transition"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-white text-sm">{clinic.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        clinic.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : clinic.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : clinic.status === 'suspended'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {clinic.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    slug: /{clinic.slug} • ID: {clinic.id.slice(0, 8)}...
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/platform/clinics/${clinic.id}`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700/60"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}

            {data.clinics.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                No clinics provisioned yet. Click &quot;Create New Clinic&quot; to start.
              </div>
            )}
          </div>
        </div>

        {/* Recent Platform Audit Feed (1 Col) */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-violet-400" />
              <h2 className="font-bold text-base text-white">Platform Audit Feed</h2>
            </div>
            <Link
              href="/platform/audit"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
            >
              <span>Full Log</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-4 divide-y divide-slate-800/60 overflow-y-auto max-h-[420px]">
            {data.recentAudit.map((log) => (
              <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-indigo-300 font-mono">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate font-mono">
                  {log.targetClinicId ? `Clinic: ${log.targetClinicId.slice(0, 8)}...` : 'Platform global'}
                  {(log.meta as Record<string, unknown>)?.['ip'] ? ` • IP: ${(log.meta as Record<string, unknown>)['ip']}` : ''}
                </div>
              </div>
            ))}

            {data.recentAudit.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No platform audit events logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
