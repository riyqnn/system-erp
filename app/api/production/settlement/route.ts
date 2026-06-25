import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('tr_order_settlement')
    .select(`
      settlement_id,
      prod_order_id,
      period,
      material_cost,
      labor_cost,
      other_cost,
      actual_cost,
      standard_cost,
      variance_cost,
      settlement_status,
      settlement_date,
      tr_production_order!prod_order_id(prod_order_id)
    `)
    .order('settlement_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const statusMap: Record<string, string> = {
    settled: 'settled',
    closed: 'settled',
    draft: 'draft',
    cancelled: 'cancelled',
  }

  const mapped = (data || []).map((r) => {
    const prodOrder = Array.isArray(r.tr_production_order) ? r.tr_production_order[0] : r.tr_production_order;
    return {
      id: r.settlement_id,
      production_order_id: r.prod_order_id,
      settlement_date: r.settlement_date,
      actual_cost: r.actual_cost != null ? Number(r.actual_cost) : null,
      variance: r.variance_cost != null ? Number(r.variance_cost) : null,
      status: statusMap[String(r.settlement_status).toLowerCase()] ?? r.settlement_status ?? 'draft',
      notes: null,
      production_orders: prodOrder
        ? { po_number: prodOrder.prod_order_id }
        : null,
    };
  })

  return NextResponse.json(mapped)
}

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createRouteHandlerClient()

  const now = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const settlementId = `STL-${yyyymm}-${String(now.getTime()).slice(-4)}`

  const actualCost = Number(body.actual_cost) || 0
  const varianceCost = Number(body.variance) || Number(body.variance_cost) || 0
  const standardCost = actualCost - varianceCost

  const { data, error } = await supabase
    .from('tr_order_settlement')
    .insert([{
      settlement_id: settlementId,
      prod_order_id: body.production_order_id || null,
      period: yyyymm,
      actual_cost: actualCost,
      standard_cost: standardCost,
      variance_cost: varianceCost,
      settlement_status: body.status || 'draft',
      settlement_date: body.settlement_date || new Date().toISOString(),
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
