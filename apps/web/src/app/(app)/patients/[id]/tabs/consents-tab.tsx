'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Consent } from '@dental-pms/types';
import { revokeConsentAction, grantConsentAction } from '../actions';
import { CONSENT_DEFINITIONS } from '@/lib/constants/consents';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Globe,
  PlusCircle,
} from 'lucide-react';

interface ConsentsTabProps {
  patientId: string;
  consents: Consent[];
}

export function ConsentsTab({ patientId, consents }: ConsentsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group active consents by type
  const activeConsentsMap = new Map<string, Consent>();
  for (const c of consents) {
    if (!c.revokedAt) {
      activeConsentsMap.set(c.type, c);
    }
  }

  const handleRevoke = (consentId: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await revokeConsentAction(consentId, patientId);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }
      router.refresh();
    });
  };

  const handleGrant = (type: 'data_processing' | 'reminders' | 'marketing') => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await grantConsentAction(patientId, type);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }
      router.refresh();
    });
  };

  const categories: Array<'data_processing' | 'reminders' | 'marketing'> = [
    'data_processing',
    'reminders',
    'marketing',
  ];

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const def = CONSENT_DEFINITIONS[cat];
          const activeConsent = activeConsentsMap.get(cat);
          const isGranted = Boolean(activeConsent);

          return (
            <div
              key={cat}
              className={`rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                isGranted
                  ? 'border-emerald-200 bg-white dark:bg-slate-900 dark:border-emerald-900/40'
                  : 'border-slate-200 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isGranted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    {isGranted ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Not Granted / Revoked
                      </>
                    )}
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">
                    v{def.version}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {def.title}
                  </h4>
                  <p dir="rtl" className="text-xs text-slate-500 font-sans mt-0.5">
                    {def.urduTitle}
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {def.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {isGranted && activeConsent ? (
                  <>
                    <span className="text-[10px] text-slate-400">
                      Granted on{' '}
                      {new Date(activeConsent.grantedAt).toLocaleDateString('en-PK', {
                        dateStyle: 'short',
                      })}
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRevoke(activeConsent.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition"
                    >
                      Revoke
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400">Consent required</span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleGrant(cat)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Grant
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Audit Log of Consents Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Full Consent History & IP Snapshots
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Granted At</th>
                <th className="px-6 py-3 font-semibold">Revoked At</th>
                <th className="px-6 py-3 font-semibold">Recorded IP</th>
                <th className="px-6 py-3 font-semibold">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {consents.map((c) => {
                const isRevoked = Boolean(c.revokedAt);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100 capitalize">
                      {c.type.replace('_', ' ')}
                    </td>

                    <td className="px-6 py-3">
                      {isRevoked ? (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Revoked
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(c.grantedAt).toLocaleString('en-PK', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>

                    <td className="px-6 py-3 text-slate-500">
                      {c.revokedAt
                        ? new Date(c.revokedAt).toLocaleString('en-PK', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>

                    <td className="px-6 py-3 font-mono text-slate-500">
                      {c.ip || '127.0.0.1'}
                    </td>

                    <td className="px-6 py-3 font-mono text-slate-500">
                      v{c.version}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
