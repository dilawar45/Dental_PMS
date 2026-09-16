'use client';

import { useState, useTransition } from 'react';
import type { User, UserRole } from '@dental-pms/types';
import { updateUserRoleAction, toggleUserActiveAction } from './actions';
import { ShieldCheck, UserCheck, UserX, AlertCircle } from 'lucide-react';

interface UserListProps {
  currentUserId: string;
  users: User[];
}

export function UserList({ currentUserId, users }: UserListProps) {
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleRoleChange = (targetUserId: string, newRole: UserRole) => {
    setFeedbackMsg(null);
    startTransition(async () => {
      try {
        await updateUserRoleAction(targetUserId, newRole);
        setFeedbackMsg({ type: 'success', text: 'User role updated successfully.' });
      } catch (err: unknown) {
        setFeedbackMsg({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to update role.',
        });
      }
    });
  };

  const handleToggleActive = (targetUserId: string, currentActive: boolean) => {
    setFeedbackMsg(null);
    startTransition(async () => {
      try {
        await toggleUserActiveAction(targetUserId, currentActive);
        setFeedbackMsg({
          type: 'success',
          text: `User account has been ${currentActive ? 'deactivated' : 'activated'}.`,
        });
      } catch (err: unknown) {
        setFeedbackMsg({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to update status.',
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {feedbackMsg && (
        <div
          className={`rounded-xl p-3.5 text-sm flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {u.fullName}
                          {isSelf && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{u.email}</div>
                      </div>
                    </td>

                    {/* Role Dropdown */}
                    <td className="px-6 py-4">
                      <select
                        disabled={isPending || isSelf}
                        defaultValue={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="owner">Owner</option>
                        <option value="dentist">Dentist</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="assistant">Assistant</option>
                      </select>
                    </td>

                    {/* Active Status Badge */}
                    <td className="px-6 py-4">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Toggle Active Action */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={isPending || isSelf}
                        onClick={() => handleToggleActive(u.id, u.active)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          u.active
                            ? 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {u.active ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
