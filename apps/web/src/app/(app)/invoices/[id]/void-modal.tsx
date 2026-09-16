'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { voidInvoiceAction } from '../actions';
import { X, AlertTriangle, Loader2, Ban } from 'lucide-react';

interface VoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
}

export function VoidModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
}: VoidModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleVoid = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 3) {
      setError('Please provide a valid reason (at least 3 characters)');
      return;
    }

    startTransition(async () => {
      const res = await voidInvoiceAction({
        invoiceId,
        reason: reason.trim(),
      });

      if (!res.success) {
        setError(res.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-rose-950 dark:text-rose-200">
                Void Invoice
              </h3>
              <p className="text-xs text-rose-600/80 dark:text-rose-400 font-mono">
                {invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleVoid} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-600 dark:text-slate-400">
            Voiding an invoice marks it permanently invalid. No further payments can be recorded against it. An immutable audit entry will be stored.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for Voiding <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Billed in error, patient duplicate, clinical dispute resolved..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Voiding...</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirm Void</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
