import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_bom_header')
    .select('bom_id, product_id, version, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (data || []).map((r) => ({
    id: r.bom_id,
    product_id: r.product_id,
    version: String(r.version ?? '1'),
    status: (r.is_active == 1 || r.is_active === true) ? 'active' : 'inactive',
    notes: null,
    created_at: r.created_at,
    products: null,
  }))

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_bom_header')
    .insert([{
      bom_id: `BOM-${Date.now()}`,
      product_id: body.product_id || null,
      version: parseInt(body.version) || 1,
      is_active: body.status === 'active' ? 1 : 0,
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
