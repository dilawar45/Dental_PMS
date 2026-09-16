import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { patients, consents } from '@dental-pms/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { EditPatientForm } from './edit-patient-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface EditPatientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const { user } = await requireUser();
  const { id: patientId } = await params;

  const data = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
    const [patient] = await tx
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

    if (!patient) return null;

    const activeConsents = await tx
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.patientId, patientId),
          eq(consents.clinicId, user.clinicId),
          isNull(consents.revokedAt)
        )
      );

    const activeConsentTypes = new Set(activeConsents.map((c) => c.type));

    return {
      patient,
      consents: {
        data_processing: activeConsentTypes.has('data_processing'),
        reminders: activeConsentTypes.has('reminders'),
        marketing: activeConsentTypes.has('marketing'),
      },
    };
  });

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/patients/${patientId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Patient Details
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Edit Patient Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Modify demographic details and update consent agreements for {data.patient.fullName}.
        </p>
      </div>

      <EditPatientForm
        patient={data.patient}
        initialConsents={data.consents}
      />
    </div>
  );
}
