import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses Next.js cookies API to read and write auth cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://rxoqmiwuwkywxxtkyjma.supabase.co';
  const supabaseAnonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-anon-key';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Handled and refreshed by middleware.
          }
        },
      },
    }
  );
}
