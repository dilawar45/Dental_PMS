import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { appointments, patients, users } from '@dental-pms/db/schema';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { CalendarControls } from './calendar-controls';
import { MonthView, type CalendarAppointmentItem } from './month-view';
import { WeekView } from './week-view';
import { AgendaView } from './agenda-view';
import { getMonthDays, getWeekDays, formatDateYMD } from './calendar-utils';
import type { AppointmentStatus } from '@dental-pms/types';

interface AppointmentsPageProps {
  searchParams: Promise<{
    view?: string;
    date?: string;
    dentistId?: string;
    status?: string;
  }>;
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const { user } = await requireUser();
  const resolvedParams = await searchParams;

  const view = resolvedParams.view === 'week' ? 'week' : 'month';
  const currentDate = resolvedParams.date && !isNaN(Date.parse(resolvedParams.date))
    ? new Date(resolvedParams.date)
    : new Date();

  const selectedDentistId = resolvedParams.dentistId;
  const selectedStatus = resolvedParams.status as AppointmentStatus | undefined;

  // Calculate calendar days
  const days = view === 'week' ? getWeekDays(currentDate) : getMonthDays(currentDate);
  const startDate = days[0]!.date;
  const endDate = new Date(days[days.length - 1]!.date);
  endDate.setHours(23, 59, 59, 999);

  // Fetch appointments and practitioners inside withClinic scope
  const { apptItems, dentistsList } = await withClinic(
    db,
    user.clinicId,
    async (tx: ClinicTransaction) => {
      // 1. Fetch authorized practitioners for filter dropdown
      const practitioners = await tx
        .select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
        })
        .from(users)
        .where(
          and(
            eq(users.clinicId, user.clinicId),
            inArray(users.role, ['dentist', 'owner']),
            eq(users.active, true)
          )
        );

      // 2. Query appointments in the active date window
      const queryConditions = [
        eq(appointments.clinicId, user.clinicId),
        gte(appointments.startAt, startDate),
        lte(appointments.startAt, endDate),
      ];

      if (selectedDentistId) {
        queryConditions.push(eq(appointments.dentistId, selectedDentistId));
      }

      if (selectedStatus) {
        queryConditions.push(eq(appointments.status, selectedStatus));
      }

      const rows = await tx
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          patientName: patients.fullName,
          dentistId: appointments.dentistId,
          dentistName: users.fullName,
          startAt: appointments.startAt,
          endAt: appointments.endAt,
          status: appointments.status,
          reason: appointments.reason,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .innerJoin(users, eq(appointments.dentistId, users.id))
        .where(and(...queryConditions))
        .orderBy(appointments.startAt);

      const items: CalendarAppointmentItem[] = rows.map((r) => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientName,
        dentistId: r.dentistId,
        dentistName: r.dentistName,
        startAt: r.startAt.toISOString(),
        endAt: r.endAt.toISOString(),
        status: r.status,
        reason: r.reason,
      }));

      return { apptItems: items, dentistsList: practitioners };
    }
  );

  // Group appointments by dateString
  const appointmentsByDate: Record<string, CalendarAppointmentItem[]> = {};
  for (const item of apptItems) {
    const dStr = formatDateYMD(new Date(item.startAt));
    if (!appointmentsByDate[dStr]) {
      appointmentsByDate[dStr] = [];
    }
    appointmentsByDate[dStr]!.push(item);
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Appointments Calendar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Operatory schedule, practitioner chair bookings, and patient arrival statuses.
        </p>
      </div>

      <CalendarControls
        currentDate={currentDate}
        view={view}
        dentists={dentistsList}
        selectedDentistId={selectedDentistId}
        selectedStatus={selectedStatus}
        userRole={user.role}
      />

      {/* Calendar Grid View */}
      {view === 'week' ? (
        <WeekView days={days} appointmentsByDate={appointmentsByDate} />
      ) : (
        <>
          <div className="hidden md:block">
            <MonthView days={days} appointmentsByDate={appointmentsByDate} />
          </div>
          <AgendaView days={days} appointmentsByDate={appointmentsByDate} />
        </>
      )}
    </div>
  );
}
