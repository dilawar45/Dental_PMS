/**
 * PDF provider interface.
 */
export interface PdfProvider {
  /** Generate a PDF from a template name and data object. Returns PDF as Buffer. */
  generate(template: string, data: Record<string, unknown>): Promise<Buffer>;

  /** Merge multiple PDF buffers into a single PDF. */
  merge(buffers: Buffer[]): Promise<Buffer>;
}
