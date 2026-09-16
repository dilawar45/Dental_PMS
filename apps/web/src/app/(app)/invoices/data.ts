import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { db } from '@/lib/db';
import { invoices, receipts, patients, appointments, users, auditLog, files, type InvoiceLineItem } from '@dental-pms/db/schema';
import { sql, eq, and, or, ilike, desc, asc, gte, lte, type SQL } from 'drizzle-orm';
import {
  toCents,
  fromCents,
  subtractMoney,
  deriveInvoiceStatus,
} from '@/lib/money';

export interface InvoiceSearchParams {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  issuedAt: Date;
  total: string;
  paid: string;
  balance: string;
  status: 'unpaid' | 'partial' | 'paid' | 'void';
}

export interface InvoiceMetrics {
  totalOutstanding: string;
  totalCollectedMonth: string;
  overdueAmount: string;
  overdueCount: number;
}

export async function getInvoices(
  clinicId: string,
  params: InvoiceSearchParams
): Promise<{
  invoices: InvoiceListItem[];
  metrics: InvoiceMetrics;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}> {
  const pageSize = 25;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);

  return await withClinic(db, clinicId, async (tx: ClinicTransaction) => {
    // 1. Calculate Summary Metrics for Clinic
    // A. All active invoices and their receipts for outstanding & overdue
    const allInvoicesData = await tx
      .select({
        id: invoices.id,
        amount: invoices.total,
        status: invoices.status,
        issuedAt: invoices.issuedAt,
        paidAmount: sql<string>`COALESCE(SUM(${receipts.amount}), 0)`.as('paid_amount'),
      })
      .from(invoices)
      .leftJoin(receipts, eq(receipts.invoiceId, invoices.id))
      .where(eq(invoices.clinicId, clinicId))
      .groupBy(invoices.id, invoices.total, invoices.status, invoices.issuedAt);

    let outstandingCents = 0;
    let overdueCents = 0;
    let overdueCount = 0;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const inv of allInvoicesData) {
      if (inv.status === 'void') continue;
      const totalC = toCents(inv.amount);
      const paidC = toCents(inv.paidAmount);
      const balanceC = Math.max(0, totalC - paidC);

      if (balanceC > 0) {
        outstandingCents += balanceC;
        if (new Date(inv.issuedAt) < thirtyDaysAgo) {
          overdueCents += balanceC;
          overdueCount += 1;
        }
      }
    }

    // B. Total collected this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthReceiptsResult] = await tx
      .select({
        monthTotal: sql<string>`COALESCE(SUM(${receipts.amount}), 0)`.as('month_total'),
      })
      .from(receipts)
      .where(
        and(
          eq(receipts.clinicId, clinicId),
          gte(receipts.issuedAt, startOfMonth)
        )
      );

    const metrics: InvoiceMetrics = {
      totalOutstanding: fromCents(outstandingCents),
      totalCollectedMonth: fromCents(toCents(monthReceiptsResult?.monthTotal || '0')),
      overdueAmount: fromCents(overdueCents),
      overdueCount,
    };

    // 2. Build where filter conditions for query list
    const conditions: SQL[] = [eq(invoices.clinicId, clinicId)];

    if (params.q?.trim()) {
      const query = `%${params.q.trim()}%`;
      conditions.push(
        or(
          ilike(invoices.invoiceNumber, query),
          ilike(patients.fullName, query),
          ilike(patients.phone, query)
        )!
      );
    }

    if (params.from) {
      const fromDate = new Date(params.from);
      if (!isNaN(fromDate.getTime())) {
        conditions.push(gte(invoices.issuedAt, fromDate));
      }
    }

    if (params.to) {
      const toDate = new Date(params.to);
      if (!isNaN(toDate.getTime())) {
        // end of that day
        toDate.setHours(23, 59, 59, 999);
        conditions.push(lte(invoices.issuedAt, toDate));
      }
    }

    // Query rows joined with patients and receipts
    const baseQuery = tx
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        patientId: invoices.patientId,
        patientName: patients.fullName,
        patientPhone: patients.phone,
        issuedAt: invoices.issuedAt,
        total: invoices.total,
        status: invoices.status,
        paid: sql<string>`COALESCE(SUM(${receipts.amount}), 0)`.as('paid_amount'),
      })
      .from(invoices)
      .innerJoin(patients, eq(invoices.patientId, patients.id))
      .leftJoin(receipts, eq(receipts.invoiceId, invoices.id))
      .where(and(...conditions))
      .groupBy(
        invoices.id,
        invoices.invoiceNumber,
        invoices.patientId,
        patients.fullName,
        patients.phone,
        invoices.issuedAt,
        invoices.total,
        invoices.status
      );

    const rawRows = await baseQuery;

    // Map rows and derive status & balance
    let items: InvoiceListItem[] = rawRows.map((r) => {
      const total = r.total || '0.00';
      const paid = r.paid || '0.00';
      const balance = subtractMoney(total, paid);
      const derived = deriveInvoiceStatus(total, paid, r.status);
      return {
        id: r.id,
        invoiceNumber: r.invoiceNumber || `INV-${r.id.slice(0, 8).toUpperCase()}`,
        patientId: r.patientId,
        patientName: r.patientName,
        patientPhone: r.patientPhone,
        issuedAt: r.issuedAt,
        total,
        paid,
        balance: toCents(balance) < 0 ? '0.00' : balance,
        status: derived,
      };
    });

    // Apply status filter in memory (or derive accurately)
    if (params.status && params.status !== 'all') {
      items = items.filter((item) => item.status === params.status);
    }

    // Apply sorting
    if (params.sort === 'amount_desc') {
      items.sort((a, b) => toCents(b.total) - toCents(a.total));
    } else if (params.sort === 'balance_desc') {
      items.sort((a, b) => toCents(b.balance) - toCents(a.balance));
    } else {
      // Default: issued_at desc
      items.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    }

    const totalCount = items.length;
    const offset = (currentPage - 1) * pageSize;
    const paginatedItems = items.slice(offset, offset + pageSize);

    return {
      invoices: paginatedItems,
      metrics,
      totalCount,
      currentPage,
      pageSize,
    };
  });
}

