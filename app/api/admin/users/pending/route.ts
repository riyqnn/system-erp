import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'

export async function GET(request: NextRequest) {
  try {
    // Require authentication and ADMIN role
    const user = await requireAuth(request)
    requireAnyRole(user, ['ADMIN'])

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    // Fetch all pending users with their roles
    const { data: pendingUsers, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        role_id,
        is_pending,
        created_at,
        roles (
          id,
          name,
          description
        )
      `
      )
      .eq('is_pending', true)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch pending users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      pendingUsers: pendingUsers?.map(u => ({
        ...u,
        role: (u as any).roles,
      })) || [],
    })
  } catch (error: any) {
    console.error('[Pending Users Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
