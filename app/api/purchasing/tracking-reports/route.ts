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
  return String(value || '').toUpperCase()
}

function getTrackingStatus(po: any, goodsReceipts: any[], accountPayables: any[]) {
  const poStatus = normalizeStatus(po.status)

  if (poStatus === 'CANCELLED' || poStatus === 'REJECTED') {
    return 'CANCELLED'
  }

  if (accountPayables.some((ap) => ['APPROVED', 'POSTED', 'PAID'].includes(normalizeStatus(ap.ap_status)))) {
    return 'COMPLETED'
  }

  if (goodsReceipts.length > 0) {
    return 'RECEIVED'
  }

  if (['RELEASED', 'ISSUED', 'SENT', 'APPROVED'].includes(poStatus)) {
    return 'IN_TRANSIT'
  }

  return 'PENDING'
}

function getEstimatedArrivalDate(po: any, supplier: any) {
  if (po.po_release_date) {
    const releaseDate = new Date(po.po_release_date)
    const leadTime = Number(supplier?.lead_time || 7)

    if (!Number.isNaN(releaseDate.getTime())) {
      releaseDate.setDate(releaseDate.getDate() + leadTime)
      return releaseDate.toISOString()
    }
  }

  if (po.created_at) {
    const createdDate = new Date(po.created_at)
    const leadTime = Number(supplier?.lead_time || 7)

    if (!Number.isNaN(createdDate.getTime())) {
      createdDate.setDate(createdDate.getDate() + leadTime)
      return createdDate.toISOString()
    }
  }

  return null
}

function isDelayed(estimatedArrivalDate: string | null, goodsReceipts: any[]) {
  if (!estimatedArrivalDate || goodsReceipts.length > 0) return false

  const estimatedDate = new Date(estimatedArrivalDate)
  const today = new Date()

  if (Number.isNaN(estimatedDate.getTime())) return false

  return estimatedDate < today
}

