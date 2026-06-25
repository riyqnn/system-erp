import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

/**
 * POST /api/profile/password — Change the current user's password.
 * The real password is managed by Supabase Auth (ms_user.password_hash is only a
 * placeholder), so we verify the current password via re-authentication, then call
 * auth.updateUser to set the new one.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { current_password, new_password } = await request.json() as {
      current_password?: string
      new_password?: string
    }

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Password lama dan baru wajib diisi.' }, { status: 400 })
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 })
    }
    if (new_password === current_password) {
      return NextResponse.json({ error: 'Password baru tidak boleh sama dengan password lama.' }, { status: 400 })
    }

    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    // 1. Verify the current password by re-authenticating.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    })
    if (signInErr) {
      return NextResponse.json({ error: 'Password lama salah.' }, { status: 400 })
    }

    // 2. Update to the new password.
    const { error: updErr } = await supabase.auth.updateUser({ password: new_password })
    if (updErr) {
      console.error('[Profile Password]', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Profile Password Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
