'use client';

import React from 'react';
import {
  ToothSurface,
  ToothCondition,
  ToothState,
  SelectedSurfaceTarget,
} from './chart-types';
import { CONDITION_CONFIG, isPatientRight } from './chart-utils';

interface ToothProps {
  tooth: ToothState;
  isSelected?: boolean;
  selectedSurfaces?: ToothSurface[];
  onSurfaceClick: (target: SelectedSurfaceTarget, e: React.MouseEvent) => void;
  onToothClick?: (toothFdi: string, e: React.MouseEvent) => void;
  onToothContextMenu?: (toothFdi: string, e: React.MouseEvent) => void;
  canEdit: boolean;
  onReadOnlyAttempt?: () => void;
}

export function Tooth({
  tooth,
  isSelected,
  selectedSurfaces = [],
  onSurfaceClick,
  onToothClick,
  onToothContextMenu,
  canEdit,
  onReadOnlyAttempt,
}: ToothProps) {
  const { toothFdi, type, arch, surfaces, wholeCondition } = tooth;
  const isRight = isPatientRight(toothFdi);
  const isUpper = arch === 'upper';
  const isMissing = wholeCondition === 'missing';
  const isCrown = wholeCondition === 'crown';
  const isImplant = wholeCondition === 'implant';
  const hasRct = wholeCondition === 'rct' || surfaces.occlusal.condition === 'rct' || surfaces.incisal.condition === 'rct';

  // Orientation mapping:
  // For Patient Right (Q1/Q4): Right side is toward midline (Mesial), Left side is Distal.
  // For Patient Left (Q2/Q3): Left side is toward midline (Mesial), Right side is Distal.
  const leftSurface: ToothSurface = isRight ? 'distal' : 'mesial';
  const rightSurface: ToothSurface = isRight ? 'mesial' : 'distal';

  // For Upper Arch: Top is Buccal, Bottom is Lingual (Palatal).
  // For Lower Arch: Top is Lingual, Bottom is Buccal.
  const topSurface: ToothSurface = isUpper ? 'buccal' : 'lingual';
  const bottomSurface: ToothSurface = isUpper ? 'lingual' : 'buccal';

  const centerSurface: ToothSurface = type === 'incisor' || type === 'canine' ? 'incisal' : 'occlusal';

  const handleSurfaceClick = (surface: ToothSurface, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) {
      onReadOnlyAttempt?.();
      return;
    }
    onSurfaceClick({ toothFdi, surface }, e);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onToothContextMenu) {
      e.preventDefault();
      onToothContextMenu(toothFdi, e);
    }
  };

  const getSurfaceColor = (surface: ToothSurface): string => {
    if (isMissing) return '#475569'; // slate-600
    const cond = surfaces[surface]?.condition || 'healthy';
    switch (cond) {
      case 'caries':
        return '#e11d48'; // rose-600
      case 'filled':
        return '#0284c7'; // sky-600
      case 'crown':
        return '#d97706'; // amber-600
      case 'rct':
        return '#0d9488'; // teal-600
      case 'implant':
        return '#9333ea'; // purple-600
      case 'missing':
        return '#475569';
      case 'healthy':
      default:
        return 'var(--tooth-healthy-fill, #f8fafc)';
    }
  };

  const isSurfaceSelected = (surface: ToothSurface) => {
    return isSelected || selectedSurfaces.includes(surface);
  };

  return (
    <div
      className="flex flex-col items-center select-none group"
      onContextMenu={handleContextMenu}
    >
      {/* FDI number above tooth for Upper Arch */}
      {isUpper && (
        <span
          className={`text-[11px] font-mono font-bold mb-1 transition-colors ${
            isSelected
              ? 'text-primary'
              : 'text-slate-600 dark:text-slate-400 group-hover:text-primary'
          }`}
        >
          {toothFdi}
        </span>
      )}

      {/* Tooth SVG Container */}
      <div
        tabIndex={0}
        role="button"
        onClick={(e) => onToothClick?.(toothFdi, e)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToothClick?.(toothFdi, e as unknown as React.MouseEvent);
          }
        }}
        aria-label={`Tooth ${toothFdi}, ${tooth.name}. Status: ${wholeCondition}`}
        className={`relative p-1 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
          isSelected
            ? 'ring-2 ring-primary bg-primary/5 shadow-xs'
            : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
        }`}
      >
        <svg
          viewBox="0 0 54 54"
          className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 overflow-visible"
        >
          <style>
            {`:root { --tooth-healthy-fill: #f8fafc; }
              .dark { --tooth-healthy-fill: #1e293b; }`}
          </style>

          {/* Whole tooth background base */}
          <rect
            x="4"
            y="4"
            width="46"
            height="46"
            rx="8"
            fill="none"
            stroke={isCrown ? '#d97706' : '#cbd5e1'}
            strokeWidth={isCrown ? '2.5' : '1.2'}
            className="dark:stroke-slate-700 transition-colors"
          />

          {type === 'incisor' || type === 'canine' ? (
            /* Anterior Tooth Geometry (Incisor/Canine) */
            <g className="cursor-pointer">
              {/* Top Surface */}
              <polygon
                points="7,7 47,7 39,19 15,19"
                fill={getSurfaceColor(topSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(topSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(topSurface, e)}
              >
                <title>{`${toothFdi} - ${topSurface}`}</title>
              </polygon>

              {/* Bottom Surface */}
              <polygon
                points="15,35 39,35 47,47 7,47"
                fill={getSurfaceColor(bottomSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(bottomSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(bottomSurface, e)}
              >
                <title>{`${toothFdi} - ${bottomSurface}`}</title>
              </polygon>

              {/* Left Surface */}
              <polygon
                points="7,7 15,19 15,35 7,47"
                fill={getSurfaceColor(leftSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(leftSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(leftSurface, e)}
              >
                <title>{`${toothFdi} - ${leftSurface}`}</title>
              </polygon>

              {/* Right Surface */}
              <polygon
                points="47,7 47,47 39,35 39,19"
                fill={getSurfaceColor(rightSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(rightSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(rightSurface, e)}
              >
                <title>{`${toothFdi} - ${rightSurface}`}</title>
              </polygon>

              {/* Center Incisal Edge */}
              <rect
                x="15"
                y="19"
                width="24"
                height="16"
                rx="3"
                fill={getSurfaceColor(centerSurface)}
                stroke="#64748b"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(centerSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(centerSurface, e)}
              >
                <title>{`${toothFdi} - ${centerSurface}`}</title>
              </rect>
            </g>
          ) : (
            /* Posterior Tooth Geometry (Molar/Premolar: 5-region cross) */
            <g className="cursor-pointer">
              {/* Top Surface */}
              <polygon
                points="7,7 47,7 36,17 18,17"
                fill={getSurfaceColor(topSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(topSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(topSurface, e)}
              >
                <title>{`${toothFdi} - ${topSurface}`}</title>
              </polygon>

              {/* Bottom Surface */}
              <polygon
                points="18,37 36,37 47,47 7,47"
                fill={getSurfaceColor(bottomSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(bottomSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(bottomSurface, e)}
              >
                <title>{`${toothFdi} - ${bottomSurface}`}</title>
              </polygon>

              {/* Left Surface */}
              <polygon
                points="7,7 18,17 18,37 7,47"
                fill={getSurfaceColor(leftSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(leftSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(leftSurface, e)}
              >
                <title>{`${toothFdi} - ${leftSurface}`}</title>
              </polygon>

              {/* Right Surface */}
              <polygon
                points="47,7 47,47 36,37 36,17"
                fill={getSurfaceColor(rightSurface)}
                stroke="#94a3b8"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(rightSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(rightSurface, e)}
              >
                <title>{`${toothFdi} - ${rightSurface}`}</title>
              </polygon>

              {/* Center Occlusal Surface */}
              <rect
                x="18"
                y="17"
                width="18"
                height="20"
                rx="2"
                fill={getSurfaceColor(centerSurface)}
                stroke="#64748b"
                strokeWidth="1"
                className={`transition hover:opacity-80 ${
                  isSurfaceSelected(centerSurface) ? 'stroke-primary stroke-2' : ''
                }`}
                onClick={(e) => handleSurfaceClick(centerSurface, e)}
              >
                <title>{`${toothFdi} - ${centerSurface}`}</title>
              </rect>
            </g>
          )}

          {/* Condition Overlay: RCT Root Canal central line */}
          {hasRct && (
            <g className="pointer-events-none">
              <line
                x1="27"
                y1="8"
                x2="27"
                y2="46"
                stroke="#0d9488"
                strokeWidth="2.5"
                strokeDasharray="3 2"
              />
              <circle cx="27" cy="27" r="3" fill="#0d9488" />
            </g>
          )}

          {/* Condition Overlay: Implant central fixture */}
          {isImplant && (
            <g className="pointer-events-none">
              <rect x="23" y="10" width="8" height="34" rx="2" fill="#9333ea" opacity="0.85" />
              <line x1="21" y1="18" x2="33" y2="18" stroke="#ffffff" strokeWidth="1.5" />
              <line x1="21" y1="26" x2="33" y2="26" stroke="#ffffff" strokeWidth="1.5" />
              <line x1="21" y1="34" x2="33" y2="34" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}

          {/* Condition Overlay: Missing Tooth (Bold Diagonal Cross X) */}
          {isMissing && (
            <g className="pointer-events-none">
              <line
                x1="6"
                y1="6"
                x2="48"
                y2="48"
                stroke="#dc2626"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <line
                x1="48"
                y1="6"
                x2="6"
                y2="48"
                stroke="#dc2626"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>
          )}
        </svg>

        {/* Small badge dot if tooth has clinical notes */}
        {tooth.notes.length > 0 && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-slate-900"
            title={`${tooth.notes.length} clinical note(s)`}
          />
        )}
      </div>

      {/* FDI number below tooth for Lower Arch */}
      {!isUpper && (
        <span
          className={`text-[11px] font-mono font-bold mt-1 transition-colors ${
            isSelected
              ? 'text-primary'
              : 'text-slate-600 dark:text-slate-400 group-hover:text-primary'
          }`}
        >
          {toothFdi}
        </span>
      )}
    </div>
  );
}
