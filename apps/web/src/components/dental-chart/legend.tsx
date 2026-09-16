'use client';

import { ToothCondition } from './chart-types';
import { CONDITION_CONFIG } from './chart-utils';

export function DentalChartLegend() {
  const conditions: ToothCondition[] = [
    'healthy',
    'caries',
    'filled',
    'crown',
    'missing',
    'implant',
    'rct',
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Clinical Conditions Legend
        </h4>
        <span className="text-[11px] text-slate-400">FDI World Dental Federation Standard</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {conditions.map((cond) => {
          const cfg = CONDITION_CONFIG[cond];
          return (
            <div
              key={cond}
              className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30"
            >
              {/* Color swatch indicator */}
              <div
                className={`w-4 h-4 rounded-md flex-shrink-0 border ${cfg.borderClass} ${cfg.bgClass} flex items-center justify-center`}
              >
                {cond === 'missing' && (
                  <span className="text-slate-500 font-bold text-[10px] leading-none">✕</span>
                )}
                {cond === 'rct' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 block" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {cfg.label}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{cond}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { DentalChartLegend as ConditionLegend };
