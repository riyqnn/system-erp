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
  const status = String(value || '').toUpperCase()

  if (status === 'DRAFT') return 'DRAFT'

  if (['PENDING', 'PENDING_APPROVAL', 'WAITING_APPROVAL'].includes(status)) {
    return 'PENDING_APPROVAL'
  }

  if (status === 'APPROVED') return 'APPROVED'

  if (['RELEASED', 'ISSUED', 'SENT'].includes(status)) {
    return 'RELEASED'
  }

  if (['REJECTED', 'CANCELLED'].includes(status)) {
    return 'REJECTED'
  }

  if (status === 'COMPLETED') return 'COMPLETED'

  return status || 'DRAFT'
}

function denormalizeStatus(value?: string | null) {
  const status = normalizeStatus(value)

  if (status === 'PENDING_APPROVAL') return 'PENDING'
  if (status === 'RELEASED') return 'RELEASED'
  if (status === 'APPROVED') return 'APPROVED'
  if (status === 'REJECTED') return 'REJECTED'
  if (status === 'COMPLETED') return 'COMPLETED'

  return status || 'DRAFT'
}

export async function GET() {
  try {
    const [
      poResult,
      poDetailResult,
      prResult,
      quotationResult,
      supplierResult,
      productResult,
      userResult,
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
        .from('tr_purchase_requisition')
        .select('pr_id, requested_by, request_date, status, notes, created_at'),

      supabase
        .from('tr_price_quotation')
        .select(
          'quotation_id, supplier_id, product_id, proposed_price, accepted_price, final_price, qty_requested, status, quotation_date, expiry_date, notes'
        ),

      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address, lead_time, top, status'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom'),

      supabase
        .from('ms_user')
        .select('user_id, username, full_name, email, role'),
    ])

    const errors = [
      poResult.error,
      poDetailResult.error,
      prResult.error,
      quotationResult.error,
      supplierResult.error,
      productResult.error,
      userResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase orders',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

    const purchaseOrders = (data || []).map((item: AnyObject) => {
      const items = item.purchasing_purchase_order_items || []
      const firstItem = items[0]

      const subtotal = items.reduce(
        (total: number, item: any) => total + Number(item.subtotal || 0),
        0
      )

      const totalValue = Number(po.total_value || subtotal || 0)
      const taxAmount = Math.max(totalValue - subtotal, 0)
      const status = normalizeStatus(po.status)

      return {
        id: String(po.po_id),
        poNo: String(po.po_id),
        poDate: po.created_at || null,
        expectedDeliveryDate: null,

        supplierId: supplier?.supplier_id || po.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        prNo: pr?.pr_id || po.pr_id || '-',
        quotationNo: quotation?.quotation_id || po.quotation_id || '-',
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

        items: items.map((poItem: AnyObject) => ({
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
      data,
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
      quotationNumber,
      supplierCode,
      poDate,
      status,
      items,
    } = body

    if (!poNumber || !supplierCode || !items?.length) {
      return NextResponse.json(
        {
          message: 'PO number, supplier code, and items are required',
        },
        { status: 400 }
      )
    }

    const { data: existingPO } = await supabase
      .from('tr_purchase_order')
      .select('po_id')
      .eq('po_id', poNumber)
      .maybeSingle()

    if (existingPO) {
      return NextResponse.json(
        {
          message: 'PO number already exists',
        },
        { status: 409 }
      )
    }

    const { data: supplierData, error: supplierError } = await supabase
      .from('ms_supplier')
      .select('supplier_id')
      .eq('supplier_id', supplierCode)
      .maybeSingle()

    if (supplierError || !supplierData) {
      return NextResponse.json(
        {
          message: 'Supplier not found',
          error:
            supplierError?.message || `Supplier ${supplierCode} does not exist`,
        },
        { status: 404 }
      )
    }

    let prId = null

    if (prNumber) {
      const { data: prData } = await supabase
        .from('tr_purchase_requisition')
        .select('pr_id')
        .eq('pr_id', prNumber)
        .maybeSingle()

      prId = prData?.pr_id || null
    }

    let quotationId = quotationNumber || null

    if (!quotationId) {
      const firstItem = items[0]

      const { data: quotationData } = await supabase
        .from('tr_price_quotation')
        .select('quotation_id')
        .eq('supplier_id', supplierCode)
        .eq('product_id', firstItem.productSku || firstItem.productCode)
        .order('quotation_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      quotationId = quotationData?.quotation_id || null
    }

    const subtotal = items.reduce(
      (total: number, item: AnyObject) =>
        total + Number(item.qty || 0) * Number(item.unitPrice || 0),
      0
    )

    const taxAmount = subtotal * 0.11
    const totalValue = subtotal + taxAmount
    const normalizedStatus = normalizeStatus(status || 'DRAFT')

    const { data: poData, error: poError } = await supabase
      .from('tr_purchase_order')
      .insert({
        po_id: poNumber,
        pr_id: prId,
        supplier_id: supplierCode,
        quotation_id: quotationId,
        approved_by: null,
        total_value: totalValue,
        status: denormalizeStatus(normalizedStatus),
        rejection_reason: null,
        created_at: poDate || new Date().toISOString(),
        po_release_date:
          normalizedStatus === 'RELEASED' ||
          normalizedStatus === 'APPROVED' ||
          normalizedStatus === 'COMPLETED'
            ? new Date().toISOString()
            : null,
      })
      .select('po_id')
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
      const productCode = item.productSku || item.productCode

      const { data: productData, error: productError } = await supabase
        .from('ms_product')
        .select('product_id, uom')
        .eq('product_id', productCode)
        .maybeSingle()

      if (productError || !productData) {
        return NextResponse.json(
          {
            message: `Product SKU ${productCode} not found`,
            error:
              productError?.message || `Product ${productCode} does not exist`,
          },
          { status: 404 }
        )
      }

      const qty = Number(item.qty || 0)
      const unitPrice = Number(item.unitPrice || 0)

      poItemsPayload.push({
        po_id: poData.po_id,
        product_id: productData.product_id,
        qty_order: qty,
        unit_price: unitPrice,
        subtotal: qty * unitPrice,
      })
    }

    const { error: poItemsError } = await supabase
      .from('tr_po_detail')
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
        id: poData.po_id,
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
export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    const { poNo, poId, status } = body

    const targetPO = poId || poNo

    if (!targetPO) {
      return NextResponse.json(
        {
          message: 'PO number is required',
        },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        {
          message: 'Status is required',
        },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, any> = {
      status,
    }

    if (status === 'RELEASED') {
      updatePayload.po_release_date = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('tr_purchase_order')
      .update(updatePayload)
      .eq('po_id', targetPO)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to update purchase order status',
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Purchase order status updated successfully',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while updating purchase order status',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}