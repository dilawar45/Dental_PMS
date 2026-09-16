'use client';

import { useActionState } from 'react';
import type { Clinic } from '@dental-pms/types';
import { updateClinicAction, type UpdateClinicState } from './actions';
import { Building2, Save } from 'lucide-react';

export function ClinicForm({ clinic }: { clinic: Clinic }) {
  const [state, formAction, isPending] = useActionState<UpdateClinicState, FormData>(
    updateClinicAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-700 dark:text-emerald-300">
          ✅ Clinic profile and practice settings updated successfully.
        </div>
      )}

      {state.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-600 dark:text-red-400">
          ❌ {state.error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Practice Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
            >
              Clinic Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={clinic.name}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
            >
              URL Slug *
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              defaultValue={clinic.slug || ''}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
          >
            Physical Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={clinic.address || ''}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
            >
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              defaultValue={clinic.phone || ''}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="timezone"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
            >
              Timezone *
            </label>
            <input
              id="timezone"
              name="timezone"
              type="text"
              required
              defaultValue={clinic.timezone}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="locale"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1"
            >
              Locale *
            </label>
            <input
              id="locale"
              name="locale"
              type="text"
              required
              defaultValue={clinic.locale}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-all"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving changes...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </form>
  );
}
