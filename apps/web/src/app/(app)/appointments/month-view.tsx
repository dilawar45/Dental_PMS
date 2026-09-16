'use client';

import Link from 'next/link';
import { Clock, User as UserIcon } from 'lucide-react';
import type { CalendarDay } from './calendar-utils';
import { getStatusStyle, formatTimeSlot } from './calendar-utils';

export interface CalendarAppointmentItem {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  startAt: string; // ISO
  endAt: string; // ISO
  status: string;
  reason: string | null;
}

interface MonthViewProps {
  days: CalendarDay[];
  appointmentsByDate: Record<string, CalendarAppointmentItem[]>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthView({ days, appointmentsByDate }: MonthViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
        {days.map((day) => {
          const dayAppts = appointmentsByDate[day.dateString] || [];
          const isToday = day.isToday;
          const isCurrentMonth = day.isCurrentMonth;

          return (
            <div
              key={day.dateString}
              className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col transition-colors ${
                !isCurrentMonth
                  ? 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
              } ${isToday ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold rounded-full h-5 w-5 ${
                    isToday
                      ? 'bg-primary text-primary-foreground font-bold'
                      : isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {day.dayNumber}
                </span>
                {dayAppts.length > 0 && (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    {dayAppts.length}
                  </span>
                )}
              </div>

              {/* Appointment cards list inside day */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] sm:max-h-[120px] pr-0.5">
                {dayAppts.slice(0, 3).map((appt) => {
                  const style = getStatusStyle(appt.status);
                  const startDate = new Date(appt.startAt);
                  const endDate = new Date(appt.endAt);
                  const timeFormatted = startDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  return (
                    <Link
                      key={appt.id}
                      href={`/appointments/${appt.id}`}
                      className={`block rounded p-1 border text-[11px] leading-tight transition-all hover:shadow-sm hover:scale-[1.01] ${style.badge}`}
                    >
                      <div className="flex items-center justify-between gap-1 font-semibold truncate">
                        <span className="truncate">{appt.patientName}</span>
                        <span className="shrink-0 text-[10px] font-mono opacity-80">
                          {timeFormatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] opacity-75 mt-0.5 truncate">
                        <span className="truncate">Dr. {appt.dentistName.split(' ')[0]}</span>
                        <span className="shrink-0 text-[9px] font-medium">{style.label}</span>
                      </div>
                      {appt.reason && (
                        <p className="text-[9px] opacity-70 truncate mt-0.5">{appt.reason}</p>
                      )}
                    </Link>
                  );
                })}

                {dayAppts.length > 3 && (
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center py-0.5">
                    +{dayAppts.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
