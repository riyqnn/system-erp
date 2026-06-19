import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const update: Record<string, unknown> = {}
  if (body.status !== undefined) update.settlement_status = body.status
  if (body.settlement_status !== undefined) update.settlement_status = body.settlement_status
  if (body.settlement_date !== undefined) update.settlement_date = body.settlement_date
  if (body.actual_cost !== undefined) update.actual_cost = body.actual_cost
  if (body.variance_cost !== undefined) update.variance_cost = body.variance_cost

  const { data, error } = await supabase
    .from('tr_order_settlement')
    .update(update)
    .eq('settlement_id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
