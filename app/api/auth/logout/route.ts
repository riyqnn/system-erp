import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient()

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Auth Logout Error]', error)
    }

    // Clear cookies by setting them with expired dates
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )

    response.cookies.set('access_token', '', {
      path: '/',
      maxAge: 0,
    })

    response.cookies.set('refresh_token', '', {
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('[Auth Logout Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
