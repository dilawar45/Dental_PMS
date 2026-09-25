import { requireUser } from '@/lib/auth/current-user';
import { ForbiddenPage } from '@/components/forbidden';
import { getAuditLogs, type AuditSearchParams } from './data';
import { AuditFilters } from './audit-filters';
import { AuditTable } from './audit-table';
import { ShieldCheck, Lock } from 'lucide-react';

interface AuditPageProps {
  searchParams: Promise<AuditSearchParams>;
}

export default async function AuditLogPage({ searchParams }: AuditPageProps) {
  const { user, clinicId } = await requireUser();

  // Role guard: Strictly Owner only
  if (user.role !== 'owner') {
    return <ForbiddenPage role={user.role} requiredRole="owner" />;
  }

  const resolvedParams = await searchParams;
  const data = await getAuditLogs(clinicId, resolvedParams);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Audit Log Viewer
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Lock className="w-3 h-3" />
                Owner Only
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Complete, tamper-evident chronological record of all clinical, administrative, and billing transactions.
            </p>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <AuditFilters staffUsers={data.staffUsers} />

      {/* Interactive Audit Table */}
      <AuditTable
        logs={data.logs}
        totalCount={data.totalCount}
        currentPage={data.currentPage}
        pageSize={data.pageSize}
      />
    </div>
  );
}
