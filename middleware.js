export const middleware = async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
  
    // Special handling for webhook requests
    if (pathname === '/webhook' || pathname === '/api/webhook') {
      // For GET requests (webhook verification)
      if (request.method === 'GET') {
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');
        
        if (mode === 'subscribe' && token) {
          // Allow the request to continue to the webhook handler
          return;
        }
      }
      
      // For POST requests (webhook events)
      if (request.method === 'POST') {
        // Allow the request to continue to the webhook handler
        return;
      }
      
      // For OPTIONS requests (CORS preflight)
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*'
          }
        });
      }
    }
  
    // Public paths that don't require auth
    const PUBLIC_PATHS = ['/', '/login', '/register'];
  
    // Allow public paths without auth
    if (PUBLIC_PATHS.includes(pathname)) {
      return new Response(null, { status: 200 });
    }
  
    // Check for auth cookie
    const authCookie = request.cookies.get('sb-auth-token');
  
    if (!authCookie) {
      // Redirect to login for non-authenticated requests
      return Response.redirect(new URL('/', url));
    }
  
    return new Response(null, { status: 200 });
  };
  
  export const config = {
    matcher: [
      '/((?!_next/|static/|.*\\.(?:png|jpg|gif)|favicon.ico).*)',
    ],
  };