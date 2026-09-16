'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Search, Filter, RotateCcw, Archive } from 'lucide-react';

export function PatientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get('q') || '';
  const currentGender = searchParams.get('gender') || 'all';
  const currentUpcoming = searchParams.get('upcoming') || 'all';
  const currentLastVisit = searchParams.get('lastVisitDays') || 'all';
  const currentMinAge = searchParams.get('minAge') || '';
  const currentMaxAge = searchParams.get('maxAge') || '';
  const currentShowArchived = searchParams.get('showArchived') === 'true';
  const currentSort = searchParams.get('sort') || 'last_visit_desc';

  const [searchTerm, setSearchTerm] = useState(currentQ);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset to page 1 on filter changes
      params.set('page', '1');

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all' || value === 'false') {
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
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters =
    currentQ ||
    currentGender !== 'all' ||
    currentUpcoming !== 'all' ||
    currentLastVisit !== 'all' ||
    currentMinAge ||
    currentMaxAge ||
    currentShowArchived;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input with form submit */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={() => updateFilters({ q: searchTerm.trim() })}
            placeholder="Search by name, phone (+92...), or email..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
          />
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <select
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="last_visit_desc">Sort: Last Visit (Recent first)</option>
            <option value="last_visit_asc">Sort: Last Visit (Oldest first)</option>
            <option value="name_asc">Sort: Name (A-Z)</option>
            <option value="name_desc">Sort: Name (Z-A)</option>
            <option value="created_at_desc">Sort: Date Registered (Newest)</option>
          </select>

          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border shadow-sm transition ${
              isFiltersOpen || hasActiveFilters
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset all filters"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Tray */}
      {isFiltersOpen && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                value={currentGender}
                onChange={(e) => updateFilters({ gender: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Upcoming Appointments */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Upcoming Appointment
              </label>
              <select
                value={currentUpcoming}
                onChange={(e) => updateFilters({ upcoming: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="all">Any Status</option>
                <option value="yes">Has Upcoming</option>
                <option value="no">No Upcoming</option>
              </select>
            </div>

            {/* Last Visit Recency */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Last Visit Recency
              </label>
              <select
                value={currentLastVisit}
                onChange={(e) => updateFilters({ lastVisitDays: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="all">Anytime</option>
                <option value="30">Older than 30 days</option>
                <option value="60">Older than 60 days</option>
                <option value="90">Older than 90 days</option>
                <option value="180">Older than 6 months</option>
                <option value="365">Older than 1 year</option>
              </select>
            </div>

            {/* Age Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Age Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="Min"
                  value={currentMinAge}
                  onChange={(e) => updateFilters({ minAge: e.target.value || null })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="Max"
                  value={currentMaxAge}
                  onChange={(e) => updateFilters({ maxAge: e.target.value || null })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Show Archived Toggle */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={currentShowArchived}
                onChange={(e) =>
                  updateFilters({ showArchived: e.target.checked ? 'true' : null })
                }
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5 text-slate-400" />
                Include Archived / Inactive Patients
              </span>
            </label>

            {isPending && (
              <span className="text-xs text-primary font-medium animate-pulse">
                Updating results...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
