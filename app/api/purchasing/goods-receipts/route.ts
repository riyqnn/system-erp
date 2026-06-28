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

type GRStatus = 'ACCEPTED' | 'PARTIAL' | 'REJECTED'

function createGRNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = String(Date.now()).slice(-5)

  return `GR-${year}${month}-${random}`
}

function createMovementId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = `${Date.now()}${Math.floor(Math.random() * 999)}`.slice(-8)

  return `MOV-${year}${month}-${random}`
}

function formatStatus(value?: string | null) {
  const status = String(value || '').toUpperCase()

  if (status === 'ACCEPTED') return 'ACCEPTED'
  if (status === 'PARTIAL') return 'PARTIAL'
  if (status === 'REJECTED') return 'REJECTED'

  return 'DRAFT'
}

function getReceiptId(receipt: any) {
  return receipt?.receipt_id || '-'
}

function getReceivedQty(receipt: any) {
  return Number(receipt?.quantity || 0)
}

function getOrderedQty(poItem: any) {
  return Number(poItem?.qty_order || 0)
}

function getReceiptProductId(receipt: any) {
  return receipt?.product_id || null
}

function determineGRStatus(receivedQty: number, orderedQty: number): GRStatus {
  if (receivedQty <= 0) return 'REJECTED'
  if (orderedQty > 0 && receivedQty < orderedQty) return 'PARTIAL'

  return 'ACCEPTED'
}

function normalizeDateOnly(value?: string | null) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().slice(0, 10)
}

async function getDefaultWarehouseId() {
  const { data, error } = await supabase
    .from('ms_warehouse')
    .select('warehouse_id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch default warehouse: ${error.message}`)
  }

  return data?.warehouse_id || null
}

async function updateStockBalance({
  productId,
  warehouseId,
  batchNumber,
  expiryDate,
  quantity,
}: {
  productId: string
  warehouseId: string
  batchNumber: string | null
  expiryDate: string | null
  quantity: number
}) {
  let query = supabase
    .from('tr_stock_balance')
    .select('*')
    .eq('product_id', productId)
    .eq('warehouse_id', warehouseId)
    .eq('status', 'AVAILABLE')

  if (batchNumber) {
    query = query.eq('batch_number', batchNumber)
  } else {
    query = query.is('batch_number', null)
  }

  const { data: existingStock, error: fetchError } = await query
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to fetch stock balance: ${fetchError.message}`)
  }

  if (existingStock) {
    const newBalance = Number(existingStock.quantity || 0) + quantity

    const { data, error } = await supabase
      .from('tr_stock_balance')
      .update({
        quantity: newBalance,
        expiry_date: expiryDate || existingStock.expiry_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('stock_id', existingStock.stock_id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update stock balance: ${error.message}`)
    }

    return {
      stock: data,
      balanceAfter: Number(data.quantity || newBalance),
    }
  }

  const { data, error } = await supabase
    .from('tr_stock_balance')
    .insert({
      product_id: productId,
      warehouse_id: warehouseId,
      batch_number: batchNumber,
      quantity,
      expiry_date: expiryDate,
      status: 'AVAILABLE',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to insert stock balance: ${error.message}`)
  }

  return {
    stock: data,
    balanceAfter: Number(data.quantity || quantity),
  }
}

async function insertStockMovement({
  productId,
  warehouseId,
  quantity,
  balanceAfter,
  receiptId,
}: {
  productId: string
  warehouseId: string
  quantity: number
  balanceAfter: number
  receiptId: string
}) {
  const { error } = await supabase.from('tr_stock_movement').insert({
    movement_id: createMovementId(),
    product_id: productId,
    warehouse_id: warehouseId,
    type: 'IN',
    quantity,
    balance_after: balanceAfter,
    reference_id: receiptId,
    reference_type: 'GR',
    movement_date: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Failed to insert stock movement: ${error.message}`)
  }
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
      supabase.from('tr_goods_receipt').select('*'),

      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, pr_id, supplier_id, quotation_id, total_value, status, created_at, po_release_date'
        )
        .order('created_at', { ascending: false }),

      supabase.from('tr_po_detail').select('*'),

      supabase.from('ms_supplier').select('*'),

      supabase.from('ms_product').select('*'),

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
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

