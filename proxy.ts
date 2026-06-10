import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SONIVAULT route protection proxy (Next.js 16)
 *
 * Reads the NextAuth JWT session cookie directly (no DB required)
 * to avoid edge-runtime Node.js module incompatibilities.
 */
export async function proxy(request: NextRequest) {
  const { nextUrl } = request;

  const isAuthPage =
    nextUrl.pathname.startsWith('/login') ||
    nextUrl.pathname.startsWith('/verify-otp');

  const isPublicApi =
    nextUrl.pathname.startsWith('/api/auth') ||
    nextUrl.pathname.startsWith('/api/otp') ||
    nextUrl.pathname.startsWith('/api/share');

  const isPublicPage = nextUrl.pathname.startsWith('/share');

  // Always allow public API routes and share pages
  if (isPublicApi || isPublicPage) {
    return NextResponse.next();
  }

  // Check for a NextAuth session cookie (secure = prod, insecure = dev)
  const sessionCookie =
    request.cookies.get('authjs.session-token') ||
    request.cookies.get('__Secure-authjs.session-token') ||
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-next-auth.session-token');

  const isLoggedIn = !!sessionCookie?.value;

  // Authenticated users trying to visit auth pages → send to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  // Unauthenticated users visiting protected routes → send to login
  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals, static files, and PWA assets
    '/((?!_next/static|_next/image|icons|manifest.json|sw.js|workbox-|favicon.ico).*)',
  ],
};
