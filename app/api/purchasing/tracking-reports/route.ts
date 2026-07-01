import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

type AnyObject = Record<string, any>

function normalizeStatus(value?: string | null) {
  return String(value || '').toUpperCase()
}

function getString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback

  const parsed = String(value).trim()

  return parsed || fallback
}

function getNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)

  return Number.isNaN(parsed) ? fallback : parsed
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  return String(error || 'Unknown error')
}

function addDays(value?: string | null, days = 7) {
  const baseDate = value ? new Date(value) : new Date()

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString()
  }

  baseDate.setDate(baseDate.getDate() + days)

  return baseDate.toISOString()
}

function generateTrackingNumber(poId: string) {
  const timestamp = String(Date.now()).slice(-8)

  return `TRK-${poId}-${timestamp}`
}

function normalizeManualTrackingStatus(value?: string | null) {
  const status = normalizeStatus(value)

  if (status === 'SENT_TO_SUPPLIER') return 'SENT_TO_SUPPLIER'
  if (status === 'IN_PROCESS') return 'IN_PROCESS'
  if (status === 'IN_DELIVERY') return 'IN_DELIVERY'
  if (status === 'DELAYED') return 'DELAYED'
  if (status === 'DELIVERED') return 'DELIVERED'

  return 'IN_PROCESS'
}

function getReceivedQty(receipt: AnyObject) {
  const status = normalizeStatus(receipt.status)
  const quantity = getNumber(receipt.quantity || receipt.received_qty, 0)
  const rejectQty = getNumber(receipt.reject_qty, 0)

  if (status === 'REJECTED') return 0

  return Math.max(quantity - rejectQty, 0)
}

function getTrackingStatus({
  poStatus,
  latestTracking,
  hasReceipt,
}: {
  poStatus?: string | null
  latestTracking?: AnyObject | null
  hasReceipt: boolean
}) {
  const status = normalizeStatus(poStatus)

  if (hasReceipt || status === 'COMPLETED') return 'COMPLETED'

  if (latestTracking?.status) {
    return normalizeManualTrackingStatus(latestTracking.status)
  }

  if (['RELEASED', 'SENT', 'ISSUED'].includes(status)) {
    return 'SENT_TO_SUPPLIER'
  }

  if (status === 'APPROVED') return 'PENDING'
  if (['CANCELLED', 'REJECTED'].includes(status)) return 'CANCELLED'

  return 'PENDING'
}

