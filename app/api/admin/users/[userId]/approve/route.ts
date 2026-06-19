import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN'])

    const { userId } = await params

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    // Check if user exists
    const { data: targetUser, error: fetchError } = await supabase
      .from('ms_user')
      .select('user_id, username, full_name, email, status')
      .eq('user_id', parseInt(userId))
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (targetUser.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'User is already active' },
        { status: 400 }
      )
    }

    // Approve user: set status to ACTIVE
    const { error: updateError } = await supabase
      .from('ms_user')
      .update({ status: 'ACTIVE' })
      .eq('user_id', parseInt(userId))

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Approve User Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Internal server error' },
      { status: statusCode }
    )
  }
}
