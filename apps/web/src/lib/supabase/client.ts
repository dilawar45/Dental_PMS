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
    'sb_publishable__m9hSfifahzrnCOp4a6jMQ_dI017Q1d';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
