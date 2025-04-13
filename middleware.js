import { createMiddlewareClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// List of public routes that don't require authentication
const publicRoutes = [
  '/api/webhook',
  // Add other public routes here
];

export async function middleware(req) {
  const res = NextResponse.next();

  // Check if the requested path is in the public routes list
  if (publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
    return res;
  }

  // Create Supabase client with middleware
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession();

  // If no session and not a public route, redirect to login
  if (!session) {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
} 
