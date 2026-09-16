import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { db } from '@/lib/db';
import { patients, appointments } from '@dental-pms/db/schema';
import { sql, eq, and, or, ilike, isNull, desc, asc, type SQL } from 'drizzle-orm';
import type { PatientListItem } from './patient-table';

export interface PatientSearchParams {
  q?: string;
  gender?: string;
  upcoming?: string;
  lastVisitDays?: string;
  minAge?: string;
  maxAge?: string;
  showArchived?: string;
  sort?: string;
  page?: string;
}

export async function getPatients(
  clinicId: string,
  params: PatientSearchParams
): Promise<{
  patients: PatientListItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}> {
  const pageSize = 25;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const offset = (currentPage - 1) * pageSize;

  return await withClinic(db, clinicId, async (tx: ClinicTransaction) => {
    // 1. Build where conditions
    const conditions: SQL[] = [];

    // Soft delete filter
    if (params.showArchived !== 'true') {
      conditions.push(isNull(patients.deletedAt));
    }

    // Search query (fullName, phone, email)
    if (params.q?.trim()) {
      const query = `%${params.q.trim()}%`;
      conditions.push(
        or(
          ilike(patients.fullName, query),
          ilike(patients.phone, query),
          ilike(patients.email, query)
        )!
      );
    }

    // Gender filter
    if (params.gender && params.gender !== 'all') {
      conditions.push(eq(patients.gender, params.gender));
    }

    // Age range filters (via dob)
    if (params.minAge) {
      const minAgeNum = parseInt(params.minAge, 10);
      if (!isNaN(minAgeNum)) {
        // Born before or on: now - minAge years
        conditions.push(sql`${patients.dob} <= (CURRENT_DATE - INTERVAL '${sql.raw(minAgeNum.toString())} years')`);
      }
    }

    if (params.maxAge) {
      const maxAgeNum = parseInt(params.maxAge, 10);
      if (!isNaN(maxAgeNum)) {
        // Born after or on: now - (maxAge + 1) years
        conditions.push(sql`${patients.dob} >= (CURRENT_DATE - INTERVAL '${sql.raw((maxAgeNum + 1).toString())} years')`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Subquery expressions for appointments
    const totalVisitsSql = sql<number>`(
      SELECT count(*)::int
      FROM ${appointments} a
      WHERE a.patient_id = ${patients.id}
        AND a.status = 'completed'
    )`;

    const lastVisitSql = sql<string | null>`(
      SELECT max(a.start_at)::text
      FROM ${appointments} a
      WHERE a.patient_id = ${patients.id}
        AND a.status = 'completed'
    )`;

    const hasUpcomingSql = sql<boolean>`EXISTS (
      SELECT 1
      FROM ${appointments} a
      WHERE a.patient_id = ${patients.id}
        AND a.start_at > NOW()
        AND a.status IN ('scheduled', 'confirmed')
    )`;

    // Additional where filters based on appointments subqueries if requested
    const havingConditions: SQL[] = [];
    if (params.upcoming === 'yes') {
      havingConditions.push(sql`${hasUpcomingSql} = TRUE`);
    } else if (params.upcoming === 'no') {
      havingConditions.push(sql`${hasUpcomingSql} = FALSE`);
    }

    if (params.lastVisitDays && params.lastVisitDays !== 'all') {
      const days = parseInt(params.lastVisitDays, 10);
      if (!isNaN(days)) {
        havingConditions.push(
          sql`(${lastVisitSql})::timestamptz <= (NOW() - INTERVAL '${sql.raw(days.toString())} days')`
        );
      }
    }

    const finalWhere = havingConditions.length > 0
      ? whereClause
        ? and(whereClause, ...havingConditions)
        : and(...havingConditions)
      : whereClause;

    // Determine sorting
    let orderBySql: SQL;
    switch (params.sort) {
      case 'name_asc':
        orderBySql = asc(patients.fullName);
        break;
      case 'name_desc':
        orderBySql = desc(patients.fullName);
        break;
      case 'created_at_desc':
        orderBySql = desc(patients.createdAt);
        break;
      case 'last_visit_asc':
        orderBySql = sql`${lastVisitSql} ASC NULLS FIRST`;
        break;
      case 'last_visit_desc':
      default:
        orderBySql = sql`${lastVisitSql} DESC NULLS LAST`;
        break;
    }

    // 2. Count total matching rows
    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(patients)
      .where(finalWhere);

    const totalCount = countResult?.count ?? 0;

    // 3. Query paginated rows
    const rows = await tx
      .select({
        id: patients.id,
        fullName: patients.fullName,
        phone: patients.phone,
        email: patients.email,
        dob: patients.dob,
        gender: patients.gender,
        deletedAt: patients.deletedAt,
        createdAt: patients.createdAt,
        totalVisits: totalVisitsSql,
        lastVisitDate: lastVisitSql,
        hasUpcoming: hasUpcomingSql,
      })
      .from(patients)
      .where(finalWhere)
      .orderBy(orderBySql)
      .limit(pageSize)
      .offset(offset);

    // Compute age in application layer
    const items: PatientListItem[] = rows.map((r) => {
      let age: number | null = null;
      if (r.dob) {
        const birthDate = new Date(r.dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        id: r.id,
        fullName: r.fullName,
        phone: r.phone,
        email: r.email,
        dob: r.dob,
        age,
        gender: r.gender,
        totalVisits: r.totalVisits || 0,
        lastVisitDate: r.lastVisitDate,
        hasUpcoming: Boolean(r.hasUpcoming),
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return {
      patients: items,
      totalCount,
      currentPage,
      pageSize,
    };
  });
}
