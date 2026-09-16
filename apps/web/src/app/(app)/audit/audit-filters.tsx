'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Search, RotateCcw, Filter, Calendar } from 'lucide-react';

interface AuditFiltersProps {
  staffUsers: Array<{ id: string; name: string; role: string }>;
}

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'patient', label: 'Patient' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'consent', label: 'Consent' },
  { value: 'file', label: 'File' },
  { value: 'user', label: 'Staff User' },
  { value: 'clinic', label: 'Clinic Settings' },
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

  const hasActiveFilters =
    Boolean(currentQ) ||
    currentActor !== 'all' ||
    currentEntity !== 'all' ||
    Boolean(currentFrom) ||
    Boolean(currentTo);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>

        {/* Staff Actor Filter */}
        <select
          value={currentActor}
          onChange={(e) => updateFilters({ actorId: e.target.value })}
          aria-label="Filter by actor"
          className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Actors</option>
          {staffUsers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.role})
            </option>
          ))}
        </select>

        {/* Entity Type Filter */}
        <select
          value={currentEntity}
          onChange={(e) => updateFilters({ entity: e.target.value })}
          aria-label="Filter by entity type"
          className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {ENTITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Date Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowDates((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition ${
            showDates || currentFrom || currentTo
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
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
            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
            title="Reset filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Date Range Sub-bar */}
      {showDates && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-400">Timestamp Range:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">From:</label>
            <input
              type="date"
              value={currentFrom}
              onChange={(e) => updateFilters({ from: e.target.value })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">To:</label>
            <input
              type="date"
              value={currentTo}
              onChange={(e) => updateFilters({ to: e.target.value })}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {(currentFrom || currentTo) && (
            <button
              type="button"
              onClick={() => updateFilters({ from: null, to: null })}
              className="text-xs text-rose-500 hover:underline ml-auto"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}
