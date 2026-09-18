import { db } from '@/lib/db';
import { clinicInvites, clinics } from '@dental-pms/db/schema';
import { eq } from 'drizzle-orm';
import { InviteFormClient } from './invite-form-client';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InviteAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 1. Fetch invite
  const [invite] = await db
    .select()
    .from(clinicInvites)
    .where(eq(clinicInvites.token, token));

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Invalid Invitation</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This invitation link does not exist or has been removed. Please contact your platform administrator.
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // 2. Check if already accepted
  if (invite.acceptedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Invitation Already Accepted</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This invitation link has already been used. Please log in with your credentials to access your dashboard.
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // 3. Check if expired
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Invitation Expired</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This invitation link expired on {new Date(invite.expiresAt).toLocaleDateString()}. Please request a new invitation from your platform administrator.
          </p>
        </div>
      </div>
    );
  }

  // 4. Fetch clinic name
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, invite.clinicId));

  return (
    <InviteFormClient
      token={token}
      clinicName={clinic?.name || 'Your Dental Clinic'}
      email={invite.email}
      role={invite.role}
    />
  );
}
