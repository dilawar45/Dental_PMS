'use client';

import { useState } from 'react';
import { ToothSurface, ToothCondition, SelectedSurfaceTarget } from './chart-types';
import { CONDITION_CONFIG, getToothName } from './chart-utils';
import { X, Check, FileText } from 'lucide-react';

interface ConditionPickerProps {
  target: SelectedSurfaceTarget | null;
  multiSelectTargets?: SelectedSurfaceTarget[];
  onSelectCondition: (condition: ToothCondition, notes?: string) => void;
  onClose: () => void;
  position?: { x: number; y: number } | null;
}

const CONDITIONS_LIST: ToothCondition[] = [
  'healthy',
  'caries',
  'filled',
  'crown',
  'missing',
  'implant',
  'rct',
];

export function ConditionPicker({
  target,
  multiSelectTargets,
  onSelectCondition,
  onClose,
  position,
}: ConditionPickerProps) {
  const [selectedCondition, setSelectedCondition] = useState<ToothCondition>('caries');
  const [notes, setNotes] = useState('');

  if (!target && (!multiSelectTargets || multiSelectTargets.length === 0)) {
    return null;
  }

  const isMulti = multiSelectTargets && multiSelectTargets.length > 1;
  const toothTitle = isMulti
    ? `${multiSelectTargets.length} Surfaces Selected`
    : target
    ? `Tooth ${target.toothFdi} • ${getToothName(target.toothFdi)}`
    : '';

  const surfaceTitle = isMulti
    ? 'Multi-Surface Batch Update'
    : target
    ? `${target.surface.toUpperCase()} Surface`
    : '';

  const handleApply = (cond: ToothCondition) => {
    onSelectCondition(cond, notes.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {toothTitle}
            </h3>
            <span className="text-[11px] font-mono text-primary font-medium block">
              {surfaceTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Condition options */}
        <div className="p-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Diagnosis / Condition
          </label>

          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {CONDITIONS_LIST.map((cond) => {
              const cfg = CONDITION_CONFIG[cond];
              const isSelected = selectedCondition === cond;

              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setSelectedCondition(cond)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-md border ${cfg.borderClass} ${cfg.bgClass} flex-shrink-0`}
                    />
                    <div>
                      <div className="font-semibold">{cfg.label}</div>
                      <div className="text-[10px] text-slate-400">{cfg.description}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Clinical note input */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Clinical Note <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Class II cavity, composite shade A2..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleApply(selectedCondition)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
          >
            Apply Condition
          </button>
        </div>
      </div>
    </div>
  );
}
