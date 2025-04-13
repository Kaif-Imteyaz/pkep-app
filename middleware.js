import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/webhook',
  '/login',
  '/register'
];

export async function middleware(req) {
  // Check if the current path is in public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route => req.nextUrl.pathname === route);
  if (isPublicRoute) {
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If no session and not a public route, redirect to login
    if (!session) {
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch (e) {
    console.error('Middleware error:', e);
    return NextResponse.next();
  }
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    /*
     * Match all routes except for:
     * - _next (Next.js internals)
     * - static files (images, etc)
     */
    '/((?!_next/|static/|.*\\.(?:png|jpg|gif|ico|json|xml)).*)',
  ],
};
