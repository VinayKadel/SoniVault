import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Auth pages that unauthenticated users are allowed on
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

// Pages that are always public (no auth required)
const PUBLIC_PREFIXES = ['/share', '/api/auth', '/api/share'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Always allow public routes (share viewer, auth API, etc.)
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL('/login', req.url);
    // Preserve the original path so we can redirect back after login
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|icons|manifest\\.json|sw\\.js|workbox-.*\\.js|favicon\\.ico).*)',
  ],
};
