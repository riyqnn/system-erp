import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: conversationId } = await params

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.user_id)

    if (error) {
      console.error('[Conversations Read POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Conversations Read Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
