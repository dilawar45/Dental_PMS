import { NextResponse } from 'next/server';

/**
 * Derives appropriate CORS headers for the patient API.
 */
export function getCorsHeaders(req?: Request): HeadersInit {
  const isDev = process.env.NODE_ENV !== 'production';
  const allowedOriginsEnv = process.env['PATIENT_API_ALLOWED_ORIGINS'];

  let origin = '*';

  if (!isDev && allowedOriginsEnv && req) {
    const requestOrigin = req.headers.get('origin');
    const allowedList = allowedOriginsEnv.split(',').map((o) => o.trim());
    if (requestOrigin && allowedList.includes(requestOrigin)) {
      origin = requestOrigin;
    } else {
      origin = allowedList[0] || '*';
    }
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handles OPTIONS preflight requests for patient API endpoints.
 */
export function handleCorsPreflight(req?: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * Injects CORS headers into an existing NextResponse.
 */
export function withCors(response: NextResponse, req?: Request): NextResponse {
  const headers = getCorsHeaders(req);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
