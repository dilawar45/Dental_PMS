'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Building2,
  ShieldAlert,
  Users as UsersIcon,
  Mail,
  Activity,
  Copy,
  Check,
  Play,
  AlertTriangle,
  Lock,
  Unlock,
  Archive,
  ArrowLeft,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  enterSupportModeAction,
  updateClinicStatusAction,
  generateNewInviteAction,
} from './actions';

interface ClinicDetailClientProps {
  clinic: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    phone: string | null;
    timezone: string;
    locale: string;
    createdAt: Date;
    updatedAt: Date;
  };
  users: Array<{
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    active: boolean;
    createdAt: Date;
  }>;
  invites: Array<{
    id: string;
    email: string;
    role: string;
    token: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
  }>;
  activity: Array<{
    id: string;
    action: string;
    meta: Record<string, unknown>;
    at: Date;
  }>;
  origin: string;
}

export function ClinicDetailClient({
  clinic,
  users,
  invites,
  activity,
  origin,
}: ClinicDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'invites' | 'activity'>('settings');
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'dentist' | 'receptionist' | 'assistant'>('owner');
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<string | null>(null);

  const handleEnterSupportMode = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        await enterSupportModeAction(clinic.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to enter support mode');
      }
    });
  };

  const handleStatusChange = (newStatus: 'active' | 'suspended' | 'archived') => {
    setActionError(null);
    startTransition(async () => {
      const res = await updateClinicStatusAction(clinic.id, newStatus);
      if (!res.success) {
        setActionError(res.error || 'Failed to update clinic status');
      }
    });
  };

  const handleGenerateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    startTransition(async () => {
      const res = await generateNewInviteAction(clinic.id, inviteEmail, inviteRole);
      if (res.success && res.inviteUrl) {
        setNewlyCreatedLink(res.inviteUrl);
        setInviteEmail('');
      } else {
        setActionError(res.error || 'Failed to generate invitation');
      }
    });
  };

  const handleCopy = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/platform/clinics"
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Clinics</span>
        </Link>

        {actionError && (
          <div className="text-xs text-red-400 bg-red-950/60 border border-red-800/60 px-3 py-1.5 rounded-lg">
            {actionError}
          </div>
        )}
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{clinic.name}</h1>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
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
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Slug: /{clinic.slug} • Tenant UUID: {clinic.id}
            </p>
          </div>
        </div>

        {/* Global Clinic Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Primary Action: Enter Support Mode */}
          <button
            type="button"
            id="enter-support-mode-btn"
            disabled={isPending || clinic.status === 'archived'}
            onClick={handleEnterSupportMode}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{isPending ? 'Connecting...' : 'Enter Support Mode'}</span>
          </button>

          {/* Suspend / Reactivate */}
          {clinic.status === 'active' ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange('suspended')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold rounded-xl transition border border-rose-500/20 cursor-pointer disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Suspend</span>
            </button>
          ) : clinic.status === 'suspended' ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange('active')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl transition border border-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Reactivate</span>
            </button>
          ) : null}

          {/* Archive */}
          {clinic.status !== 'archived' && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (confirm(`Are you sure you want to archive '${clinic.name}'?`)) {
                  handleStatusChange('archived');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition border border-slate-700/60 cursor-pointer disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archive</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-slate-800 flex items-center gap-2">
        {[
          { id: 'settings', label: 'Overview & Settings', icon: Building2 },
          { id: 'users', label: `Staff Users (${users.length})`, icon: UsersIcon },
          { id: 'invites', label: `Invites (${invites.length})`, icon: Mail },
          { id: 'activity', label: 'Platform Activity', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Settings */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm text-xs">
          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-indigo-400">
              Clinic Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block">Clinic Name</span>
                <span className="text-white font-medium text-sm">{clinic.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">URL Slug</span>
                <span className="text-indigo-300 font-mono text-sm">/{clinic.slug}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Contact Phone</span>
                <span className="text-white font-mono">{clinic.phone || 'None provided'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-indigo-400">
              Environment & Regional
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block">Timezone</span>
                <span className="text-white font-mono">{clinic.timezone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Locale</span>
                <span className="text-white font-mono">{clinic.locale}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Provisioned Date</span>
                <span className="text-slate-300 font-mono">
                  {new Date(clinic.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">
                        {u.fullName || 'Clinic Staff'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        u.active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No users have completed registration yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Invites */}
      {activeTab === 'invites' && (
        <div className="space-y-6">
          {/* Newly created invite alert */}
          {newlyCreatedLink && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                ✓ Invitation Created Successfully
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={newlyCreatedLink}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(newlyCreatedLink, 'new')}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                >
                  {copiedToken === 'new' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Create New Invite Form */}
          <form
            onSubmit={handleGenerateInvite}
            className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-end gap-3"
          >
            <div className="flex-1 space-y-1 w-full">
              <label className="text-xs font-medium text-slate-300">Invite Email</label>
              <input
                type="email"
                required
                placeholder="dentist@clinic.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="w-full sm:w-44 space-y-1">
              <label className="text-xs font-medium text-slate-300">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="owner">Owner</option>
                <option value="dentist">Dentist</option>
                <option value="receptionist">Receptionist</option>
                <option value="assistant">Assistant</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shrink-0 cursor-pointer disabled:opacity-50"
            >
              Generate Invite
            </button>
          </form>

          {/* Existing Invites Table */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Target Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Expires</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invites.map((inv) => {
                  const isAccepted = Boolean(inv.acceptedAt);
                  const isExpired = Date.now() > new Date(inv.expiresAt).getTime();
                  const fullUrl = `${origin}/invite/${inv.token}`;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-mono text-white">{inv.email}</td>
                      <td className="px-6 py-4 uppercase text-[10px] font-bold text-slate-400">
                        {inv.role}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isAccepted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isExpired
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isAccepted ? 'Accepted' : isExpired ? 'Expired' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        {new Date(inv.expiresAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isAccepted && !isExpired && (
                          <button
                            type="button"
                            onClick={() => handleCopy(fullUrl, inv.token)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700 cursor-pointer"
                          >
                            {copiedToken === inv.token ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{copiedToken === inv.token ? 'Copied' : 'Copy Link'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {invites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No invitations recorded for this clinic.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Platform Activity */}
      {activeTab === 'activity' && (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-800/60">
            {activity.map((item) => (
              <div key={item.id} className="p-4 sm:px-6 hover:bg-slate-800/30 transition text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-300 font-mono text-sm">
                    {item.action}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {new Date(item.at).toLocaleString()}
                  </span>
                </div>
                {Boolean(item.meta?.['ip']) && (
                  <span className="text-slate-500 font-mono block mt-0.5">
                    IP: {String(item.meta['ip'])}
                  </span>
                )}
                <pre className="mt-2 bg-slate-950 p-2.5 rounded-lg text-[11px] text-slate-400 overflow-x-auto font-mono">
                  {JSON.stringify(item.meta, null, 2)}
                </pre>
              </div>
            ))}

            {activity.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No platform activity logged for this clinic yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
