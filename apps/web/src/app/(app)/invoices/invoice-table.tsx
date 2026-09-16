'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { InvoiceListItem } from './data';
import { formatPKR } from '@/lib/money';
import {
  Receipt,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react';

interface InvoiceTableProps {
  invoices: InvoiceListItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export function InvoiceTable({
  invoices,
  totalCount,
  currentPage,
  pageSize,
}: InvoiceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const getStatusBadge = (status: InvoiceListItem['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3" />
            Paid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
            <Clock className="w-3 h-3" />
            Partial
          </span>
        );
      case 'unpaid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            <AlertCircle className="w-3 h-3" />
            Unpaid
          </span>
        );
      case 'void':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Ban className="w-3 h-3" />
            Void
          </span>
        );
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <Receipt className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          No invoices found
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          No invoices match your current search or filter criteria. Try clearing your filters or create a new invoice.
        </p>
        <div className="mt-5">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
          >
            Create First Invoice
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">
                  Invoice #
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold">
                  Patient
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold">
                  Issued Date
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">
                  Total
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">
                  Paid
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">
                  Balance
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                  Status
                </th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {invoices.map((inv) => {
                const hasBalance = parseFloat(inv.balance) > 0;
                const isVoid = inv.status === 'void';

                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    {/* Invoice Number */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-primary px-2.5 py-1 rounded-md bg-primary/10 dark:bg-primary/20">
                        {inv.invoiceNumber}
                      </span>
                    </td>

                    {/* Patient Name & Phone */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {inv.patientName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {inv.patientPhone}
                      </div>
                    </td>

                    {/* Issued Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                      {new Date(inv.issuedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-4 whitespace-nowrap text-right font-medium text-slate-900 dark:text-slate-100">
                      {isVoid ? (
                        <span className="line-through text-slate-400">
                          {formatPKR(inv.total)}
                        </span>
                      ) : (
                        formatPKR(inv.total)
                      )}
                    </td>

                    {/* Paid */}
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatPKR(inv.paid)}
                    </td>

                    {/* Balance */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {isVoid ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : hasBalance ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {formatPKR(inv.balance)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0.00</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Action Button */}
                    <td className="px-5 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition group-hover:text-primary"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <div>
            Showing <span className="font-medium text-slate-700 dark:text-slate-300">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{' '}
            of <span className="font-medium text-slate-700 dark:text-slate-300">{totalCount}</span> invoices
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
