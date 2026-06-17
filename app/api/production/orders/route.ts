import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('production_orders')
    .select(`
      *,
      products(id, sku, name)
    `)
    .order('created_at', { ascending: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()

  const supabase = await createRouteHandlerClient()

  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  const { data: existing } = await supabase
    .from('production_orders')
    .select('po_number')
    .like('po_number', `PO-${dateStr}-%`)
    .order('po_number', { ascending: false })
    .limit(1)

  const lastSeq = existing?.[0]?.po_number
    ? parseInt(existing[0].po_number.split('-').pop() ?? '0', 10)
    : 0
  const po_number = `PO-${dateStr}-${String(lastSeq + 1).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('production_orders')
    .insert([{ ...body, po_number }])
    .select()

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}