export interface InvoiceDetailReceipt {
  id: string;
  receiptNumber: string;
  amount: string;
  method: string;
  receivedByName: string;
  notes: string | null;
  storageKey: string | null;
  issuedAt: Date;
  fileId?: string | null;
}

export interface InvoiceDetailAuditItem {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

export interface InvoiceDetailData {
  invoice: {
    id: string;
    invoiceNumber: string;
    clinicId: string;
    patientId: string;
    appointmentId: string | null;
    amount: string;
    subtotal: string;
    taxRate: string;
    tax: string;
    notes: string | null;
    status: 'unpaid' | 'partial' | 'paid' | 'void';
    items: InvoiceLineItem[];
    issuedAt: Date;
    createdAt: Date;
  };
  patient: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
  appointment?: {
    id: string;
    startAt: Date;
    reason: string | null;
  } | null;
  receipts: InvoiceDetailReceipt[];
  auditTrail: InvoiceDetailAuditItem[];
  totals: {
    total: string;
    paid: string;
    balance: string;
    status: 'unpaid' | 'partial' | 'paid' | 'void';
  };
}

export async function getInvoiceDetail(
  clinicId: string,
  invoiceId: string
): Promise<InvoiceDetailData | null> {
  return await withClinic(db, clinicId, async (tx: ClinicTransaction) => {
    // 1. Fetch invoice
    const [inv] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinicId)));

    if (!inv) return null;

    // 2. Fetch patient
    const [patient] = await tx
      .select({
        id: patients.id,
        fullName: patients.fullName,
        phone: patients.phone,
        email: patients.email,
        address: patients.address,
      })
      .from(patients)
      .where(and(eq(patients.id, inv.patientId), eq(patients.clinicId, clinicId)));

