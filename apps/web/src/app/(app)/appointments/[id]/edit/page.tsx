import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { appointments, patients, users } from '@dental-pms/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EditAppointmentForm } from './edit-form';

interface EditAppointmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditAppointmentPage({ params }: EditAppointmentPageProps): Promise<React.JSX.Element> {
  const { user } = await requireRole(['owner', 'receptionist']);
  const { id } = await params;

  const { appt, activeDentists } = await withClinic(
    db,
    user.clinicId,
    async (tx: ClinicTransaction) => {
      const [row] = await tx
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          patientName: patients.fullName,
          dentistId: appointments.dentistId,
          startAt: appointments.startAt,
          endAt: appointments.endAt,
          status: appointments.status,
          reason: appointments.reason,
          notes: appointments.notes,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .where(and(eq(appointments.id, id), eq(appointments.clinicId, user.clinicId)));

      const dentistsList = await tx
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
        )
        .orderBy(users.fullName);

      return { appt: row || null, activeDentists: dentistsList };
    }
  );

  if (!appt) {
    notFound();
  }

  // Reject editing terminal or active status appointments
  if (!['scheduled', 'confirmed'].includes(appt.status)) {
    redirect(`/appointments/${appt.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/appointments/${appt.id}`}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Reschedule / Edit Appointment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Modify operatory timing, attending practitioner, or clinical notes.
          </p>
        </div>
      </div>

      <EditAppointmentForm
        appointment={{
          id: appt.id,
          patientId: appt.patientId,
          patientName: appt.patientName,
          dentistId: appt.dentistId,
          startAt: appt.startAt.toISOString(),
          endAt: appt.endAt.toISOString(),
          reason: appt.reason,
          notes: appt.notes,
        }}
        dentists={activeDentists}
      />
    </div>
  );
}
