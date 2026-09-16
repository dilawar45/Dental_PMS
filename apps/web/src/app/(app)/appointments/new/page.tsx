import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { patients, users } from '@dental-pms/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppointmentForm } from './appointment-form';

interface NewAppointmentPageProps {
  searchParams: Promise<{
    patientId?: string;
    startAt?: string;
  }>;
}

export default async function NewAppointmentPage({ searchParams }: NewAppointmentPageProps) {
  const { user } = await requireRole(['owner', 'receptionist']);
  const resolvedParams = await searchParams;

  const { activePatients, activeDentists } = await withClinic(
    db,
    user.clinicId,
    async (tx: ClinicTransaction) => {
      const patientRows = await tx
        .select({
          id: patients.id,
          fullName: patients.fullName,
          phone: patients.phone,
        })
        .from(patients)
        .where(and(eq(patients.clinicId, user.clinicId), isNull(patients.deletedAt)))
        .orderBy(patients.fullName);

      const dentistRows = await tx
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

      return { activePatients: patientRows, activeDentists: dentistRows };
    }
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/appointments"
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Schedule Appointment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Book an operatory chair session with conflict detection.
          </p>
        </div>
      </div>

      <AppointmentForm
        patients={activePatients}
        dentists={activeDentists}
        defaultPatientId={resolvedParams.patientId}
        defaultStartAt={resolvedParams.startAt}
      />
    </div>
  );
}
