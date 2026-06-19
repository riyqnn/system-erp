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

  return status || 'ACCEPTED'
}

export async function GET() {
  try {
    const [
      grResult,
      poResult,
      poDetailResult,
      supplierResult,
      productResult,
      userResult,
    ] = await Promise.all([
      supabase
        .from('tr_goods_receipt')
        .select(
          'receipt_id, po_id, pr_id, supplier_id, product_id, warehouse_id, quantity, batch_number, expiry_date, receipt_date, received_by, status, reject_qty, reject_reason, created_at'
        )
        .order('receipt_date', { ascending: false }),

      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, pr_id, supplier_id, quotation_id, approved_by, total_value, status, rejection_reason, created_at, po_release_date'
        ),

      supabase
        .from('tr_po_detail')
        .select('po_detail_id, po_id, product_id, qty_order, unit_price, subtotal'),

      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom'),

      supabase
        .from('ms_user')
        .select('user_id, username, full_name, email, role'),
    ])

    const errors = [
      grResult.error,
      poResult.error,
      poDetailResult.error,
      supplierResult.error,
      productResult.error,
      userResult.error,
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

    const goodsReceipts = grResult.data || []
    const purchaseOrders = poResult.data || []
    const poDetails = poDetailResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const users = userResult.data || []

    const poMap = new Map(purchaseOrders.map((po: any) => [po.po_id, po]))
    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )
    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )
    const userMap = new Map(users.map((user: any) => [user.user_id, user]))

    const poDetailMap = new Map<string, any>()

    poDetails.forEach((detail: any) => {
      const key = `${detail.po_id}-${detail.product_id}`
      poDetailMap.set(key, detail)
    })

    const data = goodsReceipts.map((item: any) => {
      const po = poMap.get(item.po_id)
      const supplier = supplierMap.get(item.supplier_id || po?.supplier_id)
      const product = productMap.get(item.product_id)
      const receiver = userMap.get(item.received_by)
      const poDetail = poDetailMap.get(`${item.po_id}-${item.product_id}`)

      const orderedQty = Number(poDetail?.qty_order || 0)
      const receivedQty = Number(item.quantity || 0)
      const rejectQty = Number(item.reject_qty || 0)

      const receiptItem = {
        id: item.receipt_id,
        productCode: product?.product_id || item.product_id || '-',
        productName: product?.product_name || '-',
        category: product?.category || '-',
        orderedQty,
        receivedQty,
        unit: product?.uom || '-',
        expiryDate: item.expiry_date || null,
        batchNumber: item.batch_number || '-',
        condition: rejectQty > 0 ? 'PARTIAL_REJECT' : 'GOOD',
        rejectQty,
        rejectReason: item.reject_reason || '-',
      }

      return {
        id: item.receipt_id,
        grNo: item.receipt_id,
        receiptDate: item.receipt_date || item.created_at,
        receivedBy:
          receiver?.full_name || receiver?.username || item.received_by || '-',
        status: normalizeStatus(item.status),
        notes: item.reject_reason || '-',

        poNo: po?.po_id || item.po_id || '-',
        poDate: po?.created_at || null,
        expectedDeliveryDate: po?.po_release_date || null,
        poStatus: po?.status || '-',
        totalValue: Number(po?.total_value || 0),

        supplierId: supplier?.supplier_id || item.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        productCode: receiptItem.productCode,
        productName: receiptItem.productName,
        category: receiptItem.category,
        orderedQty,
        receivedQty,
        unit: receiptItem.unit,
        expiryDate: receiptItem.expiryDate,
        batchNumber: receiptItem.batchNumber,
        condition: receiptItem.condition,
        rejectQty,
        rejectReason: item.reject_reason || '-',

        items: [receiptItem],
      }
    })

    return NextResponse.json({
      message: 'Goods receipts fetched successfully',
      data,
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
      receivedBy,
      receivedByName,
      status,
      notes,
      items,
    } = body

    if (!grNumber || !poNumber || !receiptDate || !items?.length) {
      return NextResponse.json(
        {
          message: 'GR number, PO number, receipt date, and items are required',
        },
        { status: 400 }
      )
    }

    const { data: poData, error: poError } = await supabase
      .from('tr_purchase_order')
      .select('po_id, pr_id, supplier_id')
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

    let receivedById = receivedBy || null

    if (!receivedById && receivedByName) {
      const { data: userData } = await supabase
        .from('ms_user')
        .select('user_id')
        .ilike('full_name', receivedByName)
        .maybeSingle()

      receivedById = userData?.user_id || null
    }

    const receiptPayload = []

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
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

      const receiptId =
        items.length === 1 ? grNumber : `${grNumber}-${String(index + 1).padStart(2, '0')}`

      receiptPayload.push({
        receipt_id: receiptId,
        po_id: poData.po_id,
        pr_id: poData.pr_id || null,
        supplier_id: poData.supplier_id,
        product_id: productData.product_id,
        warehouse_id: item.warehouseId || null,
        quantity: Number(item.receivedQty || item.quantity || 0),
        batch_number: item.batchNumber || null,
        expiry_date: item.expiryDate || null,
        receipt_date: receiptDate,
        received_by: receivedById,
        status: status || 'ACCEPTED',
        reject_qty: Number(item.rejectQty || 0),
        reject_reason: item.rejectReason || notes || null,
      })
    }

    const { data: grData, error: grError } = await supabase
      .from('tr_goods_receipt')
      .insert(receiptPayload)
      .select()

    if (grError) {
      return NextResponse.json(
        {
          message: 'Failed to save goods receipt',
          error: grError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Goods receipt saved successfully',
      data: {
        grNumber,
        receipts: grData,
      },
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