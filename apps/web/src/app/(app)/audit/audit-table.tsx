'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AuditLogItem } from './data';
import { exportAuditLogsCsvAction } from './actions';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Loader2,
  FileSpreadsheet,
  Bot,
  User,
  Shield,
  Activity,
} from 'lucide-react';

interface AuditTableProps {
  logs: AuditLogItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export function AuditTable({
  logs,
  totalCount,
  currentPage,
  pageSize,
}: AuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isExporting, startExport] = useTransition();

  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleExportCsv = () => {
    startExport(async () => {
      const actorId = searchParams.get('actorId') || undefined;
      const action = searchParams.get('action') || undefined;
      const entity = searchParams.get('entity') || undefined;
      const from = searchParams.get('from') || undefined;
      const to = searchParams.get('to') || undefined;
      const q = searchParams.get('q') || undefined;

      const res = await exportAuditLogsCsvAction({
        actorId,
        action,
        entity,
        from,
        to,
        q,
      });

      if (res.success) {
        const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', res.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(res.error || 'Failed to export CSV');
      }
    });
  };

  const formatActionLabel = (action: string) => {
    return action
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getActionBadgeStyle = (action: string) => {
    if (
      action.includes('create') ||
      action.includes('grant') ||
      action.includes('approve') ||
      action.includes('restore') ||
      action.includes('register')
    ) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
      };
    }
    if (
      action.includes('void') ||
      action.includes('delete') ||
      action.includes('archive') ||
      action.includes('reject') ||
      action.includes('revoke')
    ) {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60',
        dot: 'bg-rose-500',
      };
    }
    if (action.includes('login') || action.includes('auth')) {
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/60',
        dot: 'bg-purple-500',
      };
    }
    return {
      bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/60',
      dot: 'bg-sky-500',
    };
  };

  const getActorRoleBadge = (role: string | null, name: string) => {
    if (name.toLowerCase() === 'system' || !role) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Bot className="w-3 h-3 text-slate-400" />
          System / Mobile
        </span>
      );
    }
    if (role === 'owner') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
          <Shield className="w-3 h-3" />
          Owner
        </span>
      );
    }
    if (role === 'dentist') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
          <User className="w-3 h-3" />
          Dentist
        </span>
      );
    }
    if (role === 'receptionist') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <User className="w-3 h-3" />
          Receptionist
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <User className="w-3 h-3" />
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Count & CSV Export Button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-slate-200">{logs.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-200">{totalCount}</strong> total system logs
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isExporting || totalCount === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Exporting CSV...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </>
          )}
        </button>
      </div>

      {/* Simplified 3-Column Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <ShieldCheck className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No system logs found
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No activities match your current filter parameters. Try clearing filters or changing the search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse table-auto">
              <thead className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5 min-w-[200px]">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3.5 min-w-[220px]">
                    Actor
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Action Performed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {logs.map((log) => {
                  const actionStyle = getActionBadgeStyle(log.action);
                  const dateObj = new Date(log.createdAt);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Column 1: Timestamp */}
                      <td className="px-6 py-3.5 align-middle">
                        <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {dateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                          {dateObj.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Column 2: Actor */}
                      <td className="px-6 py-3.5 align-middle">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {log.actorName}
                          </span>
                          {getActorRoleBadge(log.actorRole, log.actorName)}
                        </div>
                      </td>

                      {/* Column 3: Action Performed */}
                      <td className="px-6 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${actionStyle.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${actionStyle.dot}`} />
                            {formatActionLabel(log.action)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            <span className="text-slate-500">
              Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
