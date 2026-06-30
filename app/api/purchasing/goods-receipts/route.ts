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

type GoodsReceiptStatus = 'ACCEPTED' | 'REJECTED' | 'PARTIAL'

function generateReceiptId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = String(Date.now()).slice(-6)
  const random = String(Math.floor(Math.random() * 999)).padStart(3, '0')

  return `GR-${year}${month}-${timestamp}${random}`
}

function generateStockMovementId() {
  const timestamp = String(Date.now()).slice(-8)
  const random = String(Math.floor(Math.random() * 999)).padStart(3, '0')

  return `SM-${timestamp}${random}`
}

function normalizeReceiptStatus(value?: string | null): GoodsReceiptStatus {
  const status = String(value || '').toUpperCase()

  if (status === 'REJECTED') return 'REJECTED'
  if (status === 'PARTIAL') return 'PARTIAL'

  return 'ACCEPTED'
}

function getNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)

  return Number.isNaN(parsed) ? fallback : parsed
}

function getString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback

  const parsed = String(value).trim()

  return parsed || fallback
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
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}) {
  const { error } = await supabase.from('notifications').insert({
    title,
    message,
    type: 'INFORMATION',
    priority,
    status: 'UNREAD',
    recipient_role: recipientRole,
    source_module: 'PURCHASING',
    source_ref_id: sourceRefId,
    source_ref_type: sourceRefType,
    action_url: actionUrl,
  })

  if (error) {
    console.warn('Failed to create notification:', error.message)
  }
}

