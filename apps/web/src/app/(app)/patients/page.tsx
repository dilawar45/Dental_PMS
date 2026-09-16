import { requireUser } from '@/lib/auth/current-user';
import { getPatients, type PatientSearchParams } from './data';
import { PatientFilters } from './patient-filters';
import { PatientTable } from './patient-table';
import Link from 'next/link';
import { UserPlus, Users } from 'lucide-react';

interface PatientsPageProps {
  searchParams: Promise<PatientSearchParams>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const { user } = await requireUser();
  const resolvedParams = await searchParams;
  const data = await getPatients(user.clinicId, resolvedParams);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Patients
            </h1>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {data.totalCount} total
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Directory of patient records, medical profiles, and treatment histories.
          </p>
        </div>

        <div>
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
          >
            <UserPlus className="h-4 w-4" />
            New Patient
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <PatientFilters />

      {/* Patients Table / Empty State */}
      <PatientTable
        patients={data.patients}
        totalCount={data.totalCount}
        currentPage={data.currentPage}
        pageSize={data.pageSize}
      />
    </div>
  );
}
