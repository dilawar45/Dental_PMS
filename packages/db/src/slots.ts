import { and, eq, notInArray, gte, lt, inArray } from 'drizzle-orm';
import { appointments } from './schema/appointments';
import { users } from './schema/users';
import type { ClinicTransaction } from './index';

export interface Slot {
  start: string;
  end: string;
  start_at: string;
  end_at: string;
  dentist_id: string;
  dentist_name?: string | null;
}

export interface GetAvailableSlotsParams {
  clinicId: string;
  date: string; // 'YYYY-MM-DD', 'today', 'upcoming'
  dentistId?: string;
  limit?: number;
}

export interface AvailableSlotsResult {
  date: string;
  available_slots: Slot[];
}

/**
 * Formats a Date to YYYY-MM-DD in Asia/Karachi (+05:00).
 */
export function getKarachiDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Generates available 30-minute appointment slots between 09:00 and 19:00 Asia/Karachi.
 * Excludes overlapping booked appointments for active dentists.
 * Must be executed inside a clinic-scoped transaction.
 */
export async function getAvailableSlots(
  tx: ClinicTransaction,
  params: GetAvailableSlotsParams
): Promise<AvailableSlotsResult> {
  const { clinicId, date, dentistId, limit = 50 } = params;

  // 1. Resolve dentists to consider
  let activeDentists: Array<{ id: string; fullName: string }> = [];
  if (dentistId) {
    const [dentist] = await tx
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(and(eq(users.id, dentistId), eq(users.clinicId, clinicId)))
      .limit(1);
    if (dentist) {
      activeDentists = [dentist];
    }
  }

  if (activeDentists.length === 0) {
    activeDentists = await tx
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(
        and(
          eq(users.clinicId, clinicId),
          inArray(users.role, ['dentist', 'owner'])
        )
      );
  }

  // If still no dentist configured, return empty
  if (activeDentists.length === 0) {
    return {
      date,
      available_slots: [],
    };
  }

  // 2. Resolve target dates
  const datesToScan: string[] = [];
  const karachiTodayStr = getKarachiDateString();

  if (date === 'upcoming') {
    // Next 7 days starting tomorrow
    const baseDate = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      datesToScan.push(getKarachiDateString(d));
    }
  } else if (date === 'today') {
    datesToScan.push(karachiTodayStr);
  } else {
    // Specific YYYY-MM-DD format
    datesToScan.push(date);
  }

  const availableSlots: Slot[] = [];

  // 3. Scan dates until limit is reached
  for (const targetDate of datesToScan) {
    if (availableSlots.length >= limit) break;

    // Start of clinic hours: 09:00 PKT (+05:00)
    // End of clinic hours: 19:00 PKT (+05:00)
    const dayStart = new Date(`${targetDate}T09:00:00+05:00`);
    const dayEnd = new Date(`${targetDate}T19:00:00+05:00`);

    // Query appointments on this day
    const existingAppointments = await tx
      .select({
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        dentistId: appointments.dentistId,
      })
      .from(appointments)
      .where(
        and(
          notInArray(appointments.status, ['cancelled', 'no_show']),
          gte(appointments.startAt, dayStart),
          lt(appointments.startAt, dayEnd),
          dentistId ? eq(appointments.dentistId, dentistId) : undefined
        )
      );

    // Generate 30-minute intervals
    let cursor = new Date(dayStart.getTime());
    while (cursor < dayEnd && availableSlots.length < limit) {
      const slotStart = new Date(cursor.getTime());
      const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);

      for (const dentist of activeDentists) {
        if (availableSlots.length >= limit) break;

        const isOverlapping = existingAppointments.some((appt) => {
          if (appt.dentistId !== dentist.id) return false;
          const apptStart = new Date(appt.startAt).getTime();
          const apptEnd = new Date(appt.endAt).getTime();
          return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
        });

        if (!isOverlapping) {
          const startIso = slotStart.toISOString();
          const endIso = slotEnd.toISOString();
          availableSlots.push({
            start: startIso,
            end: endIso,
            start_at: startIso,
            end_at: endIso,
            dentist_id: dentist.id,
            dentist_name: dentist.fullName,
          });
        }
      }

      cursor = new Date(cursor.getTime() + 30 * 60 * 1000);
    }
  }

  return {
    date,
    available_slots: availableSlots.slice(0, limit),
  };
}
