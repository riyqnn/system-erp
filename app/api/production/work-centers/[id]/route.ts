import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.wc_name = body.name
  if (body.wc_name !== undefined) update.wc_name = body.wc_name
  if (body.capacity_per_hour !== undefined) update.capacity_per_hour = body.capacity_per_hour
  if (body.cost_per_hour !== undefined) update.cost_per_hour = body.cost_per_hour

  const { data, error } = await supabase
    .from('ms_work_center')
    .update(update)
    .eq('wc_id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createRouteHandlerClient()
  const { error } = await supabase.from('ms_work_center').delete().eq('wc_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
