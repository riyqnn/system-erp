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

function getReceiptId(receipt: any) {
  return (
    receipt?.receipt_id ||
    receipt?.gr_id ||
    receipt?.goods_receipt_id ||
    receipt?.id ||
    '-'
  )
}

function getReceivedQty(receipt: any) {
  return Number(
    receipt?.received_qty ||
      receipt?.qty_received ||
      receipt?.qty ||
      receipt?.quantity ||
      0
  )
}

function getReceiptProductId(receipt: any) {
  return receipt?.product_id || receipt?.item_id || receipt?.sku || null
}

export async function GET() {
  try {
    const [
      receiptResult,
      poResult,
      poDetailResult,
      supplierResult,
      productResult,
    ] = await Promise.all([
      supabase.from('tr_goods_receipt').select('*'),

      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, supplier_id, quotation_id, total_value, status, created_at, po_release_date'
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
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    const receipts = receiptResult.data || []
    const purchaseOrders = poResult.data || []
    const poDetails = poDetailResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []

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

    const receiptsByPO = new Map<string, any[]>()

    receipts.forEach((receipt: any) => {
      const poId = String(receipt.po_id || '')
      const currentReceipts = receiptsByPO.get(poId) || []

      currentReceipts.push(receipt)
      receiptsByPO.set(poId, currentReceipts)
    })

    const goodsReceipts = purchaseOrders
      .filter((po: any) => receiptsByPO.has(String(po.po_id || '')))
      .map((po: any) => {
        const supplier = supplierMap.get(po.supplier_id)
        const receiptRows = receiptsByPO.get(String(po.po_id || '')) || []
        const firstReceipt = receiptRows[0]

        const poItems = detailsByPO.get(String(po.po_id || '')) || []

        const items = poItems.map((poItem: any) => {
          const product = productMap.get(poItem.product_id)

          const matchingReceipt =
            receiptRows.find(
              (receipt: any) =>
                String(getReceiptProductId(receipt) || '') ===
                String(poItem.product_id || '')
            ) || firstReceipt

          return {
            id: String(poItem.po_detail_id),
            productCode: product?.product_id || poItem.product_id || '-',
            productName: product?.product_name || '-',
            category: product?.category || '-',
            orderedQty: Number(poItem.qty_order || 0),
            receivedQty: getReceivedQty(matchingReceipt),
            unit: product?.uom || '-',
            expiryDate: matchingReceipt?.expiry_date || null,
            batchNumber: matchingReceipt?.batch_number || '-',
            condition: matchingReceipt?.condition || 'GOOD',
          }
        })

        const firstItem = items[0]

        return {
          id: String(getReceiptId(firstReceipt)),
          grNo: String(getReceiptId(firstReceipt)),
          receiptDate:
            firstReceipt?.receipt_date ||
            firstReceipt?.created_at ||
            po.po_release_date ||
            po.created_at ||
            null,
          receivedBy:
            firstReceipt?.received_by ||
            firstReceipt?.received_by_name ||
            'Warehouse Staff',
          status: normalizeStatus(firstReceipt?.status),
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

    const {
      grNumber,
      poNumber,
      receiptDate,
      receivedByName,
      status,
      notes,
      items,
    } = body

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

    const receiptRows = []

    for (const item of items) {
      const productCode = item.productSku || item.productCode

      const { data: productData, error: productError } = await supabase
        .from('ms_product')
        .select('product_id')
        .eq('product_id', productCode)
        .maybeSingle()

      if (productError || !productData) {
        return NextResponse.json(
          {
            message: `Product SKU ${productCode} not found`,
            error:
              productError?.message || `Product ${productCode} does not exist`,
          },
          { status: 404 }
        )
      }

      receiptRows.push({
        receipt_id:
          grNumber ||
          `GR-${new Date().getFullYear()}${String(
            new Date().getMonth() + 1
          ).padStart(2, '0')}-${String(Date.now()).slice(-5)}`,
        po_id: poData.po_id,
        product_id: productData.product_id,
        received_qty: Number(item.receivedQty || item.qty || 0),
        receipt_date: receiptDate || new Date().toISOString(),
        received_by: receivedByName || 'Warehouse Staff',
        status: status || 'ACCEPTED',
        notes: notes || null,
        expiry_date: item.expiryDate || null,
        batch_number: item.batchNumber || null,
        condition: item.condition || 'GOOD',
      })
    }

    const { data, error } = await supabase
      .from('tr_goods_receipt')
      .insert(receiptRows)
      .select()

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