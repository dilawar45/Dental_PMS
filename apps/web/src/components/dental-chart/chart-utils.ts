import {
  ToothSurface,
  ToothCondition,
  ToothType,
  ArchType,
  ChartingEntryItem,
  ToothState,
  ToothSurfacesMap,
} from './chart-types';

export const PERMANENT_UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
export const PERMANENT_UPPER_LEFT = ['21', '22', '23', '24', '25', '26', '27', '28'];
export const PERMANENT_LOWER_LEFT = ['31', '32', '33', '34', '35', '36', '37', '38'];
export const PERMANENT_LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];

export const PRIMARY_UPPER_RIGHT = ['55', '54', '53', '52', '51'];
export const PRIMARY_UPPER_LEFT = ['61', '62', '63', '64', '65'];
export const PRIMARY_LOWER_LEFT = ['71', '72', '73', '74', '75'];
export const PRIMARY_LOWER_RIGHT = ['85', '84', '83', '82', '81'];

/**
 * Returns anatomical tooth name from FDI number.
 */
export function getToothName(fdi: string): string {
  const q = fdi.charAt(0);
  const n = fdi.charAt(1);

  const quadNames: Record<string, string> = {
    '1': 'Upper Right',
    '2': 'Upper Left',
    '3': 'Lower Left',
    '4': 'Lower Right',
    '5': 'Primary Upper Right',
    '6': 'Primary Upper Left',
    '7': 'Primary Lower Left',
    '8': 'Primary Lower Right',
  };

  const toothNames: Record<string, string> = {
    '1': 'Central Incisor',
    '2': 'Lateral Incisor',
    '3': 'Canine',
    '4': 'First Premolar',
    '5': 'Second Premolar',
    '6': 'First Molar',
    '7': 'Second Molar',
    '8': 'Third Molar (Wisdom Tooth)',
  };

  // Primary teeth ending in 4/5 are primary molars
  if (['5', '6', '7', '8'].includes(q)) {
    if (n === '4') return `${quadNames[q]} First Molar`;
    if (n === '5') return `${quadNames[q]} Second Molar`;
  }

  const quad = quadNames[q] || 'Unknown';
  const tName = toothNames[n] || 'Tooth';
  return `${quad} ${tName}`;
}

/**
 * Derives tooth category (molar, premolar, canine, incisor) for anatomical geometry.
 */
export function getToothType(fdi: string): ToothType {
  const n = parseInt(fdi.charAt(1), 10);
  const isPrimary = ['5', '6', '7', '8'].includes(fdi.charAt(0));

  if (n === 1 || n === 2) return 'incisor';
  if (n === 3) return 'canine';
  if (isPrimary && (n === 4 || n === 5)) return 'molar';
  if (n === 4 || n === 5) return 'premolar';
  return 'molar';
}

/**
 * Derives whether tooth belongs to Upper or Lower arch.
 */
export function getToothArch(fdi: string): ArchType {
  const q = fdi.charAt(0);
  return ['1', '2', '5', '6'].includes(q) ? 'upper' : 'lower';
}

/**
 * Determines whether tooth is located on Patient Right (Quadrant 1, 4, 5, 8 - viewer left)
 * or Patient Left (Quadrant 2, 3, 6, 7 - viewer right).
 */
export function isPatientRight(fdi: string): boolean {
  const q = fdi.charAt(0);
  return ['1', '4', '5', '8'].includes(q);
}

/**
 * Color metadata for conditions.
 */
export const CONDITION_CONFIG: Record<
  ToothCondition,
  {
    label: string;
    description: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    svgFill: string;
    svgStroke: string;
  }
> = {
  healthy: {
    label: 'Healthy',
    description: 'Intact, sound tooth structure',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderClass: 'border-slate-300 dark:border-slate-700',
    svgFill: 'fill-slate-100 dark:fill-slate-800/80',
    svgStroke: 'stroke-slate-300 dark:stroke-slate-700',
  },
  caries: {
    label: 'Caries (Decay)',
    description: 'Active carious lesion or cavitation',
    bgClass: 'bg-rose-100 dark:bg-rose-950/60',
    textClass: 'text-rose-700 dark:text-rose-400',
    borderClass: 'border-rose-400 dark:border-rose-800',
    svgFill: 'fill-rose-500 dark:fill-rose-600',
    svgStroke: 'stroke-rose-600 dark:stroke-rose-500',
  },
  filled: {
    label: 'Filled / Restored',
    description: 'Composite, amalgam or glass ionomer restoration',
    bgClass: 'bg-sky-100 dark:bg-sky-950/60',
    textClass: 'text-sky-700 dark:text-sky-400',
    borderClass: 'border-sky-400 dark:border-sky-800',
    svgFill: 'fill-sky-500 dark:fill-sky-600',
    svgStroke: 'stroke-sky-600 dark:stroke-sky-500',
  },
  crown: {
    label: 'Crown (Cap)',
    description: 'Full-coverage prosthetic crown',
    bgClass: 'bg-amber-100 dark:bg-amber-950/60',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-400 dark:border-amber-800',
    svgFill: 'fill-amber-400 dark:fill-amber-500',
    svgStroke: 'stroke-amber-600 dark:stroke-amber-500',
  },
  rct: {
    label: 'Root Canal (RCT)',
    description: 'Endodontically treated root canals',
    bgClass: 'bg-teal-100 dark:bg-teal-950/60',
    textClass: 'text-teal-700 dark:text-teal-400',
    borderClass: 'border-teal-400 dark:border-teal-800',
    svgFill: 'fill-teal-500 dark:fill-teal-600',
    svgStroke: 'stroke-teal-600 dark:stroke-teal-500',
  },
  implant: {
    label: 'Dental Implant',
    description: 'Osseointegrated implant fixture with abutment',
    bgClass: 'bg-purple-100 dark:bg-purple-950/60',
    textClass: 'text-purple-700 dark:text-purple-400',
    borderClass: 'border-purple-400 dark:border-purple-800',
    svgFill: 'fill-purple-500 dark:fill-purple-600',
    svgStroke: 'stroke-purple-600 dark:stroke-purple-500',
  },
  missing: {
    label: 'Missing / Extracted',
    description: 'Congenitally absent or extracted tooth',
    bgClass: 'bg-slate-200 dark:bg-slate-800',
    textClass: 'text-slate-500 dark:text-slate-400',
    borderClass: 'border-slate-400 dark:border-slate-600',
    svgFill: 'fill-slate-300 dark:fill-slate-700/60',
    svgStroke: 'stroke-slate-500 dark:stroke-slate-400',
  },
};

