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

  if (['PROPOSED', 'PENDING', 'WAITING_RESPONSE'].includes(status)) {
    return 'SENT'
  }

  if (['COUNTERED', 'NEGOTIATION'].includes(status)) {
    return 'COUNTERED'
  }

  if (['ACCEPTED', 'APPROVED', 'AGREED'].includes(status)) {
    return 'AGREED'
  }

  if (['REJECTED', 'CANCELLED'].includes(status)) {
    return 'REJECTED'
  }

  return status || 'SENT'
}

function denormalizeStatus(value?: string | null) {
  const status = String(value || '').toUpperCase()

  if (status === 'SENT') return 'PROPOSED'
  if (status === 'COUNTERED') return 'PROPOSED'
  if (status === 'AGREED') return 'ACCEPTED'
  if (status === 'REJECTED') return 'REJECTED'

  return status || 'PROPOSED'
}

export async function GET() {
  try {
    const [
      quotationResult,
      supplierResult,
      productResult,
      supplierPriceResult,
    ] = await Promise.all([
      supabase
        .from('tr_price_quotation')
        .select(`
          quotation_id,
          supplier_id,
          product_id,
          negotiated_by,
          proposed_price,
          accepted_price,
          final_price,
          qty_requested,
          status,
          quotation_date,
          expiry_date,
          notes
        `)
        .order('quotation_date', { ascending: false }),

      supabase
        .from('ms_supplier')
        .select('supplier_id, supplier_name, contact, address'),

      supabase
        .from('ms_product')
        .select('product_id, product_name, category, uom'),

      supabase
        .from('ms_supplier_price')
        .select('supplier_price_id, supplier_id, product_id, unit_price_estimate, uom'),
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
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    const quotations = quotationResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const supplierPrices = supplierPriceResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const referencePriceMap = new Map<string, number>()

    supplierPrices.forEach((price: any) => {
      const key = `${price.supplier_id}-${price.product_id}`
      referencePriceMap.set(key, Number(price.unit_price_estimate || 0))
    })

    const negotiations = quotations.map((item: any) => {
      const supplier = supplierMap.get(item.supplier_id)
      const product = productMap.get(item.product_id)
      const referenceKey = `${item.supplier_id}-${item.product_id}`
      const referencePrice = referencePriceMap.get(referenceKey) || 0

      return {
        id: item.quotation_id,
        negotiationNo: item.quotation_id,

        rfqNo: item.quotation_id,
        rfqStatus: normalizeStatus(item.status),
        quotationDeadline: item.expiry_date || null,
        specificationNotes: item.notes || '-',

        supplierId: supplier?.supplier_id || item.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        supplierContact: supplier?.contact || '-',
        supplierAddress: supplier?.address || '-',

        productCode: product?.product_id || item.product_id || '-',
        productName: product?.product_name || '-',
        category: product?.category || '-',

        referencePrice,
        proposedPrice: Number(item.proposed_price || 0),
        supplierResponsePrice: Number(item.accepted_price || 0),
        finalPrice: Number(item.final_price || item.accepted_price || 0),
        qty: Number(item.qty_requested || 0),
        unit: product?.uom || '-',
        confirmationDeadline: item.expiry_date || null,
        status: normalizeStatus(item.status),
        notes: item.notes || '-',
        createdAt: item.quotation_date || null,
      }
    })

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
      .select('product_id, uom')
      .eq('product_id', productSku)
      .maybeSingle()

    if (productError || !productData) {
      return NextResponse.json(
        {
          message: 'Product SKU not found',
          error: productError?.message || `Product ${productSku} does not exist`,
        },
        { status: 404 }
      )
    }

    const { data: existingNegotiation } = await supabase
      .from('tr_price_quotation')
      .select('quotation_id')
      .eq('quotation_id', negotiationNumber)
      .maybeSingle()

    if (existingNegotiation) {
      return NextResponse.json(
        {
          message: 'Negotiation number already exists',
        },
        { status: 409 }
      )
    }

    const acceptedPrice =
      supplierResponsePrice === undefined || supplierResponsePrice === ''
        ? null
        : Number(supplierResponsePrice)

    const insertedFinalPrice =
      finalPrice === undefined || finalPrice === ''
        ? acceptedPrice
        : Number(finalPrice)

    const { data: negotiationData, error: negotiationError } = await supabase
      .from('tr_price_quotation')
      .insert({
        quotation_id: negotiationNumber,
        supplier_id: supplierCode,
        product_id: productSku,
        proposed_price: Number(proposedPrice || referencePrice || 0),
        accepted_price: acceptedPrice,
        final_price: insertedFinalPrice,
        qty_requested: Number(qty || 0),
        status: denormalizeStatus(status),
        quotation_date: new Date().toISOString(),
        expiry_date: confirmationDeadline || null,
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
      updatePayload.accepted_price =
        supplierResponsePrice === '' ? null : Number(supplierResponsePrice)
    }

    if (finalPrice !== undefined) {
      updatePayload.final_price = finalPrice === '' ? null : Number(finalPrice)
    }

    if (status) {
      updatePayload.status = denormalizeStatus(status)
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