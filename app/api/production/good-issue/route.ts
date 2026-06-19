import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('tr_goods_issue')
    .select(`
      issue_id,
      prod_order_id,
      product_id,
      quantity,
      purpose,
      issue_date,
      batch_number,
      tr_production_order!prod_order_id(prod_order_id),
      ms_product!product_id(product_name)
    `)
    .order('issue_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (data || []).map((r) => ({
    id: r.issue_id,
    production_order_id: r.prod_order_id,
    product_id: r.product_id,
    quantity: Number(r.quantity),
    issue_date: r.issue_date,
    batch_number: r.batch_number,
    status: 'issued',
    notes: null,
    production_orders: r.tr_production_order
      ? { po_number: r.tr_production_order.prod_order_id }
      : null,
    products: r.ms_product
      ? { name: r.ms_product.product_name, sku: r.product_id }
      : null,
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const now = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const seq = String(now.getTime()).slice(-3)
  const issueId = `ISS-${yyyymm}-${seq}`

  const { data, error } = await supabase
    .from('tr_goods_issue')
    .insert([{
      issue_id: issueId,
      prod_order_id: body.production_order_id || null,
      product_id: body.product_id || null,
      quantity: body.quantity || 0,
      purpose: body.purpose || 'PRODUCTION',
      issue_date: body.issue_date || new Date().toISOString(),
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
