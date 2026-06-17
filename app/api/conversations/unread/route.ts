import { AnyObject } from '@/lib/any';
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

export async function GET() {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    const { data: convs, error: convErr } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversations!inner(
          messages(id, created_at, sender_id)
        )
      `)
      .eq('user_id', user.user_id)

    if (convErr) {
      console.error('[Unread GET]', convErr)
      return NextResponse.json({ error: convErr.message }, { status: 500 })
    }

    let unreadCount = 0

    // Calculate unread count across all conversations
    for (const cp of convs ?? []) {
      const convData = cp.conversations as AnyObject
      const messages = (Array.isArray(convData) ? convData[0]?.messages : convData?.messages) ?? []
      const lastRead = cp.last_read_at ? new Date(cp.last_read_at + 'Z').getTime() : 0
      
      for (const msg of messages) {
        if (msg.sender_id === user.user_id) continue // skip my own messages
        
        let msgTimeStr = msg.created_at
        if (!msgTimeStr.endsWith('Z') && !msgTimeStr.match(/[+-]\d{2}:?\d{2}$/)) {
          msgTimeStr += 'Z'
        }
        const msgTime = new Date(msgTimeStr).getTime()
        
        if (msgTime > lastRead) {
          unreadCount++
        }
      }
    }

    return NextResponse.json({ data: { count: unreadCount } })
  } catch (err) {
    console.error('[Unread GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
