import type { PdfProvider } from './interface';

/**
 * Real PDF provider stub — throws until PDF library is configured.
 */
export class RealPdfProvider implements PdfProvider {
  async generate(_template: string, _data: Record<string, unknown>): Promise<Buffer> {
    throw new Error('PDF provider not configured. Install and configure a PDF library to enable.');
  }

  async merge(_buffers: Buffer[]): Promise<Buffer> {
    throw new Error('PDF provider not configured. Install and configure a PDF library to enable.');
  }
}
