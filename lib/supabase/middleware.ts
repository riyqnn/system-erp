/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Create a Supabase client for use in Next.js middleware
 * This is used to refresh user sessions and handle auth redirects
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Combine request cookies and response cookies
          const requestCookies = request.cookies.getAll()
          const responseCookies = supabaseResponse.cookies.getAll()

          // Remove duplicates from response cookies
          const responseCookieNames = new Set(responseCookies.map(c => c.name))
          const uniqueRequestCookies = requestCookies.filter(
            c => !responseCookieNames.has(c.name)
          )

          return [...responseCookies, ...uniqueRequestCookies]
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Use the correct cookie setting method for Next.js middleware
            supabaseResponse.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return { supabaseResponse, user, session }
}
