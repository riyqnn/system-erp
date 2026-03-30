import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid refresh token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
      {
        headers: {
          'Set-Cookie': [
            `access_token=${data.session.access_token}; Path=/; HttpOnly; SameSite=lax; Max-Age=${data.session.expires_in}`,
            `refresh_token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=lax; Max-Age=604800`,
          ].join(', '),
        },
      }
    )
  } catch (error) {
    console.error('[Auth Refresh Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
