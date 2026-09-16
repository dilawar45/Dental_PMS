'use client';

import React, { useState, useTransition, useMemo, useEffect, useCallback } from 'react';
import type { UserRole } from '@dental-pms/types';
import {
  ChartingEntryItem,
  ToothSurface,
  ToothCondition,
  SelectedSurfaceTarget,
} from './chart-types';
import {
  reduceEntriesToToothStates,
  getToothName,
  PERMANENT_UPPER_RIGHT,
  PERMANENT_UPPER_LEFT,
  PERMANENT_LOWER_LEFT,
  PERMANENT_LOWER_RIGHT,
  PRIMARY_UPPER_RIGHT,
  PRIMARY_UPPER_LEFT,
  PRIMARY_LOWER_LEFT,
  PRIMARY_LOWER_RIGHT,
} from './chart-utils';
import { Arch } from './arch';
import { ConditionLegend } from './legend';
import { ConditionPicker } from './condition-picker';
import { HistoryPanel } from './history-panel';
import {
  recordChartingEntryAction,
  recordBatchChartingEntriesAction,
  exportChartPdfAction,
} from '@/app/(app)/patients/[id]/charting-actions';
import {
  Layers,
  Baby,
  Smile,
  CheckSquare,
  FileDown,
  History,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DentalChartProps {
  patientId: string;
  patientName: string;
  patientAge: number | null;
  initialEntries: ChartingEntryItem[];
  userRole: UserRole;
}

export function DentalChart({
  patientId,
  patientName,
  patientAge,
  initialEntries,
  userRole,
}: DentalChartProps) {
  const canEdit = userRole === 'owner' || userRole === 'dentist';

  // Primary vs Permanent view. Default to Primary if patient is younger than 13 years old.
  const [isPrimary, setIsPrimary] = useState<boolean>(
    patientAge !== null && patientAge < 13
  );

  const [entries, setEntries] = useState<ChartingEntryItem[]>(initialEntries);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [focusedTooth, setFocusedTooth] = useState<string | null>(null);

  // Condition Picker state
  const [pickerTarget, setPickerTarget] = useState<SelectedSurfaceTarget | null>(null);
  const [isBatchPicker, setIsBatchPicker] = useState<boolean>(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Synchronize when initialEntries changes
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  // Derive latest tooth surface condition map
  const toothStates = useMemo(() => {
    return reduceEntriesToToothStates(entries);
  }, [entries]);

  // Flat list of visible teeth for keyboard navigation
  const visibleTeeth = useMemo(() => {
    if (isPrimary) {
      return [
        ...PRIMARY_UPPER_RIGHT,
        ...PRIMARY_UPPER_LEFT,
        ...PRIMARY_LOWER_LEFT,
        ...PRIMARY_LOWER_RIGHT,
      ];
    }
    return [
      ...PERMANENT_UPPER_RIGHT,
      ...PERMANENT_UPPER_LEFT,
      ...PERMANENT_LOWER_LEFT,
      ...PERMANENT_LOWER_RIGHT,
    ];
  }, [isPrimary]);

  // Handle tooth selection
  const handleSelectTooth = useCallback(
    (toothFdi: string, isShift: boolean) => {
      setFocusedTooth(toothFdi);

      if (isMultiSelectMode || isShift) {
        setSelectedTeeth((prev) =>
          prev.includes(toothFdi)
            ? prev.filter((t) => t !== toothFdi)
            : [...prev, toothFdi]
        );
      } else {
        // Single tooth selection
        setSelectedTeeth([toothFdi]);
      }
    },
    [isMultiSelectMode]
  );

  // Handle surface selection
  const handleSelectSurface = useCallback(
    (toothFdi: string, surface: ToothSurface) => {
      setFocusedTooth(toothFdi);

      if (!canEdit) {
        // Read-only user: open history panel to inspect tooth details
        setSelectedTeeth([toothFdi]);
        setIsHistoryOpen(true);
        setStatusMessage({
          type: 'info',
          text: `Viewing Tooth #${toothFdi}. Chart editing is restricted to Dentists and Owners.`,
        });
        return;
      }

      if (isMultiSelectMode) {
        // Toggle tooth in multi-selection
        setSelectedTeeth((prev) =>
          prev.includes(toothFdi)
            ? prev.filter((t) => t !== toothFdi)
            : [...prev, toothFdi]
        );
        return;
      }

      // Open condition picker for this specific surface
      setSelectedTeeth([toothFdi]);
      setIsBatchPicker(false);
      setPickerTarget({
        toothFdi,
        surface,
      });
    },
    [canEdit, isMultiSelectMode]
  );

  // Apply condition from picker
  const handleApplyCondition = async (condition: ToothCondition, notes?: string) => {
    if (!canEdit) return;

    if (isBatchPicker) {
      if (selectedTeeth.length === 0) return;

      const batchTeeth = [...selectedTeeth];
      const batchEntries = batchTeeth.map((toothFdi) => ({
        toothFdi,
        surface: 'whole' as ToothSurface,
        condition,
        notes,
      }));

      // Optimistic entries
      const tempId = `temp-${Date.now()}`;
      const optimisticItems: ChartingEntryItem[] = batchEntries.map((e, idx) => ({
        id: `${tempId}-${idx}`,
        toothFdi: e.toothFdi,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes || null,
        recordedAt: new Date().toISOString(),
        recordedByName: 'Current User',
      }));

      setEntries((prev) => [...prev, ...optimisticItems]);
      setPickerTarget(null);
      setIsBatchPicker(false);
      setSelectedTeeth([]);

      startTransition(async () => {
        const res = await recordBatchChartingEntriesAction({
          patientId,
          entries: batchEntries,
        });

        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: `Successfully charted condition "${condition}" on ${batchTeeth.length} teeth.`,
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Failed to apply batch condition.',
          });
        }
      });
    } else if (pickerTarget) {
      const { toothFdi, surface } = pickerTarget;

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticItem: ChartingEntryItem = {
        id: tempId,
        toothFdi,
        surface,
        condition,
        notes: notes || null,
        recordedAt: new Date().toISOString(),
        recordedByName: 'Current User',
      };

      setEntries((prev) => [...prev, optimisticItem]);
      setPickerTarget(null);

      startTransition(async () => {
        const res = await recordChartingEntryAction({
          patientId,
          toothFdi,
          surface,
          condition,
          notes,
        });

        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: `Recorded ${condition} on Tooth #${toothFdi} (${surface}).`,
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Failed to record entry.',
          });
        }
      });
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (pickerTarget) return; // Don't intercept while modal is open

      if (e.key === 'Escape') {
        setSelectedTeeth([]);
        setFocusedTooth(null);
        setIsBatchPicker(false);
        setIsHistoryOpen(false);
        return;
      }

      if (!focusedTooth) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          setFocusedTooth(visibleTeeth[0] || null);
        }
        return;
      }

      const currentIndex = visibleTeeth.indexOf(focusedTooth);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % visibleTeeth.length;
        setFocusedTooth(visibleTeeth[nextIndex] || null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex =
          (currentIndex - 1 + visibleTeeth.length) % visibleTeeth.length;
        setFocusedTooth(visibleTeeth[prevIndex] || null);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectTooth(focusedTooth, false);
      }
    },
    [focusedTooth, handleSelectTooth, pickerTarget, visibleTeeth]
  );

  // PDF Export
  const handleExportPdf = async () => {
    setIsExporting(true);
    setStatusMessage({
      type: 'info',
      text: 'Generating dental chart PDF...',
    });

    try {
      const res = await exportChartPdfAction(patientId);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Dental chart PDF generated and saved to Patient Documents tab.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to export chart PDF.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'An unexpected error occurred during PDF generation.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="space-y-4 focus:outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Dental Charting Workspace"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Left: View Mode Toggle (Permanent vs Primary) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setIsPrimary(false);
                setSelectedTeeth([]);
                setFocusedTooth(null);
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                !isPrimary
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Smile className="h-3.5 w-3.5 text-primary" />
              <span>Permanent (32)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPrimary(true);
                setSelectedTeeth([]);
                setFocusedTooth(null);
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                isPrimary
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <Baby className="h-3.5 w-3.5 text-amber-500" />
              <span>Primary / Pediatric (20)</span>
            </button>
          </div>

          {patientAge !== null && patientAge < 13 && (
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
              <Sparkles className="h-3 w-3" />
              Pediatric view suggested (Age {patientAge})
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-Select Toggle */}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setIsMultiSelectMode((prev) => !prev);
                if (isMultiSelectMode) {
                  setSelectedTeeth([]);
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                isMultiSelectMode
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Multi-Select</span>
              {selectedTeeth.length > 0 && (
                <span className="ml-1 bg-white/20 text-inherit text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {selectedTeeth.length}
                </span>
              )}
            </button>
          )}

          {/* Timeline / History Toggle */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
              isHistoryOpen
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            <History className="h-3.5 w-3.5 text-primary" />
            <span>Timeline</span>
            <span className="ml-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {entries.length}
            </span>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <FileDown className="h-3.5 w-3.5 text-primary" />
            <span>{isExporting ? 'Exporting...' : 'Export Chart PDF'}</span>
          </button>
        </div>
      </div>

      {/* Role Notice for Read-Only Staff */}
      {!canEdit && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            <strong>Read-Only Mode:</strong> Chart viewing is open to all staff. Recording or updating clinical tooth conditions is restricted to <strong>Dentists</strong> and <strong>Owners</strong>.
          </span>
        </div>
      )}

      {/* Status / Feedback Banner */}
      {statusMessage && (
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-xl text-xs transition-all animate-in fade-in',
            statusMessage.type === 'success' &&
              'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300',
            statusMessage.type === 'error' &&
              'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300',
            statusMessage.type === 'info' &&
              'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300'
          )}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            {statusMessage.type === 'error' && (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            {statusMessage.type === 'info' && (
              <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Batch Selection Action Bar */}
      {canEdit && selectedTeeth.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-primary">
              {selectedTeeth.length} {selectedTeeth.length === 1 ? 'tooth' : 'teeth'} selected:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {selectedTeeth.map((fdi) => (
                <span
                  key={fdi}
                  className="bg-white dark:bg-slate-900 text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-primary/30 text-primary shadow-xs"
                >
                  #{fdi}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTeeth([])}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsBatchPicker(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 shadow-xs transition"
            >
              Apply Condition to Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Dental Charting Board */}
      <div className="relative flex flex-col xl:flex-row gap-4">
        {/* Odontogram Canvas (Upper Arch + Lower Arch) */}
        <div className="flex-1 space-y-4">
          <Arch
            arch="upper"
            isPrimary={isPrimary}
            toothStates={toothStates}
            selectedTeeth={selectedTeeth}
            activeSurfaceSelection={pickerTarget}
            focusedTooth={focusedTooth}
            onSelectTooth={handleSelectTooth}
            onSelectSurface={handleSelectSurface}
            canEdit={canEdit}
          />

          <Arch
            arch="lower"
            isPrimary={isPrimary}
            toothStates={toothStates}
            selectedTeeth={selectedTeeth}
            activeSurfaceSelection={pickerTarget}
            focusedTooth={focusedTooth}
            onSelectTooth={handleSelectTooth}
            onSelectSurface={handleSelectSurface}
            canEdit={canEdit}
          />

          {/* Condition Legend */}
          <ConditionLegend />
        </div>

        {/* Slide-out / Side History Drawer */}
        {isHistoryOpen && (
          <div className="xl:w-80 shrink-0 h-[600px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <HistoryPanel
              entries={entries}
              selectedTooth={selectedTeeth[0] || null}
              onClose={() => setIsHistoryOpen(false)}
              onSelectTooth={(fdi) => {
                setSelectedTeeth([fdi]);
                setFocusedTooth(fdi);
              }}
            />
          </div>
        )}
      </div>

      {/* Condition Picker Popover/Modal for Single Surface */}
      {pickerTarget && (
        <ConditionPicker
          target={pickerTarget}
          onSelectCondition={handleApplyCondition}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {/* Condition Picker Popover/Modal for Batch Teeth */}
      {isBatchPicker && (
        <ConditionPicker
          target={null}
          multiSelectTargets={selectedTeeth.map((fdi) => ({
            toothFdi: fdi,
            surface: 'whole',
          }))}
          onSelectCondition={handleApplyCondition}
          onClose={() => setIsBatchPicker(false)}
        />
      )}
    </div>
  );
}
