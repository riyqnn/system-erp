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
      .from('purchasing_purchase_orders')
      .select(`
        id,
        po_number,
        po_date,
        expected_delivery_date,
        subtotal,
        tax_amount,
        total_value,
        status,
        approval_level,
        created_by_name,
        approved_by_name,
        approved_at,
        approval_notes,
        rejection_reason,
        released_at,
        purchasing_purchase_requisitions (
          id,
          pr_number,
          request_date,
          requested_by_name,
          department
        ),
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
      `)
      .order('po_date', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase orders',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const purchaseOrders = (data || []).map((item: any) => {
      const items = item.purchasing_purchase_order_items || []
      const firstItem = items[0]

      return {
        id: item.id,
        poNo: item.po_number,
        poDate: item.po_date,
        expectedDeliveryDate: item.expected_delivery_date,
        supplierId: item.ms_suppliers?.supplier_code || '-',
        supplierName: item.ms_suppliers?.supplier_name || '-',
        supplierContact: item.ms_suppliers?.contact || '-',
        supplierAddress: item.ms_suppliers?.address || '-',
        prNo: item.purchasing_purchase_requisitions?.pr_number || '-',
        requestedBy:
          item.purchasing_purchase_requisitions?.requested_by_name || '-',
        department: item.purchasing_purchase_requisitions?.department || '-',
        subtotal: item.subtotal || 0,
        taxAmount: item.tax_amount || 0,
        totalValue: item.total_value || 0,
        status: item.status,
        approvalLevel: item.approval_level || '-',
        approver: item.approved_by_name || '-',
        approvedAt: item.approved_at,
        approvalNotes: item.approval_notes || '-',
        rejectionReason: item.rejection_reason || '-',
        releasedAt: item.released_at,
        createdBy: item.created_by_name || '-',

        productCode: firstItem?.products?.sku || '-',
        productName: firstItem?.products?.name || '-',
        category: firstItem?.products?.category || '-',
        qty: firstItem?.qty || 0,
        unit: firstItem?.unit || firstItem?.products?.unit || '-',
        unitPrice: firstItem?.unit_price || 0,

        items: items.map((poItem: any) => ({
          id: poItem.id,
          productCode: poItem.products?.sku || '-',
          productName: poItem.products?.name || '-',
          category: poItem.products?.category || '-',
          qty: poItem.qty || 0,
          unit: poItem.unit || poItem.products?.unit || '-',
          unitPrice: poItem.unit_price || 0,
          subtotal: poItem.subtotal || 0,
        })),
      }
    })

    return NextResponse.json({
      message: 'Purchase orders fetched successfully',
      data: purchaseOrders,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching purchase orders',
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
      poNumber,
      prNumber,
      supplierCode,
      poDate,
      expectedDeliveryDate,
      status,
      createdByName,
      items,
    } = body

    if (!poNumber || !supplierCode || !poDate || !items?.length) {
      return NextResponse.json(
        {
          message:
            'PO number, supplier code, PO date, and items are required',
        },
        { status: 400 }
      )
    }

    const { data: supplierData, error: supplierError } = await supabase
      .from('ms_suppliers')
      .select('supplier_id')
      .eq('supplier_code', supplierCode)
      .single()

    if (supplierError || !supplierData) {
      return NextResponse.json(
        {
          message: 'Supplier not found',
          error: supplierError?.message,
        },
        { status: 404 }
      )
    }

    let prId = null

    if (prNumber) {
      const { data: prData } = await supabase
        .from('purchasing_purchase_requisitions')
        .select('id')
        .eq('pr_number', prNumber)
        .single()

      prId = prData?.id || null
    }

    const subtotal = items.reduce(
      (total: number, item: any) =>
        total + Number(item.qty || 0) * Number(item.unitPrice || 0),
      0
    )

    const taxAmount = subtotal * 0.11
    const totalValue = subtotal + taxAmount

    const { data: poData, error: poError } = await supabase
      .from('purchasing_purchase_orders')
      .insert({
        po_number: poNumber,
        pr_id: prId,
        supplier_id: supplierData.supplier_id,
        po_date: poDate,
        expected_delivery_date: expectedDeliveryDate || null,
        subtotal,
        tax_amount: taxAmount,
        total_value: totalValue,
        status: status || 'DRAFT',
        approval_level: 'MANAGER_PURCHASING',
        created_by_name: createdByName || 'Purchasing Staff',
      })
      .select('id')
      .single()

    if (poError || !poData) {
      return NextResponse.json(
        {
          message: 'Failed to save purchase order',
          error: poError?.message,
        },
        { status: 500 }
      )
    }

    const poItemsPayload = []

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

      const qty = Number(item.qty || 0)
      const unitPrice = Number(item.unitPrice || 0)

      poItemsPayload.push({
        po_id: poData.id,
        product_id: productData.id,
        qty,
        unit: item.unit || productData.unit || '-',
        unit_price: unitPrice,
        subtotal: qty * unitPrice,
      })
    }

    const { error: poItemsError } = await supabase
      .from('purchasing_purchase_order_items')
      .insert(poItemsPayload)

    if (poItemsError) {
      return NextResponse.json(
        {
          message: 'Purchase order saved, but failed to save PO items',
          error: poItemsError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Purchase order saved successfully',
      data: {
        id: poData.id,
        poNumber,
        subtotal,
        taxAmount,
        totalValue,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving purchase order',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}