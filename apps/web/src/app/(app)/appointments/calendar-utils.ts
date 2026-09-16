/**
 * Date and calendar calculation utilities for Month and Week views.
 */

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getMonthDays(currentDate: Date): CalendarDay[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];
  const todayStr = formatDateYMD(new Date());

  // Fill preceding days from previous month (starting Sunday = 0)
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    const dateStr = formatDateYMD(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Fill current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const dateStr = formatDateYMD(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Fill succeeding days to complete the 35 or 42 grid slots
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = formatDateYMD(d);
    days.push({
      date: d,
      dateString: dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export function getWeekDays(currentDate: Date): CalendarDay[] {
  const d = new Date(currentDate);
  const dayOfWeek = d.getDay(); // 0 = Sunday
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - dayOfWeek);

  const days: CalendarDay[] = [];
  const todayStr = formatDateYMD(new Date());

  for (let i = 0; i < 7; i++) {
    const current = new Date(startOfWeek);
    current.setDate(startOfWeek.getDate() + i);
    const dateStr = formatDateYMD(current);
    days.push({
      date: current,
      dateString: dateStr,
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === currentDate.getMonth(),
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTimeSlot(start: Date, end: Date): string {
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function getStatusStyle(status: string) {
  switch (status) {
    case 'scheduled':
      return {
        badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
        dot: 'bg-sky-500',
        label: 'Scheduled',
      };
    case 'confirmed':
      return {
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        dot: 'bg-indigo-500',
        label: 'Confirmed',
      };
    case 'arrived':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        label: 'Arrived',
      };
    case 'completed':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        label: 'Completed',
      };
    case 'no_show':
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500',
        label: 'No-Show',
      };
    case 'cancelled':
      return {
        badge: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 line-through',
        dot: 'bg-slate-400',
        label: 'Cancelled',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        dot: 'bg-slate-500',
        label: status,
      };
  }
}
