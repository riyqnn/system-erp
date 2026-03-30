import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Fetch full user profile with role
    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    const { data: profile, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        role_id,
        is_active,
        created_at,
        updated_at,
        roles (
          id,
          name,
          description
        )
      `
      )
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile: {
        ...profile,
        role: (profile as any).roles,
      },
    })
  } catch (error: any) {
    console.error('[Auth Profile Error]', error)
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
