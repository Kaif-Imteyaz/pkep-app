import { NextResponse } from 'next/server';

export const middleware = async (request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Allow webhook route without auth
  if (pathname.startsWith('/api/webhook')) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Redirect all other paths to login
  url.pathname = '/login';
  return NextResponse.redirect(url);
};

export const config = {
  matcher: [
    '/((?!_next/|static/|.*\\.(?:png|jpg|gif)|favicon.ico).*)',
  ],
};
