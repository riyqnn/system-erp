import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeStatus(value?: string | null) {
  return String(value || 'UNKNOWN').toUpperCase()
}

function getMonthLabel(value?: string | null) {
  if (!value) return 'Unknown'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function buildStatusOverview(rows: any[], statusKey: string) {
  const statusMap = new Map<string, number>()

  rows.forEach((row) => {
    const status = normalizeStatus(row?.[statusKey])
    statusMap.set(status, (statusMap.get(status) || 0) + 1)
  })

  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }))
}

export async function GET() {
  try {
    const [
      supplierResult,
      prResult,
      quotationResult,
      poResult,
      goodsReceiptResult,
      apResult,
    ] = await Promise.all([
      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, status, created_at'),

      supabase
        .from('tr_purchase_requisition')
        .select('pr_id, status, request_date, created_at'),

      supabase
      .from('tr_price_quotation')
      .select(
        'quotation_id, supplier_id, product_id, status, quotation_date'
      ),

      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, supplier_id, quotation_id, total_value, status, created_at, po_release_date'
        ),

      supabase
        .from('tr_goods_receipt')
        .select('receipt_id, po_id, status, receipt_date, created_at'),

      supabase
      .from('tr_account_payable')
      .select('ap_id, po_id, ap_status, created_at'),
    ])

    const errors = [
      supplierResult.error,
      prResult.error,
      quotationResult.error,
      poResult.error,
      goodsReceiptResult.error,
      apResult.error,
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

    const suppliers = supplierResult.data || []
    const purchaseRequisitions = prResult.data || []
    const quotations = quotationResult.data || []
    const purchaseOrders = poResult.data || []
    const goodsReceipts = goodsReceiptResult.data || []
    const accountPayables = apResult.data || []

    const negotiations = quotations.filter((quotation: any) =>
      ['NEGOTIATION', 'COUNTERED', 'AGREED', 'ACCEPTED', 'APPROVED'].includes(
        normalizeStatus(quotation.status)
      )
    )

    const receiptPOSet = new Set(
      goodsReceipts.map((receipt: any) => String(receipt.po_id || ''))
    )

    const apPOSet = new Set(
      accountPayables.map((ap: any) => String(ap.po_id || ''))
    )

    const threeWayMatchings = purchaseOrders.filter((po: any) => {
      const poId = String(po.po_id || '')
      return receiptPOSet.has(poId) || apPOSet.has(poId)
    })

    const trackingReports = purchaseOrders.filter((po: any) =>
      ['APPROVED', 'RELEASED', 'SENT', 'ISSUED'].includes(
        normalizeStatus(po.status)
      )
    )

    const monthlyPOMap = new Map<string, { month: string; totalPO: number; totalValue: number }>()

    purchaseOrders.forEach((po: any) => {
      const month = getMonthLabel(po.created_at || po.po_release_date)
      const current = monthlyPOMap.get(month) || {
        month,
        totalPO: 0,
        totalValue: 0,
      }

      current.totalPO += 1
      current.totalValue += Number(po.total_value || 0)

      monthlyPOMap.set(month, current)
    })

    const monthlyPurchaseOrders = Array.from(monthlyPOMap.values())

    const pendingPR = purchaseRequisitions.filter((pr: any) =>
      ['PENDING', 'DRAFT', 'REQUESTED'].includes(normalizeStatus(pr.status))
    ).length

    const pendingPO = purchaseOrders.filter((po: any) =>
      ['PENDING', 'PENDING_APPROVAL', 'DRAFT'].includes(normalizeStatus(po.status))
    ).length

    const delayedPO = purchaseOrders.filter((po: any) => {
      const status = normalizeStatus(po.status)
      return ['DELAYED', 'OVERDUE'].includes(status)
    }).length

    const alerts = [
      ...(pendingPR > 0
        ? [
            {
              id: 'pending-pr',
              type: 'warning',
              title: 'Pending Purchase Requisition',
              message: `${pendingPR} purchase requisition(s) still need to be processed.`,
            },
          ]
        : []),
      ...(pendingPO > 0
        ? [
            {
              id: 'pending-po',
              type: 'warning',
              title: 'Pending Purchase Order',
              message: `${pendingPO} purchase order(s) are still pending.`,
            },
          ]
        : []),
      ...(delayedPO > 0
        ? [
            {
              id: 'delayed-po',
              type: 'danger',
              title: 'Delayed Purchase Order',
              message: `${delayedPO} purchase order(s) are delayed or overdue.`,
            },
          ]
        : []),
    ]

    return NextResponse.json({
      message: 'Purchasing dashboard data fetched successfully',
      data: {
        summary: {
          totalSuppliers: suppliers.length,
          totalPurchaseRequisitions: purchaseRequisitions.length,
          totalRFQ: quotations.length,
          totalNegotiations: negotiations.length,
          totalPurchaseOrders: purchaseOrders.length,
          totalGoodsReceipts: goodsReceipts.length,
          totalThreeWayMatchings: threeWayMatchings.length,
          totalTrackingReports: trackingReports.length,
        },
        monthlyPurchaseOrders,
        poStatusOverview: buildStatusOverview(purchaseOrders, 'status'),
        supplierStatusOverview: buildStatusOverview(suppliers, 'status'),
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