    if (!patient) return null;

    // 3. Optional appointment
    let appt = null;
    if (inv.appointmentId) {
      const [apptRecord] = await tx
        .select({
          id: appointments.id,
          startAt: appointments.startAt,
          reason: appointments.reason,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.id, inv.appointmentId),
            eq(appointments.clinicId, clinicId)
          )
        );
      appt = apptRecord || null;
    }

    // 4. Fetch receipts with receiver info
    const receiptRows = await tx
      .select({
        id: receipts.id,
        receiptNumber: receipts.receiptNumber,
        amount: receipts.amount,
        method: receipts.method,
        receivedByName: users.fullName,
        notes: receipts.notes,
        storageKey: receipts.storageKey,
        issuedAt: receipts.issuedAt,
      })
      .from(receipts)
      .leftJoin(users, eq(receipts.receivedBy, users.id))
      .where(and(eq(receipts.invoiceId, invoiceId), eq(receipts.clinicId, clinicId)))
      .orderBy(desc(receipts.issuedAt));

    // Also look up any corresponding file records for receipts
    const receiptFiles = await tx
      .select({
        id: files.id,
        storageKey: files.storageKey,
      })
      .from(files)
      .where(
        and(
          eq(files.clinicId, clinicId),
          eq(files.patientId, inv.patientId),
          eq(files.kind, 'receipt')
        )
      );

    const fileMap = new Map(receiptFiles.map((f) => [f.storageKey, f.id]));

    let totalPaidCents = 0;
    const formattedReceipts: InvoiceDetailReceipt[] = receiptRows.map((r) => {
      const amt = r.amount || '0.00';
      totalPaidCents += toCents(amt);
      return {
        id: r.id,
        receiptNumber: r.receiptNumber || `REC-${r.id.slice(0, 8).toUpperCase()}`,
        amount: amt,
        method: r.method || 'cash',
        receivedByName: r.receivedByName || 'Staff Member',
        notes: r.notes,
        storageKey: r.storageKey,
        issuedAt: r.issuedAt,
        fileId: r.storageKey ? fileMap.get(r.storageKey) || null : null,
      };
    });

    const totalStr = inv.total || '0.00';
    const paidStr = fromCents(totalPaidCents);
    const balanceStr = subtractMoney(totalStr, paidStr);
    const safeBalance = toCents(balanceStr) < 0 ? '0.00' : balanceStr;
    const derivedStatus = deriveInvoiceStatus(totalStr, paidStr, inv.status);

    // 5. Fetch audit trail for this invoice
    const auditRows = await tx
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorName: users.fullName,
        actorRole: users.role,
        meta: auditLog.meta,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .where(
        and(
          eq(auditLog.clinicId, clinicId),
          eq(auditLog.entity, 'invoice'),
          eq(auditLog.entityId, invoiceId)
        )
      )
      .orderBy(desc(auditLog.createdAt));

    const auditTrail: InvoiceDetailAuditItem[] = auditRows.map((a) => ({
      id: a.id,
      action: a.action,
      actorName: a.actorName || 'System',
      actorRole: a.actorRole || 'staff',
      meta: (a.meta as Record<string, unknown>) || null,
      createdAt: a.createdAt,
    }));

    return {
      invoice: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
        clinicId: inv.clinicId,
        patientId: inv.patientId,
        appointmentId: inv.appointmentId,
        amount: totalStr,
        subtotal: inv.subtotal || totalStr,
        taxRate: inv.taxRate || '0.00',
        tax: inv.tax || '0.00',
        notes: inv.notes,
        status: derivedStatus,
        items: (inv.items as InvoiceLineItem[]) || [],
        issuedAt: inv.issuedAt,
        createdAt: inv.createdAt,
      },
      patient,
      appointment: appt,
      receipts: formattedReceipts,
      auditTrail,
      totals: {
        total: totalStr,
        paid: paidStr,
        balance: safeBalance,
        status: derivedStatus,
      },
    };
  });
}
