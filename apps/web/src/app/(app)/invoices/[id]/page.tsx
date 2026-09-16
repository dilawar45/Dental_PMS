import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/current-user';
import { getInvoiceDetail } from '../data';
import { formatPKR } from '@/lib/money';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  ShieldCheck,
  Receipt,
  Clock,
  AlertCircle,
  CheckCircle2,
  Ban,
  FileText,
  Building,
} from 'lucide-react';
import { InvoiceClientActions, ReceiptPdfButton } from './invoice-client-actions';

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  // Allowed roles: owner, receptionist
  const { user } = await requireRole(['owner', 'receptionist']);
  const resolvedParams = await params;
  const data = await getInvoiceDetail(user.clinicId, resolvedParams.id);

  if (!data) {
    notFound();
  }

  const { invoice, patient, appointment, receipts, auditTrail, totals } = data;

  const getStatusBadge = (status: typeof totals.status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid in Full
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
            <Clock className="w-3.5 h-3.5" />
            Partially Paid
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            <AlertCircle className="w-3.5 h-3.5" />
            Unpaid Balance
          </span>
        );
      case 'void':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Ban className="w-3.5 h-3.5" />
            Void / Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Back & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl font-mono">
              {invoice.invoiceNumber}
            </h1>
            {getStatusBadge(totals.status)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Issued on{' '}
            {new Date(invoice.issuedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <InvoiceClientActions
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          patientName={patient.fullName}
          balance={totals.balance}
          status={totals.status}
          userRole={user.role}
        />
      </div>

      {/* Patient & Invoice Meta Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            <span>Billed To</span>
            <User className="w-4 h-4" />
          </div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            <Link
              href={`/patients/${patient.id}`}
              className="hover:text-primary transition hover:underline"
            >
              {patient.fullName}
            </Link>
          </div>
          <div className="text-xs text-slate-500 mt-1 space-y-0.5">
            <div>Phone: {patient.phone}</div>
            {patient.email && <div>Email: {patient.email}</div>}
            {patient.address && <div>Address: {patient.address}</div>}
          </div>
        </div>

        {/* Linked Appointment Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            <span>Clinical Context</span>
            <Calendar className="w-4 h-4" />
          </div>
          {appointment ? (
            <div>
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {appointment.reason || 'General Treatment Session'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(appointment.startAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              No specific appointment linked to this billing record.
            </div>
          )}
        </div>

        {/* Financial Snapshot Card */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            <span>Balance Due</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totals.status === 'void' ? (
              <span className="text-slate-400 line-through">
                {formatPKR(totals.total)}
              </span>
            ) : parseFloat(totals.balance) > 0 ? (
              <span className="text-rose-600 dark:text-rose-400">
                {formatPKR(totals.balance)}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">Settled (0.00)</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex justify-between">
            <span>Total: {formatPKR(totals.total)}</span>
            <span>Paid: {formatPKR(totals.paid)}</span>
          </div>
        </div>
      </div>

      {/* Procedure Line Items Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Itemized Clinical Services
          </h2>
          <span className="text-xs text-slate-500">
            {invoice.items.length} {invoice.items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-400 bg-slate-50/30 dark:bg-slate-900/40">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">#</th>
                <th scope="col" className="px-6 py-3 font-semibold">Description</th>
                <th scope="col" className="px-6 py-3 font-semibold text-right">Rate</th>
                <th scope="col" className="px-6 py-3 font-semibold text-center">Qty</th>
                <th scope="col" className="px-6 py-3 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                    {item.description}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-600 dark:text-slate-400">
                    {formatPKR(item.amount)}
                  </td>
                  <td className="px-6 py-3.5 text-center text-slate-700 dark:text-slate-300">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {formatPKR(item.subtotal || (parseFloat(item.amount) * item.quantity).toFixed(2))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-6 bg-slate-50/40 dark:bg-slate-800/20">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="md:max-w-xs text-xs text-slate-500">
              {invoice.notes && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Notes & Instructions:
                  </span>
                  <p className="whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatPKR(invoice.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tax ({invoice.taxRate}%):</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatPKR(invoice.tax)}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100">
                <span>Total Amount:</span>
                <span>{formatPKR(totals.total)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Amount Paid:</span>
                <span>{formatPKR(totals.paid)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-700 dark:text-slate-300">Balance Due:</span>
                <span className={parseFloat(totals.balance) > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}>
                  {formatPKR(totals.balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipts & Payment History */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Payment Receipts History
          </h2>
          <span className="text-xs text-slate-500">
            {receipts.length} {receipts.length === 1 ? 'payment' : 'payments'} recorded
          </span>
        </div>

        {receipts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No payments recorded against this invoice yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-400 bg-slate-50/30 dark:bg-slate-900/40">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold">Receipt #</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Date & Time</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Method</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Received By</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-right">Amount</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-right">PDF Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {receipts.map((rcpt) => (
                  <tr key={rcpt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {rcpt.receiptNumber}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {new Date(rcpt.issuedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {rcpt.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                      {rcpt.receivedByName}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatPKR(rcpt.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <ReceiptPdfButton
                        receiptId={rcpt.id}
                        storageKey={rcpt.storageKey}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Audit Trail Section */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Invoice Audit History
          </h2>
          <span className="text-xs text-slate-500">
            {auditTrail.length} recorded events
          </span>
        </div>

        {auditTrail.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No audit records found for this invoice.
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {auditTrail.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.action}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 capitalize">
                      {item.actorRole}
                    </span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    By <span className="font-medium">{item.actorName}</span>
                    {item.meta && (
                      <span className="ml-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {JSON.stringify(item.meta)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-slate-400 font-mono text-[11px]">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
