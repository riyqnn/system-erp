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

type MatchStatus =
  | 'WAITING_GR'
  | 'WAITING_INVOICE'
  | 'PARTIAL_RECEIPT'
  | 'PRICE_MISMATCH'
  | 'MATCHED'

function normalizeStatus(value?: string | null) {
  return String(value || '').toUpperCase()
}

function getReceiptId(receipt: AnyObject) {
  return (
    receipt?.receipt_id ||
    receipt?.gr_id ||
    receipt?.goods_receipt_id ||
    receipt?.id ||
    '-'
  )
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

function getAPId(ap: AnyObject) {
  return ap?.ap_id || ap?.id || ap?.account_payable_id || '-'
}

function getAPStatus(ap: AnyObject) {
  return ap?.ap_status || ap?.status || ap?.payment_status || 'PENDING'
}

function getAPAmount(ap: AnyObject) {
  return Number(
    ap?.grand_total ||
      ap?.total_value ||
      ap?.total_amount ||
      ap?.invoice_total ||
      ap?.amount ||
      ap?.payable_amount ||
      0
  )
}

function getAPDate(ap: AnyObject) {
  return ap?.invoice_date || ap?.ap_date || ap?.created_at || null
}

function getDueDate(ap: AnyObject) {
  return ap?.due_date || ap?.payment_due_date || ap?.created_at || null
}

function getPOQty(poItem: AnyObject) {
  return Number(
    poItem?.qty_order ||
      poItem?.order_qty ||
      poItem?.qty ||
      poItem?.quantity ||
      poItem?.qty_requested ||
      0
  )
}

function getUnitPrice(poItem: AnyObject) {
  return Number(
    poItem?.unit_price ||
      poItem?.price ||
      poItem?.final_price ||
      poItem?.accepted_price ||
      0
  )
}

function getSubtotal(poItem: AnyObject) {
  const subtotal = Number(poItem?.subtotal || poItem?.total || 0)

  if (subtotal > 0) return subtotal

  return getPOQty(poItem) * getUnitPrice(poItem)
}

function getPOSubtotal(poItems: any[]) {
  return poItems.reduce((total, item) => total + getSubtotal(item), 0)
}

function getPOOrderedQty(poItems: any[]) {
  return poItems.reduce((total, item) => total + getPOQty(item), 0)
}

function getPOReceivedQty(poItems: any[], receipts: any[]) {
  return poItems.reduce((total, item) => {
    const matchingReceipts = receipts.filter((row: any) => {
      return (
        String(getReceiptProductId(row) || '') === String(item.product_id || '')
      )
    })

    const itemReceivedQty = matchingReceipts.reduce((subtotal, receipt) => {
      return subtotal + getReceivedQty(receipt)
    }, 0)

    return total + itemReceivedQty
  }, 0)
}

function buildResults(po: AnyObject, poItem: AnyObject, receipt: AnyObject, ap: AnyObject) {
  const orderedQty = getPOQty(poItem)
  const receivedQty = getReceivedQty(receipt)
  const poTotal = Number(po?.total_value || 0)
  const apAmount = getAPAmount(ap)

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
  if (Math.round(apAmount) !== Math.round(poTotal)) return 'PRICE_MISMATCH'

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
  const qtyMatch = hasReceipt && orderedQty > 0 && receivedQty === orderedQty
  const invoiceAvailable = hasAP
  const priceMatch = hasAP && Math.round(apAmount) === Math.round(poTotal)

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
        ? `Ordered quantity and received quantity are both ${orderedQty}.`
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

  let lastError: AnyObject = null

  if (existingAP) {
    const { data, error } = await supabase
      .from('tr_account_payable')
      .update({
        supplier_id: supplierId,
        inv_supp_no: existingAP.inv_supp_no || invoiceNo,
        ap_amount: getNumber(existingAP.ap_amount || poTotal, 0),
        ap_status: 'PENDING_VERIFICATION',
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
      ap_status: 'PENDING_VERIFICATION',
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
  po: any
  poId: string
  receipt: any
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

export async function GET() {
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
      const firstError = errors[0]

      return NextResponse.json(
        {
          message: 'Failed to fetch three-way matchings',
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

    const apByPO = new Map()
    ;(apResult.data || []).forEach((a: AnyObject) => {
      const poId = String(a.po_id || '')
      if (!apByPO.has(poId)) apByPO.set(poId, a)
    })

    const matchings = purchaseOrders
      .filter((po: AnyObject) => {
        const poId = String(po.po_id || '')
        const poStatus = normalizeStatus(po.status)

        return ['RELEASED', 'COMPLETED'].includes(poStatus)
      })
      .map((po: AnyObject) => {
        const poId = String(po.po_id || '')
        const supplier = supplierMap.get(po.supplier_id)
        const poItems = detailsByPO.get(poId) || []
        const receiptRows = receiptsByPO.get(poId) || []
        const ap = apByPO.get(poId)
        const firstPoItem = poItems[0] || null
        const firstReceipt = receiptRows[0] || null
        const product = productMap.get(firstPoItem?.product_id)

        const matchingReceipt =
          receiptRows.find(
            (receipt: AnyObject) =>
              String(getReceiptProductId(receipt) || '') ===
              String(firstPoItem?.product_id || '')
          ) || firstReceipt

        const orderedQty = getPOQty(firstPoItem)
        const receivedQty = getReceivedQty(matchingReceipt)

        const poSubtotal = poItems.reduce(
          (total: number, item: AnyObject) => total + getSubtotal(item),
          0
        )

        const poTotalValue = Number(po.total_value || poSubtotal || 0)
        const poTaxAmount = Math.max(poTotalValue - poSubtotal, 0)
        const apAmount = getAPAmount(ap)

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
          'PENDING_VERIFICATION',
          'VERIFIED',
          'APPROVED',
          'PAID',
          'OUTSTANDING',
          'OVERDUE',
          'BELUM_LUNAS',
          'LUNAS',
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
          receiptDate:
            firstReceipt?.receipt_date || firstReceipt?.created_at || null,
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

          poItems: poItems.map((poItem: any) => {
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

          grItems: receiptRows.map((receipt: any) => {
            const itemProduct = productMap.get(receipt.product_id)

            return {
              id: receipt.receipt_id,
              productCode: itemProduct?.product_id || receipt.product_id || '-',
              productName: itemProduct?.product_name || '-',
              category: itemProduct?.category || '-',
              orderedQty: poItems
                .filter((item: any) => item.product_id === receipt.product_id)
                .reduce((total: number, item: any) => total + getPOQty(item), 0),
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

    return NextResponse.json({
      message: 'Three-way matchings fetched successfully',
      data: matchings,
      meta: {
        total: matchings.length,
      },
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
        supabase
          .from('tr_purchase_order')
          .select('*')
          .eq('po_id', poId)
          .maybeSingle(),

        supabase.from('tr_po_detail').select('*').eq('po_id', poId),

        supabase.from('tr_goods_receipt').select('*').eq('po_id', poId),

        supabase
          .from('tr_account_payable')
          .select('*')
          .eq('po_id', poId)
          .maybeSingle(),
      ])

    if (poResult.error) {
      return NextResponse.json(
        {
          message: 'Failed to update three-way matching',
          error: poError instanceof Error ? poError.message : String(poError),
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

    if (!hasReceipt) {
      return NextResponse.json(
        {
          message:
            'Cannot send to Finance because Goods Receipt is not available yet',
          error: 'WAITING_GR',
        },
        { status: 400 }
      )
    }

    if (receivedQty < orderedQty) {
      return NextResponse.json(
        {
          message:
            'Cannot send to Finance because Goods Receipt is still partial',
          error: 'PARTIAL_RECEIPT',
        },
        { status: 400 }
      )
    }

    if (existingAP && Math.round(existingAPAmount) !== Math.round(poTotalValue)) {
      return NextResponse.json(
        {
          message:
            'Cannot send to Finance because supplier invoice amount does not match PO total',
          error: 'PRICE_MISMATCH',
        },
        { status: 400 }
      )
    }

    const firstReceipt = receipts[0]
    const today = new Date()

    const invoiceDate =
      formatDateOnly(existingAP?.invoice_date) ||
      formatDateOnly(today.toISOString()) ||
      today.toISOString().slice(0, 10)

    const dueDate =
      formatDateOnly(existingAP?.due_date) ||
      formatDateOnly(addDays(today, 30).toISOString()) ||
      addDays(today, 30).toISOString().slice(0, 10)

    const invoiceNo = createFinanceInvoiceNumber({
      existingInvoiceNo: existingAP?.inv_supp_no,
      poId,
      receiptId: getReceiptId(firstReceipt),
    })

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