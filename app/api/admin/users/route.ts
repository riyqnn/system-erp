import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'

export async function POST(request: NextRequest) {
  try {
    // Require authentication and ADMIN role
    const user = await requireAuth(request)
    requireAnyRole(user, ['ADMIN'])

    const { full_name, email, password, role_id, is_active } = await request.json()

    // Validation
    if (!full_name || !email || !password || !role_id) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    // Create user profile
    // Admin can choose is_active status - if true, user can login immediately
    // If false or not specified, user will be pending
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role_id,
        is_active: is_active ?? false,
        is_pending: !(is_active ?? false), // If not active, then pending
      })

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: is_active
          ? 'User created successfully and can login immediately'
          : 'User created successfully. Pending approval.',
        user: {
          id: authData.user.id,
          email,
          full_name,
          role_id,
          is_active: is_active ?? false,
          is_pending: !(is_active ?? false),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[Admin Create User Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}

// Get all users (not just pending)
export async function GET(request: NextRequest) {
  try {
    // Require authentication and ADMIN role
    const user = await requireAuth(request)
    requireAnyRole(user, ['ADMIN'])

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    // Fetch all users with their roles
    const { data: users, error } = await supabase
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
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      users: users?.map(u => ({
        ...u,
        role: (u as any).roles,
      })) || [],
    })
  } catch (error: any) {
    console.error('[Admin Get Users Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
