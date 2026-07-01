import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type AnyObject = Record<string, any>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeStatus(value?: string | null) {
  return String(value || 'UNKNOWN').trim().toUpperCase()
}

function formatStatusLabel(value?: string | null) {
  const status = normalizeStatus(value)

  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    RELEASED: 'Released',
    REVISION_REQUIRED: 'Revision Required',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
    PROCESSED: 'Processed',
    CLOSED: 'Closed',
    SENT: 'Sent',
    ISSUED: 'Issued',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
    UNKNOWN: 'Unknown',
  }

  return (
    statusMap[status] ||
    status
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  )
}

function getMonthKey(value?: string | null) {
  if (!value) return 'unknown'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'unknown'

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}`
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

function buildStatusOverview(rows: AnyObject[], statusKey: string) {
  const statusMap = new Map<string, number>()

  rows.forEach((row) => {
    const label = formatStatusLabel(row?.[statusKey])
    statusMap.set(label, (statusMap.get(label) || 0) + 1)
  })

  return Array.from(statusMap.entries()).map(([label, value]) => ({
    label,
    value,
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
        .select('quotation_id, supplier_id, product_id, status, quotation_date'),

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
          error: errors[0]?.message || 'Unknown database error',
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

    const negotiations = quotations.filter((quotation: AnyObject) =>
      ['NEGOTIATION', 'COUNTERED', 'AGREED', 'ACCEPTED', 'APPROVED'].includes(
        normalizeStatus(quotation.status)
      )
    )

    const agreedNegotiations = quotations.filter((quotation: AnyObject) =>
      ['AGREED', 'ACCEPTED', 'APPROVED'].includes(normalizeStatus(quotation.status))
    ).length

    const receiptPOSet = new Set(
      goodsReceipts.map((receipt: AnyObject) => String(receipt.po_id || ''))
    )

    const apPOSet = new Set(
      accountPayables.map((ap: AnyObject) => String(ap.po_id || ''))
    )

    const threeWayMatchings = purchaseOrders.filter((po: AnyObject) => {
      const poId = String(po.po_id || '')

      return receiptPOSet.has(poId) || apPOSet.has(poId)
    })

    const matchedDocuments = purchaseOrders.filter((po: AnyObject) => {
      const poId = String(po.po_id || '')

      return receiptPOSet.has(poId) && apPOSet.has(poId)
    }).length

    const trackingReports = purchaseOrders.filter((po: AnyObject) =>
      ['APPROVED', 'RELEASED', 'SENT', 'ISSUED', 'COMPLETED'].includes(
        normalizeStatus(po.status)
      )
    )

    const monthlyPOMap = new Map<
      string,
      {
        month: string
        count: number
        value: number
      }
    >()

    purchaseOrders.forEach((po: AnyObject) => {
      const sourceDate = po.created_at || po.po_release_date
      const monthKey = getMonthKey(sourceDate)
      const monthLabel = getMonthLabel(sourceDate)

      const current = monthlyPOMap.get(monthKey) || {
        month: monthLabel,
        count: 0,
        value: 0,
      }

      current.count += 1
      current.value += Number(po.total_value || 0)

      monthlyPOMap.set(monthKey, current)
    })

    const monthlyPurchaseOrders = Array.from(monthlyPOMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, value]) => value)

    const pendingPR = purchaseRequisitions.filter((pr: AnyObject) =>
      ['PENDING', 'DRAFT', 'REQUESTED'].includes(normalizeStatus(pr.status))
    ).length

    const pendingApprovalPO = purchaseOrders.filter((po: AnyObject) =>
      ['PENDING_APPROVAL', 'PENDING', 'DRAFT'].includes(normalizeStatus(po.status))
    ).length

    const releasedPO = purchaseOrders.filter((po: AnyObject) =>
      ['RELEASED', 'COMPLETED'].includes(normalizeStatus(po.status))
    ).length

    const delayedPO = purchaseOrders.filter((po: AnyObject) =>
      ['DELAYED', 'OVERDUE'].includes(normalizeStatus(po.status))
    ).length

    const alerts = [
      ...(pendingPR > 0
        ? [
            {
              title: 'Pending Purchase Requisition',
              value: pendingPR,
              description: `${pendingPR} purchase requisition(s) still need to be processed.`,
            },
          ]
        : []),

      ...(pendingApprovalPO > 0
        ? [
            {
              title: 'Pending Purchase Order',
              value: pendingApprovalPO,
              description: `${pendingApprovalPO} purchase order(s) are still pending approval or processing.`,
            },
          ]
        : []),

      ...(delayedPO > 0
        ? [
            {
              title: 'Delayed Purchase Order',
              value: delayedPO,
              description: `${delayedPO} purchase order(s) are delayed or overdue.`,
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

          pendingApprovalPO,
          releasedPO,
          agreedNegotiations,
          matchedDocuments,
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