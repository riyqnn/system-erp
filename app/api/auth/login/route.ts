import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createAdminClient } from '@/lib/supabase/server'
// Note: If you get a Turbopack TypeError in dev, please restart your next dev server to clear the HMR cache.
import { type UserProfile, resolveUserProfile } from '@/lib/auth/rbac'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid credentials' },
        { status: 401 }
      )
    }

    // 2. Fetch user profile from ms_user table or fallback
    let dbProfile: UserProfile | null = null

    try {
      const adminSupabase = await createAdminClient()
      const { data: dbData, error: dbError } = await adminSupabase
        .from('ms_user')
        .select('user_id, username, full_name, email, role, status, created_at')
        .eq('email', data.user.email)
        .maybeSingle()

      if (dbData && !dbError) {
        dbProfile = dbData as UserProfile
      }
    } catch (e) {
      console.error('Error querying ms_user in login API:', e)
    }

    const userData = resolveUserProfile(data.user.email, data.user, dbProfile)

    if (!userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (userData.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 403 }
      )
    }

    const isProd = process.env.NODE_ENV === 'production'
    const cookieOptions = `; Path=/; HttpOnly; SameSite=lax; ${isProd ? 'Secure;' : ''}`

    // 3. Return user data (tokens are already set in cookies by Supabase)
    return NextResponse.json(
      {
        user: {
          user_id: userData.user_id,
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          status: userData.status,
          created_at: userData.created_at,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': [
            `access_token=${data.session.access_token}${cookieOptions} Max-Age=${data.session.expires_in}`,
            `refresh_token=${data.session.refresh_token}${cookieOptions} Max-Age=604800`,
          ].join(', '),
        },
      }
    )
  } catch (error) {
    console.error('[Auth Login Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
