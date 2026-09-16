'use client';

import Link from 'next/link';
import { Clock, User as UserIcon, AlertCircle } from 'lucide-react';
import type { CalendarDay } from './calendar-utils';
import { getStatusStyle, formatTimeSlot } from './calendar-utils';
import type { CalendarAppointmentItem } from './month-view';

interface WeekViewProps {
  days: CalendarDay[];
  appointmentsByDate: Record<string, CalendarAppointmentItem[]>;
}

export function WeekView({ days, appointmentsByDate }: WeekViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* 7 Columns for 7 Days */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        {days.map((day) => {
          const dayAppts = appointmentsByDate[day.dateString] || [];
          const weekdayName = day.date.toLocaleDateString('en-US', { weekday: 'short' });

          return (
            <div
              key={day.dateString}
              className={`flex flex-col min-h-[420px] p-3 ${
                day.isToday ? 'bg-primary/5 dark:bg-primary/10' : ''
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    {weekdayName}
                  </span>
                  <span
                    className={`inline-block text-base font-bold ${
                      day.isToday ? 'text-primary' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {dayAppts.length}
                </span>
              </div>

              {/* Appointments list */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {dayAppts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-xs text-slate-400">No appointments</p>
                  </div>
                ) : (
                  dayAppts.map((appt) => {
                    const style = getStatusStyle(appt.status);
                    const startDate = new Date(appt.startAt);
                    const endDate = new Date(appt.endAt);
                    const timeRange = formatTimeSlot(startDate, endDate);

                    return (
                      <Link
                        key={appt.id}
                        href={`/appointments/${appt.id}`}
                        className={`block rounded-lg p-2.5 border text-xs leading-snug transition-all hover:shadow-md hover:border-slate-400 ${style.badge}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {appt.patientName}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style.badge}`}
                          >
                            {style.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{timeRange}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          <UserIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{appt.dentistName}</span>
                        </div>

                        {appt.reason && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 italic border-t border-slate-200/50 dark:border-slate-700/50 pt-1">
                            &ldquo;{appt.reason}&rdquo;
                          </p>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
