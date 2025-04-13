export const middleware = async (request) => {
  const url = new URL(request.url);

  // Always allow webhook endpoint
  if (url.pathname === '/api/webhook') {
    return new Response(null, { status: 200 });
  }

  // Allow login page
  if (url.pathname === '/login') {
    return new Response(null, { status: 200 });
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('sb-auth-token');
  
  if (!authCookie) {
    // Redirect to login for non-authenticated requests
    return Response.redirect(new URL('/login', url));
  }

  return new Response(null, { status: 200 });
};

export const config = {
  matcher: [
    // Match all paths except static files and system files
    '/:path*',
    '!/api/webhook',
    '!/_next/:path*',
    '!/static/:path*',
    '!/favicon.ico',
    '!/*.png',
    '!/*.jpg',
    '!/*.gif',
    '!/*.json',
    '!/*.xml'
  ]
};
