import { requireUser } from '@/lib/auth/current-user';
import { ForbiddenPage } from '@/components/forbidden';
import { getAuditLogs, type AuditSearchParams } from './data';
import { AuditFilters } from './audit-filters';
import { AuditTable } from './audit-table';
import { ShieldAlert } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Audit Log Viewer
          </h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Owner Only
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete, tamper-evident chronological record of all clinical, administrative, and billing transactions.
        </p>
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
