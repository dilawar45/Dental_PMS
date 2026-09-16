'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AuditLogItem } from './data';
import { exportAuditLogsCsvAction } from './actions';
import {
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Loader2,
  FileSpreadsheet,
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

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60';
    if (action.includes('void') || action.includes('delete') || action.includes('archive')) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60';
    if (action.includes('update') || action.includes('pdf')) return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Count & CSV Export Button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Showing {logs.length} of {totalCount} total audit records
        </span>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isExporting || totalCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition shadow-sm disabled:opacity-50"
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

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No audit logs found
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No activities match your current filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Timestamp</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Actor</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Action</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Entity</th>
                  <th scope="col" className="px-5 py-3.5 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {logs.map((log) => {
                  const isExpanded = expandedRows[log.id];

                  return (
                    <tr key={log.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td colSpan={5} className="p-0">
                        <div
                          className="flex items-center px-5 py-3.5 cursor-pointer"
                          onClick={() => toggleRow(log.id)}
                        >
                          {/* Timestamp */}
                          <div className="w-48 flex-shrink-0 text-xs text-slate-600 dark:text-slate-400 font-mono">
                            {new Date(log.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>

                          {/* Actor */}
                          <div className="w-44 flex-shrink-0 pr-2">
                            <div className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                              {log.actorName}
                            </div>
                            <span className="capitalize text-[10px] text-slate-400">
                              {log.actorRole}
                            </span>
                          </div>

                          {/* Action */}
                          <div className="w-48 flex-shrink-0 pr-2">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(
                                log.action
                              )}`}
                            >
                              {log.action}
                            </span>
                          </div>

                          {/* Entity & ID */}
                          <div className="flex-1 min-w-[150px] pr-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              {log.entity}
                            </span>
                            {log.entityId && (
                              <span className="ml-2 font-mono text-[11px] text-slate-400 truncate">
                                #{log.entityId.slice(0, 8)}
                              </span>
                            )}
                          </div>

                          {/* Expand Toggle */}
                          <div className="w-20 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(log.id);
                              }}
                              className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                              title={isExpanded ? 'Collapse JSON' : 'Expand JSON'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Metadata Drawer */}
                        {isExpanded && (
                          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-b border-slate-100 dark:border-slate-800 text-xs">
                            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                              <span>Metadata Payload:</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                Log ID: {log.id}
                              </span>
                            </div>
                            {log.meta ? (
                              <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 dark:bg-black/60 dark:text-emerald-300 font-mono text-[11px] overflow-x-auto">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-slate-400 italic">No additional metadata payload.</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div>
              Showing <span className="font-medium text-slate-700 dark:text-slate-300">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-medium text-slate-700 dark:text-slate-300">{totalCount}</span> entries
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
