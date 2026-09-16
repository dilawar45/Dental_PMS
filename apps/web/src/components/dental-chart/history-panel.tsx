'use client';

import React, { useState } from 'react';
import { ChartingEntryItem, ToothSurface } from './chart-types';
import { CONDITION_CONFIG, getToothName, formatSurfaceLabel } from './chart-utils';
import { Clock, User, FileText, X, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryPanelProps {
  entries: ChartingEntryItem[];
  selectedTooth: string | null;
  onClose: () => void;
  onSelectTooth?: (toothFdi: string) => void;
}

export function HistoryPanel({
  entries,
  selectedTooth,
  onClose,
  onSelectTooth,
}: HistoryPanelProps) {
  const [filterMode, setFilterMode] = useState<'selected' | 'all'>(
    selectedTooth ? 'selected' : 'all'
  );

  // If selectedTooth changed and wasn't null, default to 'selected'
  React.useEffect(() => {
    if (selectedTooth) {
      setFilterMode('selected');
    }
  }, [selectedTooth]);

  const displayedEntries = React.useMemo(() => {
    let list = [...entries];
    if (filterMode === 'selected' && selectedTooth) {
      list = list.filter((e) => e.toothFdi === selectedTooth);
    }
    // Sort descending by recordedAt (newest first)
    return list.sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [entries, filterMode, selectedTooth]);

  // Group by surface if viewing single tooth
  const surfaceGrouped = React.useMemo(() => {
    if (!selectedTooth || filterMode === 'all') return null;

    const map = new Map<ToothSurface, ChartingEntryItem[]>();
    for (const entry of displayedEntries) {
      const existing = map.get(entry.surface) ?? [];
      existing.push(entry);
      map.set(entry.surface, existing);
    }
    return map;
  }, [displayedEntries, filterMode, selectedTooth]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm sm:max-w-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Charting Timeline
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedTooth && filterMode === 'selected'
                ? `Tooth #${selectedTooth} — ${getToothName(selectedTooth)}`
                : 'All patient charting records'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close timeline"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 text-xs">
        <button
          type="button"
          onClick={() => setFilterMode('selected')}
          disabled={!selectedTooth}
          className={cn(
            'flex-1 py-1 px-2 rounded-md font-medium transition-colors text-center',
            filterMode === 'selected' && selectedTooth
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 disabled:pointer-events-none'
          )}
        >
          {selectedTooth ? `Tooth #${selectedTooth}` : 'Select a tooth'}
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={cn(
            'flex-1 py-1 px-2 rounded-md font-medium transition-colors text-center',
            filterMode === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          All Teeth ({entries.length})
        </button>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {displayedEntries.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No charting entries recorded yet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select any tooth surface on the odontogram to log findings and treatments.
            </p>
          </div>
        ) : (
          <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {displayedEntries.map((entry) => {
              const config = CONDITION_CONFIG[entry.condition];
              const dateStr = new Date(entry.recordedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={entry.id} className="relative group">
                  {/* Timeline dot */}
                  <span
                    className={cn(
                      'absolute -left-[19px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
                      config.bgClass
                    )}
                  />

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/60 hover:border-primary/40 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onSelectTooth?.(entry.toothFdi)}
                            className="font-bold text-xs text-primary hover:underline"
                          >
                            Tooth #{entry.toothFdi}
                          </button>
                          <span className="text-[11px] text-slate-400">•</span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {formatSurfaceLabel(entry.surface)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {getToothName(entry.toothFdi)}
                        </p>
                      </div>

                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-md text-white shrink-0',
                          config.bgClass
                        )}
                      >
                        {config.label}
                      </span>
                    </div>

                    {/* Clinical Note if present */}
                    {entry.notes && (
                      <div className="flex items-start gap-1.5 bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] leading-relaxed break-words">
                          {entry.notes}
                        </span>
                      </div>
                    )}

                    {/* Meta: Recorded by and timestamp */}
                    <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{entry.recordedByName || 'Dentist'}</span>
                      </div>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Append-only clinical audit log</span>
        <span>FDI ISO-3950 Compliant</span>
      </div>
    </div>
  );
}
