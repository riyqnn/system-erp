 
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'

export async function POST(request: NextRequest) {
  try {
    // Require authentication and ADMIN role
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN'])

    const { full_name, email, password, username, role, status } = await request.json()

    // Validation
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'username, email, password, and role are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('ms_user')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already registered' },
        { status: 409 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, username },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    // Create user profile in ms_user
    // password_hash is managed by Supabase Auth, store a placeholder
    const { error: profileError } = await supabase
      .from('ms_user')
      .insert({
        username,
        password_hash: '--- managed by supabase auth ---',
        email,
        full_name: full_name || null,
        role,
        status: status || 'ACTIVE',
      })

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: { username, email, full_name, role, status: status || 'ACTIVE' },
      },
      { status: 201 }
    )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Admin Create User Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Internal server error' },
      { status: statusCode }
    )
  }
}

// Get all users
export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN'])

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    const { data: users, error } = await supabase
      .from('ms_user')
      .select('user_id, username, full_name, email, role, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users || [] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Admin Get Users Error]', error)
    const statusCode = (error as { statusCode?: number }).statusCode || 500
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
