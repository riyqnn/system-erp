import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_work_center')
    .select('wc_id, wc_name, capacity_per_hour, cost_per_hour')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (data || []).map((r) => ({
    id: r.wc_id,
    name: r.wc_name,
    capacity_per_hour: r.capacity_per_hour,
    cost_per_hour: r.cost_per_hour,
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_work_center')
    .insert([{
      wc_id: `WC-${Date.now()}`,
      wc_name: body.name || body.wc_name || null,
      capacity_per_hour: body.capacity_per_hour || null,
      cost_per_hour: body.cost_per_hour || null,
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
