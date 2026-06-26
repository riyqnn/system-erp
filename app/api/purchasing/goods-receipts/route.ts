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
  const status = String(value || '').toUpperCase()

  if (['ACCEPTED', 'RECEIVED', 'COMPLETED'].includes(status)) return 'ACCEPTED'
  if (['PARTIAL', 'PARTIALLY_RECEIVED'].includes(status)) return 'PARTIAL'
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'REJECTED'

  return status || 'DRAFT'
}

function getReceiptId(receipt: AnyObject) {
  return receipt?.receipt_id || receipt?.gr_id || receipt?.goods_receipt_id || receipt?.id || '-'
}

function getReceivedQty(receipt: AnyObject) {
  return Number(
    receipt?.received_qty ||
      receipt?.qty_received ||
      receipt?.qty ||
      receipt?.quantity ||
      receipt?.received_quantity ||
      0
  )
}

function getReceiptProductId(receipt: AnyObject) {
  return receipt?.product_id || receipt?.item_id || receipt?.sku || null
}

function createGRNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = String(Date.now()).slice(-5)

  return `GR-${year}${month}-${random}`
}

function buildReceiptRows({
  items,
  grNumber,
  poId,
  receiptDate,
  qtyColumn,
}: {
  items: AnyObject[]
  grNumber: string
  poId: string
  receiptDate?: string
  qtyColumn: 'qty_received' | 'received_qty' | 'qty' | 'quantity' | 'received_quantity'
}) {
  return items.map((item, index) => {
    const receiptId = items.length > 1 ? `${grNumber}-${index + 1}` : grNumber
    const receivedQty = Number(item.receivedQty || item.qty || item.quantity || 0)

    return {
      receipt_id: receiptId,
      po_id: poId,
      product_id: item.product_id,
      [qtyColumn]: receivedQty,
      receipt_date: receiptDate || new Date().toISOString(),
    }
  })
}

async function insertGoodsReceiptWithFallback({
  items,
  grNumber,
  poId,
  receiptDate,
}: {
  items: AnyObject[]
  grNumber: string
  poId: string
  receiptDate?: string
}) {
  const qtyColumns: Array<
    'qty_received' | 'received_qty' | 'qty' | 'quantity' | 'received_quantity'
  > = ['qty_received', 'received_qty', 'qty', 'quantity', 'received_quantity']

  let lastError: AnyObject = null

  for (const qtyColumn of qtyColumns) {
    const rows = buildReceiptRows({
      items,
      grNumber,
      poId,
      receiptDate,
      qtyColumn,
    })

    const { data, error } = await supabase.from('tr_goods_receipt').insert(rows).select()

    if (!error) {
      return { data, error: null, qtyColumn }
    }

    lastError = error

    const message = String(error.message || '').toLowerCase()
    const isSchemaColumnError =
      message.includes('could not find') ||
      message.includes('schema cache') ||
      message.includes('column')

    if (!isSchemaColumnError) {
      return { data: null, error, qtyColumn }
    }
  }

  return {
    data: null,
    error: lastError,
    qtyColumn: null,
  }
}

