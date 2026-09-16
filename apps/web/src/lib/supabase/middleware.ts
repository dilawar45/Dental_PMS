import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware session refresher and route protector.
 * Refreshes auth tokens stored in cookies and enforces login redirects.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://rxoqmiwuwkywxxtkyjma.supabase.co';
  const supabaseAnonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    'sb_publishable__m9hSfifahzrnCOp4a6jMQ_dI017Q1d';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth token safely
  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    user = null;
  }

  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');
  const isPublicRoute = isLoginPage || isAuthCallback;

  // Unauthenticated users trying to access protected routes -> redirect to /login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (request.nextUrl.pathname !== '/') {
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
    }
    return NextResponse.redirect(url);
  }

  // Authenticated users trying to access /login or / -> redirect to /dashboard
  if (user && (isLoginPage || request.nextUrl.pathname === '/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
