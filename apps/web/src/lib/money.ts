/**
 * Decimal-Safe Integer-Cents Money Math Utilities.
 * Strictly prevents IEEE-754 floating point rounding errors on financial values.
 */

/**
 * Converts a monetary string or number representation into integer cents.
 * e.g. "12000.50" -> 1200050, 45.1 -> 4510
 */
export function toCents(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer cents into a fixed 2-decimal string representation.
 * e.g. 1200050 -> "12000.50"
 */
export function fromCents(cents: number): string {
  if (!isFinite(cents) || isNaN(cents)) return '0.00';
  const sign = cents < 0 ? '-' : '';
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainingCents = absCents % 100;
  return `${sign}${dollars}.${String(remainingCents).padStart(2, '0')}`;
}

/**
 * Adds two monetary values decimal-safely.
 */
export function addMoney(a: string | number, b: string | number): string {
  return fromCents(toCents(a) + toCents(b));
}

/**
 * Subtracts b from a decimal-safely.
 */
export function subtractMoney(a: string | number, b: string | number): string {
  return fromCents(toCents(a) - toCents(b));
}

/**
 * Multiplies a unit amount by an integer quantity decimal-safely.
 */
export function multiplyMoney(unitAmount: string | number, quantity: number): string {
  const safeQty = Math.max(0, Math.round(quantity));
  return fromCents(toCents(unitAmount) * safeQty);
}

/**
 * Calculates tax on a subtotal based on a percentage tax rate decimal-safely.
 * e.g. subtotal = 1000.00, taxRate = 5.0 -> tax = 50.00
 */
export function calculateTax(
  subtotal: string | number,
  taxRatePercent: string | number
): string {
  const subtotalCents = toCents(subtotal);
  const rate = typeof taxRatePercent === 'number' ? taxRatePercent : parseFloat(String(taxRatePercent)) || 0;
  // tax = round(subtotalCents * (rate / 100))
  const taxCents = Math.round((subtotalCents * rate) / 100);
  return fromCents(taxCents);
}

export interface CalculatedInvoiceTotals {
  subtotal: string;
  tax: string;
  total: string;
}

/**
 * Derives comprehensive invoice totals from line items and tax rate.
 */
export function calculateInvoiceTotals(
  items: Array<{ amount: string | number; quantity: number }>,
  taxRatePercent: string | number
): CalculatedInvoiceTotals {
  let subtotalCents = 0;
  for (const item of items) {
    const itemSubtotalCents = toCents(item.amount) * Math.max(0, Math.round(item.quantity));
    subtotalCents += itemSubtotalCents;
  }

  const rate = typeof taxRatePercent === 'number' ? taxRatePercent : parseFloat(String(taxRatePercent)) || 0;
  const taxCents = Math.round((subtotalCents * rate) / 100);
  const totalCents = subtotalCents + taxCents;

  return {
    subtotal: fromCents(subtotalCents),
    tax: fromCents(taxCents),
    total: fromCents(totalCents),
  };
}

/**
 * Derives invoice status based on total and paid amounts:
 * - 'unpaid': paid <= 0
 * - 'partial': 0 < paid < total
 * - 'paid': paid >= total
 * - 'void': if already marked void
 */
export function deriveInvoiceStatus(
  total: string | number,
  paid: string | number,
  currentStatus?: string
): 'unpaid' | 'partial' | 'paid' | 'void' {
  if (currentStatus === 'void') return 'void';
  const totalCents = toCents(total);
  const paidCents = toCents(paid);

  if (paidCents <= 0) return 'unpaid';
  if (paidCents < totalCents) return 'partial';
  return 'paid';
}

/**
 * Formats monetary value into human-readable currency with thousands separators.
 * e.g. "12500.00" -> "PKR 12,500.00"
 */
export function formatPKR(amount: string | number, showCurrency = true): string {
  const cents = toCents(amount);
  const sign = cents < 0 ? '-' : '';
  const absDollars = Math.abs(cents) / 100;

  const formatted = absDollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return showCurrency ? `PKR ${sign}${formatted}` : `${sign}${formatted}`;
}
