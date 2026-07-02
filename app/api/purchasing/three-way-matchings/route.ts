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
  supplier_id: string
  total_value: number
  status: string
  created_at: string
  po_release_date: string | null
}

interface DBPoDetail {
  po_detail_id?: string
  po_id: string
  product_id: string
  qty_order: number
  order_qty?: number
  qty?: number
  quantity?: number
  qty_requested?: number
  unit_price: number
  price?: number
  final_price?: number
  accepted_price?: number
  subtotal: number
  total?: number
}

interface DBGoodsReceipt {
  receipt_id: string
  gr_id?: string
  goods_receipt_id?: string
  id?: string
  po_id: string
  product_id: string
  item_id?: string
  sku?: string
  quantity: number
  received_qty?: number
  qty_received?: number
  qty?: number
  received_quantity?: number
  status: string
  receipt_date: string | null
  created_at: string | null
  condition?: string | null
}

interface DBAccountPayable {
  ap_id: string
  id?: string
  account_payable_id?: string
  po_id: string
  supplier_id: string | null
  inv_supp_no: string
  invoice_date: string
  ap_amount: number
  grand_total?: number
  total_value?: number
  total_amount?: number
  invoice_total?: number
  amount?: number
  payable_amount?: number
  ap_status: string
  status?: string
  payment_status?: string
  due_date: string
  payment_due_date?: string
  created_at: string
}
type MatchStatus =
  | 'WAITING_GR'
  | 'WAITING_INVOICE'
  | 'PARTIAL_RECEIPT'
  | 'PRICE_MISMATCH'
  | 'MATCHED'

function normalizeStatus(value?: string | null) {
  return String(value || '').toUpperCase()
}

function getReceiptId(receipt: Partial<DBGoodsReceipt> | undefined) {
  return receipt?.receipt_id || receipt?.gr_id || receipt?.goods_receipt_id || receipt?.id || '-'
}

function getReceivedQty(receipt: Partial<DBGoodsReceipt> | undefined) {
  return Number(
    receipt?.received_qty ||
      receipt?.qty_received ||
      receipt?.qty ||
      receipt?.quantity ||
      receipt?.received_quantity ||
      0
  )
}

function getReceiptProductId(receipt: Partial<DBGoodsReceipt> | undefined) {
  return receipt?.product_id || receipt?.item_id || receipt?.sku || null
}

function getAPId(ap: Partial<DBAccountPayable> | undefined) {
  return ap?.ap_id || ap?.id || ap?.account_payable_id || '-'
}

function getAPStatus(ap: Partial<DBAccountPayable> | undefined) {
  return ap?.ap_status || ap?.status || ap?.payment_status || 'PENDING'
}

function getAPAmount(ap: Partial<DBAccountPayable> | undefined) {
  return Number(
    ap?.grand_total ||
      ap?.total_value ||
      ap?.total_amount ||
      ap?.invoice_total ||
      ap?.amount ||
      ap?.payable_amount ||
      ap?.ap_amount ||
      0
  )
}

function getAPDate(ap: Partial<DBAccountPayable> | undefined) {
  return ap?.invoice_date || ap?.created_at || null
}

function getDueDate(ap: Partial<DBAccountPayable> | undefined) {
  return ap?.due_date || ap?.payment_due_date || ap?.created_at || null
}

function getPOQty(poItem: Partial<DBPoDetail> | undefined) {
  return Number(
    poItem?.qty_order ||
      poItem?.order_qty ||
      poItem?.qty ||
      poItem?.quantity ||
      poItem?.qty_requested ||
      0
  )
}

function getUnitPrice(poItem: Partial<DBPoDetail> | undefined) {
  return Number(
    poItem?.unit_price ||
      poItem?.price ||
      poItem?.final_price ||
      poItem?.accepted_price ||
      0
  )
}

function getSubtotal(poItem: Partial<DBPoDetail> | undefined) {
  const subtotal = Number(poItem?.subtotal || poItem?.total || 0)
  if (subtotal > 0) return subtotal
  return getPOQty(poItem) * getUnitPrice(poItem)
}

