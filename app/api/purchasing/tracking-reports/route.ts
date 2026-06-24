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

function addDays(value?: string | null, days = 7) {
  const baseDate = value ? new Date(value) : new Date()

  if (Number.isNaN(baseDate.getTime())) {
    return new Date().toISOString()
  }

  baseDate.setDate(baseDate.getDate() + days)
  return baseDate.toISOString()
}

function getTrackingStatus(poStatus?: string | null, hasReceipt = false) {
  const status = normalizeStatus(poStatus)

  if (hasReceipt || status === 'COMPLETED') return 'COMPLETED'
  if (['RELEASED', 'SENT', 'ISSUED'].includes(status)) return 'IN_TRANSIT'
  if (['APPROVED'].includes(status)) return 'PENDING'
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
    ] = await Promise.all([
      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, supplier_id, total_value, status, created_at, po_release_date'
        )
        .order('created_at', { ascending: false }),

      supabase
        .from('tr_po_detail')
        .select('po_detail_id, po_id, product_id, qty_order, unit_price, subtotal'),

      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address, lead_time, top, status'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom'),

      supabase
        .from('tr_goods_receipt')
        .select('receipt_id, po_id, receipt_date, status, created_at'),
    ])

    const errors = [
      poResult.error,
      poDetailResult.error,
      supplierResult.error,
      productResult.error,
      goodsReceiptResult.error,
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
    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const goodsReceipts = goodsReceiptResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const detailsByPO = new Map<string, any[]>()

    poDetails.forEach((detail: any) => {
      const poId = String(detail.po_id || '')
      const currentDetails = detailsByPO.get(poId) || []

      currentDetails.push(detail)
      detailsByPO.set(poId, currentDetails)
    })

    const receiptByPO = new Map<string, any>()

    goodsReceipts.forEach((receipt: any) => {
      const poId = String(receipt.po_id || '')
      if (!receiptByPO.has(poId)) {
        receiptByPO.set(poId, receipt)
      }
    })

    const trackingReports = purchaseOrders.map((po: any) => {
      const supplier = supplierMap.get(po.supplier_id)
      const items = detailsByPO.get(po.po_id) || []
      const firstItem = items[0]
      const product = productMap.get(firstItem?.product_id)
      const receipt = receiptByPO.get(String(po.po_id || ''))

      const estimatedArrivalDate =
        receipt?.receipt_date ||
        addDays(po.po_release_date || po.created_at, Number(supplier?.lead_time || 7))

      return {
        id: String(po.po_id),
        trackingNo: `TRK-${po.po_id}`,
        entityType: 'PURCHASE_ORDER',
        entityId: String(po.po_id),
        trackingStatus: getTrackingStatus(po.status, Boolean(receipt)),
        estimatedArrivalDate,
        supplierNotes: receipt
          ? 'Goods have been received by warehouse.'
          : 'Purchase order is being monitored for delivery.',
        reportedBy: 'Purchasing Staff',
        reportedAt: receipt?.created_at || po.po_release_date || po.created_at,

        poNo: po.po_id,
        poDate: po.created_at,
        expectedDeliveryDate: estimatedArrivalDate,
        poStatus: po.status || '-',
        totalValue: Number(po.total_value || 0),

        supplierId: supplier?.supplier_id || po.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        productCode: product?.product_id || firstItem?.product_id || '-',
        productName: product?.product_name || '-',
        category: product?.category || '-',
        qty: Number(firstItem?.qty_order || 0),
        unit: product?.uom || '-',
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

    return NextResponse.json({
      message:
        'Tracking report is generated from purchase order and goods receipt data. Manual tracking save is not enabled in the current schema.',
      data: body,
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