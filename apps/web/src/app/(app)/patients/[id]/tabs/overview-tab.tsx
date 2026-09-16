'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Patient } from '@dental-pms/types';
import { archivePatientAction, restorePatientAction } from '../actions';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Edit,
  Archive,
  RotateCcw,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface OverviewTabProps {
  patient: Patient;
  totalAppointments: number;
  totalTreatments: number;
}

export function OverviewTab({
  patient,
  totalAppointments,
  totalTreatments,
}: OverviewTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isArchived = Boolean(patient.deletedAt);

  // Calculate age
  let age: number | null = null;
  if (patient.dob) {
    const birthDate = new Date(patient.dob);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  const handleArchive = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await archivePatientAction(patient.id);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }
      setConfirmArchive(false);
      router.refresh();
    });
  };

  const handleRestore = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await restorePatientAction(patient.id);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Banner if Archived */}
      {isArchived && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                This patient record is currently archived
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Archived on{' '}
                {new Date(patient.deletedAt!).toLocaleDateString('en-PK', {
                  dateStyle: 'medium',
                })}
                . The profile is hidden from standard directory listings.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRestore}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Profile
          </button>
        </div>
      )}

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details Card */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                {patient.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {patient.fullName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Registered: {new Date(patient.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
                  <span>•</span>
                  <span className="capitalize">{patient.gender || 'Unspecified'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/patients/${patient.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Profile
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Mobile Phone
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100 font-mono">
                <Phone className="h-4 w-4 text-slate-400" />
                {patient.phone}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Email Address
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                <Mail className="h-4 w-4 text-slate-400" />
                {patient.email || <span className="text-slate-400">Not provided</span>}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Date of Birth / Age
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                <Calendar className="h-4 w-4 text-slate-400" />
                {patient.dob ? (
                  <span>
                    {patient.dob} ({age !== null ? `${age} years old` : '—'})
                  </span>
                ) : (
                  <span className="text-slate-400">Not provided</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Residential Address
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  {patient.address || <span className="text-slate-400">Not provided</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Clinical & Administrative Notes
            </span>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/50 p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-800">
              {patient.notes || (
                <span className="text-slate-400 italic">No notes recorded yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Quick Stats & Archive Action */}
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Clinical Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 block">
                  {totalAppointments}
                </span>
                <span className="text-xs text-slate-500">Appointments</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 block">
                  {totalTreatments}
                </span>
                <span className="text-xs text-slate-500">Treatments</span>
              </div>
            </div>
          </div>

          {/* Archive Action Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Record Lifecycle
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Archiving hides this patient from appointments booking and searches, but preserves complete medical records and billing history.
            </p>

            {!isArchived ? (
              confirmArchive ? (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900 space-y-2">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                    Are you sure you want to archive {patient.fullName}?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleArchive}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {isPending ? 'Archiving...' : 'Yes, Archive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmArchive(false)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmArchive(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 py-2.5 text-xs font-semibold transition"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archive Patient
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={handleRestore}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2.5 text-xs font-semibold transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isPending ? 'Restoring...' : 'Restore Patient'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
