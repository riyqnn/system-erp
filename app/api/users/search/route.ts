import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

/**
 * GET /api/users/search?q=keyword
 * Search users by name, username, or email for starting a DM
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q     = searchParams.get('q')?.trim() ?? ''
    const limit = parseInt(searchParams.get('limit') ?? '10')

    if (q.length < 1) {
      return NextResponse.json({ data: [] })
    }

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('ms_user')
      .select('user_id, username, full_name, email, role')
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`)
      .neq('user_id', user.user_id)        // exclude self
      .eq('status', 'ACTIVE')
      .limit(limit)

    if (error) {
      console.error('[Users Search]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[Users Search Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
