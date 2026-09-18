'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClinicAction, type CreateClinicInput } from './actions';
import {
  Building2,
  Mail,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function NewClinicPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateClinicInput>({
    name: '',
    slug: '',
    ownerEmail: '',
    ownerName: '',
    phone: '',
    timezone: 'Asia/Karachi',
    locale: 'en-PK',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdResult, setCreatedResult] = useState<{
    clinicId: string;
    inviteUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-slugify when typing name if slug hasn't been manually diverged
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === '' || prev.slug === autoSlug.slice(0, prev.slug.length) ? autoSlug : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await createClinicAction(formData);
      if (!res.success) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      } else {
        setCreatedResult({
          clinicId: res.clinicId,
          inviteUrl: res.inviteUrl,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (createdResult) {
      navigator.clipboard.writeText(createdResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <div className="flex items-center gap-2">
        <Link
          href="/platform/clinics"
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Clinics</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Create New Clinic</h1>
        <p className="text-sm text-slate-400 mt-1">
          Provision an isolated tenant environment and generate an invitation link for the clinic owner.
        </p>
      </div>

      {createdResult ? (
        /* Success State: Show Invitation Link */
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Clinic Successfully Provisioned!</h2>
              <p className="text-xs text-slate-400">
                Clinic status is set to <strong className="text-amber-400 font-mono">pending</strong> until the owner completes onboarding.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
              Single-Use Owner Invitation Link (72h Expiry)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdResult.inviteUrl}
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow cursor-pointer shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Send this link to <span className="text-slate-300 font-semibold">{formData.ownerEmail}</span>. When they open it, they will set their password and activate the clinic.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <Link
              href={`/platform/clinics/${createdResult.clinicId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
            >
              <span>Manage Clinic</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/platform/clinics"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Return to Clinics List →
            </Link>
          </div>
        </div>
      ) : (
        /* Form State */
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm"
        >
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2">
              1. Clinic Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-300">
                  Clinic Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Dental Practice"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
                {fieldErrors['name'] && (
                  <p className="text-[11px] text-red-400">{fieldErrors['name']}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Clinic Slug <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center">
                  <span className="bg-slate-800 border border-r-0 border-slate-700/80 rounded-l-xl px-3 py-2.5 text-xs text-slate-400 select-none">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="acme-dental"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                    }
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-r-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono transition"
                  />
                </div>
                {fieldErrors['slug'] && (
                  <p className="text-[11px] text-red-400">{fieldErrors['slug']}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+923001234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2 pt-4">
              2. Primary Clinic Owner
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-300">
                  Owner Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@acmedental.com"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
                {fieldErrors['ownerEmail'] && (
                  <p className="text-[11px] text-red-400">{fieldErrors['ownerEmail']}</p>
                )}
                <p className="text-[11px] text-slate-500">
                  The invitation link will be registered specifically to this email address.
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-300">Owner Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Dr. Jane Doe"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-2 pt-4">
              3. Localization
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Timezone</label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="Asia/Karachi">Asia/Karachi (PKT, UTC+5)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Locale</label>
                <select
                  value={formData.locale}
                  onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="en-PK">en-PK (English - Pakistan)</option>
                  <option value="en-US">en-US (English - US)</option>
                  <option value="en-GB">en-GB (English - UK)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/platform/clinics"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Provisioning Clinic...' : 'Create Clinic & Generate Invite'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
