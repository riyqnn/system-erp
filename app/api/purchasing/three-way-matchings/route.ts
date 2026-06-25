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
      receipt?.received_quantity ||
      0
  )
}

function getReceiptProductId(receipt: any) {
  return receipt?.product_id || receipt?.item_id || receipt?.sku || null
}

function getAPId(ap: any) {
  return ap?.ap_id || ap?.id || ap?.account_payable_id || '-'
}

function getAPStatus(ap: any) {
  return ap?.ap_status || ap?.status || ap?.payment_status || 'PENDING'
}

function getAPAmount(ap: any) {
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

function getAPDate(ap: any) {
  return ap?.invoice_date || ap?.ap_date || ap?.created_at || null
}

function getDueDate(ap: any) {
  return ap?.due_date || ap?.payment_due_date || ap?.created_at || null
}

function getPOQty(poItem: any) {
  return Number(
    poItem?.qty_order ||
      poItem?.order_qty ||
      poItem?.qty ||
      poItem?.quantity ||
      poItem?.qty_requested ||
      0
  )
}

function getUnitPrice(poItem: any) {
  return Number(
    poItem?.unit_price ||
      poItem?.price ||
      poItem?.final_price ||
      poItem?.accepted_price ||
      0
  )
}

function getSubtotal(poItem: any) {
  const subtotal = Number(poItem?.subtotal || poItem?.total || 0)

  if (subtotal > 0) return subtotal

  return getPOQty(poItem) * getUnitPrice(poItem)
}

function getMatchStatus(poTotal: number, receivedQty: number, orderedQty: number) {
  if (receivedQty <= 0) return 'PENDING'
  if (orderedQty > 0 && Number(receivedQty) !== Number(orderedQty)) return 'MISMATCH'
  if (poTotal <= 0) return 'PENDING'

  return 'MATCHED'
}

function buildResults(po: any, poItem: any, receipt: any, ap: any) {
  const orderedQty = getPOQty(poItem)
  const receivedQty = getReceivedQty(receipt)
  const poTotal = Number(po?.total_value || 0)
  const apAmount = getAPAmount(ap)

  const qtyMatch =
    receivedQty > 0 && orderedQty > 0 && Number(receivedQty) === Number(orderedQty)

  const receiptExists = Boolean(receipt)

  const invoiceMatch =
    !ap || apAmount === 0 || Math.round(apAmount) === Math.round(poTotal)

  return [
    {
      id: 'qty-check',
      checkItem: 'PO Qty vs GR Qty',
      checkResult: qtyMatch ? 'MATCH' : 'MISMATCH',
      detail: qtyMatch
        ? `Ordered quantity and received quantity are both ${orderedQty}.`
        : `Ordered quantity is ${orderedQty}, while received quantity is ${receivedQty}.`,
    },
    {
      id: 'receipt-check',
      checkItem: 'Goods Receipt Availability',
      checkResult: receiptExists ? 'MATCH' : 'MISMATCH',
      detail: receiptExists
        ? 'Goods receipt record is available for this purchase order.'
        : 'Goods receipt record is not available yet.',
    },
    {
      id: 'invoice-check',
      checkItem: 'PO Total vs AP/Invoice Total',
      checkResult: invoiceMatch ? 'MATCH' : 'MISMATCH',
      detail: ap
        ? invoiceMatch
          ? `PO total and AP amount are aligned at ${poTotal}.`
          : `PO total is ${poTotal}, while AP amount is ${apAmount}.`
        : 'Account payable record is not available yet. For demo, this matching can still be sent to Finance.',
    },
  ]
}

async function tryUpdateAccountPayable(poId: string, sentToFinance: boolean) {
  const updateAttempts = [
    { ap_status: sentToFinance ? 'APPROVED' : 'DRAFT' },
    { status: sentToFinance ? 'APPROVED' : 'DRAFT' },
    { payment_status: sentToFinance ? 'APPROVED' : 'DRAFT' },
    { ap_status: sentToFinance ? 'POSTED' : 'DRAFT' },
    { status: sentToFinance ? 'POSTED' : 'DRAFT' },
    { payment_status: sentToFinance ? 'POSTED' : 'DRAFT' },
    { ap_status: sentToFinance ? 'PENDING_PAYMENT' : 'DRAFT' },
    { status: sentToFinance ? 'PENDING_PAYMENT' : 'DRAFT' },
    { payment_status: sentToFinance ? 'PENDING_PAYMENT' : 'DRAFT' },
  ]

  let lastError: any = null

  for (const payload of updateAttempts) {
    const { data, error } = await supabase
      .from('tr_account_payable')
      .update(payload)
      .eq('po_id', poId)
      .select()

    if (!error) {
      return {
        updated: true,
        data,
        error: null,
        payload,
      }
    }

    lastError = error
  }

  return {
    updated: false,
    data: null,
    error: lastError,
    payload: null,
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
      supabase.from('tr_purchase_order').select('*').order('created_at', {
        ascending: false,
      }),

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
        const poId = String(po.po_id || '')
        const poStatus = normalizeStatus(po.status)

        return (
          receiptsByPO.has(poId) ||
          apByPO.has(poId) ||
          ['RELEASED', 'APPROVED', 'COMPLETED'].includes(poStatus)
        )
      })
      .map((po: any) => {
        const poId = String(po.po_id || '')
        const supplier = supplierMap.get(po.supplier_id)
        const poItems = detailsByPO.get(poId) || []
        const receiptRows = receiptsByPO.get(poId) || []
        const firstPoItem = poItems[0]
        const firstReceipt = receiptRows[0]
        const ap = apByPO.get(poId)
        const product = productMap.get(firstPoItem?.product_id)

        const matchingReceipt =
          receiptRows.find(
            (receipt: any) =>
              String(getReceiptProductId(receipt) || '') ===
              String(firstPoItem?.product_id || '')
          ) || firstReceipt

        const orderedQty = getPOQty(firstPoItem)
        const receivedQty = getReceivedQty(matchingReceipt)

        const poSubtotal = poItems.reduce(
          (total: number, item: any) => total + getSubtotal(item),
          0
        )

        const poTotalValue = Number(po.total_value || poSubtotal || 0)
        const poTaxAmount = Math.max(poTotalValue - poSubtotal, 0)

        const matchStatus = getMatchStatus(
          poTotalValue,
          receivedQty,
          orderedQty
        )

        const apStatus = normalizeStatus(getAPStatus(ap))

        return {
          id: poId,
          matchingNo: `TWM-${poId}`,
          matchStatus,
          sentToFinance: ['APPROVED', 'POSTED', 'PAID', 'PENDING_PAYMENT'].includes(
            apStatus
          ),
          sentToFinanceAt: ap?.updated_at || ap?.created_at || null,
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

          invoiceNo: ap ? String(getAPId(ap)) : `AP-${poId}`,
          invoiceDate: getAPDate(ap),
          dueDate: getDueDate(ap),
          invoiceSubtotal: getAPAmount(ap),
          invoiceTaxAmount: 0,
          invoiceGrandTotal: getAPAmount(ap),
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

          results: buildResults(po, firstPoItem, matchingReceipt, ap),
        }
      })

    return NextResponse.json({
      message: 'Three-way matchings fetched successfully',
      data: matchings,
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

    const { matchingNo, poNumber, sentToFinance } = body

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

    const { data: poData, error: poError } = await supabase
      .from('tr_purchase_order')
      .select('*')
      .eq('po_id', poId)
      .maybeSingle()

    if (poError) {
      return NextResponse.json(
        {
          message: 'Failed to update three-way matching',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

    if (!poData) {
      return NextResponse.json(
        {
          message: 'Purchase order not found',
          error: `PO ${poId} does not exist`,
        },
        { status: 404 }
      )
    }

    const { data: apData, error: apFetchError } = await supabase
      .from('tr_account_payable')
      .select('*')
      .eq('po_id', poId)
      .maybeSingle()

    if (apFetchError) {
      return NextResponse.json(
        {
          message: 'Failed to fetch account payable data',
          error: apFetchError.message,
        },
        { status: 500 }
      )
    }

    if (apData) {
      const updateResult = await tryUpdateAccountPayable(
        poId,
        Boolean(sentToFinance)
      )

      return NextResponse.json({
        message: 'Three-way matching sent to Finance successfully',
        data: {
          poId,
          sentToFinance: Boolean(sentToFinance),
          apExists: true,
          apUpdated: updateResult.updated,
          updatePayload: updateResult.payload,
          updateWarning: updateResult.error?.message || null,
          accountPayable: updateResult.data || apData,
        },
      })
    }

    return NextResponse.json({
      message:
        'Three-way matching sent to Finance successfully. Account payable record was not found, so this is treated as a finance handoff for demo.',
      data: {
        poId,
        sentToFinance: Boolean(sentToFinance),
        apExists: false,
        financeHandoff: true,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while sending three-way matching to finance',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}