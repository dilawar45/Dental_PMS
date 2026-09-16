import { requireRole } from '@/lib/auth/current-user';
import { getInvoices, type InvoiceSearchParams } from './data';
import { InvoiceFilters } from './invoice-filters';
import { InvoiceTable } from './invoice-table';
import { formatPKR } from '@/lib/money';
import Link from 'next/link';
import {
  Receipt,
  Plus,
  Coins,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface InvoicesPageProps {
  searchParams: Promise<InvoiceSearchParams>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  // Allowed roles: owner, receptionist
  const { user } = await requireRole(['owner', 'receptionist']);
  const resolvedParams = await searchParams;
  const data = await getInvoices(user.clinicId, resolvedParams);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Invoices & Billing
            </h1>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {data.totalCount} invoices
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage dental procedure billing, collect patient payments, and generate official receipts.
          </p>
        </div>

        <div>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Outstanding */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Outstanding
            </span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {formatPKR(data.metrics.totalOutstanding)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Unpaid balances across all active invoices
            </p>
          </div>
        </div>

        {/* Card 2: Collected This Month */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Collected This Month
            </span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatPKR(data.metrics.totalCollectedMonth)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Receipts issued in {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Card 3: Overdue >30 Days */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overdue (&gt;30 Days)
            </span>
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {formatPKR(data.metrics.overdueAmount)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {data.metrics.overdueCount} {data.metrics.overdueCount === 1 ? 'invoice' : 'invoices'} pending over a month
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <InvoiceFilters />

      {/* Invoices Table */}
      <InvoiceTable
        invoices={data.invoices}
        totalCount={data.totalCount}
        currentPage={data.currentPage}
        pageSize={data.pageSize}
      />
    </div>
  );
}
