import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting store
// In production, you'd want to use Redis or another persistent store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute for general routes
const API_MAX_REQUESTS_PER_WINDOW = 50; // 50 requests per minute for API routes

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (clientIP) {
    return clientIP;
  }

  return 'unknown';
}

function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = ip;
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetTime: existing.resetTime,
  };
}

export function middleware(request: NextRequest) {
  const ip = getClientIP(request);
  const { pathname } = request.nextUrl;

  // Skip rate limiting for static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Determine rate limit based on route type
  const isApiRoute = pathname.startsWith('/api/');
  const maxRequests = isApiRoute ? API_MAX_REQUESTS_PER_WINDOW : MAX_REQUESTS_PER_WINDOW;

  const rateLimitResult = checkRateLimit(ip, maxRequests, RATE_LIMIT_WINDOW);

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());

  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
        },
      }
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};