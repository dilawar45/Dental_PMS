import { History, Shield, User, Clock, ChevronRight } from 'lucide-react';

export interface PatientAuditItem {
  id: string;
  action: string;
  entity: string;
  actorName: string | null;
  at: string;
  meta: Record<string, unknown> | null;
}

interface AuditTabProps {
  auditLogs: PatientAuditItem[];
}

export function AuditTab({ auditLogs }: AuditTabProps) {
  if (auditLogs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
          <History className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No audit history recorded yet
        </p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Audit entries will be automatically captured when modifications occur on this profile.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Immutable Patient Audit Trail
        </h3>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {auditLogs.map((log) => (
          <div key={log.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="flex items-center gap-2">
                <ActionBadge action={log.action} />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {formatActionTitle(log.action)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                  <User className="h-3 w-3 text-slate-400" />
                  {log.actorName || 'System'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(log.at).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            {/* Meta JSON Viewer */}
            {log.meta && Object.keys(log.meta).length > 0 && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-[11px] font-mono border border-slate-200 dark:border-slate-800 overflow-x-auto text-slate-700 dark:text-slate-300">
                <pre className="whitespace-pre-wrap">{JSON.stringify(log.meta, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  if (action.includes('create') || action.includes('grant') || action.includes('restore')) {
    return (
      <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-mono font-semibold">
        {action}
      </span>
    );
  }
  if (action.includes('archive') || action.includes('revoke') || action.includes('delete')) {
    return (
      <span className="rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 text-[10px] font-mono font-semibold">
        {action}
      </span>
    );
  }
  return (
    <span className="rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 text-[10px] font-mono font-semibold">
      {action}
    </span>
  );
}

function formatActionTitle(action: string): string {
  switch (action) {
    case 'patient.create':
      return 'Patient profile created';
    case 'patient.update':
      return 'Patient demographic details updated';
    case 'patient.archive':
      return 'Patient profile archived (soft-deleted)';
    case 'patient.restore':
      return 'Patient profile restored';
    case 'consent.grant':
      return 'Compliance consent granted';
    case 'consent.revoke':
      return 'Compliance consent revoked';
    case 'file.upload':
      return 'Patient media asset uploaded';
    case 'file.delete':
      return 'Patient media asset deleted';
    default:
      return action;
  }
}
