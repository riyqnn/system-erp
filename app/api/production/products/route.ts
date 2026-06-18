import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()
  const { data, error } = await supabase
    .from('ms_product')
    .select('product_id, product_name, uom')
    .order('product_name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const mapped = (data ?? []).map((p) => ({
    id: p.product_id,
    sku: p.product_id,
    name: p.product_name,
    unit: p.uom,
  }))
  return NextResponse.json(mapped)
}
