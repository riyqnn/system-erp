import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Require authentication and ADMIN role
    const user = await requireAuth(request)
    requireAnyRole(user, ['ADMIN'])

    const { userId } = await params

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    // Check if user exists and is pending
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, is_pending')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!targetUser.is_pending) {
      return NextResponse.json(
        { error: 'User is not pending approval' },
        { status: 400 }
      )
    }

    // Approve user: set is_active to true and is_pending to false
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_active: true,
        is_pending: false,
      })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to approve user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'User approved successfully',
      user: targetUser,
    })
  } catch (error: any) {
    console.error('[Approve User Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
