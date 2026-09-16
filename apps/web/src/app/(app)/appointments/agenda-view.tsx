'use client';

import Link from 'next/link';
import { Clock, User as UserIcon } from 'lucide-react';
import type { CalendarDay } from './calendar-utils';
import { getStatusStyle, formatTimeSlot } from './calendar-utils';
import type { CalendarAppointmentItem } from './month-view';

interface AgendaViewProps {
  days: CalendarDay[];
  appointmentsByDate: Record<string, CalendarAppointmentItem[]>;
}

export function AgendaView({ days, appointmentsByDate }: AgendaViewProps) {
  // Only days that have appointments or are today
  const daysWithContent = days.filter(
    (d) => d.isToday || (appointmentsByDate[d.dateString] && appointmentsByDate[d.dateString]!.length > 0)
  );

  return (
    <div className="md:hidden space-y-4">
      {daysWithContent.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
          No appointments scheduled for this period.
        </div>
      ) : (
        daysWithContent.map((day) => {
          const appts = appointmentsByDate[day.dateString] || [];
          const formattedDate = day.date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={day.dateString}
              className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm ${
                day.isToday ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {formattedDate}
                  </span>
                  {day.isToday && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      Today
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {appts.length} {appts.length === 1 ? 'appointment' : 'appointments'}
                </span>
              </div>

              {appts.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No scheduled visits</p>
              ) : (
                <div className="space-y-2">
                  {appts.map((appt) => {
                    const style = getStatusStyle(appt.status);
                    const startDate = new Date(appt.startAt);
                    const endDate = new Date(appt.endAt);
                    const timeRange = formatTimeSlot(startDate, endDate);

                    return (
                      <Link
                        key={appt.id}
                        href={`/appointments/${appt.id}`}
                        className={`block rounded-lg p-3 border text-xs leading-snug transition-all ${style.badge}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {appt.patientName}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${style.badge}`}
                          >
                            {style.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300 mt-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{timeRange}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{appt.dentistName}</span>
                          </div>
                        </div>

                        {appt.reason && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
                            {appt.reason}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
