import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

/**
 * GET /api/profile — Get current user's profile (ms_user + user_profiles)
 * PATCH /api/profile — Update current user's profile
 */

export async function GET() {
  try {
    const user = await getUserFromRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    // Fetch extended profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.user_id)
      .maybeSingle()

    if (error) {
      console.error('[Profile GET]', error)
    }

    if (!profile) {
      await supabase
        .from('user_profiles')
        .insert({ user_id: user.user_id })

      return NextResponse.json({
        user,
        profile: {
          user_id:      user.user_id,
          avatar_url:   null,
          avatar_style: 'adventurer',
          department:   null,
          phone:        null,
          bio:          null,
          theme:        'light',
          notif_email:  true,
          notif_push:   true,
        },
      })
    }

    return NextResponse.json({ user, profile })
  } catch (err) {
    console.error('[Profile GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      avatar_url?: string | null
      avatar_style?: string
      department?: string | null
      phone?: string | null
      bio?: string | null
      theme?: string
      notif_email?: boolean
      notif_push?: boolean
    }

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id:      user.user_id,
        ...body,
        updated_at:   new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Profile PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (err) {
    console.error('[Profile PATCH Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
