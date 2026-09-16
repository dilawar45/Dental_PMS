import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { bookingRequests, patients, users } from '@dental-pms/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  AlertTriangle,
  User as UserIcon,
  ExternalLink,
} from 'lucide-react';
import { getChannelBadge } from '../channel-badge';
import { BookingTriageCard } from './booking-triage-card';

interface BookingDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { user } = await requireRole(['owner', 'receptionist']);
  const { id } = await params;

  const data = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
    const [req] = await tx
      .select({
        id: bookingRequests.id,
        patientId: bookingRequests.patientId,
        patientName: patients.fullName,
        patientPhoneFromTable: patients.phone,
        rawPhone: bookingRequests.patientPhone,
        rawName: bookingRequests.patientName,
        requestedSlotStart: bookingRequests.requestedSlotStart,
        requestedSlotEnd: bookingRequests.requestedSlotEnd,
        reason: bookingRequests.reason,
        notes: bookingRequests.notes,
        status: bookingRequests.status,
        requestedVia: bookingRequests.requestedVia,
        createdAt: bookingRequests.createdAt,
      })
      .from(bookingRequests)
      .leftJoin(patients, eq(bookingRequests.patientId, patients.id))
      .where(and(eq(bookingRequests.id, id), eq(bookingRequests.clinicId, user.clinicId)));

    if (!req) return null;

    const dentistRows = await tx
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.clinicId, user.clinicId),
          inArray(users.role, ['dentist', 'owner']),
          eq(users.active, true)
        )
      )
      .orderBy(users.fullName);

    const patientRows = await tx
      .select({
        id: patients.id,
        fullName: patients.fullName,
        phone: patients.phone,
      })
      .from(patients)
      .where(and(eq(patients.clinicId, user.clinicId), isNull(patients.deletedAt)))
      .orderBy(patients.fullName);

    return { request: req, activeDentists: dentistRows, activePatients: patientRows };
  });

  if (!data || !data.request) {
    notFound();
  }

  const { request, activeDentists, activePatients } = data;
  const channelBadge = getChannelBadge(request.requestedVia);
  const ChannelIcon = channelBadge.icon;

  const isLinked = Boolean(request.patientId);
  const displayName = request.patientName || request.rawName || 'Prospective Patient';
  const effectivePhone = request.patientPhoneFromTable || request.rawPhone || 'Not provided';

  const start = new Date(request.requestedSlotStart);
  const end = new Date(request.requestedSlotEnd);

  const formattedSlot = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const createdFormatted = new Date(request.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/bookings"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Booking Request Triage
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Inquiry #{request.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border shadow-sm ${channelBadge.color}`}
          >
            <ChannelIcon className="h-3.5 w-3.5" />
            <span>{channelBadge.label}</span>
          </span>

          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              request.status === 'pending'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : request.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            {request.status}
          </span>
        </div>
      </div>

      {/* Inquiry Summary Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
        {/* Patient Status Alert / Profile */}
        <div
          className={`rounded-lg p-4 border ${
            isLinked
              ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/60 dark:border-slate-800/60'
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isLinked ? 'Registered Patient' : 'Unlinked Inquirer'}
                </p>
                {!isLinked && (
                  <span className="rounded bg-amber-200 dark:bg-amber-900/80 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:text-amber-200">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {displayName}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{effectivePhone}</span>
              </p>
            </div>

            {isLinked && (
              <Link
                href={`/patients/${request.patientId}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline self-start sm:self-auto"
              >
                <span>View Full Patient Chart</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Requested Slot & Timestamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Requested Date & Slot</span>
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formattedSlot}</p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Inquiry Received</span>
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{createdFormatted}</p>
          </div>
        </div>

        {/* Reason / Transcribed Message */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Patient Inquiry / Reason for Visit
          </p>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/60 text-sm font-medium text-slate-800 dark:text-slate-200 italic">
            &ldquo;{request.reason || 'No description provided.'}&rdquo;
          </div>
        </div>

        {request.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Internal Triage Notes
            </p>
            <p className="text-xs text-slate-500 whitespace-pre-wrap">{request.notes}</p>
          </div>
        )}
      </div>

      {/* Triage Action Interface (only for pending requests) */}
      {request.status === 'pending' && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Triage & Decision
          </h3>
          <BookingTriageCard
            booking={{
              id: request.id,
              patientId: request.patientId,
              patientName: request.patientName,
              rawName: request.rawName,
              phone: effectivePhone,
              requestedSlotStart: request.requestedSlotStart.toISOString(),
              requestedSlotEnd: request.requestedSlotEnd.toISOString(),
              reason: request.reason,
              status: request.status,
              requestedVia: request.requestedVia,
            }}
            dentists={activeDentists}
            patients={activePatients}
          />
        </div>
      )}
    </div>
  );
}
