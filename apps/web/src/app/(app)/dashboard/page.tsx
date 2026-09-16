import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { appointments, bookingRequests, patients, users } from '@dental-pms/db/schema';
import { eq, isNull, count, desc, and, gte, lte } from 'drizzle-orm';
import { Calendar, Users, Inbox, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const { user, clinicId } = await requireUser();

  const data = await withClinic(db, clinicId, async (tx) => {
    // 1. Pending booking requests count
    const [pendingBookingsRes] = await tx
      .select({ count: count() })
      .from(bookingRequests)
      .where(eq(bookingRequests.status, 'pending'));

    // 2. Active patients count (deleted_at is null)
    const [activePatientsRes] = await tx
      .select({ count: count() })
      .from(patients)
      .where(isNull(patients.deletedAt));

    // 3. Total & today's appointments
    const [totalAppointmentsRes] = await tx
      .select({ count: count() })
      .from(appointments);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [todayApptsRes] = await tx
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.startAt, startOfToday),
          lte(appointments.startAt, endOfToday)
        )
      );

    // Recent booking requests
    const recentBookingRequests = await tx
      .select({
        id: bookingRequests.id,
        reason: bookingRequests.reason,
        requestedVia: bookingRequests.requestedVia,
        status: bookingRequests.status,
        requestedSlotStart: bookingRequests.requestedSlotStart,
        patientName: patients.fullName,
        patientPhone: patients.phone,
      })
      .from(bookingRequests)
      .leftJoin(patients, eq(bookingRequests.patientId, patients.id))
      .orderBy(desc(bookingRequests.createdAt))
      .limit(4);

    // Upcoming appointments
    const upcomingAppointments = await tx
      .select({
        id: appointments.id,
        startAt: appointments.startAt,
        status: appointments.status,
        reason: appointments.reason,
        patientName: patients.fullName,
        dentistName: users.fullName,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(users, eq(appointments.dentistId, users.id))
      .orderBy(desc(appointments.startAt))
      .limit(5);

    return {
      todayAppointmentsCount: Number(todayApptsRes?.count ?? 0),
      pendingBookingsCount: Number(pendingBookingsRes?.count ?? 0),
      activePatientsCount: Number(activePatientsRes?.count ?? 0),
      totalAppointmentsCount: Number(totalAppointmentsRes?.count ?? 0),
      recentBookingRequests,
      upcomingAppointments,
    };
  });

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Clinic operational overview and real-time patient queue.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Active Reception Mode
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Today's Appointments */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Today&apos;s Appointments
              </p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                {data.todayAppointmentsCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>{data.totalAppointmentsCount} total appointments scheduled</span>
          </div>
        </div>

        {/* Card 2: Pending Booking Requests */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending Booking Requests
              </p>
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
                {data.pendingBookingsCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Inbox className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>Inbound inquiries via WhatsApp & Voice agent</span>
          </div>
        </div>

        {/* Card 3: Active Patients */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Patients
              </p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                {data.activePatientsCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <span>Verified patient records in clinic database</span>
          </div>
        </div>
      </div>

      {/* Grid: Pending Inbound Bookings & Scheduled Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Inbound Bookings */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Inbox className="h-4 w-4 text-amber-500" />
              Recent Booking Inquiries
            </h2>
            <span className="text-xs font-medium text-slate-400">Omnichannel</span>
          </div>

          <div className="space-y-3">
            {data.recentBookingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {req.patientName || 'Prospective Patient'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{req.reason || 'General inquiry'}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                    {req.requestedVia}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(req.requestedSlotStart).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent / Upcoming Appointments */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Scheduled Appointments
            </h2>
            <span className="text-xs font-medium text-slate-400">±30 Day Window</span>
          </div>

          <div className="space-y-3">
            {data.upcomingAppointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {appt.patientName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {appt.dentistName} • {appt.reason}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      appt.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : appt.status === 'confirmed'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {appt.status}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(appt.startAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
