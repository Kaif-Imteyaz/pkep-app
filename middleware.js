export const middleware = async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
  
    // List of public paths that don't require auth
    const PUBLIC_PATHS = ['/api/webhook', '/webhook', '/login'];
  
    // Allow public paths without auth
    if (PUBLIC_PATHS.includes(pathname)) {
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
      /*
       * Match all paths except:
       * - /_next (Next.js internals)
       * - /static (static files)
       */
      '/((?!_next/|static/|.*\\.(png|jpg|gif|ico|json|xml)).*)'
    ],
  };