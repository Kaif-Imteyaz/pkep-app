export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/webhook (webhook endpoint)
     * - /_next (Next.js internals)
     * - /fonts, /icons, /images (static files)
     * - /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!api/webhook|_next|fonts|icons|images|favicon.ico|sitemap.xml).*)',
  ],
} 