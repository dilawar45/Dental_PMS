import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { clinics, simulatorSessions } from '@dental-pms/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { SimulatorChat } from './simulator-chat';

export default async function SimulatorPage() {
  const { user, clinicId } = await requireRole(['owner', 'receptionist']);

  // Fetch clinic info and recent simulator sessions (last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { clinic, sessions } = await withClinic(
    db,
    clinicId,
    async (tx: ClinicTransaction) => {
      const [c] = await tx
        .select({
          id: clinics.id,
          name: clinics.name,
          phone: clinics.phone,
        })
        .from(clinics)
        .where(eq(clinics.id, clinicId));

      const sess = await tx
        .select({
          id: simulatorSessions.id,
          channel: simulatorSessions.channel,
          phone: simulatorSessions.phone,
          label: simulatorSessions.label,
          createdAt: simulatorSessions.createdAt,
          updatedAt: simulatorSessions.updatedAt,
        })
        .from(simulatorSessions)
        .where(
          and(
            eq(simulatorSessions.clinicId, clinicId),
            gte(simulatorSessions.createdAt, twentyFourHoursAgo)
          )
        )
        .orderBy(desc(simulatorSessions.updatedAt));

      return { clinic: c, sessions: sess };
    }
  );

  const defaultClinicId = process.env['DEFAULT_CLINIC_ID'] || clinicId;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-4 md:p-6 max-w-7xl mx-auto w-full gap-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            AI Receptionist Simulator
          </h1>
          <p className="text-sm text-muted-foreground">
            Test and demonstrate clinical multi-channel AI responses, tool invocations, and live database side effects.
          </p>
        </div>
      </div>

      <SimulatorChat
        clinic={clinic}
        defaultClinicId={defaultClinicId}
        initialSessions={sessions}
        userRole={user.role}
      />
    </div>
  );
}
