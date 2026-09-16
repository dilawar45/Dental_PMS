'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateReceiptPdfAction } from '../actions';
import { PaymentModal } from './payment-modal';
import { VoidModal } from './void-modal';
import { CreditCard, Ban, FileDown, Loader2, CheckCircle2 } from 'lucide-react';

interface InvoiceClientActionsProps {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  balance: string;
  status: 'unpaid' | 'partial' | 'paid' | 'void';
  userRole: string;
}

export function InvoiceClientActions({
  invoiceId,
  invoiceNumber,
  patientName,
  balance,
  status,
  userRole,
}: InvoiceClientActionsProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);

  const canRecordPayment = status !== 'paid' && status !== 'void' && parseFloat(balance) > 0;
  const canVoid = userRole === 'owner' && status !== 'void';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canRecordPayment && (
          <button
            type="button"
            onClick={() => setIsPaymentOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </button>
        )}

        {canVoid && (
          <button
            type="button"
            onClick={() => setIsVoidOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          >
            <Ban className="w-4 h-4" />
            Void Invoice
          </button>
        )}
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        patientName={patientName}
        balance={balance}
      />

      <VoidModal
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
      />
    </>
  );
}

export function ReceiptPdfButton({
  receiptId,
  storageKey,
}: {
  receiptId: string;
  storageKey: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateReceiptPdfAction(receiptId);
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {storageKey ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PDF Stored
        </span>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileDown className="w-3 h-3" />
              <span>Generate PDF</span>
            </>
          )}
        </button>
      )}

      {error && (
        <span className="text-[11px] text-rose-500 font-medium">{error}</span>
      )}
    </div>
  );
}
