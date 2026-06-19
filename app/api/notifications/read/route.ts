import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

/**
 * PATCH /api/notifications/read
 * Body: { ids: string[] } — mark specific IDs as read
 * Body: { all: true }    — mark all as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { ids?: string[]; all?: boolean }

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    const orFilter = [
      `recipient_id.eq.${user.user_id}`,
      `recipient_role.eq.${user.role}`,
    ].join(',')

    let query = supabase
      .from('notifications')
      .update({ status: 'READ', read_at: new Date().toISOString() })
      .or(orFilter)

    if (!body.all && body.ids && body.ids.length > 0) {
      query = query.in('id', body.ids)
    }

    const { error } = await query

    if (error) {
      console.error('[Notifications PATCH read]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Notifications PATCH Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