export async function GET() {
  try {
    const [
      poResult,
      poDetailResult,
      supplierResult,
      productResult,
      goodsReceiptResult,
      manualTrackingResult,
    ] = await Promise.all([
      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, supplier_id, total_value, status, created_at, po_release_date'
        )
        .order('created_at', { ascending: false }),

      supabase
        .from('tr_po_detail')
        .select('po_id, product_id, qty_order, unit_price, subtotal'),

      supabase
        .from('ms_supplier')
        .select(
          'supplier_id, supplier_name, contact, address, lead_time, top, status'
        ),

      supabase.from('ms_product').select('product_id, product_name, category, uom'),

      supabase
        .from('tr_goods_receipt')
        .select(
          'receipt_id, po_id, product_id, quantity, reject_qty, receipt_date, status, created_at'
        ),

      supabase
        .from('purchasing_tracking_reports')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

    const errors = [
      poResult.error,
      poDetailResult.error,
      supplierResult.error,
      productResult.error,
      goodsReceiptResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      const firstError = errors[0]

      return NextResponse.json(
        {
          message: 'Failed to fetch tracking reports',
          error: firstError?.message || 'Unknown database error',
        },
        { status: 500 }
      )
    }

    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const manualTrackingRows = manualTrackingResult.error
      ? []
      : manualTrackingResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: AnyObject) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: AnyObject) => [product.product_id, product])
    )

    const receiptsByPO = new Map<string, AnyObject[]>()
    ;(goodsReceiptResult.data || []).forEach((receipt: AnyObject) => {
      const poId = String(receipt.po_id || '')
      const currentReceipts = receiptsByPO.get(poId) || []

      currentReceipts.push(receipt)
      receiptsByPO.set(poId, currentReceipts)
    })

    const detailsByPO = new Map<string, AnyObject[]>()
    ;(poDetailResult.data || []).forEach((detail: AnyObject) => {
      const poId = String(detail.po_id || '')
      const currentDetails = detailsByPO.get(poId) || []

      currentDetails.push(detail)
      detailsByPO.set(poId, currentDetails)
    })

    const trackingByPO = new Map<string, AnyObject>()
    manualTrackingRows.forEach((tracking: AnyObject) => {
      const poId = String(tracking.entity_id || tracking.po_id || '')
      const entityType = normalizeStatus(tracking.entity_type)

      if (!poId || entityType !== 'PURCHASE_ORDER') return
      if (!trackingByPO.has(poId)) trackingByPO.set(poId, tracking)
    })

    const trackingReports = (poResult.data || [])
      .filter((item: AnyObject) => {
        const status = normalizeStatus(item.status)

        return ['RELEASED', 'COMPLETED'].includes(status)
      })
      .map((item: AnyObject) => {
        const poId = String(item.po_id || '')
        const poDetails = detailsByPO.get(poId) || []
        const firstDetail = poDetails[0] || null

        const receiptRows = receiptsByPO.get(poId) || []
        const firstReceipt = receiptRows[0] || null
        const hasReceipt = receiptRows.length > 0

        const latestTracking = trackingByPO.get(poId) || null

        const supplier = supplierMap.get(item.supplier_id)
        const product = firstDetail
          ? productMap.get(firstDetail.product_id)
          : undefined

        const estimatedArrivalDate =
          latestTracking?.estimated_arrival_date ||
          addDays(item.po_release_date || item.created_at, 7)

        const trackingStatus = getTrackingStatus({
          poStatus: item.status,
          latestTracking,
          hasReceipt,
        })

        const receivedQty = receiptRows.reduce((total, receipt) => {
          return total + getReceivedQty(receipt)
        }, 0)

        return {
          id: poId,
          trackingNo: latestTracking?.tracking_number || `TRK-${poId}`,
          entityType: 'PURCHASE_ORDER',
          entityId: poId,

          trackingStatus,
          manualTrackingStatus: latestTracking?.status || null,
          estimatedArrivalDate,
          supplierNotes: firstReceipt
            ? 'Goods have been received by warehouse.'
            : latestTracking?.supplier_notes ||
              'No manual supplier delivery update has been recorded yet.',

          reportedBy: latestTracking?.created_by_name || 'Purchasing Staff',
          reportedAt:
            latestTracking?.created_at ||
            firstReceipt?.created_at ||
            item.po_release_date ||
            item.created_at,

          poNo: poId,
          poDate: item.created_at,
          poReleaseDate: item.po_release_date || null,
          expectedDeliveryDate: estimatedArrivalDate,
          poStatus: item.status || '-',
          totalValue: getNumber(item.total_value, 0),

          supplierId: supplier?.supplier_id || item.supplier_id || '-',
          supplierName: supplier?.supplier_name || '-',
          supplierContact: supplier?.contact || '-',
          supplierAddress: supplier?.address || '-',

          productCode: product?.product_id || firstDetail?.product_id || '-',
          productName: product?.product_name || '-',
          category: product?.category || '-',
          qty: getNumber(firstDetail?.qty_order, 0),
          receivedQty,
          unit: product?.uom || '-',

          receiptId: firstReceipt?.receipt_id || null,
          receiptDate: firstReceipt?.receipt_date || null,
          hasGoodsReceipt: hasReceipt,
        }
      })

    return NextResponse.json({
      message: 'Tracking reports fetched successfully',
      data: trackingReports,
      meta: {
        total: trackingReports.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching tracking reports',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const poNumber = getString(
      body.poNumber || body.poNo || body.po_id || body.entityId
    )

    const trackingStatus = normalizeManualTrackingStatus(
      body.trackingStatus || body.status
    )

    const estimatedArrivalDate = getString(
      body.estimatedArrivalDate || body.estimated_arrival_date,
      ''
    )

    const supplierNotes = getString(
      body.supplierNotes || body.supplier_notes,
      ''
    )

    const createdByName = getString(
      body.createdByName || body.created_by_name,
      'Purchasing Staff'
    )

    if (!poNumber || !trackingStatus) {
      return NextResponse.json(
        {
          message: 'PO number and tracking status are required',
        },
        { status: 400 }
      )
    }

    const { data: poData, error: poError } = await supabase
      .from('tr_purchase_order')
      .select('po_id, status')
      .eq('po_id', poNumber)
      .maybeSingle()

    if (poError) {
      return NextResponse.json(
        {
          message: 'Failed to validate purchase order',
          error: poError.message,
        },
        { status: 500 }
      )
    }

    if (!poData) {
      return NextResponse.json(
        {
          message: 'Purchase order was not found',
          error: `PO ${poNumber} does not exist`,
        },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('purchasing_tracking_reports')
      .insert({
        tracking_number: generateTrackingNumber(poNumber),
        entity_type: 'PURCHASE_ORDER',
        entity_id: poNumber,
        status: trackingStatus,
        estimated_arrival_date: estimatedArrivalDate || null,
        supplier_notes: supplierNotes || null,
        created_by_name: createdByName,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to save tracking report',
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tracking report saved successfully',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving tracking report',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}