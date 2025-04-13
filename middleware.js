// middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Skip auth check for webhook and public routes
    if (req.nextUrl.pathname.startsWith('/api/webhook')) {
      return res;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && !req.nextUrl.pathname.startsWith('/login')) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
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
     * 1. /api/webhook (WhatsApp webhook)
     * 2. /_next (Next.js internals)
     * 3. /static (static files)
     * 4. /*.{png,jpg,gif} (image files)
     * 5. /favicon.ico (favicon file)
     */
    '/((?!api/webhook|_next/|static/|.*\\.(?:png|jpg|gif)|favicon.ico).*)',
  ],
};