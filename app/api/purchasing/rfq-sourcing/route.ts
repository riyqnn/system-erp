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

  if (['NEGOTIATION', 'COUNTERED'].includes(status)) {
    return 'NEGOTIATION'
  }

  if (['AGREED', 'ACCEPTED', 'APPROVED'].includes(status)) {
    return 'AGREED'
  }

  if (['REJECTED', 'DECLINED'].includes(status)) {
    return 'REJECTED'
  }

  return status || 'WAITING_RESPONSE'
}

function generateRFQNo(quotationId: string) {
  if (!quotationId) return '-'

  return String(quotationId).startsWith('RFQ-')
    ? quotationId
    : `RFQ-${quotationId}`
}

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
          error: errors[0]?.message,
        },
        { status: 500 }
      )
    }

    const quotations = quotationResult.data || []
    const suppliers = supplierResult.data || []
    const products = productResult.data || []
    const purchaseRequisitions = prResult.data || []
    const prDetails = prDetailResult.data || []
    const users = userResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const userMap = new Map(users.map((user: any) => [user.user_id, user]))

    const prMap = new Map(
      purchaseRequisitions.map((pr: any) => [pr.pr_id, pr])
    )

    const prByProduct = new Map<string, any>()

    prDetails.forEach((detail: any) => {
      const productId = detail.product_id
      const pr = prMap.get(detail.pr_id)

      if (productId && pr && !prByProduct.has(productId)) {
        prByProduct.set(productId, {
          ...pr,
          detail,
        })
      }
    })

    const rfqSourcing = quotations.map((item: any) => {
      const supplier = supplierMap.get(item.supplier_id)
      const product = productMap.get(item.product_id)
      const relatedPR = prByProduct.get(item.product_id)
      const requester = relatedPR ? userMap.get(relatedPR.requested_by) : null

      return {
        id: String(item.quotation_id),
        rfqNo: generateRFQNo(String(item.quotation_id)),
        requiredQty: Number(item.qty_requested || 0),
        unit: product?.uom || '-',

        productCode: product?.product_id || item.product_id || '-',
        productName: product?.product_name || '-',
        category: product?.category || '-',

        prNo: relatedPR?.pr_id || '-',
        requestDate: relatedPR?.request_date || relatedPR?.created_at || null,
        requestedBy:
          requester?.full_name || requester?.username || 'Inventory Staff',
        department: requester?.role || 'Inventory',

        supplierId: supplier?.supplier_id || item.supplier_id || '-',
        supplierName: supplier?.supplier_name || '-',
        candidateSupplierName: supplier?.supplier_name || '-',
        picName: supplier?.contact || '-',
        email: supplier?.contact || '-',
        phone: supplier?.contact || '-',
        address: supplier?.address || '-',

        quotationDeadline: item.expiry_date || null,
        specificationNotes: item.notes || '-',
        status: normalizeStatus(item.status),
        createdAt: item.quotation_date || null,

        proposedPrice: Number(item.proposed_price || 0),
        acceptedPrice: Number(item.accepted_price || 0),
        finalPrice: Number(item.final_price || 0),
      }
    })

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
      status,
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