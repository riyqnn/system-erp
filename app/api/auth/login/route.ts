import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { AuthError } from '@/lib/auth/rbac'

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

    // Fetch user profile with role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        role_id,
        is_active,
        is_pending,
        created_at,
        updated_at,
        roles (
          id,
          name,
          description
        )
      `
      )
      .eq('id', data.user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (!userData.is_active) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      )
    }

    if (userData.is_pending) {
      return NextResponse.json(
        { error: 'Account pending admin approval' },
        { status: 403 }
      )
    }

    // Return user data (tokens are already set in cookies by Supabase)
    return NextResponse.json(
      {
        user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role_id: userData.role_id,
          is_active: userData.is_active,
          is_pending: userData.is_pending,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
          role: (userData as any).roles, // Full role object
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
      {
        status: 200,
        headers: {
          // Set HTTP-only cookies explicitly for compatibility
          'Set-Cookie': [
            `access_token=${data.session.access_token}; Path=/; HttpOnly; SameSite=lax; Max-Age=${data.session.expires_in}`,
            `refresh_token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=lax; Max-Age=604800`, // 7 days
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
