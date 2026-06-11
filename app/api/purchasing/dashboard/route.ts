import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

function getMonthName(value: string) {
  const date = new Date(value)

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
  }).format(date)
}

export async function GET() {
  try {
    const [
      suppliersResult,
      prResult,
      rfqResult,
      negotiationResult,
      poResult,
      grResult,
      matchingResult,
      trackingResult,
    ] = await Promise.all([
      supabase.from('purchasing_supplier_products').select('id, status'),
      supabase
        .from('purchasing_purchase_requisitions')
        .select('id, status, request_date'),
      supabase.from('purchasing_rfq_sourcing').select('id, status, created_at'),
      supabase
        .from('purchasing_price_negotiations')
        .select('id, status, created_at'),
      supabase
        .from('purchasing_purchase_orders')
        .select('id, status, po_date, total_value'),
      supabase
        .from('purchasing_goods_receipts')
        .select('id, status, receipt_date'),
      supabase
        .from('purchasing_three_way_matchings')
        .select('id, match_status, sent_to_finance, created_at'),
      supabase
        .from('purchasing_tracking_reports')
        .select('id, status, entity_type, estimated_arrival_date, created_at'),
    ])

    const errors = [
      suppliersResult.error,
      prResult.error,
      rfqResult.error,
      negotiationResult.error,
      poResult.error,
      grResult.error,
      matchingResult.error,
      trackingResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch dashboard data',
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    const suppliers = suppliersResult.data || []
    const purchaseRequisitions = prResult.data || []
    const rfq = rfqResult.data || []
    const negotiations = negotiationResult.data || []
    const purchaseOrders = poResult.data || []
    const goodsReceipts = grResult.data || []
    const matchings = matchingResult.data || []
    const trackingReports = trackingResult.data || []

    const monthlyPoMap = new Map<string, { month: string; count: number; value: number }>()

    purchaseOrders.forEach((po) => {
      const month = getMonthName(po.po_date)
      const current = monthlyPoMap.get(month) || {
        month,
        count: 0,
        value: 0,
      }

      current.count += 1
      current.value += Number(po.total_value || 0)
      monthlyPoMap.set(month, current)
    })

    const monthlyPurchaseOrders = Array.from(monthlyPoMap.values())

    const poStatusOverview = [
      {
        label: 'Draft',
        value: purchaseOrders.filter((item) => item.status === 'DRAFT').length,
      },
      {
        label: 'Pending Approval',
        value: purchaseOrders.filter((item) => item.status === 'PENDING_APPROVAL')
          .length,
      },
      {
        label: 'Approved',
        value: purchaseOrders.filter((item) => item.status === 'APPROVED').length,
      },
      {
        label: 'Released',
        value: purchaseOrders.filter((item) => item.status === 'RELEASED').length,
      },
    ]

    const supplierStatusOverview = [
      {
        label: 'Active',
        value: suppliers.filter((item) => item.status === 'ACTIVE').length,
      },
      {
        label: 'Inactive',
        value: suppliers.filter((item) => item.status === 'INACTIVE').length,
      },
    ]

    const alerts = [
      {
        title: 'Pending PO Approval',
        value: purchaseOrders.filter((item) => item.status === 'PENDING_APPROVAL')
          .length,
        description: 'Purchase orders waiting for approval.',
      },
      {
        title: 'Waiting RFQ Response',
        value: rfq.filter((item) => item.status === 'WAITING_RESPONSE').length,
        description: 'RFQ documents waiting for supplier response.',
      },
      {
        title: 'Delayed Tracking',
        value: trackingReports.filter((item) => item.status === 'DELAYED').length,
        description: 'Tracking reports marked as delayed.',
      },
      {
        title: 'Mismatch Documents',
        value: matchings.filter((item) => item.match_status === 'MISMATCH').length,
        description: 'Three-way matching documents with mismatch result.',
      },
    ]

    return NextResponse.json({
      message: 'Purchasing dashboard data fetched successfully',
      data: {
        summary: {
          totalSuppliers: suppliers.length,
          totalPurchaseRequisitions: purchaseRequisitions.length,
          totalRFQ: rfq.length,
          totalNegotiations: negotiations.length,
          totalPurchaseOrders: purchaseOrders.length,
          totalGoodsReceipts: goodsReceipts.length,
          totalThreeWayMatchings: matchings.length,
          totalTrackingReports: trackingReports.length,
          pendingApprovalPO: purchaseOrders.filter(
            (item) => item.status === 'PENDING_APPROVAL'
          ).length,
          releasedPO: purchaseOrders.filter((item) => item.status === 'RELEASED')
            .length,
          agreedNegotiations: negotiations.filter(
            (item) => item.status === 'AGREED'
          ).length,
          matchedDocuments: matchings.filter(
            (item) => item.match_status === 'MATCHED'
          ).length,
        },
        monthlyPurchaseOrders,
        poStatusOverview,
        supplierStatusOverview,
        alerts,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}