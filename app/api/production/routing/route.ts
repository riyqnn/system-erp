import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_routing')
    .select('routing_id, product_id, wc_id, operation_name, setup_time, process_time, created_at, ms_work_center(wc_name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (data || []).map((r) => ({
    id: r.routing_id,
    product_id: r.product_id,
    work_center_id: r.wc_id,
    operation_name: r.operation_name,
    setup_time: r.setup_time,
    process_time: r.process_time,
    created_at: r.created_at,
    work_center_name: r.ms_work_center?.wc_name ?? null,
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_routing')
    .insert([{
      routing_id: `RTG-${Date.now()}`,
      product_id: body.product_id || null,
      wc_id: body.work_center_id || body.wc_id || null,
      operation_name: body.operation_name || null,
      setup_time: body.setup_time || null,
      process_time: body.process_time || null,
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