async function insertStockMovement({
  receiptId,
  poId,
  productId,
  warehouseId,
  quantity,
}: {
  receiptId: string
  poId: string
  productId: string
  warehouseId: string
  quantity: number
}) {
  if (quantity <= 0) return

  const movementPayload = {
    movement_id: generateStockMovementId(),
    product_id: productId,
    warehouse_id: warehouseId,
    movement_type: 'IN',
    quantity,
    reference_id: receiptId,
    reference_type: 'GOODS_RECEIPT',
    source_ref_id: poId,
    source_ref_type: 'PO',
    movement_date: new Date().toISOString(),
    notes: `Stock in from goods receipt ${receiptId}`,
  }

  const { error } = await supabase
    .from('tr_stock_movement')
    .insert(movementPayload)

  if (error) {
    console.warn('Failed to insert stock movement:', error.message)
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

  const totalOrdered = poDetails.reduce((total: number, item: any) => {
    return total + getNumber(item.qty_order || item.ordered_qty || item.quantity, 0)
  }, 0)

  const totalReceived = receipts.reduce((total: number, receipt: any) => {
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

export async function GET() {
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
      const firstError = errors[0]

      return NextResponse.json(
        {
          message: 'Failed to fetch goods receipts',
          error:
            firstError && 'message' in firstError
              ? String(firstError.message)
              : 'Unknown database error',
        },
        { status: 500 }
      )
    }

    const receipts = receiptResult.data || []
    const purchaseOrders = poResult.data || []
    const poDetails = poDetailResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const warehouses = warehouseResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const warehouseMap = new Map(
      warehouses.map((warehouse: any) => [warehouse.warehouse_id, warehouse])
    )

    const detailsByPO = new Map<string, any[]>()
    const receiptsByPO = new Map<string, any[]>()

    poDetails.forEach((detail: any) => {
      const poId = String(detail.po_id || '')
      const currentDetails = detailsByPO.get(poId) || []

      currentDetails.push(detail)
      detailsByPO.set(poId, currentDetails)
    })

    receipts.forEach((receipt: any) => {
      const poId = String(receipt.po_id || '')
      const currentReceipts = receiptsByPO.get(poId) || []

      currentReceipts.push(receipt)
      receiptsByPO.set(poId, currentReceipts)
    })

    const goodsReceipts = purchaseOrders
      .filter((po: any) => {
        const poId = String(po.po_id || '')
        const poStatus = String(po.status || '').toUpperCase()

        return receiptsByPO.has(poId) || ['RELEASED', 'COMPLETED'].includes(poStatus)
      })
      .map((po: any) => {
        const poId = String(po.po_id || '')
        const poItems = detailsByPO.get(poId) || []
        const poReceipts = receiptsByPO.get(poId) || []

        const firstDetail = poItems[0] || null
        const firstReceipt = poReceipts[0] || null

        const productId = String(
          firstReceipt?.product_id || firstDetail?.product_id || ''
        )

        const supplier = supplierMap.get(po.supplier_id)
        const product = productMap.get(productId)
        const warehouse = firstReceipt?.warehouse_id
          ? warehouseMap.get(firstReceipt.warehouse_id)
          : null

        const orderedQty = poItems.reduce((total: number, item: any) => {
          return (
            total + getNumber(item.qty_order || item.ordered_qty || item.quantity, 0)
          )
        }, 0)

        const receivedQty = poReceipts.reduce((total: number, receipt: any) => {
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
          expectedDeliveryDate:
            po.po_release_date || po.expected_delivery_date || null,
          poStatus: po.status || '-',
          totalValue: getNumber(po.total_value, 0),

          supplierCode: po.supplier_id || '-',
          supplierName: supplier?.supplier_name || '-',

          productCode: product?.product_id || productId || '-',
          productName: product?.product_name || '-',
          category: product?.category || '-',

          orderedQty,
          receivedQty,
          remainingQty: Math.max(orderedQty - receivedQty, 0),
          unit: product?.uom || '-',

          warehouseId: firstReceipt?.warehouse_id || null,
          warehouseName:
            warehouse?.warehouse_name ||
            warehouse?.name ||
            warehouse?.warehouse_code ||
            '-',

          receiptDate: firstReceipt?.receipt_date || null,
          expiryDate: firstReceipt?.expiry_date || null,
          batchNumber: firstReceipt?.batch_number || '-',
          condition: firstReceipt?.condition || '-',

          status: firstReceipt?.status || receiptStatus,
          rejectQty: getNumber(firstReceipt?.reject_qty, 0),
          rejectReason: firstReceipt?.reject_reason || null,

          items: poItems.map((item: any) => {
            const itemProduct = productMap.get(item.product_id)

            const itemReceivedQty = poReceipts
              .filter((receipt: any) => receipt.product_id === item.product_id)
              .reduce((total: number, receipt: any) => {
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
              orderedQty: getNumber(
                item.qty_order || item.ordered_qty || item.quantity,
                0
              ),
              receivedQty: itemReceivedQty,
              unit: itemProduct?.uom || '-',
              unitPrice: getNumber(item.unit_price, 0),
              subtotal: getNumber(item.subtotal, 0),
            }
          }),
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
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const poId = getString(body.poId || body.po_id || body.poNo || body.po_no)
    const productId = getString(
      body.productId || body.product_id || body.productCode || body.product_code
    )
    const warehouseId = getString(
      body.warehouseId || body.warehouse_id || body.warehouseCode
    )

    const quantity = getNumber(
      body.quantity || body.receivedQty || body.received_qty || body.qty,
      0
    )

    const rejectQty = getNumber(body.rejectQty || body.reject_qty, 0)
    const status = normalizeReceiptStatus(body.status)
    const acceptedQuantity =
      status === 'REJECTED' ? 0 : Math.max(quantity - rejectQty, 0)

    if (!poId) {
      return NextResponse.json(
        {
          message: 'Purchase order is required.',
        },
        { status: 400 }
      )
    }

    if (!productId) {
      return NextResponse.json(
        {
          message: 'Product is required.',
        },
        { status: 400 }
      )
    }

    if (!warehouseId) {
      return NextResponse.json(
        {
          message: 'Warehouse is required.',
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

    if (poError) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase order.',
          error: poError.message,
        },
        { status: 500 }
      )
    }

    if (!purchaseOrder) {
      return NextResponse.json(
        {
          message: 'Purchase order was not found.',
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
      status,
      reject_qty: rejectQty,
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

    if (acceptedQuantity > 0) {
      await updateStockBalance({
        productId,
        warehouseId,
        quantity: acceptedQuantity,
      })

      await insertStockMovement({
        receiptId,
        poId,
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
      actionUrl: '/apps/purchasing/three-way-matching',
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