export async function GET() {
  try {
    const [receiptResult, poResult, poDetailResult, supplierResult, productResult] =
      await Promise.all([
        supabase.from('tr_goods_receipt').select('*'),

        supabase
          .from('tr_purchase_order')
          .select(
            'po_id, supplier_id, quotation_id, total_value, status, created_at, po_release_date'
          )
          .order('created_at', { ascending: false }),

        supabase.from('tr_po_detail').select('*'),

        supabase.from('ms_supplier').select('*'),

        supabase.from('ms_product').select('*'),
      ])

    const errors = [
      receiptResult.error,
      poResult.error,
      poDetailResult.error,
      supplierResult.error,
      productResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch goods receipts',
          error: errors[0] instanceof Error ? errors[0].message : String(errors[0]),
        },
        { status: 500 }
      )
    }

    const purchaseOrders = poResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: AnyObject) => [supplier.supplier_id, supplier])
    )
    const productMap = new Map(
      products.map((product: AnyObject) => [product.product_id, product])
    )

    const receiptsByPO = new Map()
    ;(receiptResult.data || []).forEach((r: AnyObject) => {
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

    const goodsReceipts = purchaseOrders
      .filter((po: AnyObject) => {
        const poId = String(po.po_id || '')
        const poStatus = String(po.status || '').toUpperCase()

        return (
          receiptsByPO.has(poId) ||
          ['RELEASED', 'APPROVED', 'COMPLETED'].includes(poStatus)
        )
      })
      .map((po: AnyObject) => {
        const supplier = supplierMap.get(po.supplier_id)
        const receiptRows = receiptsByPO.get(String(po.po_id || '')) || []
        const firstReceipt = receiptRows[0]
        const hasReceipt = Boolean(firstReceipt)

        const poItems = detailsByPO.get(String(po.po_id || '')) || []

        const items = poItems.map((poItem: AnyObject) => {
          const product = productMap.get(poItem.product_id)

          const matchingReceipt =
            receiptRows.find(
              (receipt: AnyObject) =>
                String(getReceiptProductId(receipt) || '') === String(poItem.product_id || '')
            ) || firstReceipt

          return {
            id: String(poItem.po_detail_id || poItem.id || `${po.po_id}-${poItem.product_id}`),
            productCode: product?.product_id || poItem.product_id || '-',
            productName: product?.product_name || '-',
            category: product?.category || '-',
            orderedQty: Number(
              poItem.qty_order ||
                poItem.order_qty ||
                poItem.qty ||
                poItem.quantity ||
                poItem.qty_requested ||
                0
            ),
            receivedQty: hasReceipt ? getReceivedQty(matchingReceipt) : 0,
            unit: product?.uom || '-',
            expiryDate: matchingReceipt?.expiry_date || null,
            batchNumber: matchingReceipt?.batch_number || '-',
            condition: matchingReceipt?.condition || 'GOOD',
          }
        })

        const firstItem = items[0]

        return {
          id: hasReceipt ? String(getReceiptId(firstReceipt)) : `DRAFT-GR-${po.po_id}`,
          grNo: hasReceipt ? String(getReceiptId(firstReceipt)) : `DRAFT-GR-${po.po_id}`,
          receiptDate:
            firstReceipt?.receipt_date ||
            firstReceipt?.created_at ||
            po.po_release_date ||
            po.created_at ||
            null,
          receivedBy: firstReceipt?.received_by || firstReceipt?.received_by_name || 'Warehouse Staff',
          status: hasReceipt ? normalizeStatus(firstReceipt?.status) : 'DRAFT',
          notes: firstReceipt?.notes || '-',

          poNo: po.po_id,
          poDate: po.created_at || null,
          expectedDeliveryDate: null,
          poStatus: po.status || '-',
          totalValue: Number(po.total_value || 0),

          supplierId: supplier?.supplier_id || po.supplier_id || '-',
          supplierName: supplier?.supplier_name || '-',
          supplierContact: supplier?.contact || '-',
          supplierAddress: supplier?.address || '-',

          productCode: firstItem?.productCode || '-',
          productName: firstItem?.productName || '-',
          category: firstItem?.category || '-',
          orderedQty: firstItem?.orderedQty || 0,
          receivedQty: firstItem?.receivedQty || 0,
          unit: firstItem?.unit || '-',
          expiryDate: firstItem?.expiryDate || null,
          batchNumber: firstItem?.batchNumber || '-',
          condition: firstItem?.condition || 'GOOD',

          items,
        }
      })

    return NextResponse.json({
      message: 'Goods receipts fetched successfully',
      data: goodsReceipts,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching goods receipts',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { grNumber, poNumber, receiptDate, items } = body

    if (!poNumber || !items?.length) {
      return NextResponse.json(
        {
          message: 'PO number and items are required',
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

    const normalizedItems = []

    for (const item of items) {
      const productCode = item.productSku || item.productCode || item.product_id

      const { data: productData, error: productError } = await supabase
        .from('ms_product')
        .select('product_id')
        .eq('product_id', productCode)
        .maybeSingle()

      if (productError || !productData) {
        return NextResponse.json(
          {
            message: `Product SKU ${productCode} not found`,
            error: productError?.message || `Product ${productCode} does not exist`,
          },
          { status: 404 }
        )
      }

      normalizedItems.push({
        ...item,
        product_id: productData.product_id,
      })
    }

    const finalGRNumber = grNumber?.startsWith('DRAFT-GR-')
      ? createGRNumber()
      : grNumber || createGRNumber()

    const { data, error, qtyColumn } = await insertGoodsReceiptWithFallback({
      items: normalizedItems,
      grNumber: finalGRNumber,
      poId: poData.po_id,
      receiptDate,
    })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to save goods receipt',
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Goods receipt saved successfully',
      qtyColumn,
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving goods receipt',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}