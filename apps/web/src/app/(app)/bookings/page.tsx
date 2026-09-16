import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { bookingRequests, patients } from '@dental-pms/db/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import {
  Inbox,
  Clock,
  Calendar,
  User as UserIcon,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { BookingFilters } from './booking-filters';
import { getChannelBadge } from './channel-badge';
import type { BookingRequestChannel } from '@dental-pms/types';

interface BookingsPageProps {
  searchParams: Promise<{
    channel?: string;
  }>;
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const { user } = await requireRole(['owner', 'receptionist']);
  const resolvedParams = await searchParams;

  const selectedChannel = resolvedParams.channel as BookingRequestChannel | undefined;

  const requests = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
    const conditions = [
      eq(bookingRequests.clinicId, user.clinicId),
      eq(bookingRequests.status, 'pending'),
    ];

    if (selectedChannel) {
      conditions.push(eq(bookingRequests.requestedVia, selectedChannel));
    }

    const rows = await tx
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
      .where(and(...conditions))
      .orderBy(bookingRequests.createdAt); // FIFO: oldest first

    return rows;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Booking Requests Queue
          </h1>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            {requests.length} Pending
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Omnichannel intake inbox from WhatsApp, AI Voice Agent, and Social Channels awaiting triage.
        </p>
      </div>

      <BookingFilters selectedChannel={selectedChannel} />

      {/* Requests Queue List */}
      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
            No pending booking requests
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            All prospective patient inquiries and voice bookings have been approved or triaged.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {requests.map((req) => {
            const channelBadge = getChannelBadge(req.requestedVia);
            const ChannelIcon = channelBadge.icon;

            const isLinked = Boolean(req.patientId);
            const displayName = req.patientName || req.rawName || 'Prospective Patient';
            const displayPhone = req.patientPhoneFromTable || req.rawPhone || 'No phone recorded';

            const start = new Date(req.requestedSlotStart);
            const end = new Date(req.requestedSlotEnd);

            const slotFormatted = start.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            const createdFormatted = new Date(req.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <Link
                key={req.id}
                href={`/bookings/${req.id}`}
                className="group block p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Patient & Channel Information */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                        {displayName}
                      </span>

                      {!isLinked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Unlinked ({displayPhone})</span>
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${channelBadge.color}`}
                      >
                        <ChannelIcon className="h-3 w-3" />
                        <span>{channelBadge.label}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 italic">
                      &ldquo;{req.reason || 'Dental appointment consultation'}&rdquo;
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Requested: {slotFormatted}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Received: {createdFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: CTA Arrow */}
                  <div className="flex items-center gap-3 shrink-0 sm:self-center">
                    <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                      Review & Triage
                    </span>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-400 group-hover:text-primary group-hover:border-primary/40 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
