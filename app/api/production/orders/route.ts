import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  // Tarik data dari DB lu yang asli: tr_production_order & ms_product
  const { data, error } = await supabase
    .from('tr_production_order')
    .select(`
      prod_order_id,
      product_id,
      bom_id,
      target_qty,
      start_date,
      end_date,
      status,
      ms_product (
        product_id,
        product_name
      ),
      tr_production_request!production_request_id (
        request_date
      )
    `)
    .order('prod_order_id', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const statusMap: Record<string, string> = {
    CREATED:     'planned',
    PLANNED:     'planned',
    MRP_READY:   'mrp_ready',
    IN_PROGRESS: 'in_progress',
    COMPLETED:   'completed',
    CLOSED:      'completed',
    CANCELLED:   'cancelled',
    ON_HOLD:     'on_hold',
  }

  const formattedData = data.map((item) => {
    const rawStatus = String(item.status ?? '').toUpperCase()
    const requestDate = item.tr_production_request?.request_date ?? null
    return {
      id: item.prod_order_id,
      po_number: item.prod_order_id,
      product_id: item.product_id,
      bom_id: item.bom_id ?? null,
      planned_qty: item.target_qty,
      start_date: item.start_date,
      end_date: item.end_date ?? requestDate,
      status: statusMap[rawStatus] ?? item.status?.toLowerCase() ?? 'planned',
      notes: null,
      products: item.ms_product ? {
        id: item.ms_product.product_id,
        sku: item.ms_product.product_id,
        name: item.ms_product.product_name
      } : null
    }
  })

  return NextResponse.json(formattedData)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  // Insert ke DB dengan nama kolom yang benar
  const { data, error } = await supabase
    .from('tr_production_order')
    .insert({
      prod_order_id: `PO-${Date.now()}`, // Bikin ID Unik Sementara
      product_id: body.product_id,
      target_qty: body.planned_qty, // Menerjemahkan balikan dari form
      start_date: body.start_date,
      end_date: body.end_date,
      status: body.status || 'planned',
    })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}