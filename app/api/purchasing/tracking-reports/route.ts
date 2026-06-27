import { AnyObject } from '@/lib/any';
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

    const suppliers = supplierResult.data || []
    const products = productResult.data || []

    const supplierMap = new Map(
      suppliers.map((s: AnyObject) => [s.supplier_id, s])
    )
    const productMap = new Map(
      products.map((p: AnyObject) => [p.product_id, p])
    )

    const receiptsByPO = new Map()
    ;(goodsReceiptResult.data || []).forEach((r: AnyObject) => {
      const poId = String(r.po_id || '')
      if (!receiptsByPO.has(poId)) receiptsByPO.set(poId, [])
      receiptsByPO.get(poId).push(r)
    })

    const detailsByPO = new Map()
    ;(poDetailResult.data || []).forEach((d: AnyObject) => {
      const poId = String(d.po_id || '')
      if (!detailsByPO.has(poId)) detailsByPO.set(poId, [])
      detailsByPO.get(poId).push(d)
    })

    const trackingReports = (poResult.data || []).map((item: AnyObject) => {
      const poId = String(item.po_id || '')
      const poDetails = detailsByPO.get(poId) || []
      const firstDetail = poDetails[0]
      const receiptRows = receiptsByPO.get(poId) || []
      const firstReceipt = receiptRows[0]
      const supplier = supplierMap.get(item.supplier_id)
      const product = firstDetail ? productMap.get(firstDetail.product_id) : undefined
      const estimatedArrivalDate = addDays(item.po_release_date, 7)

      return {
        id: poId,
        trackingNo: `TRK-${poId}`,
        entityType: 'PURCHASE_ORDER',
        entityId: poId,
        trackingStatus: getTrackingStatus(item.status, Boolean(firstReceipt)),
        estimatedArrivalDate,
        supplierNotes: firstReceipt
          ? 'Goods have been received by warehouse.'
          : 'Purchase order is being monitored for delivery.',
        reportedBy: 'Purchasing Staff',
        reportedAt: firstReceipt?.created_at || item.po_release_date || item.created_at,

        poNo: poId,
        poDate: item.created_at,
        expectedDeliveryDate: estimatedArrivalDate,
        poStatus: item.status || '-',
        totalValue: Number(item.total_value || 0),

        supplierId: supplier?.supplier_id || item.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        productCode: product?.product_id || firstDetail?.product_id || '-',
        productName: product?.product_name || '-',
        category: product?.category || '-',
        qty: Number(firstDetail?.qty_order || 0),
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

    const {
      trackingNumber,
      entityType,
      poNumber,
      status,
      estimatedArrivalDate,
      supplierNotes,
      createdByName,
    } = body

    if (!trackingNumber || !entityType || !status) {
      return NextResponse.json(
        {
          message: 'Tracking number, entity type, and status are required',
        },
        { status: 400 }
      )
    }

    let entityId = null

    if (poNumber) {
      const { data: poData } = await supabase
        .from('purchasing_purchase_orders')
        .select('id')
        .eq('po_number', poNumber)
        .maybeSingle()

      entityId = poData?.id || null
    }

    const { error } = await supabase
      .from('purchasing_tracking_reports')
      .insert({
        tracking_number: trackingNumber,
        entity_type: entityType,
        entity_id: entityId,
        status,
        estimated_arrival_date: estimatedArrivalDate || null,
        supplier_notes: supplierNotes || null,
        created_by_name: createdByName || 'Purchasing Staff',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to save tracking report',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

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