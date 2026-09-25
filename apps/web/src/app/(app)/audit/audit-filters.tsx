'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Search, RotateCcw, Calendar, User, Layers, X } from 'lucide-react';

interface AuditFiltersProps {
  staffUsers: Array<{ id: string; name: string; role: string }>;
}

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'patient', label: 'Patient' },
  { value: 'booking_request', label: 'Booking Request' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'charting_entry', label: 'Charting Entry' },
  { value: 'consent', label: 'Consent' },
  { value: 'file', label: 'File' },
];

export function AuditFilters({ staffUsers }: AuditFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get('q') || '';
  const currentActor = searchParams.get('actorId') || 'all';
  const currentEntity = searchParams.get('entity') || 'all';
  const currentFrom = searchParams.get('from') || '';
  const currentTo = searchParams.get('to') || '';

  const [searchTerm, setSearchTerm] = useState(currentQ);
  const [showDates, setShowDates] = useState(Boolean(currentFrom || currentTo));

  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchTerm.trim() });
  };

  const handleReset = () => {
    setSearchTerm('');
    setShowDates(false);
    startTransition(() => {
      router.push(pathname);
    });
  };

  const setDatePreset = (days: number | 'today') => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    let fromStr = toStr;

    if (days !== 'today') {
      const past = new Date();
      past.setDate(past.getDate() - days);
      fromStr = past.toISOString().slice(0, 10);
    }

    updateFilters({ from: fromStr, to: toStr });
  };

  const hasActiveFilters =
    Boolean(currentQ) ||
    currentActor !== 'all' ||
    currentEntity !== 'all' ||
    Boolean(currentFrom) ||
    Boolean(currentTo);

  return (
    <div className="space-y-3">
      {/* Main Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs md:text-sm rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                updateFilters({ q: '' });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Staff Actor Filter */}
          <div className="relative inline-flex items-center">
            <select
              value={currentActor}
              onChange={(e) => updateFilters({ actorId: e.target.value })}
              aria-label="Filter by actor"
              className="appearance-none pl-8 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">All Actors</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
            <User className="absolute left-2.5 pointer-events-none h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Entity Type Filter */}
          <div className="relative inline-flex items-center">
            <select
              value={currentEntity}
              onChange={(e) => updateFilters({ entity: e.target.value })}
              aria-label="Filter by entity type"
              className="appearance-none pl-8 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Layers className="absolute left-2.5 pointer-events-none h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Date Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowDates((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition cursor-pointer ${
              showDates || currentFrom || currentTo
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Date Range</span>
          </button>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Range Sub-bar */}
      {showDates && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 text-xs animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Time Range:</span>
            
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">From</span>
              <input
                type="date"
                value={currentFrom}
                onChange={(e) => updateFilters({ from: e.target.value })}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">To</span>
              <input
                type="date"
                value={currentTo}
                onChange={(e) => updateFilters({ to: e.target.value })}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-indigo-200/60 dark:border-indigo-800/60">
              <button
                type="button"
                onClick={() => setDatePreset('today')}
                className="px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(7)}
                className="px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium"
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(30)}
                className="px-2 py-0.5 rounded-md hover:bg-white dark:hover:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium"
              >
                30d
              </button>
            </div>
          </div>

          {(currentFrom || currentTo) && (
            <button
              type="button"
              onClick={() => updateFilters({ from: null, to: null })}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium hover:underline ml-auto"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
