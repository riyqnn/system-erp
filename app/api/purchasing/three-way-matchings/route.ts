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

function formatMatchingNo(poId: string) {
  return `MATCH-${poId}`
}

function getPoIdFromMatchingNo(matchingNo: string) {
  return matchingNo.replace(/^MATCH-/, '')
}

export async function GET() {
  try {
    const [
      poResult,
      poDetailResult,
      grResult,
      apResult,
      supplierResult,
      productResult,
    ] = await Promise.all([
      supabase
        .from('tr_purchase_order')
        .select(
          'po_id, pr_id, supplier_id, quotation_id, approved_by, total_value, status, rejection_reason, created_at, po_release_date'
        )
        .order('created_at', { ascending: false }),

      supabase
        .from('tr_po_detail')
        .select('po_detail_id, po_id, product_id, qty_order, unit_price, subtotal'),

      supabase
        .from('tr_goods_receipt')
        .select(
          'receipt_id, po_id, pr_id, supplier_id, product_id, quantity, batch_number, expiry_date, receipt_date, received_by, status, reject_qty, reject_reason, created_at'
        ),

      supabase
        .from('tr_account_payable')
        .select(
          'ap_id, po_id, supplier_id, inv_supp_no, invoice_date, ap_amount, ap_status, due_date, approved_by, created_at'
        ),

      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom'),
    ])

    const errors = [
      poResult.error,
      poDetailResult.error,
      grResult.error,
      apResult.error,
      supplierResult.error,
      productResult.error,
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
    const goodsReceipts = grResult.data || []
    const accountPayables = apResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const poDetailsByPO = new Map<string, any[]>()

    poDetails.forEach((detail: any) => {
      const poId = String(detail.po_id || '')
      const current = poDetailsByPO.get(poId) || []

      current.push(detail)
      poDetailsByPO.set(poId, current)
    })

    const grByPO = new Map<string, any[]>()

    goodsReceipts.forEach((receipt: any) => {
      const poId = String(receipt.po_id || '')
      const current = grByPO.get(poId) || []

      current.push(receipt)
      grByPO.set(poId, current)
    })

    const apByPO = new Map<string, any[]>()

    accountPayables.forEach((ap: any) => {
      const poId = String(ap.po_id || '')
      const current = apByPO.get(poId) || []

      current.push(ap)
      apByPO.set(poId, current)
    })

    const matchings = purchaseOrders.map((po: any) => {
      const supplier = supplierMap.get(po.supplier_id)
      const poItemsRaw = poDetailsByPO.get(po.po_id) || []
      const grItemsRaw = grByPO.get(po.po_id) || []
      const apItems = apByPO.get(po.po_id) || []

      const firstPoItem = poItemsRaw[0]
      const firstGrItem = grItemsRaw[0]
      const firstProduct = productMap.get(
        firstPoItem?.product_id || firstGrItem?.product_id
      )
      const firstAP = apItems[0]

      const poSubtotal = poItemsRaw.reduce(
        (total: number, item: any) => total + Number(item.subtotal || 0),
        0
      )
      const poTaxAmount = Math.max(Number(po.total_value || 0) - poSubtotal, 0)
      const poTotalValue = Number(po.total_value || poSubtotal || 0)

      const invoiceGrandTotal = apItems.reduce(
        (total: number, item: any) => total + Number(item.ap_amount || 0),
        0
      )

      const totalPoQty = poItemsRaw.reduce(
        (total: number, item: any) => total + Number(item.qty_order || 0),
        0
      )

      const totalReceivedQty = grItemsRaw.reduce(
        (total: number, item: any) => total + Number(item.quantity || 0),
        0
      )

      const hasPO = Boolean(po.po_id)
      const hasGR = grItemsRaw.length > 0
      const hasAP = apItems.length > 0

      const qtyMatched = hasPO && hasGR && totalPoQty === totalReceivedQty
      const amountMatched =
        hasPO && hasAP && Math.abs(poTotalValue - invoiceGrandTotal) < 1
      const supplierMatched = apItems.every(
        (ap: any) => String(ap.supplier_id) === String(po.supplier_id)
      )

      let matchStatus = 'PENDING'

      if (hasPO && hasGR && hasAP) {
        matchStatus = qtyMatched && amountMatched && supplierMatched ? 'MATCHED' : 'MISMATCH'
      }

      const sentToFinance = apItems.some((ap: any) =>
        ['APPROVED', 'POSTED', 'PAID'].includes(normalizeStatus(ap.ap_status))
      )

      const poItems = poItemsRaw.map((poItem: any) => {
        const product = productMap.get(poItem.product_id)

        return {
          id: String(poItem.po_detail_id),
          productCode: product?.product_id || poItem.product_id || '-',
          productName: product?.product_name || '-',
          category: product?.category || '-',
          qty: Number(poItem.qty_order || 0),
          unit: product?.uom || '-',
          unitPrice: Number(poItem.unit_price || 0),
          subtotal: Number(poItem.subtotal || 0),
        }
      })

      const grItems = grItemsRaw.map((grItem: any) => {
        const product = productMap.get(grItem.product_id)

        return {
          id: grItem.receipt_id,
          productCode: product?.product_id || grItem.product_id || '-',
          productName: product?.product_name || '-',
          category: product?.category || '-',
          orderedQty:
            poItemsRaw.find(
              (poItem: any) => String(poItem.product_id) === String(grItem.product_id)
            )?.qty_order || 0,
          receivedQty: Number(grItem.quantity || 0),
          unit: product?.uom || '-',
          condition: Number(grItem.reject_qty || 0) > 0 ? 'PARTIAL_REJECT' : 'GOOD',
        }
      })

      const results = [
        {
          id: `${po.po_id}-qty`,
          checkItem: 'PO Quantity vs Goods Receipt Quantity',
          checkResult: qtyMatched ? 'MATCHED' : 'MISMATCH',
          detail: `PO quantity ${totalPoQty}, received quantity ${totalReceivedQty}.`,
        },
        {
          id: `${po.po_id}-amount`,
          checkItem: 'PO Amount vs Supplier Invoice/AP Amount',
          checkResult: amountMatched ? 'MATCHED' : 'MISMATCH',
          detail: `PO total ${poTotalValue}, invoice/AP total ${invoiceGrandTotal}.`,
        },
        {
          id: `${po.po_id}-supplier`,
          checkItem: 'Supplier Consistency',
          checkResult: supplierMatched ? 'MATCHED' : 'MISMATCH',
          detail: supplierMatched
            ? 'Supplier data is consistent between PO and AP.'
            : 'Supplier data is different between PO and AP.',
        },
      ]

      return {
        id: formatMatchingNo(po.po_id),
        matchingNo: formatMatchingNo(po.po_id),
        matchStatus,
        sentToFinance,
        sentToFinanceAt: firstAP?.approved_by ? firstAP?.created_at : null,
        createdAt: po.created_at,

        poNo: po.po_id,
        poDate: po.created_at,
        poStatus: po.status || '-',
        poSubtotal,
        poTaxAmount,
        poTotalValue,

        grNo: firstGrItem?.receipt_id || '-',
        receiptDate: firstGrItem?.receipt_date || null,
        grStatus: firstGrItem?.status || '-',

        invoiceNo: firstAP?.inv_supp_no || firstAP?.ap_id || '-',
        invoiceDate: firstAP?.invoice_date || null,
        dueDate: firstAP?.due_date || null,
        invoiceSubtotal: invoiceGrandTotal,
        invoiceTaxAmount: 0,
        invoiceGrandTotal,
        paymentStatus: firstAP?.ap_status || '-',

        supplierId: supplier?.supplier_id || po.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        productCode: firstProduct?.product_id || '-',
        productName: firstProduct?.product_name || '-',
        category: firstProduct?.category || '-',

        poQty: Number(firstPoItem?.qty_order || 0),
        grReceivedQty: Number(firstGrItem?.quantity || 0),
        unit: firstProduct?.uom || '-',
        unitPrice: Number(firstPoItem?.unit_price || 0),

        poItems,
        grItems,
        results,
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

    const poId = getPoIdFromMatchingNo(matchingNo)

    const { data: existingAP, error: existingAPError } = await supabase
      .from('tr_account_payable')
      .select('ap_id, po_id, ap_status')
      .eq('po_id', poId)
      .limit(1)
      .maybeSingle()

    if (existingAPError) {
      return NextResponse.json(
        {
          message: 'Failed to check account payable data',
          error: existingAPError.message,
        },
        { status: 500 }
      )
    }

    if (!existingAP) {
      return NextResponse.json(
        {
          message:
            'No account payable document found for this PO. Please create AP/invoice data first.',
        },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('tr_account_payable')
      .update({
        ap_status: sentToFinance ? 'APPROVED' : 'DRAFT',
      })
      .eq('ap_id', existingAP.ap_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to update three-way matching finance status',
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