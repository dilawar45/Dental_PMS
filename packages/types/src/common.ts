/**
 * Branded type for clinic IDs.
 */
export type ClinicId = string & { readonly __brand: 'ClinicId' };

/** @deprecated Use ClinicId instead. */
export type TenantId = ClinicId;

/**
 * ISO 8601 timestamp string.
 */
export type Timestamp = string & { readonly __brand: 'Timestamp' };

/**
 * Generic result type for operations that can fail.
 */
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

/**
 * Direction of a message in the dev outbox.
 */
export type MessageDirection = 'inbound' | 'outbound';
