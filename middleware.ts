/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@supabase/ssr'
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

  // Create a Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            NextResponse.next({
              request: { headers: request.headers },
            }).cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check authentication status using Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/inventory', '/apps', '/admin']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (!isAuthenticated && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Auth routes - redirect to appropriate dashboard if already authenticated
  if (isAuthenticated && (pathname === '/login' || pathname === '/')) {
    const url = request.nextUrl.clone()
    // For now, redirect to dashboard which will handle role-based routing
    // The dashboard page will check the user role and redirect accordingly
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: Don't redirect authenticated users away from pages they're trying to access
  // Role-based access control should be handled at the component level, not middleware
  // This allows logged-in users to see "access denied" UI instead of being redirected to login

  return NextResponse.next()
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
