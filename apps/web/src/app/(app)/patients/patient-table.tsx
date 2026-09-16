'use client';

import Link from 'next/navigation';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Users, Calendar, Phone, Mail, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';

export interface PatientListItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  dob: string | null;
  age: number | null;
  gender: string | null;
  lastVisitDate: string | null;
  totalVisits: number;
  hasUpcoming: boolean;
  deletedAt: string | null;
  createdAt: string;
}

interface PatientTableProps {
  patients: PatientListItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export function PatientTable({
  patients,
  totalCount,
  currentPage,
  pageSize,
}: PatientTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const navigateToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  if (patients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No patients found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No patient records match your current search and filter criteria.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => router.push('/patients/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
          >
            <UserPlus className="h-4 w-4" />
            Register New Patient
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Patient</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Age / DOB</th>
                <th className="px-6 py-4 font-semibold">Last Visit</th>
                <th className="px-6 py-4 font-semibold text-center">Visits</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {patients.map((p) => {
                const isArchived = Boolean(p.deletedAt);
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/patients/${p.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Full Name & Gender */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition flex items-center gap-2">
                          {p.fullName}
                          {p.hasUpcoming && (
                            <span
                              title="Has upcoming scheduled appointment"
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-medium px-2 py-0.5 border border-blue-200 dark:border-blue-900"
                            >
                              <Calendar className="h-2.5 w-2.5" />
                              Upcoming
                            </span>
                          )}
                        </div>
                        {p.gender && (
                          <span className="text-xs text-slate-400 capitalize">
                            {p.gender}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact (Phone & Email) */}
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {p.phone}
                        </div>
                        {p.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-[180px]">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {p.email}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Age / DOB */}
                    <td className="px-6 py-4">
                      {p.dob ? (
                        <div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {p.age !== null ? `${p.age} yrs` : '—'}
                          </span>
                          <span className="text-xs text-slate-400 block">
                            {p.dob}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Last Visit */}
                    <td className="px-6 py-4">
                      {p.lastVisitDate ? (
                        <div>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {new Date(p.lastVisitDate).toLocaleDateString('en-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-xs text-slate-400 block">
                            {formatRelativeDays(p.lastVisitDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Never visited</span>
                      )}
                    </td>

                    {/* Total Visits */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {p.totalVisits}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-right">
                      {isArchived ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{' '}
            of <span className="font-semibold text-slate-900 dark:text-slate-100">{totalCount}</span> patients
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => navigateToPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <span className="text-xs text-slate-500 font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => navigateToPage(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeDays(dateStr: string): string {
  const diffDays = Math.round(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)} mos ago`;
  return `${Math.round(diffDays / 365)} yrs ago`;
}
