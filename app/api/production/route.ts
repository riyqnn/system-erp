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
      mrp,
      goodsIssue,
      qualityControl,
      goodsReceipt,
      settlements
    ] = await Promise.all([
      supabase.from('production_orders').select('id'),
      supabase.from('production_bom').select('id'),
      supabase.from('production_work_centers').select('id'),
      supabase.from('production_routing').select('id'),
      supabase.from('production_mrp').select('id'),
      supabase.from('production_goods_issue').select('id'),
      supabase.from('production_quality_control').select('id'),
      supabase.from('production_goods_receipts').select('id'),
      supabase.from('production_order_settlements').select('id')
    ])

    return NextResponse.json({
      success: true,
      module: 'Production',
      summary: {
        totalOrders: orders.data?.length || 0,
        totalBOM: bom.data?.length || 0,
        totalWorkCenters: workCenters.data?.length || 0,
        totalRouting: routing.data?.length || 0,
        totalMRP: mrp.data?.length || 0,
        totalGoodsIssue: goodsIssue.data?.length || 0,
        totalQualityControl: qualityControl.data?.length || 0,
        totalGoodsReceipt: goodsReceipt.data?.length || 0,
        totalSettlements: settlements.data?.length || 0
      }
    })

  } catch (error) {
    console.error('[PRODUCTION_API]', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error'
      },
      {
        status: 500
      }
    )
  }
}