function getPOSubtotal(poItems: DBPoDetail[]) {
  return poItems.reduce((total, item) => total + getSubtotal(item), 0)
}

function getPOOrderedQty(poItems: DBPoDetail[]) {
  return poItems.reduce((total, item) => total + getPOQty(item), 0)
}

function getPOReceivedQty(poItems: DBPoDetail[], receipts: DBGoodsReceipt[]) {
  return poItems.reduce((total, item) => {
    const matchingReceipts = receipts.filter((row) => {
      return String(getReceiptProductId(row) || '') === String(item.product_id || '')
    })
    const itemReceivedQty = matchingReceipts.reduce((subtotal, receipt) => {
      return subtotal + getReceivedQty(receipt)
    }, 0)
    return total + itemReceivedQty
  }, 0)
}

function determineMatchStatus({
  orderedQty,
  receivedQty,
  poTotal,
  apAmount,
  hasReceipt,
  hasAP,
}: {
  orderedQty: number
  receivedQty: number
  poTotal: number
  apAmount: number
  hasReceipt: boolean
  hasAP: boolean
}): MatchStatus {
  if (!hasReceipt || receivedQty <= 0) return 'WAITING_GR'
  if (receivedQty < orderedQty) return 'PARTIAL_RECEIPT'
  if (!hasAP) return 'WAITING_INVOICE'
  if (!isAmountWithinTolerance(apAmount, poTotal)) return 'PRICE_MISMATCH'
  return 'MATCHED'
}

function buildResults({
  orderedQty,
  receivedQty,
  poTotal,
  apAmount,
  hasReceipt,
  hasAP,
}: {
  orderedQty: number
  receivedQty: number
  poTotal: number
  apAmount: number
  hasReceipt: boolean
  hasAP: boolean
}) {
  const qtyMatch = hasReceipt && orderedQty > 0 && receivedQty >= orderedQty
  const invoiceAvailable = hasAP
  const priceMatch = hasAP && isAmountWithinTolerance(apAmount, poTotal)

  return [
    {
      id: 'receipt-check',
      checkItem: 'Goods Receipt Availability',
      checkResult: hasReceipt ? 'MATCH' : 'MISMATCH',
      detail: hasReceipt
        ? 'Goods Receipt is available for this Purchase Order.'
        : 'Goods Receipt is not available yet.',
    },
    {
      id: 'qty-check',
      checkItem: 'PO Qty vs GR Qty',
      checkResult: qtyMatch ? 'MATCH' : 'MISMATCH',
      detail: qtyMatch
        ? `Ordered quantity and received quantity are both matched (${orderedQty}).`
        : `Ordered quantity is ${orderedQty}, while received quantity is ${receivedQty}.`,
    },
    {
      id: 'invoice-check',
      checkItem: 'Supplier Invoice / AP Availability',
      checkResult: invoiceAvailable ? 'MATCH' : 'MISMATCH',
      detail: invoiceAvailable
        ? 'Supplier invoice / AP record is available.'
        : 'Supplier invoice / AP record is not available yet.',
    },
    {
      id: 'amount-check',
      checkItem: 'PO Total vs AP Amount',
      checkResult: priceMatch ? 'MATCH' : 'MISMATCH',
      detail: priceMatch
        ? 'PO total and AP amount are aligned.'
        : `PO total is ${poTotal}, while AP amount is ${apAmount}.`,
    },
  ]
}

function getNumber(val: unknown, fallback = 0) {
  const parsed = Number(val)
  return isNaN(parsed) ? fallback : parsed
}

