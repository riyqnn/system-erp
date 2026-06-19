import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_bom_header')
    .select(`
      bom_id, product_id, version, is_active, created_at,
      ms_bom_detail(bom_detail_id, bom_id, component_id, qty_required, scrap_factor,
        ms_product!component_id(product_id, product_name, uom)
      )
    `)
    .eq('bom_id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = {
    id: data.bom_id,
    product_id: data.product_id,
    version: String(data.version ?? '1'),
    status: data.is_active === 1 ? 'active' : 'inactive',
    notes: null,
    created_at: data.created_at,
    products: null,
    production_bom_details: (data.ms_bom_detail || []).map((d) => ({
      id: String(d.bom_detail_id),
      bom_id: d.bom_id,
      material_id: d.component_id,
      quantity: Number(d.qty_required),
      unit: d.ms_product?.uom ?? '',
      notes: null,
      products: d.ms_product ? {
        id: d.ms_product.product_id,
        sku: d.ms_product.product_id,
        name: d.ms_product.product_name,
      } : null,
    })),
  }

  return NextResponse.json(mapped)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const update: Record<string, unknown> = {}
  if (body.product_id !== undefined) update.product_id = body.product_id
  if (body.version !== undefined) update.version = parseInt(body.version) || 1
  if (body.status !== undefined) update.is_active = body.status === 'active' ? 1 : 0

  const { data, error } = await supabase
    .from('ms_bom_header')
    .update(update)
    .eq('bom_id', id)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createRouteHandlerClient()
  const { error } = await supabase.from('ms_bom_header').delete().eq('bom_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
