'use client';

import { useActionState } from 'react';
import type { Clinic } from '@dental-pms/types';
import { updateClinicAction, type UpdateClinicState } from './actions';
import { Building2, Save, HelpCircle, Globe, DollarSign, MapPin, Phone } from 'lucide-react';

const CURRENCY_OPTIONS = [
  { code: 'PKR', label: 'PKR – Pakistani Rupee (Rs.)', symbol: 'Rs.' },
  { code: 'USD', label: 'USD – US Dollar ($)', symbol: '$' },
  { code: 'GBP', label: 'GBP – British Pound (£)', symbol: '£' },
  { code: 'EUR', label: 'EUR – Euro (€)', symbol: '€' },
  { code: 'AED', label: 'AED – UAE Dirham (د.إ)', symbol: 'د.إ' },
  { code: 'SAR', label: 'SAR – Saudi Riyal (﷼)', symbol: '﷼' },
  { code: 'CAD', label: 'CAD – Canadian Dollar ($)', symbol: 'CA$' },
  { code: 'AUD', label: 'AUD – Australian Dollar ($)', symbol: 'A$' },
];

export function ClinicForm({ clinic }: { clinic: Clinic }) {
  const [state, formAction, isPending] = useActionState<UpdateClinicState, FormData>(
    updateClinicAction,
    {}
  );

  const selectedCurrency = clinic.currency || 'PKR';

  return (
    <form action={formAction} className="space-y-6">
      {state.success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-700 dark:text-emerald-300 shadow-sm animate-in fade-in flex items-center gap-2">
          <span>✅</span>
          <span className="font-medium">Clinic profile and practice settings updated successfully.</span>
        </div>
      )}

      {state.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-600 dark:text-red-400 shadow-sm animate-in fade-in flex items-center gap-2">
          <span>❌</span>
          <span className="font-medium">{state.error}</span>
        </div>
      )}

      {/* Practice Details Card */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Practice Identification & Address
            </h2>
            <p className="text-xs text-slate-500">Essential clinic branding and public location details.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Clinic Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={clinic.name}
              placeholder="e.g. Bright Smile Dental Clinic"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="slug"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                URL Slug (Web Identifier) *
              </label>
              <span className="text-[11px] text-slate-400 flex items-center gap-1" title="Used in patient booking links and portal addresses">
                <HelpCircle className="w-3 h-3" />
                <span>Patient Link Slug</span>
              </span>
            </div>
            <div className="relative">
              <input
                id="slug"
                name="slug"
                type="text"
                required
                defaultValue={clinic.slug || ''}
                placeholder="e.g. bright-smile"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none font-mono text-xs transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your public link: <span className="font-mono text-sky-600 dark:text-sky-400 font-medium">/book/{clinic.slug || 'clinic-slug'}</span>
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Physical Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={clinic.address || ''}
              placeholder="e.g. 14-C Gulberg III, MM Alam Road, Lahore, Pakistan"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Primary Phone / WhatsApp Hotline
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="phone"
                name="phone"
                type="text"
                defaultValue={clinic.phone || ''}
                placeholder="e.g. +924235750000"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          {/* Default Billing Currency Option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="currency"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Billing Currency *
              </label>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-900">
                Default Mode
              </span>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                id="currency"
                name="currency"
                defaultValue={selectedCurrency}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition cursor-pointer"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Applied automatically to all patient treatment estimates, invoices, and payment receipts.
            </p>
          </div>
        </div>

        {/* Regional & Timezone settings */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="timezone"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Timezone *
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="timezone"
                name="timezone"
                type="text"
                required
                defaultValue={clinic.timezone}
                placeholder="e.g. Asia/Karachi"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="locale"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Locale / Regional Code *
            </label>
            <input
              id="locale"
              name="locale"
              type="text"
              required
              defaultValue={clinic.locale}
              placeholder="e.g. en-PK or Lahore"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none transition"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/20 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 transition cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isPending ? 'Saving changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
