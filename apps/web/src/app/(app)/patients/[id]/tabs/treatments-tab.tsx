import { Stethoscope, DollarSign, Calendar, Hash } from 'lucide-react';
import type { Treatment } from '@dental-pms/types';

interface TreatmentsTabProps {
  treatments: Treatment[];
}

export function TreatmentsTab({ treatments }: TreatmentsTabProps) {
  if (treatments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
          <Stethoscope className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No treatment procedures recorded
        </p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Completed dental procedures, restorations, and billing codes will be listed here.
        </p>
      </div>
    );
  }

  const totalCost = treatments.reduce(
    (acc, t) => acc + (parseFloat(t.cost) || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Treatments Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Tooth FDI</th>
                <th className="px-6 py-4 font-semibold">Procedure Code</th>
                <th className="px-6 py-4 font-semibold">Clinical Notes</th>
                <th className="px-6 py-4 font-semibold text-right">Fee (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {treatments.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(t.createdAt).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {t.toothFdi ? (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-xs rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-800 dark:text-slate-200">
                        #{t.toothFdi}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">General</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-primary font-medium">
                      {t.procedureCode || 'D0120'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                    {t.notes || '—'}
                  </td>

                  <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                    ₨ {parseFloat(t.cost).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">
                  Total Treatment Value:
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-primary">
                  ₨ {totalCost.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
