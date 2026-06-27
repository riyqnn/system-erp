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

  if (['WAITING_RESPONSE', 'WAITING', 'PENDING'].includes(status)) {
    return 'WAITING_RESPONSE'
  }

  if (['RESPONDED', 'SUBMITTED'].includes(status)) {
    return 'RESPONDED'
  }

  if (['NEGOTIATION', 'COUNTERED', 'SENT'].includes(status)) {
    return 'NEGOTIATION'
  }

  if (['AGREED', 'ACCEPTED', 'APPROVED'].includes(status)) {
    return 'AGREED'
  }

  if (['REJECTED', 'DECLINED'].includes(status)) {
    return 'REJECTED'
  }

  return status || 'NEGOTIATION'
}

function generatePONumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = String(Date.now()).slice(-5)

  return `PO-${year}${month}-${random}`
}

async function createPurchaseOrderFromNegotiation(quotationId: string, quotation: AnyObject) {
  const { data: existingPO, error: existingPOError } = await supabase
    .from('tr_purchase_order')
    .select('po_id')
    .eq('quotation_id', quotationId)
    .maybeSingle()

  if (existingPOError) {
    throw new Error(existingPOError.message)
  }

  if (existingPO) {
    return {
      poCreated: false,
      poId: existingPO.po_id,
      message: 'Purchase Order already exists for this approved negotiation',
    }
  }

  const supplierId = quotation.supplier_id
  const productId = quotation.product_id
  const qty = Number(quotation.qty_requested || 0)
  const unitPrice = Number(
    quotation.final_price ||
      quotation.accepted_price ||
      quotation.proposed_price ||
      0
  )

  if (!supplierId || !productId || qty <= 0 || unitPrice <= 0) {
    throw new Error(
      'Cannot generate PO because supplier, product, quantity, or final price is incomplete'
    )
  }

  const subtotal = qty * unitPrice
  const taxAmount = subtotal * 0.11
  const totalValue = subtotal + taxAmount
  const poNumber = generatePONumber()

  const { data: poData, error: poError } = await supabase
    .from('tr_purchase_order')
    .insert({
      po_id: poNumber,
      pr_id: null,
      supplier_id: supplierId,
      quotation_id: quotationId,
      approved_by: null,
      total_value: totalValue,
      status: 'APPROVED',
      rejection_reason: null,
      created_at: new Date().toISOString(),
      po_release_date: new Date().toISOString(),
    })
    .select('po_id')
    .single()

  if (poError || !poData) {
    throw new Error(poError?.message || 'Failed to create purchase order')
  }

  const { error: poDetailError } = await supabase.from('tr_po_detail').insert({
    po_id: poData.po_id,
    product_id: productId,
    qty_order: qty,
    unit_price: unitPrice,
    subtotal,
  })

  if (poDetailError) {
    throw new Error(poDetailError.message)
  }

  return {
    poCreated: true,
    poId: poData.po_id,
    message: 'Purchase Order generated successfully from approved negotiation',
  }
}

