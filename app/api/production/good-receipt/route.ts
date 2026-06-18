import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('tr_production_receipt')
    .select(`
      prod_receipt_id,
      prod_order_id,
      qty_received,
      batch_number,
      receipt_date,
      tr_production_order!prod_order_id(prod_order_id)
    `)
    .order('receipt_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (data || []).map((r) => ({
    id: r.prod_receipt_id,
    production_order_id: r.prod_order_id,
    quantity_received: Number(r.qty_received),
    batch_number: r.batch_number,
    receipt_date: r.receipt_date,
    status: 'received',
    notes: null,
    production_orders: r.tr_production_order
      ? { po_number: r.tr_production_order.prod_order_id }
      : null,
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const now = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const receiptId = `GRP-${yyyymm}-${String(now.getTime()).slice(-4)}`

  const { data, error } = await supabase
    .from('tr_production_receipt')
    .insert([{
      prod_receipt_id: receiptId,
      prod_order_id: body.production_order_id || null,
      qty_received: body.quantity_received || body.qty_received || 0,
      batch_number: body.batch_number || null,
      receipt_date: body.receipt_date || new Date().toISOString(),
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
