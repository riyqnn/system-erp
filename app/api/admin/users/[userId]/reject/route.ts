 
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
      .select('user_id, username, full_name, email')
      .eq('user_id', parseInt(userId))
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user profile from ms_user
    const { error: deleteProfileError } = await supabase
      .from('ms_user')
      .delete()
      .eq('user_id', parseInt(userId))

    if (deleteProfileError) {
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    if (targetUser.email) {
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const authUser = authUsers?.users?.find((u) => u.email === targetUser.email)
        if (authUser) {
          await supabase.auth.admin.deleteUser(authUser.id)
        }
      } catch (e) {
        console.error('Failed to delete auth user:', e)
      }
    }

    return NextResponse.json({
      message: 'User rejected and deleted successfully',
      user: targetUser,
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[Reject User Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) || 'Internal server error' },
      { status: statusCode }
    )
  }
}
