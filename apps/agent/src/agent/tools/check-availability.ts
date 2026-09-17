import { z } from 'zod';
import { and, eq, notInArray, gte, lt, inArray } from 'drizzle-orm';
import { appointments, users } from '@dental-pms/db/schema';
import type { ToolSpec } from '../../llm/base';
import { runInClinic, getClinicIdFromContext } from '../../db/context';

export const TOOL_NAME = 'check_availability';
export const TOOL_DESCRIPTION =
  'Query available appointment calendar slots for a date range, dentist, or procedure.';

export const checkAvailabilityInputSchema = z.object({
  date: z.string().describe("Target date in YYYY-MM-DD format (or 'today', 'upcoming')"),
  dentist_id: z.string().uuid().optional().describe('Optional UUID of specific dentist'),
  procedure: z.string().optional().describe('Optional procedure name or code'),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilityInputSchema>;

export interface Slot {
  start: string;
  end: string;
  start_at: string;
  end_at: string;
  dentist_id: string;
  dentist_name?: string | null;
}

export interface CheckAvailabilityOutput {
  date: string;
  available_slots: Slot[];
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: "Target date in YYYY-MM-DD format (or 'today', 'upcoming')",
      },
      dentist_id: {
        type: 'string',
        description: 'Optional UUID of specific dentist',
      },
      procedure: {
        type: 'string',
        description: 'Optional procedure name or code',
      },
    },
    required: ['date'],
  },
};

/**
 * Formats a Date to YYYY-MM-DD in Asia/Karachi (+05:00).
 */
function getKarachiDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export async function execute(
  input: CheckAvailabilityInput,
  context?: Record<string, unknown>
): Promise<CheckAvailabilityOutput> {
  const clinicId = getClinicIdFromContext(context);

  return await runInClinic(clinicId, async (tx) => {
    // 1. Resolve dentists to consider
    let activeDentists: Array<{ id: string; fullName: string }> = [];
    if (input.dentist_id) {
      const [dentist] = await tx
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(and(eq(users.id, input.dentist_id), eq(users.clinicId, clinicId)))
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
        date: input.date,
        available_slots: [],
      };
    }

    // 2. Resolve target dates
    const datesToScan: string[] = [];
    const karachiTodayStr = getKarachiDateString();

    if (input.date === 'upcoming') {
      // Next 7 days starting tomorrow
      const baseDate = new Date();
      for (let i = 1; i <= 7; i++) {
        const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        datesToScan.push(getKarachiDateString(d));
      }
    } else if (input.date === 'today') {
      datesToScan.push(karachiTodayStr);
    } else {
      // Specific YYYY-MM-DD format
      datesToScan.push(input.date);
    }

    const availableSlots: Slot[] = [];

    // 3. Scan dates until 10 slots are collected
    for (const targetDate of datesToScan) {
      if (availableSlots.length >= 10) break;

      // Start of clinic hours: 09:00 PKT (04:00 UTC)
      // End of clinic hours: 19:00 PKT (14:00 UTC)
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
            input.dentist_id ? eq(appointments.dentistId, input.dentist_id) : undefined
          )
        );

      // Generate 30-minute intervals
      let cursor = new Date(dayStart.getTime());
      while (cursor < dayEnd && availableSlots.length < 10) {
        const slotStart = new Date(cursor.getTime());
        const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);

        for (const dentist of activeDentists) {
          if (availableSlots.length >= 10) break;

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
      date: input.date,
      available_slots: availableSlots.slice(0, 10),
    };
  });
}
