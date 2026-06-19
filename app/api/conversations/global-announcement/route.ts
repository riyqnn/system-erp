import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

export async function GET() {
  try {
    const user = await getUserFromRequest()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    // Find the global announcement
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'ANNOUNCEMENT')
      .eq('title', 'Pengumuman Global')
      .limit(1)
      .maybeSingle()

    if (conv) {
      await supabase.from('conversation_participants').insert({
        conversation_id: conv.id,
        user_id: user.user_id,
        role: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
      })
      
      return NextResponse.json({ data: { id: conv.id } })
    }

    const { data: newConv, error: createErr } = await supabase
      .from('conversations')
      .insert({ type: 'ANNOUNCEMENT', title: 'Pengumuman Global', created_by: user.user_id })
      .select('id')
      .single()

    if (createErr || !newConv) {
      return NextResponse.json({ error: 'Failed to create global announcement' }, { status: 500 })
    }

    await supabase.from('conversation_participants').insert({
      conversation_id: newConv.id,
      user_id: user.user_id,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
    })

    return NextResponse.json({ data: { id: newConv.id } })
  } catch (error) {
    console.error('Global announcement check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
