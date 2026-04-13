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

    // Check if user exists
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user profile from database
    const { error: deleteProfileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    // Delete user from Supabase Auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError)
      // Continue anyway - profile is deleted
    }

    return NextResponse.json({
      message: 'User rejected and deleted successfully',
      user: targetUser,
    })
  } catch (error: any) {
    console.error('[Reject User Error]', error)
    const statusCode = error.statusCode || 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
