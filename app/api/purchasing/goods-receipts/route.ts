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
      .from('purchasing_goods_receipts')
      .select(`
        id,
        gr_number,
        receipt_date,
        received_by_name,
        status,
        notes,
        purchasing_purchase_orders (
          id,
          po_number,
          po_date,
          expected_delivery_date,
          total_value,
          status,
          ms_suppliers (
            supplier_id,
            supplier_code,
            supplier_name,
            contact,
            address
          )
        ),
        purchasing_goods_receipt_items (
          id,
          ordered_qty,
          received_qty,
          unit,
          expiry_date,
          batch_number,
          condition,
          products (
            id,
            sku,
            name,
            category,
            unit
          )
        )
      `)
      .order('receipt_date', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch goods receipts',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const goodsReceipts = (data || []).map((item: any) => {
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

        poNo: po?.po_number || '-',
        poDate: po?.po_date || null,
        expectedDeliveryDate: po?.expected_delivery_date || null,
        poStatus: po?.status || '-',
        totalValue: po?.total_value || 0,

        supplierId: po?.ms_suppliers?.supplier_code || '-',
        supplierName: po?.ms_suppliers?.supplier_name || '-',
        supplierContact: po?.ms_suppliers?.contact || '-',
        supplierAddress: po?.ms_suppliers?.address || '-',

        productCode: firstItem?.products?.sku || '-',
        productName: firstItem?.products?.name || '-',
        category: firstItem?.products?.category || '-',
        orderedQty: firstItem?.ordered_qty || 0,
        receivedQty: firstItem?.received_qty || 0,
        unit: firstItem?.unit || firstItem?.products?.unit || '-',
        expiryDate: firstItem?.expiry_date || null,
        batchNumber: firstItem?.batch_number || '-',
        condition: firstItem?.condition || '-',

        items: receiptItems.map((receiptItem: any) => ({
          id: receiptItem.id,
          productCode: receiptItem.products?.sku || '-',
          productName: receiptItem.products?.name || '-',
          category: receiptItem.products?.category || '-',
          orderedQty: receiptItem.ordered_qty || 0,
          receivedQty: receiptItem.received_qty || 0,
          unit: receiptItem.unit || receiptItem.products?.unit || '-',
          expiryDate: receiptItem.expiry_date || null,
          batchNumber: receiptItem.batch_number || '-',
          condition: receiptItem.condition || '-',
        })),
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
      receivedByName,
      status,
      notes,
      items,
    } = body

    if (!grNumber || !poNumber || !receiptDate || !items?.length) {
      return NextResponse.json(
        {
          message: 'GR number, PO number, receipt date, and items are required',
        },
        { status: 400 }
      )
    }

    const { data: poData, error: poError } = await supabase
      .from('purchasing_purchase_orders')
      .select('id')
      .eq('po_number', poNumber)
      .single()

    if (poError || !poData) {
      return NextResponse.json(
        {
          message: 'Purchase order not found',
          error: poError?.message,
        },
        { status: 404 }
      )
    }

    const { data: grData, error: grError } = await supabase
      .from('purchasing_goods_receipts')
      .insert({
        gr_number: grNumber,
        po_id: poData.id,
        receipt_date: receiptDate,
        received_by_name: receivedByName || 'Warehouse Staff',
        status: status || 'ACCEPTED',
        notes: notes || null,
      })
      .select('id')
      .single()

    if (grError || !grData) {
      return NextResponse.json(
        {
          message: 'Failed to save goods receipt',
          error: grError?.message,
        },
        { status: 500 }
      )
    }

    const receiptItemsPayload = []

    for (const item of items) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, unit')
        .eq('sku', item.productSku)
        .single()

      if (productError || !productData) {
        return NextResponse.json(
          {
            message: `Product SKU ${item.productSku} not found`,
            error: productError?.message,
          },
          { status: 404 }
        )
      }

      let poItemId = null

      const { data: poItemData } = await supabase
        .from('purchasing_purchase_order_items')
        .select('id')
        .eq('po_id', poData.id)
        .eq('product_id', productData.id)
        .maybeSingle()

      poItemId = poItemData?.id || null

      receiptItemsPayload.push({
        gr_id: grData.id,
        po_item_id: poItemId,
        product_id: productData.id,
        ordered_qty: Number(item.orderedQty || 0),
        received_qty: Number(item.receivedQty || 0),
        unit: item.unit || productData.unit || '-',
        expiry_date: item.expiryDate || null,
        batch_number: item.batchNumber || null,
        condition: item.condition || 'GOOD',
      })
    }

    const { error: itemsError } = await supabase
      .from('purchasing_goods_receipt_items')
      .insert(receiptItemsPayload)

    if (itemsError) {
      return NextResponse.json(
        {
          message: 'Goods receipt saved, but failed to save receipt items',
          error: itemsError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Goods receipt saved successfully',
      data: {
        id: grData.id,
        grNumber,
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