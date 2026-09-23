import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { appointments, patients, users } from '@dental-pms/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User as UserIcon,
  Phone,
  FileText,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { StatusActions } from './status-actions';
import { getStatusStyle, formatTimeSlot } from '../calendar-utils';
import type { AppointmentStatus } from '@dental-pms/types';

interface AppointmentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps): Promise<React.JSX.Element> {
  const { user } = await requireUser();
  const { id } = await params;

  const appt = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
    const [row] = await tx
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        patientName: patients.fullName,
        patientPhone: patients.phone,
        patientDob: patients.dob,
        patientGender: patients.gender,
        dentistId: appointments.dentistId,
        dentistName: users.fullName,
        dentistRole: users.role,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(users, eq(appointments.dentistId, users.id))
      .where(and(eq(appointments.id, id), eq(appointments.clinicId, user.clinicId)));

    return row || null;
  });

  if (!appt) {
    notFound();
  }

  const style = getStatusStyle(appt.status);
  const startDate = new Date(appt.startAt);
  const endDate = new Date(appt.endAt);
  const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/appointments"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Appointment Details
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Scheduled clinical session #{appt.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${style.badge}`}
        >
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          <span>{style.label}</span>
        </span>
      </div>

      {/* Main Appointment Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
        {/* Date, Time & Duration Block */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Session Date</p>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Time & Duration</p>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {formatTimeSlot(startDate, endDate)}{' '}
                  <span className="text-xs font-normal text-slate-500">({durationMin} mins)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Patient & Attending Practitioner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Patient Card */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Patient
            </p>
            <div className="flex items-center justify-between">
              <Link
                href={`/patients/${appt.patientId}`}
                className="text-base font-bold text-primary hover:underline flex items-center gap-1.5"
              >
                <span>{appt.patientName}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              <span>{appt.patientPhone}</span>
            </div>
            {appt.patientDob && (
              <p className="text-xs text-slate-500">
                DOB: {appt.patientDob} ({appt.patientGender || 'Unspecified'})
              </p>
            )}
          </div>

          {/* Practitioner Card */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Attending Practitioner
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <UserIcon className="h-4 w-4 text-slate-400" />
              <span>{appt.dentistName}</span>
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Role: <span className="uppercase font-semibold">{appt.dentistRole}</span>
            </p>
          </div>
        </div>

        {/* Reason & Notes */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Visit Reason / Chief Complaint
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              {appt.reason || 'Routine checkup and consultation'}
            </p>
          </div>

          {appt.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Operatory Notes
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                {appt.notes}
              </p>
            </div>
          )}
        </div>

        {/* Status Actions (Role-guarded: Owner and Receptionist only) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Workflow Actions
          </p>
          <StatusActions
            appointmentId={appt.id}
            currentStatus={appt.status as AppointmentStatus}
            userRole={user.role}
          />
        </div>
      </div>
    </div>
  );
}
