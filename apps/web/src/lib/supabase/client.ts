import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components.
 * Interacts with Supabase using browser cookies.
 */
export function createClient() {
  const supabaseUrl =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://rxoqmiwuwkywxxtkyjma.supabase.co';
  const supabaseAnonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
