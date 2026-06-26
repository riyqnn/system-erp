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

function generateQuotationId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const random = String(Date.now()).slice(-5)

  return `RFQ-${year}${month}-${random}`
}

function createProductIdFromName(productName?: string | null) {
  const cleanName = String(productName || 'PRODUCT')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)

  return `AUTO-${cleanName || 'PRODUCT'}-${String(Date.now()).slice(-4)}`
}

async function resolveProduct(params: {
  productSku?: string
  productName?: string
  category?: string
  unit?: string
}) {
  const productSku = String(params.productSku || '').trim()
  const productName = String(params.productName || '').trim()
  const category = String(params.category || '-').trim()
  const unit = String(params.unit || '-').trim()

  if (productSku && productSku !== '-') {
    const { data: productById, error: productByIdError } = await supabase
      .from('ms_product')
      .select('product_id, product_name, category, uom')
      .eq('product_id', productSku)
      .maybeSingle()

    if (productByIdError) {
      throw new Error(productByIdError.message)
    }

    if (productById) {
      return productById
    }
  }

  if (productName && productName !== '-') {
    const { data: productByName, error: productByNameError } = await supabase
      .from('ms_product')
      .select('product_id, product_name, category, uom')
      .ilike('product_name', productName)
      .limit(1)
      .maybeSingle()

    if (productByNameError) {
      throw new Error(productByNameError.message)
    }

    if (productByName) {
      return productByName
    }
  }

  const newProductId =
    productSku && productSku !== '-' ? productSku : createProductIdFromName(productName)

  const { data: createdProduct, error: createProductError } = await supabase
    .from('ms_product')
    .insert({
      product_id: newProductId,
      product_name: productName || newProductId,
      category: category || '-',
      uom: unit || '-',
    })
    .select('product_id, product_name, category, uom')
    .single()

  if (createProductError) {
    throw new Error(
      `Product not found and failed to create product master: ${createProductError.message}`
    )
  }

  return createdProduct
}

async function resolveSupplier(params: {
  supplierCode?: string
  candidateSupplierName?: string
}) {
  const supplierCode = String(params.supplierCode || '').trim()
  const candidateSupplierName = String(params.candidateSupplierName || '').trim()

  if (supplierCode && supplierCode !== '-') {
    const { data: supplierById, error: supplierByIdError } = await supabase
      .from('ms_supplier')
      .select('supplier_id, supplier_name, contact, address')
      .eq('supplier_id', supplierCode)
      .maybeSingle()

    if (supplierByIdError) {
      throw new Error(supplierByIdError.message)
    }

    if (supplierById) {
      return supplierById
    }
  }

  if (candidateSupplierName && candidateSupplierName !== '-') {
    const { data: supplierByName, error: supplierByNameError } = await supabase
      .from('ms_supplier')
      .select('supplier_id, supplier_name, contact, address')
      .ilike('supplier_name', candidateSupplierName)
      .limit(1)
      .maybeSingle()

    if (supplierByNameError) {
      throw new Error(supplierByNameError.message)
    }

    if (supplierByName) {
      return supplierByName
    }
  }

  throw new Error(
    `Supplier ${supplierCode || candidateSupplierName || '-'} does not exist in supplier master`
  )
}

export async function GET() {
  try {
    const [
      quotationResult,
      supplierResult,
      productResult,
      prResult,
      prDetailResult,
      userResult,
    ] = await Promise.all([
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

      supabase
        .from('tr_purchase_requisition')
        .select('pr_id, requested_by, request_date, status, notes, created_at'),

      supabase
      .from('tr_pr_detail')
      .select('*'),

      supabase
        .from('ms_user')
        .select('user_id, username, full_name, email, role'),
    ])

    const errors = [
      quotationResult.error,
      supplierResult.error,
      productResult.error,
      prResult.error,
      prDetailResult.error,
      userResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch RFQ sourcing data',
          error: errors[0] instanceof Error ? errors[0].message : String(errors[0]),
        },
        { status: 500 }
      )
    }

    const rfqSourcing = (quotationResult.data || []).map((item: AnyObject) => ({
      id: item.id,
      rfqNo: item.rfq_number,
      requiredQty: item.required_qty || 0,
      unit: item.unit || item.products?.unit || '-',

      productCode: item.products?.sku || '-',
      productName: item.products?.name || '-',
      category: item.products?.category || '-',

      prNo: item.purchasing_purchase_requisitions?.pr_number || '-',
      requestDate: item.purchasing_purchase_requisitions?.request_date || null,
      requestedBy:
        item.purchasing_purchase_requisitions?.requested_by_name || '-',
      department: item.purchasing_purchase_requisitions?.department || '-',

      supplierId: item.ms_suppliers?.supplier_code || '-',
      supplierName:
        item.ms_suppliers?.supplier_name ||
        item.candidate_supplier_name ||
        '-',
      candidateSupplierName: item.candidate_supplier_name || '-',
      picName: item.pic_name || '-',
      email: item.email || item.ms_suppliers?.contact || '-',
      phone: item.phone || '-',
      address: item.address || item.ms_suppliers?.address || '-',

      quotationDeadline: item.quotation_deadline,
      specificationNotes: item.specification_notes || '-',
      status: item.status,
      createdAt: item.created_at,
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
      prNumber,
      productSku,
      productName,
      category,
      unit,
      requiredQty,
      supplierCode,
      candidateSupplierName,
      quotationDeadline,
      specificationNotes,
      proposedPrice,
    } = body

    if (!requiredQty || Number(requiredQty) <= 0) {
      return NextResponse.json(
        {
          message: 'Required quantity is required',
        },
        { status: 400 }
      )
    }

    if (!supplierCode && !candidateSupplierName) {
      return NextResponse.json(
        {
          message: 'Supplier is required',
        },
        { status: 400 }
      )
    }

    const productData = await resolveProduct({
      productSku,
      productName,
      category,
      unit,
    })

    const supplierData = await resolveSupplier({
      supplierCode,
      candidateSupplierName,
    })

    const quotationId = rfqNumber || generateQuotationId()

    const notes = [
      specificationNotes || '',
      prNumber ? `PR Reference: ${prNumber}` : '',
    ]
      .filter(Boolean)
      .join(' | ')

    const { data: quotationData, error: quotationError } = await supabase
      .from('tr_price_quotation')
      .insert({
        quotation_id: quotationId,
        supplier_id: supplierData.supplier_id,
        product_id: productData.product_id,
        proposed_price: Number(proposedPrice || 0),
        accepted_price: null,
        final_price: null,
        qty_requested: Number(requiredQty || 0),
        quotation_date: new Date().toISOString(),
        expiry_date: quotationDeadline || null,
        notes: notes || 'RFQ created from purchasing sourcing page',
      })
      .select()
      .single()

    if (quotationError) {
      return NextResponse.json(
        {
          message: 'Failed to save RFQ sourcing data',
          error: quotationError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'RFQ sourcing data saved successfully',
      data: quotationData,
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