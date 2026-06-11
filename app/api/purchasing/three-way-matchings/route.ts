import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('purchasing_three_way_matchings')
      .select(`
        id,
        matching_number,
        match_status,
        sent_to_finance,
        sent_to_finance_at,
        created_at,
        purchasing_purchase_orders (
          id,
          po_number,
          po_date,
          subtotal,
          tax_amount,
          total_value,
          status,
          ms_suppliers (
            supplier_id,
            supplier_code,
            supplier_name,
            contact,
            address
          ),
          purchasing_purchase_order_items (
            id,
            qty,
            unit,
            unit_price,
            subtotal,
            products (
              id,
              sku,
              name,
              category,
              unit
            )
          )
        ),
        purchasing_goods_receipts (
          id,
          gr_number,
          receipt_date,
          status,
          purchasing_goods_receipt_items (
            id,
            ordered_qty,
            received_qty,
            unit,
            condition,
            products (
              id,
              sku,
              name,
              category,
              unit
            )
          )
        ),
        purchasing_supplier_invoices (
          id,
          invoice_number,
          invoice_date,
          due_date,
          subtotal,
          tax_amount,
          grand_total,
          payment_status
        ),
        purchasing_three_way_matching_results (
          id,
          check_item,
          check_result,
          detail
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch three-way matchings',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const matchings = (data || []).map((item: any) => {
      const po = item.purchasing_purchase_orders
      const gr = item.purchasing_goods_receipts
      const invoice = item.purchasing_supplier_invoices

      const poItems = po?.purchasing_purchase_order_items || []
      const grItems = gr?.purchasing_goods_receipt_items || []
      const matchingResults = item.purchasing_three_way_matching_results || []

      const firstPoItem = poItems[0]
      const firstGrItem = grItems[0]

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

        poItems: poItems.map((poItem: any) => ({
          id: poItem.id,
          productCode: poItem.products?.sku || '-',
          productName: poItem.products?.name || '-',
          category: poItem.products?.category || '-',
          qty: poItem.qty || 0,
          unit: poItem.unit || poItem.products?.unit || '-',
          unitPrice: poItem.unit_price || 0,
          subtotal: poItem.subtotal || 0,
        })),

        grItems: grItems.map((grItem: any) => ({
          id: grItem.id,
          productCode: grItem.products?.sku || '-',
          productName: grItem.products?.name || '-',
          category: grItem.products?.category || '-',
          orderedQty: grItem.ordered_qty || 0,
          receivedQty: grItem.received_qty || 0,
          unit: grItem.unit || grItem.products?.unit || '-',
          condition: grItem.condition || '-',
        })),

        results: matchingResults.map((result: any) => ({
          id: result.id,
          checkItem: result.check_item,
          checkResult: result.check_result,
          detail: result.detail || '-',
        })),
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

    const { data, error } = await supabase
      .from('purchasing_three_way_matchings')
      .update({
        sent_to_finance: Boolean(sentToFinance),
        sent_to_finance_at: sentToFinance ? new Date().toISOString() : null,
      })
      .eq('matching_number', matchingNo)
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