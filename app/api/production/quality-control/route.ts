import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('tr_quality_control')
    .select(`
      qc_id,
      prod_order_id,
      batch_number,
      qc_status,
      inspection_date,
      inspected_by,
      tr_production_order!prod_order_id(prod_order_id)
    `)
    .order('inspection_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const qcStatusMap: Record<string, string> = {
    PASS: 'pass',
    FAIL: 'fail',
    HOLD: 'pending',
  }

  const mapped = (data || []).map((r) => {
    const prodOrder = Array.isArray(r.tr_production_order) ? r.tr_production_order[0] : r.tr_production_order;
    return {
      id: r.qc_id,
      production_order_id: r.prod_order_id,
      batch_number: r.batch_number,
      inspector: r.inspected_by ? String(r.inspected_by) : null,
      inspection_date: r.inspection_date,
      result: qcStatusMap[r.qc_status] ?? 'pending',
      defect_qty: null,
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
  const qcId = `QC-${yyyymm}-${String(now.getTime()).slice(-4)}`

  const resultToStatus: Record<string, string> = {
    pass: 'PASS',
    fail: 'FAIL',
    pending: 'HOLD',
    approved: 'PASS',
  }
  const qcStatus = resultToStatus[body.result] ?? resultToStatus[body.supervisor_decision] ?? 'HOLD'

  const { data, error } = await supabase
    .from('tr_quality_control')
    .insert([{
      qc_id: qcId,
      prod_order_id: body.production_order_id || null,
      batch_number: body.batch_number || null,
      qc_status: qcStatus,
      inspection_date: body.inspection_date || new Date().toISOString(),
    }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
