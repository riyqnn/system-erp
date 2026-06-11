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
      .from('purchasing_price_negotiations')
      .select(`
        id,
        negotiation_number,
        reference_price,
        proposed_price,
        supplier_response_price,
        final_price,
        qty,
        unit,
        confirmation_deadline,
        status,
        notes,
        created_at,
        purchasing_rfq_sourcing (
          id,
          rfq_number,
          quotation_deadline,
          specification_notes,
          status
        ),
        ms_suppliers (
          supplier_id,
          supplier_code,
          supplier_name,
          contact,
          address
        ),
        products (
          id,
          sku,
          name,
          category,
          unit
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch price negotiations',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const negotiations = (data || []).map((item: any) => ({
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
      rfqNumber,
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

    if (!negotiationNumber || !supplierCode || !productSku) {
      return NextResponse.json(
        {
          message:
            'Negotiation number, supplier code, and product SKU are required',
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

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, unit')
      .eq('sku', productSku)
      .single()

    if (productError || !productData) {
      return NextResponse.json(
        {
          message: 'Product SKU not found',
          error: productError?.message,
        },
        { status: 404 }
      )
    }

    let rfqId = null

    if (rfqNumber) {
      const { data: rfqData } = await supabase
        .from('purchasing_rfq_sourcing')
        .select('id')
        .eq('rfq_number', rfqNumber)
        .maybeSingle()

      rfqId = rfqData?.id || null
    }

    const { data: negotiationData, error: negotiationError } = await supabase
      .from('purchasing_price_negotiations')
      .insert({
        negotiation_number: negotiationNumber,
        rfq_id: rfqId,
        supplier_id: supplierData.supplier_id,
        product_id: productData.id,
        reference_price: Number(referencePrice || 0),
        proposed_price: Number(proposedPrice || 0),
        supplier_response_price:
          supplierResponsePrice === undefined || supplierResponsePrice === ''
            ? null
            : Number(supplierResponsePrice),
        final_price:
          finalPrice === undefined || finalPrice === ''
            ? null
            : Number(finalPrice),
        qty: Number(qty || 0),
        unit: productData.unit || '-',
        confirmation_deadline: confirmationDeadline || null,
        status: status || 'SENT',
        notes: notes || null,
      })
      .select()
      .single()

    if (negotiationError) {
      return NextResponse.json(
        {
          message: 'Failed to save price negotiation',
          error: negotiationError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Price negotiation saved successfully',
      data: negotiationData,
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

    const updatePayload: Record<string, any> = {}

    if (supplierResponsePrice !== undefined) {
      updatePayload.supplier_response_price =
        supplierResponsePrice === '' ? null : Number(supplierResponsePrice)
    }

    if (finalPrice !== undefined) {
      updatePayload.final_price = finalPrice === '' ? null : Number(finalPrice)
    }

    if (status) {
      updatePayload.status = status
    }

    if (notes !== undefined) {
      updatePayload.notes = notes
    }

    updatePayload.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('purchasing_price_negotiations')
      .update(updatePayload)
      .eq('negotiation_number', negotiationNumber)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to update price negotiation',
          error: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Price negotiation updated successfully',
      data,
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