function isAmountWithinTolerance(amount: number, expectedAmount: number) {
  const diff = Math.abs(amount - expectedAmount)
  const tolerance = Math.max(1000, Math.round(Math.max(amount, expectedAmount) * 0.1))
  return diff <= tolerance
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatDateOnly(dateStr: string | null | undefined) {
  if (!dateStr) return null
  return new Date(dateStr).toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function createAPNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `AP-${year}${month}-${random}`
}

function createFinanceInvoiceNumber({
  existingInvoiceNo,
  poId,
}: {
  existingInvoiceNo?: string
  poId: string
}) {
  if (existingInvoiceNo) return existingInvoiceNo
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `INV-${poId}-${random}`
}

function normalizeFinanceSupplierId(supplierId: string) {
  return supplierId
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

async function createOrUpdateAccountPayable({
  po,
  supplierId,
  poTotal,
  invoiceNo,
  invoiceDate,
  dueDate,
  apStatus,
}: {
  po: DBPurchaseOrder
  supplierId: string | null
  poTotal: number
  invoiceNo: string
  invoiceDate: string
  dueDate: string
  apStatus?: string
}) {
  const poId = po.po_id

  const { data: existingAP } = await supabase
    .from('tr_account_payable')
    .select('*')
    .eq('po_id', poId)
    .maybeSingle()

  if (existingAP) {
    const { data, error } = await supabase
      .from('tr_account_payable')
      .update({
        supplier_id: supplierId,
        inv_supp_no: existingAP.inv_supp_no || invoiceNo,
        ap_amount: getNumber(existingAP.ap_amount || poTotal, 0),
        ap_status: apStatus || 'PENDING_VERIFICATION',
        invoice_date: existingAP.invoice_date || invoiceDate,
        due_date: existingAP.due_date || dueDate,
      })
      .eq('ap_id', existingAP.ap_id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update account payable: ${error.message}`)
    }
    return data
  }

  const { data, error } = await supabase
    .from('tr_account_payable')
    .insert({
      ap_id: createAPNumber(),
      po_id: poId,
      supplier_id: supplierId,
      inv_supp_no: invoiceNo,
      invoice_date: invoiceDate,
      ap_amount: poTotal,
      ap_status: apStatus || 'PENDING_VERIFICATION',
      due_date: dueDate,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create account payable: ${error.message}`)
  }
  return data
}

async function sendToFinancePayable({
  request,
  po,
  poId,
  receipt,
  amount,
  invoiceNo,
  invoiceDate,
  dueDate,
}: {
  request: Request
  po: DBPurchaseOrder
  poId: string
  receipt: DBGoodsReceipt
  amount: number
  invoiceNo: string
  invoiceDate: string
  dueDate: string
}) {
  const origin = new URL(request.url).origin

  const financePayload = {
    action: 'match',
    no_invoice: invoiceNo,
    no_po: poId,
    gr_code: String(getReceiptId(receipt)),
    supplier_id: normalizeFinanceSupplierId(po.supplier_id),
    supplier_code: po.supplier_id,
    jumlah: amount,
    tanggal_invoice: invoiceDate,
    due_date: dueDate,
    source_module: 'PURCHASING',
    source_matching_no: `TWM-${poId}`,
  }

  const response = await fetch(`${origin}/api/finance/payable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify(financePayload),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.message ||
        'Failed to send matching data to Finance Account Payable'
    )
  }

  return {
    payload: financePayload,
    result,
  }
}

export async function GET(request: Request) {
  try {
    const [
      poResult,
      poDetailResult,
      supplierResult,
      productResult,
      receiptResult,
      apResult,
    ] = await Promise.all([
      supabase
        .from('tr_purchase_order')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('tr_po_detail').select('*'),
      supabase.from('ms_supplier').select('*'),
      supabase.from('ms_product').select('*'),
      supabase.from('tr_goods_receipt').select('*'),
      supabase.from('tr_account_payable').select('*'),
    ])

    const errors = [
      poResult.error,
      poDetailResult.error,
      supplierResult.error,
      productResult.error,
      receiptResult.error,
      apResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch three-way matchings',
          error: errors[0] instanceof Error ? errors[0].message : String(errors[0]),
        },
        { status: 500 }
      )
    }

    const purchaseOrders = poResult.data || []
    const suppliers: DBSupplier[] = supplierResult.data || []
    const products: DBProduct[] = productResult.data || []

    const supplierMap = new Map<string, DBSupplier>(suppliers.map((s) => [s.supplier_id, s]))
    const productMap = new Map<string, DBProduct>(products.map((p) => [p.product_id, p]))

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

    const apByPO = new Map<string, DBAccountPayable>()
    ;(apResult.data || []).forEach((a: DBAccountPayable) => {
      const poId = String(a.po_id || '')
      if (!apByPO.has(poId)) apByPO.set(poId, a)
    })

    const matchings = ((purchaseOrders || []) as DBPurchaseOrder[])
      .filter((po) => {
        const poStatus = normalizeStatus(po.status)
        return ['RELEASED', 'COMPLETED'].includes(poStatus)
      })
      .map((po) => {
        const poId = String(po.po_id || '')
        const supplier = supplierMap.get(po.supplier_id)
        const poItems = detailsByPO.get(poId) || []
        const receiptRows = receiptsByPO.get(poId) || []
        const ap = apByPO.get(poId)
        const firstPoItem = poItems[0] || null
        const firstReceipt = receiptRows[0] || null
        const product = firstPoItem ? productMap.get(firstPoItem.product_id) : undefined

        const orderedQty = getPOOrderedQty(poItems)
        const receivedQty = getPOReceivedQty(poItems, receiptRows)

        const poSubtotal = getPOSubtotal(poItems)
        const poTotalValue = Number(po.total_value || poSubtotal || 0)
        const poTaxAmount = Math.max(poTotalValue - poSubtotal, 0)
        const apAmount = getAPAmount(ap)
        const hasReceipt = receiptRows.length > 0
        const hasAP = Boolean(ap)

        const matchStatus = determineMatchStatus({
          orderedQty,
          receivedQty,
          poTotal: poTotalValue,
          apAmount,
          hasReceipt,
          hasAP,
        })

        const apStatus = normalizeStatus(getAPStatus(ap))
        const sentToFinance = [
          'PENDING_VERIFICATION', 'VERIFIED', 'APPROVED', 'PAID',
          'OUTSTANDING', 'OVERDUE', 'BELUM_LUNAS', 'LUNAS',
        ].includes(apStatus)

        return {
          id: poId,
          matchingNo: `TWM-${poId}`,
          matchStatus,
          sentToFinance,
          sentToFinanceAt: ap?.created_at || ap?.invoice_date || null,
          createdAt:
            firstReceipt?.created_at ||
            firstReceipt?.receipt_date ||
            po.po_release_date ||
            po.created_at ||
            new Date().toISOString(),

          poNo: po.po_id,
          poDate: po.created_at || null,
          poStatus: po.status || '-',
          poSubtotal,
          poTaxAmount,
          poTotalValue,

          grNo: firstReceipt ? String(getReceiptId(firstReceipt)) : '-',
          receiptDate: firstReceipt?.receipt_date || firstReceipt?.created_at || null,
          grStatus: firstReceipt?.status || '-',

          invoiceNo: ap?.inv_supp_no || (ap ? String(getAPId(ap)) : '-'),
          invoiceDate: getAPDate(ap),
          dueDate: getDueDate(ap),
          invoiceSubtotal: apAmount,
          invoiceTaxAmount: 0,
          invoiceGrandTotal: apAmount,
          paymentStatus: getAPStatus(ap),

          supplierId: supplier?.supplier_id || po.supplier_id || '-',
          supplierName: supplier?.supplier_name || '-',
          supplierContact: supplier?.contact || '-',
          supplierAddress: supplier?.address || '-',

          productCode: product?.product_id || firstPoItem?.product_id || '-',
          productName: product?.product_name || '-',
          category: product?.category || '-',

          poQty: orderedQty,
          grReceivedQty: receivedQty,
          unit: product?.uom || '-',
          unitPrice: getUnitPrice(firstPoItem),

          poItems: poItems.map((poItem: DBPoDetail) => {
            const itemProduct = productMap.get(poItem.product_id)
            return {
              id: `${poId}-${poItem.product_id}`,
              productCode: itemProduct?.product_id || poItem.product_id || '-',
              productName: itemProduct?.product_name || '-',
              category: itemProduct?.category || '-',
              qty: getPOQty(poItem),
              unit: itemProduct?.uom || '-',
              unitPrice: getUnitPrice(poItem),
              subtotal: getSubtotal(poItem),
            }
          }),

          grItems: receiptRows.map((receipt: DBGoodsReceipt) => {
            const itemProduct = productMap.get(receipt.product_id)
            return {
              id: receipt.receipt_id,
              productCode: itemProduct?.product_id || receipt.product_id || '-',
              productName: itemProduct?.product_name || '-',
              category: itemProduct?.category || '-',
              orderedQty: poItems
                .filter((item: DBPoDetail) => item.product_id === receipt.product_id)
                .reduce((total: number, item: DBPoDetail) => total + getPOQty(item), 0),
              receivedQty: getReceivedQty(receipt),
              unit: itemProduct?.uom || '-',
              condition: receipt.condition || '-',
            }
          }),

          results: buildResults({
            orderedQty,
            receivedQty,
            poTotal: poTotalValue,
            apAmount,
            hasReceipt,
            hasAP,
          }),
        }
      })

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    
    const total = matchings.length
    const paginatedData = matchings.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      message: 'Three-way matchings fetched successfully',
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
        message: 'Unexpected error while fetching three-way matchings',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { matchingNo, poNumber } = body

    const target = poNumber || matchingNo

    if (!target) {
      return NextResponse.json(
        {
          message: 'Matching number or PO number is required',
        },
        { status: 400 }
      )
    }

    const poId = String(target).startsWith('TWM-')
      ? String(target).replace(/^TWM-/, '')
      : String(target)

    const [poResult, poDetailResult, receiptResult, apResult] =
      await Promise.all([
        supabase.from('tr_purchase_order').select('*').eq('po_id', poId).maybeSingle(),
        supabase.from('tr_po_detail').select('*').eq('po_id', poId),
        supabase.from('tr_goods_receipt').select('*').eq('po_id', poId),
        supabase.from('tr_account_payable').select('*').eq('po_id', poId).maybeSingle(),
      ])

    if (poResult.error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase order',
          error: poResult.error.message,
        },
        { status: 500 }
      )
    }

    if (!poResult.data) {
      return NextResponse.json(
        {
          message: 'Purchase order not found',
          error: `PO ${poId} does not exist`,
        },
        { status: 404 }
      )
    }

    if (poDetailResult.error || receiptResult.error || apResult.error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch matching data',
          error:
            poDetailResult.error?.message ||
            receiptResult.error?.message ||
            apResult.error?.message,
        },
        { status: 500 }
      )
    }

    const po = poResult.data
    const poItems = poDetailResult.data || []
    const receipts = receiptResult.data || []
    const existingAP = apResult.data || null

    const orderedQty = getPOOrderedQty(poItems)
    const receivedQty = getPOReceivedQty(poItems, receipts)
    const hasReceipt = receipts.length > 0 && receivedQty > 0
    const poSubtotal = getPOSubtotal(poItems)
    const poTotalValue = getNumber(po.total_value || poSubtotal, 0)
    const existingAPAmount = getAPAmount(existingAP)

    const today = new Date()

    const invoiceDate =
      formatDateOnly(existingAP?.invoice_date) ||
      today.toISOString().slice(0, 10)

    const dueDate =
      formatDateOnly(existingAP?.due_date) ||
      addDays(today, 30).toISOString().slice(0, 10)

    const invoiceNo = createFinanceInvoiceNumber({
      existingInvoiceNo: existingAP?.inv_supp_no,
      poId,
    })

    if (!hasReceipt) {
      await createNotification({
        title: 'Goods Receipt Required',
        message: `System cannot proceed matching. GR for PO ${poId} is missing.`,
        recipientRole: 'INVENTORY',
        sourceRefId: poId,
        sourceRefType: 'PURCHASE_ORDER',
        actionUrl: '/inventory/goods-receipt',
        priority: 'HIGH',
      })
      return NextResponse.json(
        {
          message: 'Cannot send to Finance because Goods Receipt is not available yet',
          error: 'WAITING_GR',
        },
        { status: 400 }
      )
    }

    if (receivedQty < orderedQty) {
      await createOrUpdateAccountPayable({
        po, supplierId: po.supplier_id || null, poTotal: poTotalValue,
        invoiceNo, invoiceDate, dueDate, apStatus: 'PARTIAL_RECEIPT'
      })
      return NextResponse.json(
        {
          message: 'Cannot send to Finance because Goods Receipt is still partial',
          error: 'PARTIAL_RECEIPT',
        },
        { status: 400 }
      )
    }

    if (existingAP && !isAmountWithinTolerance(existingAPAmount, poTotalValue)) {
      await createOrUpdateAccountPayable({
        po, supplierId: po.supplier_id || null, poTotal: existingAPAmount,
        invoiceNo, invoiceDate, dueDate, apStatus: 'PRICE_MISMATCH'
      })
      await createNotification({
        title: 'Price Mismatch in Invoice',
        message: `Invoice amount for PO ${poId} does not match PO total.`,
        recipientRole: 'PURCHASING_MANAGER',
        sourceRefId: poId,
        sourceRefType: 'PURCHASE_ORDER',
        actionUrl: '/purchasing/three-way-matching',
        priority: 'HIGH',
      })
      return NextResponse.json(
        {
          message: 'Cannot send to Finance because supplier invoice amount does not match PO total',
          error: 'PRICE_MISMATCH',
        },
        { status: 400 }
      )
    }

    const firstReceipt = receipts[0]

    const financeResponse = await sendToFinancePayable({
      request,
      po,
      poId,
      receipt: firstReceipt,
      amount: existingAP ? existingAPAmount : poTotalValue,
      invoiceNo,
      invoiceDate,
      dueDate,
    })

    const accountPayable = await createOrUpdateAccountPayable({
      po,
      supplierId: po.supplier_id || null,
      poTotal: existingAP ? existingAPAmount : poTotalValue,
      invoiceNo,
      invoiceDate,
      dueDate,
      apStatus: 'APPROVED',
    })

    await supabase.from('sys_audit_trail').insert({
      action_type: 'THREE_WAY_MATCH_APPROVED',
      table_affected: 'tr_account_payable',
      record_id: String(accountPayable.ap_id),
      user_id: 'SYSTEM',
      old_data: existingAP ? JSON.stringify(existingAP) : null,
      new_data: JSON.stringify(accountPayable),
    })

    await createNotification({
      title: 'Account Payable Sent to Finance',
      message: `PO ${poId} has passed three-way matching and has been sent to Finance Account Payable.`,
      recipientRole: 'FINANCE',
      sourceRefId: String(accountPayable.ap_id),
      sourceRefType: 'AP',
      actionUrl: '/finance/account-payable',
      priority: 'HIGH',
    })

    return NextResponse.json({
      message: 'Three-way matching sent to Finance Account Payable successfully',
      data: {
        poId,
        matchingNo: `TWM-${poId}`,
        sentToFinance: true,
        accountPayable,
        finance: financeResponse.result,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while sending three-way matching to Finance',
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const poId = searchParams.get('poId')

    if (!poId) {
      return NextResponse.json({ message: 'PO ID is required' }, { status: 400 })
    }

    // Instead of deleting (which fails due to FK constraints from payment records),
    // detach the AP from the PO by nullifying po_id and marking as CANCELLED.
    // This clears the TWM link so a corrected invoice can be re-submitted.
    const { error } = await supabase
      .from('tr_account_payable')
      .update({ po_id: null, ap_status: 'DRAFT' })
      .eq('po_id', poId)

    if (error) throw error

    return NextResponse.json({ message: 'Correction requested and invalid invoice cleared successfully' })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to request correction', error: String(error) },
      { status: 500 }
    )
  }
}