import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

function getMonthName(value?: string | null) {
  if (!value) return 'Unknown'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
  }).format(date)
}

function normalizeStatus(value?: string | null) {
  return String(value || '').toUpperCase()
}

export async function GET() {
  try {
    const [
      suppliersResult,
      supplierPriceResult,
      prResult,
      quotationResult,
      poResult,
      poDetailResult,
      grResult,
      apResult,
    ] = await Promise.all([
      supabase.from('ms_supplier').select('supplier_id, status'),
      supabase.from('ms_supplier_price').select('supplier_price_id'),
      supabase
        .from('tr_purchase_requisition')
        .select('pr_id, status, request_date'),
      supabase
        .from('tr_price_quotation')
        .select('quotation_id, status, quotation_date, final_price, accepted_price'),
      supabase
        .from('tr_purchase_order')
        .select('po_id, status, created_at, po_release_date, total_value'),
      supabase
        .from('tr_po_detail')
        .select('po_detail_id, po_id, subtotal'),
      supabase
        .from('tr_goods_receipt')
        .select('receipt_id, status, receipt_date, po_id'),
      supabase
        .from('tr_account_payable')
        .select('ap_id, po_id, ap_status, ap_amount, created_at'),
    ])

    const errors = [
      suppliersResult.error,
      supplierPriceResult.error,
      prResult.error,
      quotationResult.error,
      poResult.error,
      poDetailResult.error,
      grResult.error,
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

    const suppliers = suppliersResult.data || []
    const supplierPrices = supplierPriceResult.data || []
    const purchaseRequisitions = prResult.data || []
    const quotations = quotationResult.data || []
    const purchaseOrders = poResult.data || []
    const purchaseOrderDetails = poDetailResult.data || []
    const goodsReceipts = grResult.data || []
    const accountPayables = apResult.data || []

    const monthlyPoMap = new Map<
      string,
      { month: string; count: number; value: number }
    >()

    purchaseOrders.forEach((po) => {
      const month = getMonthName(po.created_at || po.po_release_date)
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
        value: purchaseOrders.filter(
          (item) => normalizeStatus(item.status) === 'DRAFT'
        ).length,
      },
      {
        label: 'Pending Approval',
        value: purchaseOrders.filter((item) =>
          ['PENDING_APPROVAL', 'PENDING', 'WAITING_APPROVAL'].includes(
            normalizeStatus(item.status)
          )
        ).length,
      },
      {
        label: 'Approved',
        value: purchaseOrders.filter(
          (item) => normalizeStatus(item.status) === 'APPROVED'
        ).length,
      },
      {
        label: 'Released',
        value: purchaseOrders.filter((item) =>
          ['RELEASED', 'SENT', 'ISSUED'].includes(normalizeStatus(item.status))
        ).length,
      },
    ]

    const supplierStatusOverview = [
      {
        label: 'Active',
        value: suppliers.filter((item) =>
          ['ACTIVE', '1'].includes(normalizeStatus(item.status))
        ).length,
      },
      {
        label: 'Inactive',
        value: suppliers.filter(
          (item) => !['ACTIVE', '1'].includes(normalizeStatus(item.status))
        ).length,
      },
    ]

    const pendingApprovalPO = poStatusOverview.find(
      (item) => item.label === 'Pending Approval'
    )?.value || 0

    const releasedPO = poStatusOverview.find(
      (item) => item.label === 'Released'
    )?.value || 0

    const agreedNegotiations = quotations.filter((item) =>
      ['ACCEPTED', 'APPROVED', 'AGREED'].includes(normalizeStatus(item.status))
    ).length

    const pendingQuotations = quotations.filter((item) =>
      ['PROPOSED', 'PENDING', 'WAITING_RESPONSE'].includes(
        normalizeStatus(item.status)
      )
    ).length

    const paidOrApprovedAP = accountPayables.filter((item) =>
      ['APPROVED', 'PAID', 'POSTED'].includes(normalizeStatus(item.ap_status))
    ).length

    const matchedDocuments = Math.min(
      purchaseOrders.length,
      goodsReceipts.length,
      accountPayables.length
    )

    const mismatchDocuments =
      Math.max(purchaseOrders.length - matchedDocuments, 0)

    const alerts = [
      {
        title: 'Pending PO Approval',
        value: pendingApprovalPO,
        description: 'Purchase orders waiting for approval.',
      },
      {
        title: 'Waiting Quotation Response',
        value: pendingQuotations,
        description: 'Supplier quotations waiting for confirmation.',
      },
      {
        title: 'Goods Receipt Pending',
        value: Math.max(purchaseOrders.length - goodsReceipts.length, 0),
        description: 'Purchase orders that do not have goods receipt yet.',
      },
      {
        title: 'Unmatched Documents',
        value: mismatchDocuments,
        description: 'Estimated PO, GR, and AP documents not fully matched.',
      },
    ]

    return NextResponse.json({
      message: 'Purchasing dashboard data fetched successfully',
      data: {
        summary: {
          totalSuppliers: suppliers.length,
          totalSupplierPrices: supplierPrices.length,
          totalPurchaseRequisitions: purchaseRequisitions.length,
          totalRFQ: quotations.length,
          totalNegotiations: quotations.length,
          totalPurchaseOrders: purchaseOrders.length,
          totalPurchaseOrderItems: purchaseOrderDetails.length,
          totalGoodsReceipts: goodsReceipts.length,
          totalThreeWayMatchings: matchedDocuments,
          totalTrackingReports: goodsReceipts.length,
          totalAccountPayables: accountPayables.length,
          pendingApprovalPO,
          releasedPO,
          agreedNegotiations,
          matchedDocuments,
          paidOrApprovedAP,
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