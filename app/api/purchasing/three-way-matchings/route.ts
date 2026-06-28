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

type MatchStatus =
  | 'WAITING_GR'
  | 'WAITING_INVOICE'
  | 'PARTIAL_RECEIPT'
  | 'PRICE_MISMATCH'
  | 'MATCHED'

function normalizeStatus(value?: string | null) {
  return String(value || '').toUpperCase()
}

function createAPNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const timestamp = String(Date.now()).slice(-6)
  const random = String(Math.floor(Math.random() * 999)).padStart(3, '0')

  return `AP-${year}${month}-${timestamp}${random}`
}

function createInvoiceNumber(poId: string) {
  const cleanPo = String(poId || '').replace(/[^a-zA-Z0-9]/g, '')
  return `INV-${cleanPo}-${String(Date.now()).slice(-5)}`
}

function formatDateOnly(value?: string | null) {
  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)

  return next
}

function getReceiptId(receipt: any) {
  return receipt?.receipt_id || '-'
}

function getReceivedQty(receipt: any) {
  return Number(receipt?.quantity || 0)
}

function getReceiptProductId(receipt: any) {
  return receipt?.product_id || null
}

function getAPId(ap: any) {
  return ap?.ap_id || '-'
}

function getAPStatus(ap: any) {
  return ap?.ap_status || 'DRAFT'
}

function getAPAmount(ap: any) {
  return Number(ap?.ap_amount || 0)
}

function getAPDate(ap: any) {
  return ap?.invoice_date || ap?.created_at || null
}

function getDueDate(ap: any) {
  return ap?.due_date || null
}

function getPOQty(poItem: any) {
  return Number(poItem?.qty_order || 0)
}

function getUnitPrice(poItem: any) {
  return Number(poItem?.unit_price || 0)
}

function getSubtotal(poItem: any) {
  const subtotal = Number(poItem?.subtotal || 0)

  if (subtotal > 0) return subtotal

  return getPOQty(poItem) * getUnitPrice(poItem)
}

function getPOSubtotal(poItems: any[]) {
  return poItems.reduce((total, item) => total + getSubtotal(item), 0)
}

function getPOReceivedQty(poItems: any[], receipts: any[]) {
  return poItems.reduce((total, item) => {
    const receipt = receipts.find(
      (row: any) =>
        String(getReceiptProductId(row) || '') === String(item.product_id || '')
    )

    return total + getReceivedQty(receipt)
  }, 0)
}

