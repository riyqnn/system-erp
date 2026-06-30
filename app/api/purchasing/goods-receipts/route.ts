import { NextResponse } from 'next/server'
import { createNotification as createGlobalNotification } from '@/lib/services/notification.service'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface DBSupplier {
  supplier_id: string
  supplier_name: string
  contact: string
  address: string
  status: string
}

interface DBProduct {
  product_id: string
  product_name: string
  category: string
  uom: string
}

interface DBPurchaseOrder {
  po_id: string
  po_number?: string
  pr_id: string | null
  supplier_id: string | null
  total_value: number
  status: string
  created_at: string
  po_date?: string
  po_release_date: string | null
  expected_delivery_date?: string
}

interface DBPoDetail {
  po_detail_id: string
  po_id: string
  product_id: string
  qty_order: number
  ordered_qty?: number
  quantity?: number
  unit_price: number
  subtotal: number
}

interface DBGoodsReceipt {
  id?: string
  receipt_id: string
  gr_id?: string
  goods_receipt_id?: string
  po_id: string
  warehouse_id: string
  product_id: string
  item_id?: string
  sku?: string
  quantity: number
  received_qty?: number
  qty_received?: number
  qty?: number
  received_quantity?: number
  batch_number: string | null
  expiry_date: string | null
  receipt_date: string | null
  created_at?: string
  condition: string | null
  status: string
  reject_qty: number
  reject_reason: string | null
}

function generateReceiptId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = String(Date.now()).slice(-6)
  const random = String(Math.floor(Math.random() * 999)).padStart(3, '0')
  return `GR-${year}${month}-${timestamp}${random}`
}


function getNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return isNaN(parsed) ? fallback : parsed
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function createNotification({
  title,
  message,
  recipientRole,
  sourceRefId,
  sourceRefType,
  actionUrl,
  priority = 'MEDIUM',
}: {
  title: string
  message: string
  recipientRole: string
  sourceRefId: string
  sourceRefType: string
  actionUrl: string
  priority?: string
}) {
  try {
    await createGlobalNotification({
      title,
      message,
      type: 'INFORMATION',
      priority: (priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') || 'MEDIUM',
      recipientRole,
      sourceModule: 'PURCHASING',
      sourceRefId,
      sourceRefType,
      actionUrl,
    })
  } catch (error) {
    console.warn('Failed to create notification:', error)
  }
}

async function updateStockBalance({
  productId,
  warehouseId,
  quantity,
}: {
  productId: string
  warehouseId: string
  quantity: number
}) {
  if (quantity <= 0) return

  const { data: existingBalance, error: fetchError } = await supabase
    .from('tr_stock_balance')
    .select('*')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .maybeSingle()

  if (fetchError) {
    console.warn('Failed to fetch stock balance:', fetchError.message)
    return
  }

  if (existingBalance) {
    const quantityField =
      'qty_on_hand' in existingBalance
        ? 'qty_on_hand'
        : 'stock_qty' in existingBalance
          ? 'stock_qty'
          : 'quantity' in existingBalance
            ? 'quantity'
            : 'balance_qty' in existingBalance
              ? 'balance_qty'
              : 'available_qty' in existingBalance
                ? 'available_qty'
                : null

    if (!quantityField) {
      console.warn('Stock balance quantity field was not detected.')
      return
    }

    const currentQuantity = getNumber(existingBalance[quantityField], 0)

    const { error: updateError } = await supabase
      .from('tr_stock_balance')
      .update({
        [quantityField]: currentQuantity + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)

    if (updateError) {
      console.warn('Failed to update stock balance:', updateError.message)
    }
    return
  }

  const insertPayload = {
    product_id: productId,
    warehouse_id: warehouseId,
    quantity,
    updated_at: new Date().toISOString(),
  }

  const { error: insertError } = await supabase
    .from('tr_stock_balance')
    .insert(insertPayload)

  if (insertError) {
    console.warn('Failed to insert stock balance:', insertError.message)
  }
}

async function insertStockMovement({
  receiptId,
  productId,
  warehouseId,
  quantity,
}: {
  receiptId: string
  productId: string
  warehouseId: string
  quantity: number
}) {
  const { error } = await supabase.from('tr_stock_movement').insert({
    product_id: productId,
    warehouse_id: warehouseId,
    movement_type: 'IN',
    quantity,
    reference_id: receiptId,
    reference_type: 'GOODS_RECEIPT',
    movement_date: new Date().toISOString(),
  })

  if (error) {
    console.warn('Failed to insert stock movement:', error.message)
  }
}

async function updatePurchaseOrderCompletion(poId: string) {
  const [poDetailResult, receiptResult] = await Promise.all([
    supabase.from('tr_po_detail').select('*').eq('po_id', poId),
    supabase.from('tr_goods_receipt').select('*').eq('po_id', poId),
  ])

  if (poDetailResult.error || receiptResult.error) {
    console.warn(
      'Failed to check PO completion:',
      poDetailResult.error?.message || receiptResult.error?.message
    )
    return
  }

  const poDetails = poDetailResult.data || []
  const receipts = receiptResult.data || []

  const totalOrdered = poDetails.reduce((total: number, item: DBPoDetail) => {
    return total + getNumber(item.qty_order || item.ordered_qty || item.quantity, 0)
  }, 0)

  const totalReceived = receipts.reduce((total: number, receipt: DBGoodsReceipt) => {
    const status = String(receipt.status || '').toUpperCase()
    const quantity = getNumber(receipt.quantity || receipt.received_qty, 0)
    const rejectQty = getNumber(receipt.reject_qty, 0)

    if (status === 'REJECTED') return total

    return total + Math.max(quantity - rejectQty, 0)
  }, 0)

  if (totalOrdered > 0 && totalReceived >= totalOrdered) {
    const { error } = await supabase
      .from('tr_purchase_order')
      .update({
        status: 'COMPLETED',
      })
      .eq('po_id', poId)

    if (error) {
      console.warn('Failed to update PO completion status:', error.message)
    }
  }
}

export async function GET(request: Request) {
  try {
    const [
      receiptResult,
      poResult,
      poDetailResult,
      supplierResult,
      productResult,
      warehouseResult,
    ] = await Promise.all([
      supabase
        .from('tr_goods_receipt')
        .select('*')
        .order('receipt_date', { ascending: false }),
      supabase
        .from('tr_purchase_order')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('tr_po_detail').select('*'),
      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address, status'),
      supabase.from('ms_product').select('product_id, product_name, category, uom'),
      supabase.from('ms_warehouse').select('*'),
    ])

    const errors = [
      receiptResult.error,
      poResult.error,
      poDetailResult.error,
      supplierResult.error,
      productResult.error,
      warehouseResult.error,
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

    const supplierMap = new Map<string, DBSupplier>(
      suppliers.map((supplier) => [supplier.supplier_id, supplier])
    )
    const productMap = new Map<string, DBProduct>(
      products.map((product) => [product.product_id, product])
    )

    const receiptsByPO = new Map<string, DBGoodsReceipt[]>()
    ;(receiptResult.data || []).forEach((r: DBGoodsReceipt) => {
      const poId = String(r.po_id || '')
      if (!receiptsByPO.has(poId)) receiptsByPO.set(poId, [])
      receiptsByPO.get(poId)!.push(r)
    })

    const detailsByPO = new Map<string, DBPoDetail[]>()
    ;(poDetailResult.data || []).forEach((d: DBPoDetail) => {
      const poId = String(d.po_id || '')
      if (!detailsByPO.has(poId)) detailsByPO.set(poId, [])
      detailsByPO.get(poId)!.push(d)
    })

    const goodsReceipts = (purchaseOrders as DBPurchaseOrder[])
      .filter((po) => {
        const poId = String(po.po_id || '')
        const poStatus = String(po.status || '').toUpperCase()
        return receiptsByPO.has(poId) || ['RELEASED', 'COMPLETED'].includes(poStatus)
      })
      .map((po) => {
        const poId = String(po.po_id || '')
        const supplier = supplierMap.get(po.supplier_id || '')
        const receiptRows = receiptsByPO.get(poId) || []
        const firstReceipt = receiptRows[0]

        const poItems = detailsByPO.get(poId) || []

        const orderedQty = poItems.reduce((total: number, item: DBPoDetail) => {
          return total + getNumber(item.qty_order || item.ordered_qty || item.quantity, 0)
        }, 0)

        const receivedQty = receiptRows.reduce((total: number, receipt: DBGoodsReceipt) => {
          const status = String(receipt.status || '').toUpperCase()
          const quantity = getNumber(receipt.quantity || receipt.received_qty, 0)
          const rejectQty = getNumber(receipt.reject_qty, 0)
          if (status === 'REJECTED') return total
          return total + Math.max(quantity - rejectQty, 0)
        }, 0)

        const receiptStatus =
          receivedQty <= 0
            ? 'WAITING_RECEIPT'
            : receivedQty < orderedQty
              ? 'PARTIAL'
              : 'ACCEPTED'

        return {
          id: firstReceipt?.receipt_id || `PENDING-${poId}`,
          receiptId: firstReceipt?.receipt_id || null,
          receiptNo: firstReceipt?.receipt_id || '-',
          poId,
          poNo: po.po_id || po.po_number || '-',
          poDate: po.created_at || po.po_date || null,
          expectedDeliveryDate: po.po_release_date || po.expected_delivery_date || null,
          poStatus: po.status || '-',
          totalValue: getNumber(po.total_value, 0),

          supplierCode: po.supplier_id || '-',
          supplierName: supplier?.supplier_name || '-',

          productCode: firstReceipt?.product_id || '-',
          productName: '-',
          category: '-',

          orderedQty,
          receivedQty,
          remainingQty: Math.max(orderedQty - receivedQty, 0),

          warehouseId: firstReceipt?.warehouse_id || null,
          receiptDate: firstReceipt?.receipt_date || null,
          expiryDate: firstReceipt?.expiry_date || null,
          batchNumber: firstReceipt?.batch_number || '-',
          condition: firstReceipt?.condition || '-',

          status: firstReceipt?.status || receiptStatus,
          rejectQty: getNumber(firstReceipt?.reject_qty, 0),
          rejectReason: firstReceipt?.reject_reason || null,

          items: poItems.map((item: DBPoDetail) => {
            const itemProduct = productMap.get(item.product_id)

            const itemReceivedQty = receiptRows
              .filter((receipt: DBGoodsReceipt) => receipt.product_id === item.product_id)
              .reduce((total: number, receipt: DBGoodsReceipt) => {
                const status = String(receipt.status || '').toUpperCase()
                const quantity = getNumber(receipt.quantity || receipt.received_qty, 0)
                const rejectQty = getNumber(receipt.reject_qty, 0)
                if (status === 'REJECTED') return total
                return total + Math.max(quantity - rejectQty, 0)
              }, 0)

            return {
              id: `${poId}-${item.product_id}`,
              productId: item.product_id,
              productCode: itemProduct?.product_id || item.product_id || '-',
              productName: itemProduct?.product_name || '-',
              category: itemProduct?.category || '-',
              orderedQty: getNumber(item.qty_order || item.ordered_qty || item.quantity, 0),
              receivedQty: itemReceivedQty,
              unit: itemProduct?.uom || '-',
              unitPrice: getNumber(item.unit_price, 0),
              subtotal: getNumber(item.subtotal, 0),
            }
          }),
        }
      })

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    
    const total = goodsReceipts.length
    const paginatedData = goodsReceipts.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      message: 'Goods receipts fetched successfully',
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching goods receipts',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      poId,
      productId,
      warehouseId,
      quantity,
      rejectQty,
      status,
    } = body

    if (!poId || !productId || !warehouseId) {
      return NextResponse.json(
        {
          message: 'PO ID, Product ID, and Warehouse ID are required.',
        },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          message: 'Received quantity must be greater than zero.',
        },
        { status: 400 }
      )
    }

    const { data: purchaseOrder, error: poError } = await supabase
      .from('tr_purchase_order')
      .select('*')
      .eq('po_id', poId)
      .maybeSingle()

    if (poError || !purchaseOrder) {
      return NextResponse.json(
        {
          message: 'Purchase order not found.',
        },
        { status: 404 }
      )
    }

    const poStatus = String(purchaseOrder.status || '').toUpperCase()

    if (!['RELEASED', 'COMPLETED'].includes(poStatus)) {
      return NextResponse.json(
        {
          message: 'Goods receipt can only be created for released purchase orders.',
        },
        { status: 400 }
      )
    }

    const receiptId = body.receiptId || body.receipt_id || generateReceiptId()
    const receiptDate =
      body.receiptDate || body.receipt_date || new Date().toISOString()

    const insertPayload = {
      receipt_id: receiptId,
      po_id: poId,
      pr_id: purchaseOrder.pr_id || body.prId || body.pr_id || null,
      supplier_id:
        purchaseOrder.supplier_id || body.supplierId || body.supplier_id || null,
      product_id: productId,
      warehouse_id: warehouseId,
      quantity,
      batch_number: body.batchNumber || body.batch_number || null,
      expiry_date: body.expiryDate || body.expiry_date || null,
      receipt_date: receiptDate,
      received_by: body.receivedBy || body.received_by || 'Purchasing Staff',
      status: status || 'ACCEPTED',
      reject_qty: rejectQty || 0,
      reject_reason: body.rejectReason || body.reject_reason || null,
    }

    const { data: receiptData, error: receiptError } = await supabase
      .from('tr_goods_receipt')
      .insert(insertPayload)
      .select()
      .single()

    if (receiptError) {
      return NextResponse.json(
        {
          message: 'Failed to create goods receipt.',
          error: receiptError.message,
        },
        { status: 500 }
      )
    }

    const acceptedQuantity = quantity - (rejectQty || 0)

    if (acceptedQuantity > 0 && status !== 'REJECTED') {
      await updateStockBalance({
        productId,
        warehouseId,
        quantity: acceptedQuantity,
      })

      await insertStockMovement({
        receiptId,
        productId,
        warehouseId,
        quantity: acceptedQuantity,
      })
    }

    await updatePurchaseOrderCompletion(poId)

    await createNotification({
      title: 'Goods Receipt Recorded',
      message: `Goods receipt ${receiptId} has been recorded for PO ${poId}.`,
      recipientRole: 'PURCHASING',
      sourceRefId: receiptId,
      sourceRefType: 'GOODS_RECEIPT',
      actionUrl: '/purchasing/three-way-matching',
      priority: 'MEDIUM',
    })

    return NextResponse.json({
      message: 'Goods receipt created successfully.',
      data: receiptData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while creating goods receipt.',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}