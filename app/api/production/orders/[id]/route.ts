import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

// Hapus tipe Promise biar kompatibel sama struktur Next.js standar
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createRouteHandlerClient()
  
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
      )
    `)
    .eq('prod_order_id', id)
    .single()
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  // WAJIB ditambahin biar TypeScript gak merah (menjamin data gak null)
  if (!data) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })

  const formattedData = {
    id: data.prod_order_id,
    po_number: data.prod_order_id,
    product_id: data.product_id,
    bom_id: data.bom_id ?? null,
    planned_qty: data.target_qty,
    start_date: data.start_date,
    end_date: data.end_date,
    status: data.status,
    notes: null,
    products: data.ms_product ? {
      id: data.ms_product.product_id,
      sku: data.ms_product.product_id,
      name: data.ms_product.product_name
    } : null
  }

  return NextResponse.json(formattedData)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const statusToDb: Record<string, string> = {
    planned:     'CREATED',
    mrp_ready:   'MRP_READY',
    in_progress: 'IN_PROGRESS',
    completed:   'COMPLETED',
    cancelled:   'CANCELLED',
    on_hold:     'ON_HOLD',
  }
  const updatePayload: Record<string, unknown> = {}
  if (body.status) updatePayload.status = statusToDb[body.status] ?? body.status.toUpperCase()
  if (body.planned_qty) updatePayload.target_qty = body.planned_qty
  if (body.start_date) updatePayload.start_date = body.start_date
  if (body.end_date) updatePayload.end_date = body.end_date
  if (body.product_id) updatePayload.product_id = body.product_id

  const { data, error } = await supabase
    .from('tr_production_order')
    .update(updatePayload)
    .eq('prod_order_id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createRouteHandlerClient()
  
  const { error } = await supabase
    .from('tr_production_order')
    .delete()
    .eq('prod_order_id', id)
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}