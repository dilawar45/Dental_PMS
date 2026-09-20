import { NextResponse } from 'next/server';
import { and, eq, asc } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { chartingEntries } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);

    const entries = await withClinic(auth.clinic_id, async (tx) => {
      return await tx
        .select({
          id: chartingEntries.id,
          toothFdi: chartingEntries.toothFdi,
          surface: chartingEntries.surface,
          condition: chartingEntries.condition,
          recordedAt: chartingEntries.recordedAt,
          notes: chartingEntries.notes,
        })
        .from(chartingEntries)
        .where(
          and(
            eq(chartingEntries.clinicId, auth.clinic_id),
            eq(chartingEntries.patientId, auth.patient_id)
          )
        )
        .orderBy(asc(chartingEntries.recordedAt));
    });

    // Reduce entries into tooth -> surface latest condition map
    const teethMap: Record<
      string,
      {
        tooth_fdi: string;
        whole_condition: string;
        surfaces: Record<string, string>;
        notes: string[];
      }
    > = {};

    for (const entry of entries) {
      if (!teethMap[entry.toothFdi]) {
        teethMap[entry.toothFdi] = {
          tooth_fdi: entry.toothFdi,
          whole_condition: 'healthy',
          surfaces: {},
          notes: [],
        };
      }

      const tooth = teethMap[entry.toothFdi]!;

      if (entry.surface === 'whole') {
        tooth.whole_condition = entry.condition;
      }
      tooth.surfaces[entry.surface] = entry.condition;

      if (entry.notes && entry.notes.trim()) {
        tooth.notes.push(entry.notes.trim());
      }
    }

    return withCors(NextResponse.json({ teeth: teethMap }), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
