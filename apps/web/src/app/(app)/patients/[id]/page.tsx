import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import {
  patients,
  appointments,
  treatments,
  files,
  consents,
  auditLog,
  users,
} from '@dental-pms/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Stethoscope,
  Activity,
  HardDrive,
  ShieldCheck,
  History,
  User,
  CheckCircle2,
} from 'lucide-react';

import { OverviewTab } from './tabs/overview-tab';
import { AppointmentsTab, type PatientAppointmentItem } from './tabs/appointments-tab';
import { TreatmentsTab } from './tabs/treatments-tab';
import { ChartTab } from './tabs/chart-tab';
import { FilesTab, type PatientFileItem } from './tabs/files-tab';
import { ConsentsTab } from './tabs/consents-tab';
import { AuditTab, type PatientAuditItem } from './tabs/audit-tab';

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; created?: string }>;
}

export default async function PatientDetailPage({
  params,
  searchParams,
}: PatientDetailPageProps) {
  const { user } = await requireUser();
  const { id: patientId } = await params;
  const { tab = 'overview', created } = await searchParams;

  const data = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
    // 1. Fetch patient
    const [patientRow] = await tx
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

    if (!patientRow) {
      return null;
    }

    // 2. Fetch appointments joined with dentist
    const aptRows = await tx
      .select({
        id: appointments.id,
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        dentistName: users.fullName,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.dentistId, users.id))
      .where(and(eq(appointments.patientId, patientId), eq(appointments.clinicId, user.clinicId)))
      .orderBy(desc(appointments.startAt));

    const patientAppointments: PatientAppointmentItem[] = aptRows.map((a) => ({
      id: a.id,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status,
      reason: a.reason,
      notes: a.notes,
      dentistName: a.dentistName || 'Attending Dentist',
    }));

    // 3. Fetch treatments
    const treatmentRows = await tx
      .select()
      .from(treatments)
      .where(and(eq(treatments.patientId, patientId), eq(treatments.clinicId, user.clinicId)))
      .orderBy(desc(treatments.createdAt));

    // 4. Fetch files
    const fileRows = await tx
      .select({
        id: files.id,
        kind: files.kind,
        storageKey: files.storageKey,
        mime: files.mime,
        size: files.size,
        uploadedAt: files.uploadedAt,
        uploaderName: users.fullName,
      })
      .from(files)
      .leftJoin(users, eq(files.uploadedBy, users.id))
      .where(and(eq(files.patientId, patientId), eq(files.clinicId, user.clinicId)))
      .orderBy(desc(files.uploadedAt));

    const patientFiles: PatientFileItem[] = fileRows.map((f) => ({
      id: f.id,
      kind: f.kind,
      storageKey: f.storageKey,
      mime: f.mime,
      size: f.size,
      uploadedAt: f.uploadedAt.toISOString(),
      uploaderName: f.uploaderName,
    }));

    // 5. Fetch consents
    const consentRows = await tx
      .select()
      .from(consents)
      .where(and(eq(consents.patientId, patientId), eq(consents.clinicId, user.clinicId)))
      .orderBy(desc(consents.grantedAt));

    // 6. Fetch audit logs
    const auditRows = await tx
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        at: auditLog.at,
        meta: auditLog.meta,
        actorName: users.fullName,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .where(
        and(
          eq(auditLog.clinicId, user.clinicId),
          or(
            and(eq(auditLog.entity, 'patient'), eq(auditLog.entityId, patientId)),
            and(eq(auditLog.entity, 'consent'), eq(auditLog.entityId, patientId)),
            and(eq(auditLog.entity, 'file'), eq(auditLog.entityId, patientId))
          )
        )
      )
      .orderBy(desc(auditLog.at));

    const patientAuditLogs: PatientAuditItem[] = auditRows.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      actorName: a.actorName,
      at: a.at.toISOString(),
      meta: a.meta as Record<string, unknown> | null,
    }));

    return {
      patient: patientRow,
      appointments: patientAppointments,
      treatments: treatmentRows,
      files: patientFiles,
      consents: consentRows,
      auditLogs: patientAuditLogs,
    };
  });

  if (!data) {
    notFound();
  }

  const { patient, appointments: apts, treatments: trts, files: fls, consents: csnts, auditLogs: auds } =
    data;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User, count: null },
    { id: 'appointments', label: 'Appointments', icon: Calendar, count: apts.length },
    { id: 'treatments', label: 'Treatments', icon: Stethoscope, count: trts.length },
    { id: 'chart', label: 'Dental Chart', icon: Activity, count: null },
    { id: 'files', label: 'Files', icon: HardDrive, count: fls.length },
    { id: 'consents', label: 'Consents', icon: ShieldCheck, count: csnts.filter((c) => !c.revokedAt).length },
    { id: 'audit', label: 'Audit Trail', icon: History, count: auds.length },
  ];

  return (
    <div className="space-y-6">
      {/* Newly registered success toast banner */}
      {created && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 flex items-center justify-between text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold">
              Patient profile and compliance consents successfully saved!
            </span>
          </div>
          <span className="text-xs text-emerald-600 font-mono">
            ID: {patient.id.slice(0, 8)}
          </span>
        </div>
      )}

      {/* Top Header */}
      <div>
        <Link
          href="/patients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Patients Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {patient.fullName}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Phone: {patient.phone} {patient.email && `• Email: ${patient.email}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto pb-px">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={`/patients/${patientId}?tab=${t.id}`}
                className={`whitespace-nowrap flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold transition ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Panes */}
      <div>
        {tab === 'overview' && (
          <OverviewTab
            patient={patient}
            totalAppointments={apts.length}
            totalTreatments={trts.length}
          />
        )}
        {tab === 'appointments' && <AppointmentsTab appointments={apts} />}
        {tab === 'chart' && (
          <ChartTab
            patientId={patient.id}
            patientName={patient.fullName}
            patientDob={patient.dob}
            userRole={user.role}
            clinicId={user.clinicId}
          />
        )}
        {tab === 'consents' && (
          <ConsentsTab patientId={patient.id} consents={csnts} />
        )}
        {tab === 'audit' && <AuditTab auditLogs={auds} />}
      </div>
    </div>
  );
}
