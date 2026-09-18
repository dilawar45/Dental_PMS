import { getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { clinics, users, patients } from '@dental-pms/db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  ShieldAlert,
  Users as UsersIcon,
  Filter,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PlatformClinicsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const context = await getCurrentUser();
  const actorId = context?.realUser?.id || context?.user.id;
  const params = await searchParams;

  const data = await withPlatformAdmin(
    db,
    async (tx) => {
      // Fetch clinics with owner info and patient count
      const clinicRows = await tx
        .select({
          id: clinics.id,
          name: clinics.name,
          slug: clinics.slug,
          status: clinics.status,
          phone: clinics.phone,
          createdAt: clinics.createdAt,
        })
        .from(clinics)
        .orderBy(desc(clinics.createdAt));

      // Fetch owners
      const ownerRows = await tx
        .select({
          clinicId: users.clinicId,
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.role, 'owner'));

      // Fetch patient counts
      const patientCounts = await tx
        .select({
          clinicId: patients.clinicId,
          count: sql<number>`count(*)::int`,
        })
        .from(patients)
        .groupBy(patients.clinicId);

      const ownerMap = new Map(ownerRows.map((o) => [o.clinicId, o]));
      const countMap = new Map(patientCounts.map((p) => [p.clinicId, p.count]));

      return clinicRows.map((c) => ({
        ...c,
        owner: ownerMap.get(c.id) || null,
        patientCount: countMap.get(c.id) || 0,
      }));
    },
    { actorId }
  );

  // Filter based on searchParams
  const filteredClinics = data.filter((c) => {
    if (params.status && params.status !== 'all' && c.status !== params.status) {
      return false;
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchSlug = c.slug ? c.slug.toLowerCase().includes(q) : false;
      const matchOwner = c.owner?.email.toLowerCase().includes(q) || c.owner?.fullName.toLowerCase().includes(q);
      if (!matchName && !matchSlug && !matchOwner) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Clinics Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage provisioned tenant clinics, inspect owners, and enter Support Mode.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/platform/clinics/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Clinic</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 rounded-xl p-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Pending', value: 'pending' },
            { label: 'Suspended', value: 'suspended' },
            { label: 'Archived', value: 'archived' },
          ].map((tab) => {
            const isSelected = (!params.status && tab.value === 'all') || params.status === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/platform/clinics?${new URLSearchParams({
                  ...(params.search ? { search: params.search } : {}),
                  status: tab.value,
                }).toString()}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Search Input */}
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Search clinics or owners..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {params.status && (
            <input type="hidden" name="status" value={params.status} />
          )}
        </form>
      </div>

      {/* Clinics Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Clinic Name & Slug</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Primary Owner</th>
                <th className="px-6 py-3.5">Patients</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">{clinic.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        /{clinic.slug}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        clinic.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : clinic.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : clinic.status === 'suspended'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {clinic.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {clinic.owner ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">
                          {clinic.owner.fullName || 'Clinic Owner'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {clinic.owner.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px]">
                        No owner assigned (Pending invite)
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-white text-xs">{clinic.patientCount}</span>
                  </td>

                  <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                    {new Date(clinic.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/platform/clinics/${clinic.id}`}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition border border-slate-700/60"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredClinics.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No clinics match the current filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
