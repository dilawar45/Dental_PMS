'use client';

import { useState, useTransition } from 'react';
import {
  Users,
  Search,
  Key,
  Power,
  ShieldCheck,
  Building2,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  togglePlatformUserActiveAction,
  resetPlatformUserPasswordAction,
} from './actions';

interface PlatformUser {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  active: boolean;
  clinicId: string | null;
  clinicName: string | null;
  createdAt: Date;
}

interface PlatformUsersClientProps {
  users: PlatformUser[];
}

export function PlatformUsersClient({ users }: PlatformUsersClientProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ msg: string; error?: boolean } | null>(null);

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<PlatformUser | null>(null);
  const [tempPassword, setTempPassword] = useState('Pass123456!');

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchName = u.fullName?.toLowerCase().includes(q);
      const matchClinic = u.clinicName?.toLowerCase().includes(q);
      if (!matchEmail && !matchName && !matchClinic) return false;
    }
    return true;
  });

  const handleToggleActive = (user: PlatformUser) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await togglePlatformUserActiveAction(user.id, !user.active);
      if (res.success) {
        setFeedback({ msg: `User ${user.email} status updated.` });
      } else {
        setFeedback({ msg: res.error || 'Failed to update status', error: true });
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await resetPlatformUserPasswordAction(resetModalUser.id, tempPassword);
      if (res.success) {
        setFeedback({ msg: `Password reset successfully for ${resetModalUser.email}` });
        setResetModalUser(null);
      } else {
        setFeedback({ msg: res.error || 'Failed to reset password', error: true });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Platform Users Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global directory of super-admins, clinic owners, and medical staff across all tenants.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
            feedback.error
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {feedback.error ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 rounded-xl p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All Roles', value: 'all' },
            { label: 'Super-Admin', value: 'super_admin' },
            { label: 'Owner', value: 'owner' },
            { label: 'Dentist', value: 'dentist' },
            { label: 'Receptionist', value: 'receptionist' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                roleFilter === tab.value
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, or clinic..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Tenant Clinic</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">
                        {u.fullName || 'User'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        u.role === 'super_admin'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : u.role === 'owner'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {u.clinicName ? (
                      <span className="text-slate-300 font-medium">{u.clinicName}</span>
                    ) : (
                      <span className="text-indigo-400 font-mono text-[11px]">
                        Global Platform
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        u.active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setResetModalUser(u)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition border border-slate-700/60 cursor-pointer"
                        title="Reset Password"
                      >
                        <Key className="h-3.5 w-3.5" />
                      </button>

                      {u.role !== 'super_admin' && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-lg transition border cursor-pointer ${
                            u.active
                              ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border-slate-700/60'
                              : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-400 border-slate-700/60'
                          }`}
                          title={u.active ? 'Disable Account' : 'Activate Account'}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No platform users matched your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Reset Password for {resetModalUser.email}
            </h3>
            <p className="text-xs text-slate-400">
              Set a temporary password for this account. They will be able to log in immediately with these credentials.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
