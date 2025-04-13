export const middleware = async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
  
    // Allow webhook route without auth
    if (pathname === '/api/webhook') {
      return new Response(null, { status: 200 });
    }
  
    // Allow login page
    if (pathname.startsWith('/login')) {
      return new Response(null, { status: 200 });
    }
  
    // Redirect all other paths to login
    url.pathname = '/login';
    return Response.redirect(url.toString(), 307);
  };
  
  export const config = {
    matcher: [
      '/((?!_next/|static/|.*\\.(?:png|jpg|gif)|favicon.ico).*)',
    ],
  };