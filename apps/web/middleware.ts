import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // Check authentication by calling NestJS API
  const isAuthenticated = await checkAuth(request)

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/apps']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (!isAuthenticated && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to dashboard if already authenticated
  if (isAuthenticated && (pathname === '/login' || pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: Don't redirect authenticated users away from pages they're trying to access
  // Role-based access control should be handled at the component level, not middleware
  // This allows logged-in users to see "access denied" UI instead of being redirected to login

  return NextResponse.next()
}

/**
 * Check if user is authenticated by calling NestJS API
 */
async function checkAuth(request: NextRequest): Promise<boolean> {
  try {
    // Extract access token from cookies using Next.js 15+ API
    const accessToken = request.cookies.get('access_token')?.value

    // Debug: log if no token found
    if (!accessToken) {
      console.log('[Middleware] No access_token found in cookies')
      console.log('[Middleware] Available cookies:', Array.from(request.cookies.getAll()).map(c => c.name))
      return false
    }

    console.log('[Middleware] Found access_token, calling API...')

    const response = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Pass access token via Authorization header for server-side calls
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    console.log('[Middleware] API response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[Middleware] API error response:', errorText)
    }

    return response.ok
  } catch (error) {
    console.log('[Middleware] Auth check error:', error)
    return false
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
