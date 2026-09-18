'use client';

import { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
  Calendar,
} from 'lucide-react';

interface AuditItem {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetClinicId: string | null;
  targetClinicName: string | null;
  meta: Record<string, unknown>;
  at: Date;
}

interface PlatformAuditClientProps {
  logs: AuditItem[];
}

export function PlatformAuditClient({ logs }: PlatformAuditClientProps) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchActor = log.actorEmail?.toLowerCase().includes(q) || log.actorId?.includes(q);
      const matchClinic = log.targetClinicName?.toLowerCase().includes(q) || log.targetClinicId?.includes(q);
      if (!matchAction && !matchActor && !matchClinic) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Target Clinic', 'IP', 'Meta'];
    const rows = filteredLogs.map((log) => [
      log.id,
      new Date(log.at).toISOString(),
      log.actorEmail || log.actorId || 'system',
      log.action,
      log.targetClinicName || log.targetClinicId || 'platform',
      (log.meta['ip'] as string) || '',
      JSON.stringify(log.meta).replace(/"/g, '""'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `platform-audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Platform Audit Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable log of all platform-level operations, clinic state changes, and support mode sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700/60 cursor-pointer shadow-sm"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 rounded-xl p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All Events', value: 'all' },
            { label: 'Clinic Created', value: 'clinic.created' },
            { label: 'Invite Created', value: 'invite.created' },
            { label: 'Invite Accepted', value: 'invite.accepted' },
            { label: 'Support Entered', value: 'support.entered' },
            { label: 'Support Exited', value: 'support.exited' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActionFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                actionFilter === tab.value
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, or clinic..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="w-8 px-4 py-3.5"></th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Actor</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Target Clinic</th>
                <th className="px-4 py-3.5">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <tr key={log.id} className="group">
                    <td colSpan={6} className="p-0">
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="flex items-center px-4 py-3.5 hover:bg-slate-800/30 transition cursor-pointer"
                      >
                        <div className="w-8 text-slate-500">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>

                        <div className="w-44 text-slate-400 font-mono text-[11px]">
                          {new Date(log.at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>

                        <div className="w-56 truncate text-slate-300 font-medium">
                          {log.actorEmail || (log.actorId ? `ID: ${log.actorId.slice(0, 8)}...` : 'system')}
                        </div>

                        <div className="w-48">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider ${
                              log.action.startsWith('support.')
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : log.action.startsWith('clinic.')
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </div>

                        <div className="flex-1 truncate text-slate-300 font-mono text-[11px]">
                          {log.targetClinicName || (log.targetClinicId ? `Clinic: ${log.targetClinicId.slice(0, 8)}...` : 'Platform global')}
                        </div>

                        <div className="w-32 text-right text-slate-500 font-mono text-[11px]">
                          {(log.meta['ip'] as string) || '—'}
                        </div>
                      </div>

                      {/* Expandable JSON Metadata */}
                      {isExpanded && (
                        <div className="px-12 py-3 bg-slate-950 border-t border-b border-slate-800/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                            Event Payload & Metadata (JSON)
                          </span>
                          <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No platform audit records matched your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