function getPOOrderedQty(poItems: any[]) {
  return poItems.reduce((total, item) => total + getPOQty(item), 0)
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
        ? `PO total and AP amount are aligned.`
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

async function createOrUpdateAccountPayable({
  po,
  supplierId,
  poTotal,
}: {
  po: any
  supplierId: string | null
  poTotal: number
}) {
  const poId = String(po.po_id || '')

  const { data: existingAP, error: fetchError } = await supabase
    .from('tr_account_payable')
    .select('*')
    .eq('po_id', poId)
    .maybeSingle()

  if (fetchError) {
    throw new Error(`Failed to fetch account payable: ${fetchError.message}`)
  }

  const today = new Date()
  const invoiceDate = formatDateOnly(today.toISOString())
  const dueDate = formatDateOnly(addDays(today, 30).toISOString())

  if (existingAP) {
    const { data, error } = await supabase
      .from('tr_account_payable')
      .update({
        supplier_id: supplierId,
        ap_amount: Number(existingAP.ap_amount || poTotal || 0),
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
      inv_supp_no: createInvoiceNumber(poId),
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
      return NextResponse.json(
        {
          message: 'Failed to fetch three-way matchings',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

    const matchings = (data || []).map((item: AnyObject) => {
      const po = item.purchasing_purchase_orders
      const gr = item.purchasing_goods_receipts
      const invoice = item.purchasing_supplier_invoices

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

      return {
        id: item.id,
        matchingNo: item.matching_number,
        matchStatus: item.match_status,
        sentToFinance: item.sent_to_finance,
        sentToFinanceAt: item.sent_to_finance_at,
        createdAt: item.created_at,

        poNo: po?.po_number || '-',
        poDate: po?.po_date || null,
        poStatus: po?.status || '-',
        poSubtotal: po?.subtotal || 0,
        poTaxAmount: po?.tax_amount || 0,
        poTotalValue: po?.total_value || 0,

        grNo: gr?.gr_number || '-',
        receiptDate: gr?.receipt_date || null,
        grStatus: gr?.status || '-',

        invoiceNo: invoice?.invoice_number || '-',
        invoiceDate: invoice?.invoice_date || null,
        dueDate: invoice?.due_date || null,
        invoiceSubtotal: invoice?.subtotal || 0,
        invoiceTaxAmount: invoice?.tax_amount || 0,
        invoiceGrandTotal: invoice?.grand_total || 0,
        paymentStatus: invoice?.payment_status || '-',

        supplierId: po?.ms_suppliers?.supplier_code || '-',
        supplierName: po?.ms_suppliers?.supplier_name || '-',
        supplierContact: po?.ms_suppliers?.contact || '-',
        supplierAddress: po?.ms_suppliers?.address || '-',

        productCode:
          firstPoItem?.products?.sku || firstGrItem?.products?.sku || '-',
        productName:
          firstPoItem?.products?.name || firstGrItem?.products?.name || '-',
        category:
          firstPoItem?.products?.category ||
          firstGrItem?.products?.category ||
          '-',

        poQty: firstPoItem?.qty || 0,
        grReceivedQty: firstGrItem?.received_qty || 0,
        unit: firstPoItem?.unit || firstGrItem?.unit || '-',
        unitPrice: firstPoItem?.unit_price || 0,

        poItems: poItems.map((poItem: AnyObject) => ({
          id: poItem.id,
          productCode: poItem.products?.sku || '-',
          productName: poItem.products?.name || '-',
          category: poItem.products?.category || '-',
          qty: poItem.qty || 0,
          unit: poItem.unit || poItem.products?.unit || '-',
          unitPrice: poItem.unit_price || 0,
          subtotal: poItem.subtotal || 0,
        })),

        grItems: grItems.map((grItem: AnyObject) => ({
          id: grItem.id,
          productCode: grItem.products?.sku || '-',
          productName: grItem.products?.name || '-',
          category: grItem.products?.category || '-',
          orderedQty: grItem.ordered_qty || 0,
          receivedQty: grItem.received_qty || 0,
          unit: grItem.unit || grItem.products?.unit || '-',
          condition: grItem.condition || '-',
        })),

        results: matchingResults.map((result: AnyObject) => ({
          id: result.id,
          checkItem: result.check_item,
          checkResult: result.check_result,
          detail: result.detail || '-',
        })),
      }
    })

    const matchings = purchaseOrders
      .filter((po: any) => {
        const poStatus = normalizeStatus(po.status)

        return ['RELEASED', 'COMPLETED'].includes(poStatus)
      })
      .map((po: any) => {
        const poId = String(po.po_id || '')
        const supplier = supplierMap.get(po.supplier_id)
        const poItems = detailsByPO.get(poId) || []
        const receiptRows = receiptsByPO.get(poId) || []
        const ap = apByPO.get(poId)
        const firstPoItem = poItems[0]
        const firstReceipt = receiptRows[0]
        const product = productMap.get(firstPoItem?.product_id)

        const orderedQty = getPOOrderedQty(poItems)
        const receivedQty = getPOReceivedQty(poItems, receiptRows)
        const hasReceipt = receiptRows.length > 0 && receivedQty > 0
        const hasAP = Boolean(ap)

        const poSubtotal = getPOSubtotal(poItems)
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

        return {
          id: poId,
          matchingNo: `TWM-${poId}`,
          matchStatus,
          sentToFinance: [
            'PENDING_VERIFICATION',
            'APPROVED',
            'PAID',
            'OUTSTANDING',
            'OVERDUE',
          ].includes(apStatus),
          sentToFinanceAt: ap?.created_at || null,
          createdAt:
            firstReceipt?.created_at ||
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
            firstReceipt?.receipt_date ||
            firstReceipt?.created_at ||
            null,
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
        error: error instanceof Error ? error.message : 'Unknown error',
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

    const [
      poResult,
      poDetailResult,
      receiptResult,
    ] = await Promise.all([
      supabase
        .from('tr_purchase_order')
        .select('*')
        .eq('po_id', poId)
        .maybeSingle(),

      supabase.from('tr_po_detail').select('*').eq('po_id', poId),

      supabase.from('tr_goods_receipt').select('*').eq('po_id', poId),
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

    if (poDetailResult.error || receiptResult.error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch matching data',
          error: poDetailResult.error?.message || receiptResult.error?.message,
        },
        { status: 500 }
      )
    }

    const po = poResult.data
    const poItems = poDetailResult.data || []
    const receipts = receiptResult.data || []

    const orderedQty = getPOOrderedQty(poItems)
    const receivedQty = getPOReceivedQty(poItems, receipts)
    const hasReceipt = receipts.length > 0 && receivedQty > 0
    const poSubtotal = getPOSubtotal(poItems)
    const poTotalValue = Number(po.total_value || poSubtotal || 0)

    if (!hasReceipt) {
      return NextResponse.json(
        {
          message: 'Cannot send to Finance because Goods Receipt is not available yet',
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

    const accountPayable = await createOrUpdateAccountPayable({
      po,
      supplierId: po.supplier_id || null,
      poTotal: poTotalValue,
    })

    await createNotification({
      title: 'Account Payable Pending Verification',
      message: `PO ${poId} has passed purchasing verification and is waiting for Finance verification.`,
      recipientRole: 'FINANCE',
      sourceRefId: accountPayable.ap_id,
      sourceRefType: 'AP',
      actionUrl: '/apps/purchasing/finance',
      priority: 'HIGH',
    })

    return NextResponse.json({
      message: 'Three-way matching sent to Finance successfully',
      data: {
        poId,
        matchingNo: `TWM-${poId}`,
        sentToFinance: true,
        accountPayable,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while sending three-way matching to Finance',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}