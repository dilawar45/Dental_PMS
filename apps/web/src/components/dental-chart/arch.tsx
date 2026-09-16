'use client';

import React from 'react';
import { ArchType, ToothSurface, ToothState } from './chart-types';
import {
  PERMANENT_UPPER_RIGHT,
  PERMANENT_UPPER_LEFT,
  PERMANENT_LOWER_LEFT,
  PERMANENT_LOWER_RIGHT,
  PRIMARY_UPPER_RIGHT,
  PRIMARY_UPPER_LEFT,
  PRIMARY_LOWER_LEFT,
  PRIMARY_LOWER_RIGHT,
} from './chart-utils';
import { Tooth } from './tooth';

interface ArchProps {
  arch: ArchType;
  isPrimary: boolean;
  toothStates: Record<string, ToothState>;
  selectedTeeth: string[];
  activeSurfaceSelection: { toothFdi: string; surface: ToothSurface } | null;
  focusedTooth: string | null;
  onSelectTooth: (toothFdi: string, multi: boolean) => void;
  onSelectSurface: (toothFdi: string, surface: ToothSurface) => void;
  canEdit: boolean;
}

export function Arch({
  arch,
  isPrimary,
  toothStates,
  selectedTeeth,
  activeSurfaceSelection,
  focusedTooth,
  onSelectTooth,
  onSelectSurface,
  canEdit,
}: ArchProps) {
  const isUpper = arch === 'upper';

  const rightTeeth = isUpper
    ? isPrimary
      ? PRIMARY_UPPER_RIGHT
      : PERMANENT_UPPER_RIGHT
    : isPrimary
      ? PRIMARY_LOWER_RIGHT
      : PERMANENT_LOWER_RIGHT;

  const leftTeeth = isUpper
    ? isPrimary
      ? PRIMARY_UPPER_LEFT
      : PERMANENT_UPPER_LEFT
    : isPrimary
      ? PRIMARY_LOWER_LEFT
      : PERMANENT_LOWER_LEFT;

  const rightQuadName = isUpper
    ? isPrimary
      ? 'Quadrant 5 (Upper Right)'
      : 'Quadrant 1 (Upper Right)'
    : isPrimary
      ? 'Quadrant 8 (Lower Right)'
      : 'Quadrant 4 (Lower Right)';

  const leftQuadName = isUpper
    ? isPrimary
      ? 'Quadrant 6 (Upper Left)'
      : 'Quadrant 2 (Upper Left)'
    : isPrimary
      ? 'Quadrant 7 (Lower Left)'
      : 'Quadrant 3 (Lower Left)';

  return (
    <div className="w-full bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Arch Header */}
      <div className="flex items-center justify-between mb-3 px-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
            {isUpper ? 'Maxillary Arch (Upper)' : 'Mandibular Arch (Lower)'}
          </h4>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            {isPrimary ? '• Primary Dentition' : '• Permanent Dentition'}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
          <span>← Patient Right (Viewer Left)</span>
          <span>Patient Left (Viewer Right) →</span>
        </div>
      </div>

      {/* Teeth Layout Grid with Midline Separation */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
        <div className="min-w-[700px] flex items-center justify-center gap-2 sm:gap-4 py-2">
          {/* Right Quadrant (Patient Right / Viewer Left) */}
          <div className="flex-1 flex flex-col items-end">
            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1 mr-2 text-right">
              {rightQuadName}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {rightTeeth.map((fdi) => (
                <Tooth
                  key={fdi}
                  tooth={toothStates[fdi]!}
                  isSelected={selectedTeeth.includes(fdi)}
                  selectedSurfaces={
                    activeSurfaceSelection?.toothFdi === fdi
                      ? [activeSurfaceSelection.surface]
                      : []
                  }
                  onSurfaceClick={(target) => onSelectSurface(target.toothFdi, target.surface)}
                  onToothClick={(toothFdi, e) => onSelectTooth(toothFdi, e.shiftKey)}
                  canEdit={canEdit}
                />
              ))}
            </div>
          </div>

          {/* Anatomical Midline Divider */}
          <div className="flex flex-col items-center justify-center px-1">
            <div className="w-px h-28 sm:h-32 bg-primary/40 dark:bg-primary/50 relative">
              <span className="absolute top-1/2 -left-3.5 -translate-y-1/2 bg-white dark:bg-slate-900 border border-primary/30 text-primary font-bold text-[9px] px-1 py-0.5 rounded shadow-xs">
                MID
              </span>
            </div>
            <span className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider">
              Midline
            </span>
          </div>

          {/* Left Quadrant (Patient Left / Viewer Right) */}
          <div className="flex-1 flex flex-col items-start">
            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1 ml-2 text-left">
              {leftQuadName}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {leftTeeth.map((fdi) => (
                <Tooth
                  key={fdi}
                  tooth={toothStates[fdi]!}
                  isSelected={selectedTeeth.includes(fdi)}
                  selectedSurfaces={
                    activeSurfaceSelection?.toothFdi === fdi
                      ? [activeSurfaceSelection.surface]
                      : []
                  }
                  onSurfaceClick={(target) => onSelectSurface(target.toothFdi, target.surface)}
                  onToothClick={(toothFdi, e) => onSelectTooth(toothFdi, e.shiftKey)}
                  canEdit={canEdit}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
