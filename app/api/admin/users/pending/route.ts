import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN'])

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    // Fetch all users with status != 'ACTIVE' (pending/inactive)
    const { data: pendingUsers, error } = await supabase
      .from('ms_user')
      .select('user_id, username, full_name, email, role, status, created_at')
      .neq('status', 'ACTIVE')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch pending users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ pendingUsers: pendingUsers || [] })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Pending Users Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Internal server error' },
      { status: statusCode }
    )
  }
}
