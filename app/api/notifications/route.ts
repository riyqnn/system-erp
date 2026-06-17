import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

/**
 * GET /api/notifications
 * Query params: status, type, priority, page, limit
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status   = searchParams.get('status')
    const type     = searchParams.get('type')
    const priority = searchParams.get('priority')
    const page     = parseInt(searchParams.get('page')  ?? '1')
    const limit    = parseInt(searchParams.get('limit') ?? '20')
    const offset   = (page - 1) * limit

    // Use admin client — RLS auth.jwt() context is unreliable in route handlers.
    // Authorization is already enforced by getUserFromRequest() above.
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    // Filter: notifications for this user OR their role
    const orFilter = [
      `recipient_id.eq.${user.user_id}`,
      `recipient_role.eq.${user.role}`,
    ].join(',')

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .or(orFilter)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status)   query = query.eq('status',   status)
    if (type)     query = query.eq('type',     type)
    if (priority) query = query.eq('priority', priority)

    const { data, error, count } = await query

    if (error) {
      console.error('[Notifications GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const unreadCount = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .or(orFilter)
      .eq('status', 'UNREAD')

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      unread: unreadCount.count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[Notifications GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