export async function GET() {
  try {
    const [quotationResult, supplierResult, productResult, supplierPriceResult] =
      await Promise.all([
        supabase
          .from('tr_price_quotation')
          .select(
            'quotation_id, supplier_id, product_id, proposed_price, accepted_price, final_price, qty_requested, status, quotation_date, expiry_date, notes'
          )
          .order('quotation_date', { ascending: false }),

        supabase
          .from('ms_supplier')
          .select('supplier_id, supplier_name, contact, address, lead_time, top, status'),

        supabase
          .from('ms_product')
          .select('product_id, product_name, category, uom'),

        supabase.from('ms_supplier_price').select('*'),
      ])

    const errors = [
      quotationResult.error,
      supplierResult.error,
      productResult.error,
      supplierPriceResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch price negotiations',
          error: errors[0] instanceof Error ? errors[0].message : String(errors[0]),
        },
        { status: 500 }
      )
    }

    const negotiations = (quotationResult.data || []).map((item: AnyObject) => ({
      id: item.id,
      negotiationNo: item.negotiation_number,

      rfqNo: item.purchasing_rfq_sourcing?.rfq_number || '-',
      rfqStatus: item.purchasing_rfq_sourcing?.status || '-',
      quotationDeadline:
        item.purchasing_rfq_sourcing?.quotation_deadline || null,
      specificationNotes:
        item.purchasing_rfq_sourcing?.specification_notes || '-',

      supplierId: item.ms_suppliers?.supplier_code || '-',
      supplierName: item.ms_suppliers?.supplier_name || '-',
      supplierContact: item.ms_suppliers?.contact || '-',
      supplierAddress: item.ms_suppliers?.address || '-',

      productCode: item.products?.sku || '-',
      productName: item.products?.name || '-',
      category: item.products?.category || '-',

      referencePrice: item.reference_price || 0,
      proposedPrice: item.proposed_price || 0,
      supplierResponsePrice: item.supplier_response_price || 0,
      finalPrice: item.final_price || 0,
      qty: item.qty || 0,
      unit: item.unit || item.products?.unit || '-',
      confirmationDeadline: item.confirmation_deadline,
      status: item.status,
      notes: item.notes || '-',
      createdAt: item.created_at,
    }))

    return NextResponse.json({
      message: 'Price negotiations fetched successfully',
      data: negotiations,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching price negotiations',
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
      negotiationNumber,
      supplierCode,
      productSku,
      referencePrice,
      proposedPrice,
      supplierResponsePrice,
      finalPrice,
      qty,
      confirmationDeadline,
      status,
      notes,
    } = body

    if (!supplierCode || !productSku) {
      return NextResponse.json(
        {
          message: 'Supplier code and product SKU are required',
        },
        { status: 400 }
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

    const { data: productData, error: productError } = await supabase
      .from('ms_product')
      .select('product_id')
      .eq('product_id', productSku)
      .maybeSingle()

    if (productError || !productData) {
      return NextResponse.json(
        {
          message: 'Product SKU not found',
          error:
            productError?.message || `Product ${productSku} does not exist`,
        },
        { status: 404 }
      )
    }

    const quotationId =
      negotiationNumber ||
      `NEG-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}-${String(Date.now()).slice(-5)}`

    const { data: quotationData, error: quotationError } = await supabase
      .from('tr_price_quotation')
      .insert({
        quotation_id: quotationId,
        supplier_id: supplierData.supplier_id,
        product_id: productData.product_id,
        proposed_price: Number(proposedPrice || referencePrice || 0),
        accepted_price:
          supplierResponsePrice === undefined || supplierResponsePrice === ''
            ? null
            : Number(supplierResponsePrice),
        final_price:
          finalPrice === undefined || finalPrice === ''
            ? null
            : Number(finalPrice),
        qty_requested: Number(qty || 0),
        status: status ? normalizeStatus(status) : 'NEGOTIATION',
        quotation_date: new Date().toISOString(),
        expiry_date: confirmationDeadline || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (quotationError) {
      return NextResponse.json(
        {
          message: 'Failed to save price negotiation',
          error: quotationError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Price negotiation saved successfully',
      data: quotationData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving price negotiation',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    const {
      negotiationNumber,
      supplierResponsePrice,
      finalPrice,
      status,
      notes,
    } = body

    if (!negotiationNumber) {
      return NextResponse.json(
        {
          message: 'Negotiation number is required',
        },
        { status: 400 }
      )
    }

    const updatePayload: AnyObject = {}

    if (supplierResponsePrice !== undefined) {
      updatePayload.accepted_price =
        supplierResponsePrice === '' ? null : Number(supplierResponsePrice)
    }

    if (finalPrice !== undefined) {
      updatePayload.final_price = finalPrice === '' ? null : Number(finalPrice)
    }

    if (status) {
      updatePayload.status = normalizeStatus(status)
    }

    if (notes !== undefined) {
      updatePayload.notes = notes
    }

    const { data, error } = await supabase
      .from('tr_price_quotation')
      .update(updatePayload)
      .eq('quotation_id', negotiationNumber)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to update price negotiation',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

    let generatedPO = null
    const normalizedStatus = normalizeStatus(data?.status)

    if (normalizedStatus === 'AGREED') {
      try {
        generatedPO = await createPurchaseOrderFromNegotiation(negotiationNumber, data)
      } catch (poError) {
        return NextResponse.json(
          {
            message:
              'Price negotiation updated, but failed to generate purchase order',
            data,
            error:
              poError instanceof Error
                ? poError.message
                : 'Unknown purchase order error',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message:
        generatedPO?.poCreated
          ? 'Price negotiation approved and purchase order generated successfully'
          : 'Price negotiation updated successfully',
      data,
      generatedPO,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while updating price negotiation',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}