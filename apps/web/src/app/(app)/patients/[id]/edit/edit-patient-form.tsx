'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Patient } from '@dental-pms/types';
import { updatePatientAction, type UpdatePatientInput } from './actions';
import { CONSENT_DEFINITIONS } from '@/lib/constants/consents';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface EditPatientFormProps {
  patient: Patient;
  initialConsents: {
    data_processing: boolean;
    reminders: boolean;
    marketing: boolean;
  };
}

export function EditPatientForm({
  patient,
  initialConsents,
}: EditPatientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState<UpdatePatientInput>({
    fullName: patient.fullName,
    phone: patient.phone,
    email: patient.email || '',
    dob: patient.dob || '',
    gender: (patient.gender as 'male' | 'female' | 'other') || 'male',
    address: patient.address || '',
    notes: patient.notes || '',
    consents: initialConsents,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    startTransition(async () => {
      const res = await updatePatientAction(patient.id, formData);
      if (!res.success) {
        setErrorMsg(res.error);
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        return;
      }

      router.push(`/patients/${patient.id}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {errorMsg && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Demographics */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Patient Demographics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Update primary contact information and personal details.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className={`w-full rounded-xl border ${
                fieldErrors['fullName']
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 dark:border-slate-700'
              } bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary`}
            />
            {fieldErrors['fullName'] && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors['fullName']}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mobile Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className={`w-full rounded-xl border ${
                  fieldErrors['phone']
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary`}
              />
            </div>
            {fieldErrors['phone'] && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors['phone']}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {fieldErrors['email'] && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors['email']}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date of Birth <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={formData.dob || ''}
                onChange={(e) =>
                  setFormData({ ...formData, dob: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Gender <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={formData.gender || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gender: e.target.value as 'male' | 'female' | 'other',
                })
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Residential Address <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Clinical / Administrative Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Consents State Synchronization */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Compliance Consents
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Unchecking a granted consent revokes it with an audit record; checking an ungranted consent records a new grant.
          </p>
        </div>

        <div className="space-y-4">
          {/* Data processing */}
          <div
            className={`rounded-xl border p-4 transition-colors ${
              formData.consents.data_processing
                ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                : 'border-slate-200 bg-slate-50 dark:border-slate-800'
            }`}
          >
            <label className="flex items-start gap-3.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.consents.data_processing}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    consents: {
                      ...formData.consents,
                      data_processing: e.target.checked,
                    },
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {CONSENT_DEFINITIONS.data_processing.title}
                  </span>
                  <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    Required
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {CONSENT_DEFINITIONS.data_processing.description}
                </p>
              </div>
            </label>
          </div>

          {/* Reminders */}
          <div
            className={`rounded-xl border p-4 transition-colors ${
              formData.consents.reminders
                ? 'border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20'
                : 'border-slate-200 bg-slate-50 dark:border-slate-800'
            }`}
          >
            <label className="flex items-start gap-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consents.reminders}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    consents: {
                      ...formData.consents,
                      reminders: e.target.checked,
                    },
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {CONSENT_DEFINITIONS.reminders.title}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {CONSENT_DEFINITIONS.reminders.description}
                </p>
              </div>
            </label>
          </div>

          {/* Marketing */}
          <div
            className={`rounded-xl border p-4 transition-colors ${
              formData.consents.marketing
                ? 'border-purple-200 bg-purple-50/40 dark:border-purple-900/50 dark:bg-purple-950/20'
                : 'border-slate-200 bg-slate-50 dark:border-slate-800'
            }`}
          >
            <label className="flex items-start gap-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consents.marketing}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    consents: {
                      ...formData.consents,
                      marketing: e.target.checked,
                    },
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {CONSENT_DEFINITIONS.marketing.title}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {CONSENT_DEFINITIONS.marketing.description}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/patients/${patient.id}`}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending || !formData.consents.data_processing}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {isPending ? 'Updating Profile...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