<<<<<<< HEAD
    const goodsReceipts = (data || []).map((item: AnyObject) => {
      const receiptItems = item.purchasing_goods_receipt_items || []
      const firstItem = receiptItems[0]
      const po = item.purchasing_purchase_orders

      return {
        id: item.id,
        grNo: item.gr_number,
        receiptDate: item.receipt_date,
        receivedBy: item.received_by_name || '-',
        status: item.status,
        notes: item.notes || '-',
=======
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
>>>>>>> 2a574dc (fix goods receipt and three way matching integration)

        poNo: po?.po_number || '-',
        poDate: po?.po_date || null,
        expectedDeliveryDate: po?.expected_delivery_date || null,
        poStatus: po?.status || '-',
        totalValue: po?.total_value || 0,

<<<<<<< HEAD
        supplierId: po?.ms_suppliers?.supplier_code || '-',
        supplierName: po?.ms_suppliers?.supplier_name || '-',
        supplierContact: po?.ms_suppliers?.contact || '-',
        supplierAddress: po?.ms_suppliers?.address || '-',
=======
    poDetails.forEach((detail: any) => {
      const poId = String(detail.po_id || '')
      const currentDetails = detailsByPO.get(poId) || []

      currentDetails.push(detail)
      detailsByPO.set(poId, currentDetails)
    })
>>>>>>> 2a574dc (fix goods receipt and three way matching integration)

        productCode: firstItem?.products?.sku || '-',
        productName: firstItem?.products?.name || '-',
        category: firstItem?.products?.category || '-',
        orderedQty: firstItem?.ordered_qty || 0,
        receivedQty: firstItem?.received_qty || 0,
        unit: firstItem?.unit || firstItem?.products?.unit || '-',
        expiryDate: firstItem?.expiry_date || null,
        batchNumber: firstItem?.batch_number || '-',
        condition: firstItem?.condition || '-',

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
        const supplier = supplierMap.get(po.supplier_id)
        const receiptRows = receiptsByPO.get(poId) || []
        const firstReceipt = receiptRows[0]
        const hasReceipt = Boolean(firstReceipt)
        const poItems = detailsByPO.get(poId) || []

        const items = poItems.map((poItem: any) => {
          const product = productMap.get(poItem.product_id)

          const matchingReceipt =
            receiptRows.find(
              (receipt: any) =>
                String(getReceiptProductId(receipt) || '') ===
                String(poItem.product_id || '')
            ) || null

          const orderedQty = getOrderedQty(poItem)
          const receivedQty = matchingReceipt ? getReceivedQty(matchingReceipt) : 0

          return {
            id: String(poItem.po_detail_id || `${poId}-${poItem.product_id}`),
            productCode: product?.product_id || poItem.product_id || '-',
            productName: product?.product_name || '-',
            category: product?.category || '-',
            orderedQty,
            receivedQty,
            unit: product?.uom || '-',
            expiryDate: matchingReceipt?.expiry_date || null,
            batchNumber: matchingReceipt?.batch_number || '',
            condition: matchingReceipt
              ? formatStatus(matchingReceipt.status)
              : 'PENDING_RECEIPT',
            rejectQty: Number(matchingReceipt?.reject_qty || 0),
            rejectReason: matchingReceipt?.reject_reason || '',
          }
        })

        const firstItem = items[0]
        const warehouse = firstReceipt
          ? warehouseMap.get(firstReceipt.warehouse_id)
          : null

        return {
          id: hasReceipt ? String(getReceiptId(firstReceipt)) : `DRAFT-GR-${poId}`,
          grNo: hasReceipt ? String(getReceiptId(firstReceipt)) : `DRAFT-GR-${poId}`,
          receiptDate:
            firstReceipt?.receipt_date ||
            firstReceipt?.created_at ||
            po.po_release_date ||
            po.created_at ||
            null,
          receivedBy: firstReceipt?.received_by || null,
          status: hasReceipt ? formatStatus(firstReceipt?.status) : 'DRAFT',

          poNo: po.po_id,
          prNo: po.pr_id || '-',
          poDate: po.created_at || null,
          expectedDeliveryDate: null,
          poStatus: po.status || '-',
          totalValue: Number(po.total_value || 0),

          supplierId: supplier?.supplier_id || po.supplier_id || '-',
          supplierName: supplier?.supplier_name || '-',
          supplierContact: supplier?.contact || '-',
          supplierAddress: supplier?.address || '-',

          warehouseId: firstReceipt?.warehouse_id || '',
          warehouseName: warehouse?.warehouse_name || '-',

          productCode: firstItem?.productCode || '-',
          productName: firstItem?.productName || '-',
          category: firstItem?.category || '-',
          orderedQty: firstItem?.orderedQty || 0,
          receivedQty: firstItem?.receivedQty || 0,
          unit: firstItem?.unit || '-',
          expiryDate: firstItem?.expiryDate || null,
          batchNumber: firstItem?.batchNumber || '',
          condition: firstItem?.condition || 'PENDING_RECEIPT',
          rejectQty: firstItem?.rejectQty || 0,
          rejectReason: firstItem?.rejectReason || '',

          items,
        }
      })

    return NextResponse.json({
      message: 'Goods receipts fetched successfully',
      data: goodsReceipts,
      meta: {
        total: goodsReceipts.length,
      },
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
      warehouseId,
      receivedById,
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
      .select('po_id, pr_id, supplier_id, status')
      .eq('po_id', poNumber)
      .maybeSingle()

    if (poError) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase order',
          error: poError.message,
        },
        { status: 500 }
      )
    }

    if (!poData) {
      return NextResponse.json(
        {
          message: 'Purchase order not found',
          error: `PO ${poNumber} does not exist`,
        },
        { status: 404 }
      )
    }

    const poStatus = String(poData.status || '').toUpperCase()

    if (!['RELEASED', 'COMPLETED'].includes(poStatus)) {
      return NextResponse.json(
        {
          message: 'Goods receipt can only be created for released purchase order',
          error: `Current PO status is ${poData.status}`,
        },
        { status: 400 }
      )
    }

    const finalWarehouseId = warehouseId || (await getDefaultWarehouseId())

    if (!finalWarehouseId) {
      return NextResponse.json(
        {
          message: 'Warehouse is required',
          error: 'No warehouse was provided and no default warehouse exists',
        },
        { status: 400 }
      )
    }

    const { data: poDetails, error: poDetailError } = await supabase
      .from('tr_po_detail')
      .select('*')
      .eq('po_id', poNumber)

    if (poDetailError) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase order details',
          error: poDetailError.message,
        },
        { status: 500 }
      )
    }

    const poDetailMap = new Map(
      (poDetails || []).map((detail: any) => [String(detail.product_id), detail])
    )

    const finalGRNumber = grNumber?.startsWith('DRAFT-GR-')
      ? createGRNumber()
      : grNumber || createGRNumber()

    const receiptRows = []

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      const productId = item.productSku || item.productCode || item.product_id
      const poDetail = poDetailMap.get(String(productId))
      const orderedQty = getOrderedQty(poDetail)
      const quantity = Number(item.receivedQty || item.quantity || item.qty || 0)
      const rejectQty = Number(item.rejectQty || 0)
      const batchNumber = item.batchNumber || null
      const expiryDate = normalizeDateOnly(item.expiryDate)
      const status = determineGRStatus(quantity, orderedQty)

      if (!productId) {
        return NextResponse.json(
          {
            message: 'Product ID is required for every goods receipt item',
          },
          { status: 400 }
        )
      }

      if (!poDetail) {
        return NextResponse.json(
          {
            message: `Product ${productId} is not part of PO ${poNumber}`,
          },
          { status: 400 }
        )
      }

      if (quantity < 0) {
        return NextResponse.json(
          {
            message: `Received quantity for product ${productId} cannot be negative`,
          },
          { status: 400 }
        )
      }

      if (orderedQty > 0 && quantity > orderedQty) {
        return NextResponse.json(
          {
            message: `Received quantity for product ${productId} cannot exceed ordered quantity`,
            error: `Ordered ${orderedQty}, received ${quantity}`,
          },
          { status: 400 }
        )
      }

      const receiptId =
        items.length > 1 ? `${finalGRNumber}-${index + 1}` : finalGRNumber

      receiptRows.push({
        receipt_id: receiptId,
        po_id: poData.po_id,
        pr_id: poData.pr_id || null,
        supplier_id: poData.supplier_id || null,
        product_id: String(productId),
        warehouse_id: finalWarehouseId,
        quantity,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        receipt_date: receiptDate || new Date().toISOString(),
        received_by: receivedById ? Number(receivedById) : null,
        status,
        reject_qty: rejectQty,
        reject_reason: item.rejectReason || null,
      })
    }

    const { data: insertedReceipts, error: insertError } = await supabase
      .from('tr_goods_receipt')
      .insert(receiptRows)
      .select()

    if (insertError) {
      return NextResponse.json(
        {
          message: 'Failed to save goods receipt',
          error: insertError.message,
        },
        { status: 500 }
      )
    }

    for (const receipt of insertedReceipts || []) {
      const qty = Number(receipt.quantity || 0)

      if (qty > 0 && receipt.status !== 'REJECTED') {
        const { balanceAfter } = await updateStockBalance({
          productId: receipt.product_id,
          warehouseId: receipt.warehouse_id,
          batchNumber: receipt.batch_number || null,
          expiryDate: receipt.expiry_date || null,
          quantity: qty,
        })

        await insertStockMovement({
          productId: receipt.product_id,
          warehouseId: receipt.warehouse_id,
          quantity: qty,
          balanceAfter,
          receiptId: receipt.receipt_id,
        })
      }
    }

    await createNotification({
      title: 'Goods Receipt Created',
      message: `Goods Receipt ${finalGRNumber} has been created for PO ${poNumber}.`,
      recipientRole: 'PURCHASING',
      sourceRefId: finalGRNumber,
      sourceRefType: 'GR',
      actionUrl: '/apps/purchasing/goods-receipt',
      priority: 'MEDIUM',
    })

    await createNotification({
      title: 'Goods Receipt Ready for Matching',
      message: `GR ${finalGRNumber} for PO ${poNumber} is ready for Three-Way Matching.`,
      recipientRole: 'FINANCE',
      sourceRefId: finalGRNumber,
      sourceRefType: 'GR',
      actionUrl: '/apps/purchasing/three-way-matching',
      priority: 'MEDIUM',
    })

    return NextResponse.json({
      message: 'Goods receipt saved successfully',
      data: insertedReceipts,
      meta: {
        grNumber: finalGRNumber,
        poNumber,
        warehouseId: finalWarehouseId,
        insertedRows: insertedReceipts?.length || 0,
        stockUpdated: true,
        notificationCreated: true,
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