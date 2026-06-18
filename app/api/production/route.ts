import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient()

    const [
      orders,
      bom,
      workCenters,
      routing,
      goodsIssue,
      qualityControl,
      goodsReceipt,
      settlements
    ] = await Promise.all([
      supabase.from('tr_production_order').select('prod_order_id'),
      supabase.from('ms_bom_header').select('bom_id'),
      supabase.from('ms_work_center').select('wc_id'),
      supabase.from('ms_routing').select('routing_id'),
      supabase.from('tr_goods_issue').select('issue_id'),
      supabase.from('tr_quality_control').select('qc_id'),
      supabase.from('tr_production_receipt').select('prod_receipt_id'),
      supabase.from('tr_order_settlement').select('settlement_id')
    ])

    return NextResponse.json({
      success: true,
      module: 'Production',
      summary: {
        totalOrders: orders.data?.length || 0,
        totalBOM: bom.data?.length || 0,
        totalWorkCenters: workCenters.data?.length || 0,
        totalRouting: routing.data?.length || 0,
        totalGoodsIssue: goodsIssue.data?.length || 0,
        totalQualityControl: qualityControl.data?.length || 0,
        totalGoodsReceipt: goodsReceipt.data?.length || 0,
        totalSettlements: settlements.data?.length || 0
      }
    })

  } catch (error) {
    console.error('[PRODUCTION_API]', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
