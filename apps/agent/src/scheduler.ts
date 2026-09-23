import cron, { ScheduledTask } from 'node-cron';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getDefaultDb } from '@dental-pms/db';
import { appointments, pushRemindersSent } from '@dental-pms/db/schema';
import { sendPushToPatient } from './lib/push';

/**
 * Checks for upcoming confirmed appointments in the 24-hour and 2-hour windows
 * and sends push reminders to patients if not previously sent.
 */
export async function checkAndSendReminders(): Promise<{ sent24h: number; sent2h: number }> {
  const db = getDefaultDb();
  const now = new Date();

  // 24h Window: [now + 23h 45m, now + 24h 15m]
  const window24hStart = new Date(now.getTime() + 23.75 * 60 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 24.25 * 60 * 60 * 1000);

  // 2h Window: [now + 1h 45m, now + 2h 15m]
  const window2hStart = new Date(now.getTime() + 1.75 * 60 * 60 * 1000);
  const window2hEnd = new Date(now.getTime() + 2.25 * 60 * 60 * 1000);

  let sent24h = 0;
  let sent2h = 0;

  try {
    // 1. Process 24h reminders
    const appts24h = await db
      .select({
        id: appointments.id,
        clinicId: appointments.clinicId,
        patientId: appointments.patientId,
        startAt: appointments.startAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'confirmed'),
          gte(appointments.startAt, window24hStart),
          lte(appointments.startAt, window24hEnd)
        )
      );

    for (const appt of appts24h) {
      // Check if already sent
      const [alreadySent] = await db
        .select()
        .from(pushRemindersSent)
        .where(
          and(
            eq(pushRemindersSent.appointmentId, appt.id),
            eq(pushRemindersSent.reminderType, '24h')
          )
        )
        .limit(1);

      if (!alreadySent) {
        const timeStr = appt.startAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        await sendPushToPatient(appt.patientId, {
          title: 'Appointment Reminder',
          body: `Reminder: you have an appointment tomorrow at ${timeStr}.`,
          data: {
            appointment_id: appt.id,
            reminder_type: '24h',
          },
        });

        await db
          .insert(pushRemindersSent)
          .values({
            clinicId: appt.clinicId,
            appointmentId: appt.id,
            reminderType: '24h',
          })
          .onConflictDoNothing();

        sent24h++;
      }
    }

    // 2. Process 2h reminders
    const appts2h = await db
      .select({
        id: appointments.id,
        clinicId: appointments.clinicId,
        patientId: appointments.patientId,
        startAt: appointments.startAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'confirmed'),
          gte(appointments.startAt, window2hStart),
          lte(appointments.startAt, window2hEnd)
        )
      );

    for (const appt of appts2h) {
      // Check if already sent
      const [alreadySent] = await db
        .select()
        .from(pushRemindersSent)
        .where(
          and(
            eq(pushRemindersSent.appointmentId, appt.id),
            eq(pushRemindersSent.reminderType, '2h')
          )
        )
        .limit(1);

      if (!alreadySent) {
        await sendPushToPatient(appt.patientId, {
          title: 'Appointment Reminder',
          body: 'Your appointment is in 2 hours.',
          data: {
            appointment_id: appt.id,
            reminder_type: '2h',
          },
        });

        await db
          .insert(pushRemindersSent)
          .values({
            clinicId: appt.clinicId,
            appointmentId: appt.id,
            reminderType: '2h',
          })
          .onConflictDoNothing();

        sent2h++;
      }
    }
  } catch (err) {
    console.error('[ReminderScheduler] Error running reminder sweep:', err);
  }

  return { sent24h, sent2h };
}

/**
 * Starts the 15-minute cron job for appointment reminders.
 */
export function startReminderScheduler(): ScheduledTask {
  console.log('⏰ Starting Appointment Push Reminder Scheduler (sweeps every 15 minutes)');

  // Run every 15 minutes: at minutes 0, 15, 30, 45
  const task = cron.schedule('*/15 * * * *', async () => {
    console.log('[ReminderScheduler] Running scheduled 15-minute appointment sweep...');
    const result = await checkAndSendReminders();
    console.log(
      `[ReminderScheduler] Sweep completed. Sent: ${result.sent24h} (24h reminders), ${result.sent2h} (2h reminders).`
    );
  });

  return task;
}
