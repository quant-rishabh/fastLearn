import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /protected)
  const path = request.nextUrl.pathname;

  // Define paths that are considered public (accessible without authentication)
  const isPublicPath = path === '/login' || path === '/';

  // Check if user is logged in by looking for auth token in cookies or headers
  // For client-side auth, we'll skip middleware and handle it in components
  // This is a placeholder for server-side authentication if needed

  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For protected paths, you can add authentication checks here
  // For now, we'll let the client-side handle authentication
  return NextResponse.next();
}

// Configure which paths the middleware runs on
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