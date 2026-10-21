import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getAuthTokenExpiry(request: NextRequest): number | null {
  try {
    const allCookies = request.cookies.getAll();
    const tokenCookies = allCookies
      .filter((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (tokenCookies.length === 0) return null;

    let rawVal = tokenCookies.map((c) => c.value).join('');
    if (rawVal.startsWith('base64-')) {
      rawVal = Buffer.from(rawVal.slice(7), 'base64').toString('utf-8');
    }

    const parsed = JSON.parse(rawVal);
    if (typeof parsed?.expires_at === 'number') {
      return parsed.expires_at * 1000;
    }
    if (typeof parsed?.access_token === 'string') {
      const parts = parsed.access_token.split('.');
      if (parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        if (typeof payload?.exp === 'number') {
          return payload.exp * 1000;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

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

  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');
  const isInvitePage = request.nextUrl.pathname.startsWith('/invite');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isPublicRoute = isLoginPage || isAuthCallback || isInvitePage || isApiRoute;

  // Fast check: check if any Supabase auth cookies exist
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  );

  // If there are no auth cookies at all:
  // - On protected routes, immediately redirect to /login without network delay
  // - On public routes, immediately return without blocking on remote auth
  if (!hasAuthCookie) {
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      if (request.nextUrl.pathname !== '/') {
        url.searchParams.set('redirectTo', request.nextUrl.pathname);
      }
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Fast path: If the active auth token in cookie is fresh (> 60s remaining),
  // skip remote Supabase HTTP call and proceed instantly!
  const tokenExpiry = getAuthTokenExpiry(request);
  const now = Date.now();
  const isTokenFresh = tokenExpiry !== null && tokenExpiry > now + 60_000;

  if (isTokenFresh) {
    if (request.nextUrl.pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Refresh auth token safely only when auth cookies are expiring or need renewal
  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    user = null;
  }

  // Unauthenticated users trying to access protected routes -> redirect to /login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (request.nextUrl.pathname !== '/') {
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
    }
    return NextResponse.redirect(url);
  }

  // Authenticated users accessing the root '/' page are forwarded to /dashboard
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
