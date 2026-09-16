export type ToothSurface =
  | 'mesial'
  | 'distal'
  | 'buccal'
  | 'lingual'
  | 'occlusal'
  | 'incisal'
  | 'whole';

export type ToothCondition =
  | 'healthy'
  | 'caries'
  | 'filled'
  | 'crown'
  | 'missing'
  | 'implant'
  | 'rct';

export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

export type ArchType = 'upper' | 'lower';

export type DentitionType = 'permanent' | 'primary';

export interface ChartingEntryItem {
  id: string;
  patientId?: string;
  toothFdi: string;
  surface: ToothSurface;
  condition: ToothCondition;
  notes?: string | null;
  recordedAt: string;
  recordedById?: string | null;
  recordedByName?: string | null;
}

export interface ToothSurfaceState {
  condition: ToothCondition;
  latestEntryId?: string;
  notes?: string | null;
  recordedAt?: string | Date;
  recordedByName?: string;
}

export type ToothSurfacesMap = Record<ToothSurface, ToothSurfaceState>;

export interface ToothState {
  toothFdi: string;
  name: string;
  type: ToothType;
  arch: ArchType;
  isPrimary: boolean;
  surfaces: ToothSurfacesMap;
  wholeCondition: ToothCondition;
  notes: string[];
  history: ChartingEntryItem[];
}

export interface SelectedSurfaceTarget {
  toothFdi: string;
  surface: ToothSurface;
}
