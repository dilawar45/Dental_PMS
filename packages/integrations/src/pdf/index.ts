import type { PdfProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { MockPdfProvider } from './mock';
import { RealPdfProvider } from './real';

export type { PdfProvider } from './interface';

/**
 * Factory: returns the active PDF provider based on PDF_PROVIDER env var.
 */
export function getPdfProvider(db: Database): PdfProvider {
  const mode = process.env['PDF_PROVIDER'] ?? 'mock';

  switch (mode) {
    case 'mock':
      return new MockPdfProvider(db);
    case 'real':
      return new RealPdfProvider();
    default:
      throw new Error(`Unknown PDF_PROVIDER: "${mode}". Use "mock" or "real".`);
  }
}
