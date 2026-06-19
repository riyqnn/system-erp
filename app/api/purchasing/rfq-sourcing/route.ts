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
    return 'WAITING_RESPONSE'
  }

  if (['ACCEPTED', 'APPROVED', 'AGREED'].includes(status)) {
    return 'RESPONDED'
  }

  if (['REJECTED', 'CANCELLED'].includes(status)) {
    return 'CANCELLED'
  }

  return status || 'WAITING_RESPONSE'
}

export async function GET() {
  try {
    const { data, error } = await supabase
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
        notes,
        ms_supplier (
          supplier_id,
          supplier_name,
          contact,
          address,
          lead_time,
          top,
          status
        ),
        ms_product (
          product_id,
          product_name,
          category,
          uom
        ),
        ms_user (
          user_id,
          username,
          full_name,
          email,
          role
        )
      `)
      .order('quotation_date', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch RFQ sourcing data',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const rfqSourcing = (data || []).map((item: any) => ({
      id: item.quotation_id,
      rfqNo: item.quotation_id,
      requiredQty: Number(item.qty_requested || 0),
      unit: item.ms_product?.uom || '-',

      productCode: item.ms_product?.product_id || item.product_id || '-',
      productName: item.ms_product?.product_name || '-',
      category: item.ms_product?.category || '-',

      prNo: '-',
      requestDate: item.quotation_date || null,
      requestedBy:
        item.ms_user?.full_name || item.ms_user?.username || 'Purchasing Staff',
      department: item.ms_user?.role || 'Purchasing',

      supplierId: item.ms_supplier?.supplier_id || item.supplier_id || '-',
      supplierName: item.ms_supplier?.supplier_name || '-',
      candidateSupplierName: item.ms_supplier?.supplier_name || '-',
      picName: item.ms_supplier?.contact || '-',
      email: item.ms_supplier?.contact || '-',
      phone: item.ms_supplier?.contact || '-',
      address: item.ms_supplier?.address || '-',

      quotationDeadline: item.expiry_date || null,
      specificationNotes: item.notes || '-',
      status: normalizeStatus(item.status),
      createdAt: item.quotation_date || null,

      proposedPrice: Number(item.proposed_price || 0),
      acceptedPrice: Number(item.accepted_price || 0),
      finalPrice: Number(item.final_price || 0),
    }))

    return NextResponse.json({
      message: 'RFQ sourcing data fetched successfully',
      data: rfqSourcing,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching RFQ sourcing data',
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
      rfqNumber,
      productSku,
      requiredQty,
      supplierCode,
      candidateSupplierName,
      quotationDeadline,
      specificationNotes,
      status,
    } = body

    if (!rfqNumber || !productSku || !requiredQty) {
      return NextResponse.json(
        {
          message: 'RFQ number, product SKU, and required quantity are required',
        },
        { status: 400 }
      )
    }

    const { data: productData, error: productError } = await supabase
      .from('ms_product')
      .select('product_id, product_name, uom, category')
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

    let selectedSupplierId = supplierCode || null

    if (!selectedSupplierId && candidateSupplierName) {
      const { data: supplierData } = await supabase
        .from('ms_supplier')
        .select('supplier_id')
        .ilike('supplier_name', candidateSupplierName)
        .maybeSingle()

      selectedSupplierId = supplierData?.supplier_id || null
    }

    if (!selectedSupplierId) {
      return NextResponse.json(
        {
          message: 'Supplier is required',
        },
        { status: 400 }
      )
    }

    const { data: supplierData, error: supplierError } = await supabase
      .from('ms_supplier')
      .select('supplier_id')
      .eq('supplier_id', selectedSupplierId)
      .maybeSingle()

    if (supplierError || !supplierData) {
      return NextResponse.json(
        {
          message: 'Supplier not found',
          error:
            supplierError?.message ||
            `Supplier ${selectedSupplierId} does not exist`,
        },
        { status: 404 }
      )
    }

    const { data: existingQuotation } = await supabase
      .from('tr_price_quotation')
      .select('quotation_id')
      .eq('quotation_id', rfqNumber)
      .maybeSingle()

    if (existingQuotation) {
      return NextResponse.json(
        {
          message: 'RFQ number already exists',
        },
        { status: 409 }
      )
    }

    const { data: rfqData, error: rfqError } = await supabase
      .from('tr_price_quotation')
      .insert({
        quotation_id: rfqNumber,
        supplier_id: selectedSupplierId,
        product_id: productSku,
        proposed_price: 0,
        accepted_price: null,
        final_price: null,
        qty_requested: Number(requiredQty || 0),
        status: status || 'PROPOSED',
        quotation_date: new Date().toISOString(),
        expiry_date: quotationDeadline || null,
        notes: specificationNotes || null,
      })
      .select()
      .single()

    if (rfqError) {
      return NextResponse.json(
        {
          message: 'Failed to save RFQ sourcing data',
          error: rfqError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'RFQ sourcing data saved successfully',
      data: rfqData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving RFQ sourcing data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}