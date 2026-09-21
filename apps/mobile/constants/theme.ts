export const colors = {
  primary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  white: '#ffffff',
  black: '#000000',
  border: '#e2e8f0',
  background: '#f8fafc',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const statusColors: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  scheduled: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Scheduled',
  },
  confirmed: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    label: 'Confirmed',
  },
  arrived: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Arrived',
  },
  completed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Completed',
  },
  no_show: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    label: 'No Show',
  },
  cancelled: {
    bg: 'bg-slate-100',
    text: 'text-slate-500 line-through',
    border: 'border-slate-200',
    label: 'Cancelled',
  },
};

export const invoiceStatusColors: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  unpaid: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    label: 'Unpaid',
  },
  partial: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Partial',
  },
  paid: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Paid',
  },
  void: {
    bg: 'bg-slate-100',
    text: 'text-slate-500 line-through',
    border: 'border-slate-200',
    label: 'Void',
  },
};

export interface ToothConditionMeta {
  hex: string;
  label: string;
  bg: string;
  text: string;
  border: string;
}

export const toothConditionColors: Record<string, ToothConditionMeta> = {
  healthy: {
    hex: '#cbd5e1', // slate-300
    label: 'Healthy',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
  },
  caries: {
    hex: '#ef4444', // red-500
    label: 'Caries / Cavity',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-300',
  },
  filled: {
    hex: '#3b82f6', // blue-500
    label: 'Filled / Restored',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-300',
  },
  crown: {
    hex: '#f59e0b', // amber-500
    label: 'Crown / Cap',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-300',
  },
  missing: {
    hex: '#475569', // slate-600
    label: 'Missing / Extracted',
    bg: 'bg-slate-200',
    text: 'text-slate-800',
    border: 'border-slate-400',
  },
  implant: {
    hex: '#a855f7', // purple-500
    label: 'Dental Implant',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-300',
  },
  rct: {
    hex: '#14b8a6', // teal-500
    label: 'Root Canal (RCT)',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-300',
  },
};