const DEFAULT_SURFACES: ToothSurfacesMap = {
  occlusal: { condition: 'healthy' },
  incisal: { condition: 'healthy' },
  mesial: { condition: 'healthy' },
  distal: { condition: 'healthy' },
  buccal: { condition: 'healthy' },
  lingual: { condition: 'healthy' },
  whole: { condition: 'healthy' },
};

/**
 * Reduces a flat list of chronological charting entries into a clean ToothState map.
 * Guaranteed: Latest entry per (toothFdi, surface) wins.
 */
export function buildOdontogramMap(
  allEntries: ChartingEntryItem[],
  fdiList: string[]
): Record<string, ToothState> {
  const map: Record<string, ToothState> = {};

  // 1. Initialize default states for all requested teeth
  for (const fdi of fdiList) {
    map[fdi] = {
      toothFdi: fdi,
      name: getToothName(fdi),
      type: getToothType(fdi),
      arch: getToothArch(fdi),
      isPrimary: ['5', '6', '7', '8'].includes(fdi.charAt(0)),
      surfaces: { ...DEFAULT_SURFACES },
      wholeCondition: 'healthy',
      notes: [],
      history: [],
    };
  }

  // 2. Sort entries chronologically (oldest to newest so newest overwrites)
  const sorted = [...allEntries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  for (const entry of sorted) {
    const tooth = map[entry.toothFdi];
    if (!tooth) continue;

    // Append to tooth history
    tooth.history.unshift(entry);

    if (entry.notes?.trim()) {
      tooth.notes.push(entry.notes.trim());
    }

    if (entry.surface === 'whole') {
      tooth.wholeCondition = entry.condition;
      tooth.surfaces.whole = {
        condition: entry.condition,
        latestEntryId: entry.id,
        notes: entry.notes,
        recordedAt: entry.recordedAt,
        recordedByName: entry.recordedByName || undefined,
      };

      // If missing or implant or crown applied to whole tooth, propagate to all surfaces
      if (['missing', 'implant', 'crown'].includes(entry.condition)) {
        (Object.keys(tooth.surfaces) as ToothSurface[]).forEach((s) => {
          tooth.surfaces[s] = {
            condition: entry.condition,
            latestEntryId: entry.id,
            notes: entry.notes,
            recordedAt: entry.recordedAt,
            recordedByName: entry.recordedByName || undefined,
          };
        });
      }
    } else {
      tooth.surfaces[entry.surface] = {
        condition: entry.condition,
        latestEntryId: entry.id,
        notes: entry.notes,
        recordedAt: entry.recordedAt,
        recordedByName: entry.recordedByName || undefined,
      };
    }
  }

  return map;
}

/**
 * Human-readable label for anatomical tooth surfaces.
 */
export function formatSurfaceLabel(surface: ToothSurface): string {
  switch (surface) {
    case 'mesial':
      return 'Mesial (M)';
    case 'distal':
      return 'Distal (D)';
    case 'buccal':
      return 'Buccal / Facial (B)';
    case 'lingual':
      return 'Lingual / Palatal (L)';
    case 'occlusal':
      return 'Occlusal (O)';
    case 'incisal':
      return 'Incisal (I)';
    case 'whole':
      return 'Whole Tooth';
    default:
      return surface;
  }
}

/**
 * Helper to reduce entries to tooth states map for both permanent and primary teeth.
 */
export function reduceEntriesToToothStates(
  allEntries: ChartingEntryItem[],
  fdiList?: string[]
): Record<string, ToothState> {
  const allTeeth = fdiList ?? [
    ...PERMANENT_UPPER_RIGHT,
    ...PERMANENT_UPPER_LEFT,
    ...PERMANENT_LOWER_LEFT,
    ...PERMANENT_LOWER_RIGHT,
    ...PRIMARY_UPPER_RIGHT,
    ...PRIMARY_UPPER_LEFT,
    ...PRIMARY_LOWER_LEFT,
    ...PRIMARY_LOWER_RIGHT,
  ];
  return buildOdontogramMap(allEntries, allTeeth);
}
