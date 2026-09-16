import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { chartingEntries, users } from '@dental-pms/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { UserRole } from '@dental-pms/types';
import { DentalChart } from '@/components/dental-chart/dental-chart';
import type { ChartingEntryItem } from '@/components/dental-chart/chart-types';

interface ChartTabProps {
  patientId: string;
  patientName: string;
  patientDob?: string | null;
  userRole: UserRole;
  clinicId: string;
}

export async function ChartTab({
  patientId,
  patientName,
  patientDob,
  userRole,
  clinicId,
}: ChartTabProps) {
  // 1. Calculate patient age if DOB is present
  let patientAge: number | null = null;
  if (patientDob) {
    const birthDate = new Date(patientDob);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      patientAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        patientAge--;
      }
    }
  }

  // 2. Fetch all append-only charting entries scoped to the active clinic
  const rows = await withClinic(db, clinicId, async (tx: ClinicTransaction) => {
    return await tx
      .select({
        id: chartingEntries.id,
        toothFdi: chartingEntries.toothFdi,
        surface: chartingEntries.surface,
        condition: chartingEntries.condition,
        notes: chartingEntries.notes,
        recordedAt: chartingEntries.recordedAt,
        recordedByName: users.fullName,
      })
      .from(chartingEntries)
      .leftJoin(users, eq(chartingEntries.recordedBy, users.id))
      .where(
        and(
          eq(chartingEntries.patientId, patientId),
          eq(chartingEntries.clinicId, clinicId)
        )
      )
      .orderBy(asc(chartingEntries.recordedAt));
  });

  const initialEntries: ChartingEntryItem[] = rows.map((r) => ({
    id: r.id,
    toothFdi: r.toothFdi,
    surface: r.surface,
    condition: r.condition,
    notes: r.notes,
    recordedAt: r.recordedAt.toISOString(),
    recordedByName: r.recordedByName || 'Dentist',
  }));

  return (
    <div className="space-y-6">
      <DentalChart
        patientId={patientId}
        patientName={patientName}
        patientAge={patientAge}
        initialEntries={initialEntries}
        userRole={userRole}
      />
    </div>
  );
}
