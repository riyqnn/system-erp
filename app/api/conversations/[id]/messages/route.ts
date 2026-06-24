import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

type Params = { params: Promise<{ id: string }> }

/**
 * GET  /api/conversations/[id]/messages — fetch messages (paginated)
 * POST /api/conversations/[id]/messages — send a message
 */

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: conversationId } = await params
    const { searchParams } = new URL(request.url)
    const limit  = parseInt(searchParams.get('limit') ?? '50')
    const before = searchParams.get('before') // ISO timestamp cursor

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    let query = supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, type, content, is_edited, created_at, updated_at,
        ms_user!sender_id(full_name, username, role)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }) // Fetch latest first
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Messages GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type MsUserRef = { full_name: string | null; username: string; role: string } | null
    let messages = (data ?? []).map((m) => {
      const senderRef = (m.ms_user as unknown) as MsUserRef
      return {
        ...m,
        sender_name: senderRef?.full_name ?? senderRef?.username ?? null,
        sender_role: senderRef?.role ?? null,
        ms_user: undefined,
      }
    })
    
    // Reverse so the oldest is first in the UI
    messages = messages.reverse()

    return NextResponse.json({ data: messages })
  } catch (err) {
    console.error('[Messages GET Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: conversationId } = await params
    const body = await request.json() as { content: string; type?: 'TEXT' | 'ANNOUNCEMENT' }

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id:       user.user_id,
        type:            body.type ?? 'TEXT',
        content:         body.content.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Messages POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('[Messages POST Error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
