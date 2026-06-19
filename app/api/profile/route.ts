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
      full_name?: string | null
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

    // full_name lives in ms_user (account table), the rest in user_profiles.
    // username, email and role are intentionally NOT editable here:
    //  - email is the join key between auth.users and ms_user (changing it breaks login lookup)
    //  - role is governed by the admin module, not self-service.
    const { full_name, ...profileFields } = body

    if (full_name !== undefined) {
      const trimmed = (full_name ?? '').trim()
      if (!trimmed) {
        return NextResponse.json({ error: 'Nama lengkap tidak boleh kosong.' }, { status: 400 })
      }
      const { error: userErr } = await supabase
        .from('ms_user')
        .update({ full_name: trimmed })
        .eq('user_id', user.user_id)
      if (userErr) {
        console.error('[Profile PATCH ms_user]', userErr)
        return NextResponse.json({ error: userErr.message }, { status: 500 })
      }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id:      user.user_id,
        ...profileFields,
        updated_at:   new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Profile PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      profile: data,
      full_name: full_name !== undefined ? (full_name ?? '').trim() : user.full_name,
    })
  } catch (err) {
    console.error('[Profile PATCH Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
