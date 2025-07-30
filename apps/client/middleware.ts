import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // If user is authenticated and tries to access auth pages, redirect to /events
    if (token && (pathname.startsWith('/auth/') || pathname === '/')) {
      if (pathname === '/auth/verify-email') {
        // Allow access to verify-email even if authenticated
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/events', req.url));
    }

    // If user is not authenticated and tries to access protected routes
    if (!token && (pathname.startsWith('/events') || pathname.startsWith('/dashboard'))) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // If user is not authenticated and tries to access verify-email
    if (!token && pathname === '/auth/verify-email') {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // We handle authorization in the middleware function above
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};