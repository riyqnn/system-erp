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
      0
  )
}

function getAPDate(ap: any) {
  return ap?.invoice_date || ap?.created_at || null
}

function getDueDate(ap: any) {
  return ap?.due_date || ap?.created_at || null
}

function getMatchStatus(poTotal: number, receivedQty: number, orderedQty: number) {
  if (receivedQty <= 0) return 'PENDING'
  if (orderedQty > 0 && receivedQty !== orderedQty) return 'MISMATCH'
  if (poTotal <= 0) return 'PENDING'

  return 'MATCHED'
}

function buildResults(po: any, poItem: any, receipt: any, ap: any) {
  const orderedQty = Number(poItem?.qty_order || 0)
  const receivedQty = getReceivedQty(receipt)
  const poTotal = Number(po?.total_value || 0)
  const apAmount = getAPAmount(ap)

  const qtyMatch =
    receivedQty > 0 && orderedQty > 0 && Number(receivedQty) === Number(orderedQty)

  const invoiceMatch =
    !ap || apAmount === 0 || Math.round(apAmount) === Math.round(poTotal)

  const receiptExists = Boolean(receipt)

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
        : 'Account payable record is not available yet.',
    },
  ]
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
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    const purchaseOrders = poResult.data || []
    const poDetails = poDetailResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const receipts = receiptResult.data || []
    const accountPayables = apResult.data || []

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

    const apByPO = new Map<string, any>()

    accountPayables.forEach((ap: any) => {
      const poId = String(ap.po_id || '')
      if (poId && !apByPO.has(poId)) {
        apByPO.set(poId, ap)
      }
    })

    const matchings = purchaseOrders
      .filter((po: any) => {
        const poId = String(po.po_id || '')
        return receiptsByPO.has(poId) || apByPO.has(poId)
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

        const orderedQty = Number(firstPoItem?.qty_order || 0)
        const receivedQty = getReceivedQty(matchingReceipt)
        const poSubtotal = poItems.reduce(
          (total: number, item: any) => total + Number(item.subtotal || 0),
          0
        )
        const poTotalValue = Number(po.total_value || poSubtotal || 0)
        const poTaxAmount = Math.max(poTotalValue - poSubtotal, 0)

        const matchStatus = getMatchStatus(
          poTotalValue,
          receivedQty,
          orderedQty
        )

        return {
          id: poId,
          matchingNo: `TWM-${poId}`,
          matchStatus,
          sentToFinance: ['APPROVED', 'POSTED', 'PAID'].includes(
            normalizeStatus(getAPStatus(ap))
          ),
          sentToFinanceAt: ap?.created_at || null,
          createdAt: firstReceipt?.created_at || po.po_release_date || po.created_at,

          poNo: po.po_id,
          poDate: po.created_at || null,
          poStatus: po.status || '-',
          poSubtotal,
          poTaxAmount,
          poTotalValue,

          grNo: String(getReceiptId(firstReceipt)),
          receiptDate:
            firstReceipt?.receipt_date ||
            firstReceipt?.created_at ||
            null,
          grStatus: firstReceipt?.status || '-',

          invoiceNo: String(getAPId(ap)),
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
          unitPrice: Number(firstPoItem?.unit_price || 0),

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

    const { matchingNo, sentToFinance } = body

    if (!matchingNo) {
      return NextResponse.json(
        {
          message: 'Matching number is required',
        },
        { status: 400 }
      )
    }

    const poId = String(matchingNo).startsWith('TWM-')
      ? String(matchingNo).replace(/^TWM-/, '')
      : String(matchingNo)

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

    if (!apData) {
      return NextResponse.json({
        message:
          'Three-way matching marked as reviewed, but no account payable record was found for this PO.',
        data: {
          poId,
          sentToFinance: Boolean(sentToFinance),
        },
      })
    }

    const { data, error } = await supabase
      .from('tr_account_payable')
      .update({
        ap_status: sentToFinance ? 'APPROVED' : 'DRAFT',
      })
      .eq('po_id', poId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to update three-way matching',
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Three-way matching updated successfully',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while updating three-way matching',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}