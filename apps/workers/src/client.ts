import { Inngest } from 'inngest';

/**
 * Shared Inngest client for the dental PMS.
 * All worker functions should use this client instance.
 */
export const inngest = new Inngest({
  id: 'dental-pms',
});
