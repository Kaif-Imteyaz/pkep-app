export const middleware = async (request) => {
  const url = new URL(request.url);
  
  // Skip auth check for webhook and public routes
  if (url.pathname.startsWith('/api/webhook')) {
    return new Response(null, { status: 200 });
  }

  // For other routes, redirect to login if not authenticated
  if (!url.pathname.startsWith('/login')) {
    url.pathname = '/login';
    return Response.redirect(url);
  }

  return new Response(null, { status: 200 });
}

export const config = {
  matcher: [
    '/((?!api/webhook|_next/|static/|.*\\.(?:png|jpg|gif)|favicon.ico).*)',
  ],
} 