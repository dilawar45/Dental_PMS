'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AuditLogItem } from './data';
import { exportAuditLogsCsvAction } from './actions';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Loader2,
  FileSpreadsheet,
  Copy,
  Check,
  Bot,
  User,
  Shield,
  Activity,
  Calendar,
  Layers,
  FileText,
  CreditCard,
  Receipt,
  HeartHandshake,
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
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

  const formatActionLabel = (action: string) => {
    // Human readable action titles
    const formatted = action
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return formatted;
  };

  const getActionBadgeStyle = (action: string) => {
    if (action.includes('create') || action.includes('grant') || action.includes('approve') || action.includes('restore') || action.includes('register')) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
      };
    }
    if (action.includes('void') || action.includes('delete') || action.includes('archive') || action.includes('reject') || action.includes('revoke')) {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60',
        dot: 'bg-rose-500',
      };
    }
    if (action.includes('update') || action.includes('status') || action.includes('batch')) {
      return {
        bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/60',
        dot: 'bg-sky-500',
      };
    }
    if (action.includes('login') || action.includes('reset')) {
      return {
        bg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/60',
        dot: 'bg-violet-500',
      };
    }
    return {
      bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400',
    };
  };

  const getActorRoleBadge = (role: string, name: string) => {
    const isSystem = !role || role.toLowerCase() === 'system' || name.toLowerCase() === 'system';
    if (isSystem) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <Bot className="w-3 h-3 text-slate-500" />
          System / AI
        </span>
      );
    }
    if (role === 'owner') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
          <Shield className="w-3 h-3 text-purple-600" />
          Owner
        </span>
      );
    }
    if (role === 'dentist') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
          <User className="w-3 h-3 text-blue-600" />
          Dentist
        </span>
      );
    }
    if (role === 'patient') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
          <User className="w-3 h-3 text-emerald-600" />
          Patient
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
        {role}
      </span>
    );
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'patient':
        return <User className="w-3.5 h-3.5 text-slate-500" />;
      case 'appointment':
      case 'booking_request':
        return <Calendar className="w-3.5 h-3.5 text-slate-500" />;
      case 'invoice':
        return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
      case 'receipt':
        return <Receipt className="w-3.5 h-3.5 text-slate-500" />;
      case 'consent':
        return <HeartHandshake className="w-3.5 h-3.5 text-slate-500" />;
      case 'charting_entry':
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Count & CSV Export Button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-slate-200">{logs.length}</strong> of <strong className="text-slate-900 dark:text-slate-200">{totalCount}</strong> total audit records
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

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <ShieldCheck className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No audit logs found
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
                  <th scope="col" className="px-5 py-3.5 min-w-[170px]">Timestamp</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[180px]">Actor</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[210px]">Action</th>
                  <th scope="col" className="px-5 py-3.5 min-w-[200px]">Entity</th>
                  <th scope="col" className="px-5 py-3.5 w-24 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {logs.map((log) => {
                  const isExpanded = expandedRows[log.id];
                  const actionStyle = getActionBadgeStyle(log.action);
                  const dateObj = new Date(log.createdAt);

                  return (
                    <tr
                      key={log.id}
                      className={`group transition-colors ${
                        isExpanded ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Column 1: Timestamp */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
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
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium text-xs text-slate-900 dark:text-slate-100">
                            {log.actorName}
                          </span>
                          {getActorRoleBadge(log.actorRole, log.actorName)}
                        </div>
                      </td>

                      {/* Column 3: Action */}
                      <td className="px-5 py-3.5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${actionStyle.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${actionStyle.dot}`} />
                          {formatActionLabel(log.action)}
                        </span>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {log.action}
                        </div>
                      </td>

                      {/* Column 4: Entity */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          {getEntityIcon(log.entity)}
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                            {log.entity.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {log.entityId && (
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              #{log.entityId.slice(0, 8)}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(log.entityId!, `entity-${log.id}`)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded"
                              title="Copy full entity ID"
                            >
                              {copiedId === `entity-${log.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Details Toggle */}
                      <td className="px-5 py-3.5 align-middle text-right">
                        <button
                          type="button"
                          onClick={() => toggleRow(log.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                            isExpanded
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                          }`}
                        >
                          <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Render Expanded Drawers Separately below if any */}
        {logs.some((log) => expandedRows[log.id]) && (
          <div className="border-t border-slate-200 dark:border-slate-800">
            {logs.map((log) => {
              if (!expandedRows[log.id]) return null;
              return (
                <div
                  key={`expanded-${log.id}`}
                  className="p-5 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 animate-in fade-in duration-150"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        Event Details & Metadata
                      </span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Log ID: {log.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(JSON.stringify(log.meta || {}, null, 2), `meta-${log.id}`)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        {copiedId === `meta-${log.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied JSON</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy Payload</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleRow(log.id)}
                        className="px-2 py-1 rounded-md text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {log.meta && Object.keys(log.meta).length > 0 ? (
                    <div className="space-y-3">
                      {/* Structured Preview Chips */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {Object.entries(log.meta).map(([key, val]) => {
                          if (typeof val === 'object' && val !== null) return null;
                          return (
                            <div
                              key={key}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs"
                            >
                              <span className="text-[11px] text-slate-400 font-medium capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                {String(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Raw JSON Code Block */}
                      <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 dark:bg-black/70 dark:text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No additional metadata attached to this log entry.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-950/30">
            <div>
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCount}</span> entries
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition shadow-2xs cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition shadow-2xs cursor-pointer"
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
