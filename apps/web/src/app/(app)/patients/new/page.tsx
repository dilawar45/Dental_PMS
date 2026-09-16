import { requireUser } from '@/lib/auth/current-user';
import { PatientForm } from './patient-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewPatientPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      {/* Back button and page title */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Patients Directory
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Register New Patient
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Create a new clinical chart profile and capture mandatory patient compliance consents.
        </p>
      </div>

      <PatientForm />
    </div>
  );
}