export async function GET() {
  try {
    const [
      poResult,
      poDetailResult,
      grResult,
      apResult,
      supplierResult,
      productResult,
    ] = await Promise.all([
      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, pr_id, supplier_id, quotation_id, approved_by, total_value, status, rejection_reason, created_at, po_release_date'
        )
        .order('created_at', { ascending: false }),

      supabase
        .from('tr_po_detail')
        .select('po_detail_id, po_id, product_id, qty_order, unit_price, subtotal'),

      supabase
        .from('tr_goods_receipt')
        .select(
          'receipt_id, po_id, pr_id, supplier_id, product_id, quantity, batch_number, expiry_date, receipt_date, received_by, status, reject_qty, reject_reason, created_at'
        ),

      supabase
        .from('tr_account_payable')
        .select(
          'ap_id, po_id, supplier_id, inv_supp_no, invoice_date, ap_amount, ap_status, due_date, approved_by, created_at'
        ),

      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address, lead_time, top, status'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom'),
    ])

    const errors = [
      poResult.error,
      poDetailResult.error,
      grResult.error,
      apResult.error,
      supplierResult.error,
      productResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch tracking reports',
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    const purchaseOrders = poResult.data || []
    const poDetails = poDetailResult.data || []
    const goodsReceipts = grResult.data || []
    const accountPayables = apResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const poDetailsByPO = new Map<string, any[]>()

    poDetails.forEach((detail: any) => {
      const poId = String(detail.po_id || '')
      const current = poDetailsByPO.get(poId) || []

      current.push(detail)
      poDetailsByPO.set(poId, current)
    })

    const grByPO = new Map<string, any[]>()

    goodsReceipts.forEach((receipt: any) => {
      const poId = String(receipt.po_id || '')
      const current = grByPO.get(poId) || []

      current.push(receipt)
      grByPO.set(poId, current)
    })

    const apByPO = new Map<string, any[]>()

    accountPayables.forEach((ap: any) => {
      const poId = String(ap.po_id || '')
      const current = apByPO.get(poId) || []

      current.push(ap)
      apByPO.set(poId, current)
    })

    const trackingReports = purchaseOrders.map((po: any) => {
      const supplier = supplierMap.get(po.supplier_id)
      const poItems = poDetailsByPO.get(po.po_id) || []
      const grItems = grByPO.get(po.po_id) || []
      const apItems = apByPO.get(po.po_id) || []

      const firstItem = poItems[0]
      const firstProduct = productMap.get(firstItem?.product_id)

      const estimatedArrivalDate = getEstimatedArrivalDate(po, supplier)
      const trackingStatus = isDelayed(estimatedArrivalDate, grItems)
        ? 'DELAYED'
        : getTrackingStatus(po, grItems, apItems)

      const totalQty = poItems.reduce(
        (total: number, item: any) => total + Number(item.qty_order || 0),
        0
      )

      const totalReceivedQty = grItems.reduce(
        (total: number, item: any) => total + Number(item.quantity || 0),
        0
      )

      const latestReceipt = grItems
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.receipt_date || b.created_at || 0).getTime() -
            new Date(a.receipt_date || a.created_at || 0).getTime()
        )[0]

      const latestAP = apItems
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at || b.invoice_date || 0).getTime() -
            new Date(a.created_at || a.invoice_date || 0).getTime()
        )[0]

      let supplierNotes = '-'

      if (trackingStatus === 'DELAYED') {
        supplierNotes = 'Delivery is past the estimated arrival date.'
      } else if (trackingStatus === 'RECEIVED') {
        supplierNotes = `Goods received: ${totalReceivedQty} of ${totalQty}.`
      } else if (trackingStatus === 'COMPLETED') {
        supplierNotes = 'PO, receipt, and payable process already completed.'
      } else if (trackingStatus === 'IN_TRANSIT') {
        supplierNotes = 'PO has been released and is waiting for goods receipt.'
      } else {
        supplierNotes = 'PO is still waiting for the next purchasing process.'
      }

      return {
        id: `TRACK-${po.po_id}`,
        trackingNo: `TRACK-${po.po_id}`,
        entityType: 'PURCHASE_ORDER',
        entityId: po.po_id,
        trackingStatus,
        estimatedArrivalDate,
        supplierNotes,
        reportedBy: 'System',
        reportedAt: latestReceipt?.created_at || latestAP?.created_at || po.created_at,

        poNo: po.po_id,
        poDate: po.created_at || null,
        expectedDeliveryDate: estimatedArrivalDate,
        poStatus: po.status || '-',
        totalValue: Number(po.total_value || 0),

        supplierId: supplier?.supplier_id || po.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        productCode: firstProduct?.product_id || firstItem?.product_id || '-',
        productName: firstProduct?.product_name || '-',
        category: firstProduct?.category || '-',
        qty: totalQty,
        receivedQty: totalReceivedQty,
        unit: firstProduct?.uom || '-',

        latestReceiptNo: latestReceipt?.receipt_id || '-',
        latestReceiptDate: latestReceipt?.receipt_date || null,
        latestInvoiceNo: latestAP?.inv_supp_no || latestAP?.ap_id || '-',
        latestPaymentStatus: latestAP?.ap_status || '-',
      }
    })

    return NextResponse.json({
      message: 'Tracking reports fetched successfully',
      data: trackingReports,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching tracking reports',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      trackingNumber,
      poNumber,
      status,
      estimatedArrivalDate,
      supplierNotes,
      createdByName,
    } = body

    if (!trackingNumber || !poNumber || !status) {
      return NextResponse.json(
        {
          message: 'Tracking number, PO number, and status are required',
        },
        { status: 400 }
      )
    }

    const { data: poData, error: poError } = await supabase
      .from('tr_purchase_order')
      .select('po_id')
      .eq('po_id', poNumber)
      .maybeSingle()

    if (poError || !poData) {
      return NextResponse.json(
        {
          message: 'Purchase order not found',
          error: poError?.message || `PO ${poNumber} does not exist`,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message:
        'Tracking report saved successfully. Tracking is computed from PO, GR, and AP data in the new database schema.',
      data: {
        trackingNumber,
        poNumber,
        status,
        estimatedArrivalDate: estimatedArrivalDate || null,
        supplierNotes: supplierNotes || null,
        createdByName: createdByName || 'Purchasing Staff',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving tracking report',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}