'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import type { UserRole } from '@dental-pms/types';
import { formatDateYMD } from './calendar-utils';

interface CalendarControlsProps {
  currentDate: Date;
  view: 'month' | 'week';
  dentists: Array<{ id: string; fullName: string; role: string }>;
  selectedDentistId?: string;
  selectedStatus?: string;
  userRole: UserRole;
}

export function CalendarControls({
  currentDate,
  view,
  dentists,
  selectedDentistId,
  selectedStatus,
  userRole,
}: CalendarControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    for (const [key, value] of Object.entries(newParams)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const next = new Date(currentDate);
    if (view === 'month') {
      next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      next.setDate(next.getDate() + (direction === 'next' ? 7 : -7));
    }
    updateParams({ date: formatDateYMD(next) });
  };

  const jumpToToday = () => {
    updateParams({ date: formatDateYMD(new Date()) });
  };

  const titleFormat =
    view === 'month'
      ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const canCreate = ['owner', 'receptionist'].includes(userRole);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Date Header and Nav Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-1">
          <button
            type="button"
            onClick={() => navigateDate('prev')}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Previous"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigateDate('next')}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Next"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <span>{titleFormat}</span>
        </h2>
      </div>

      {/* Filter and View Selectors */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Month / Week View Toggle */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => updateParams({ view: 'month' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              view === 'month'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => updateParams({ view: 'week' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              view === 'week'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Week
          </button>
        </div>

        {/* Dentist Filter */}
        <select
          value={selectedDentistId || ''}
          onChange={(e) => updateParams({ dentistId: e.target.value || undefined })}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Practitioners</option>
          {dentists.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName} ({d.role})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus || ''}
          onChange={(e) => updateParams({ status: e.target.value || undefined })}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="arrived">Arrived</option>
          <option value="completed">Completed</option>
          <option value="no_show">No-Show</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* New Appointment CTA */}
        {canCreate && (
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity ml-auto sm:ml-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Appointment</span>
          </Link>
        )}
      </div>
    </div>
  );
}
