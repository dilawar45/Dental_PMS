'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoiceAction } from '../actions';
import { calculateInvoiceTotals, formatPKR } from '@/lib/money';
import { Plus, Trash2, ArrowLeft, Loader2, AlertCircle, FileCheck } from 'lucide-react';
import Link from 'next/link';

interface PatientOption {
  id: string;
  fullName: string;
  phone: string;
}

interface AppointmentOption {
  id: string;
  patientId: string;
  startAt: Date;
  reason: string | null;
}

interface InvoiceFormProps {
  patients: PatientOption[];
  appointments: AppointmentOption[];
  initialPatientId?: string;
  initialAppointmentId?: string;
}

interface LineItemRow {
  description: string;
  amount: string;
  quantity: number;
}

export function InvoiceForm({
  patients,
  appointments,
  initialPatientId = '',
  initialAppointmentId = '',
}: InvoiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(initialAppointmentId);
  const [taxRate, setTaxRate] = useState('5.00');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { description: 'Dental Consultation & Examination', amount: '2500.00', quantity: 1 },
  ]);

  // Filter appointments for selected patient
  const patientAppointments = appointments.filter(
    (appt) => appt.patientId === selectedPatientId
  );

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedAppointmentId('');
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: '', amount: '0.00', quantity: 1 },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItemRow,
    value: string | number
  ) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const target = updated[index];
      if (!target) return prev;
      if (field === 'quantity') {
        updated[index] = { ...target, quantity: Number(value) || 1 };
      } else if (field === 'description') {
        updated[index] = { ...target, description: String(value) };
      } else if (field === 'amount') {
        updated[index] = { ...target, amount: String(value) };
      }
      return updated;
    });
  };

  // Live integer-cents calculation
  const totals = calculateInvoiceTotals(
    lineItems.map((item) => ({
      amount: item.amount || '0',
      quantity: item.quantity || 1,
    })),
    taxRate || '0'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPatientId) {
      setError('Please select a patient');
      return;
    }

    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item) continue;
      if (!item.description.trim()) {
        setError(`Item #${i + 1} requires a description`);
        return;
      }
      const amt = parseFloat(item.amount);
      if (isNaN(amt) || amt <= 0) {
        setError(`Item #${i + 1} amount must be greater than 0`);
        return;
      }
    }

    startTransition(async () => {
      const res = await createInvoiceAction({
        patientId: selectedPatientId,
        appointmentId: selectedAppointmentId || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description.trim(),
          amount: parseFloat(item.amount).toFixed(2),
          quantity: item.quantity,
        })),
        taxRate: parseFloat(taxRate || '0').toFixed(2),
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error);
      } else {
        router.push(`/invoices/${res.data.id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-4 flex items-start gap-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Patient & Appointment Selection */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          1. Patient & Context
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Patient Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Patient <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">-- Choose a patient --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Optional Appointment Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Link Appointment <span className="text-xs text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              disabled={!selectedPatientId || patientAppointments.length === 0}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900"
            >
              <option value="">
                {!selectedPatientId
                  ? 'Select patient first'
                  : patientAppointments.length === 0
                  ? 'No appointments found'
                  : '-- Link appointment --'}
              </option>
              {patientAppointments.map((appt) => (
                <option key={appt.id} value={appt.id}>
                  {new Date(appt.startAt).toLocaleDateString()} - {appt.reason || 'General Visit'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Repeatable Line Items */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            2. Procedure Line Items
          </h2>
          <button
            type="button"
            onClick={handleAddLineItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Procedure
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => {
            const itemSubtotal = (parseFloat(item.amount || '0') * (item.quantity || 1)).toFixed(2);
            return (
              <div
                key={index}
                className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-800/30"
              >
                {/* Description */}
                <div className="col-span-12 sm:col-span-6">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Procedure / Description #{index + 1}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Scaling & Polishing, Root Canal, Extraction"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Amount */}
                <div className="col-span-5 sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Rate (PKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.amount}
                    onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)
                    }
                    required
                    className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Row Subtotal */}
                <div className="col-span-3 sm:col-span-2 text-right">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Subtotal
                  </label>
                  <div className="py-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatPKR(itemSubtotal, false)}
                  </div>
                </div>

                {/* Delete button */}
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(index)}
                    disabled={lineItems.length <= 1}
                    className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-20 disabled:hover:text-slate-400 transition"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tax, Notes & Financial Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Notes & Tax Rate */}
        <div className="md:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            3. Tax & Notes
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tax Rate (%)
            </label>
            <div className="w-48">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Standard dental service GST/tax (default 5%). Set 0 for tax-exempt services.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Invoice Notes & Terms <span className="text-xs text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Follow-up appointment in 2 weeks. Payment due on receipt."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Right Column: Order Summary Calculation */}
        <div className="md:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Invoice Summary
            </h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatPKR(totals.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tax ({taxRate || '0'}%):</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatPKR(totals.tax)}
                </span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between text-base font-bold text-slate-900 dark:text-slate-100">
                <span>Total Amount:</span>
                <span className="text-primary">{formatPKR(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Invoice...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Issue Invoice</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-400">
              Audit log entry will be automatically generated upon creation.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
