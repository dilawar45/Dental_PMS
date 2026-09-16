'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { Search, Filter, RotateCcw, Calendar, ArrowDownUp } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Invoices' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'paid', label: 'Paid in Full' },
  { value: 'void', label: 'Void' },
];

export function InvoiceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get('q') || '';
  const currentStatus = searchParams.get('status') || 'all';
  const currentFrom = searchParams.get('from') || '';
  const currentTo = searchParams.get('to') || '';
  const currentSort = searchParams.get('sort') || 'issued_at_desc';

  const [searchTerm, setSearchTerm] = useState(currentQ);
  const [showDates, setShowDates] = useState(Boolean(currentFrom || currentTo));

  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Always reset page on filter change
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
    currentStatus !== 'all' ||
    Boolean(currentFrom) ||
    Boolean(currentTo) ||
    currentSort !== 'issued_at_desc';

  return (
    <div className="space-y-3">
      {/* Primary Bar: Status Pills + Search + Actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = currentStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilters({ status: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </form>

          {/* Sort Dropdown */}
          <div className="relative flex items-center">
            <ArrowDownUp className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              aria-label="Sort invoices by"
              className="pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="issued_at_desc">Newest First</option>
              <option value="amount_desc">Total (High to Low)</option>
              <option value="balance_desc">Balance (High to Low)</option>
            </select>
          </div>

          {/* Toggle Date Filter */}
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
            <span>Dates</span>
          </button>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Range Collapsible Toolbar */}
      {showDates && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-400">Issued Date Range:</span>
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
