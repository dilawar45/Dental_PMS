import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { patients, appointments } from '@dental-pms/db/schema';
import { eq, isNull, and, desc } from 'drizzle-orm';
import { InvoiceForm } from './invoice-form';

interface NewInvoicePageProps {
  searchParams: Promise<{
    patientId?: string;
    appointmentId?: string;
  }>;
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  // Allowed: owner, receptionist
  const { user } = await requireRole(['owner', 'receptionist']);
  const resolvedParams = await searchParams;

  const { patientsList, appointmentsList } = await withClinic(
    db,
    user.clinicId,
    async (tx: ClinicTransaction) => {
      // 1. Fetch active patients
      const patientRecords = await tx
        .select({
          id: patients.id,
          fullName: patients.fullName,
          phone: patients.phone,
        })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, user.clinicId),
            isNull(patients.deletedAt)
          )
        )
        .orderBy(patients.fullName);

      // 2. Fetch recent appointments
      const appointmentRecords = await tx
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          startAt: appointments.startAt,
          reason: appointments.reason,
        })
        .from(appointments)
        .where(eq(appointments.clinicId, user.clinicId))
        .orderBy(desc(appointments.startAt))
        .limit(100);

      return {
        patientsList: patientRecords,
        appointmentsList: appointmentRecords,
      };
    }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Create New Invoice
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Issue an itemized billing invoice for patient dental treatments and procedures.
        </p>
      </div>

      <InvoiceForm
        patients={patientsList}
        appointments={appointmentsList}
        initialPatientId={resolvedParams.patientId}
        initialAppointmentId={resolvedParams.appointmentId}
      />
    </div>
  );
}
