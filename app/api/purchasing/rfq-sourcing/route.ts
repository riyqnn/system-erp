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

export async function GET() {
  try {
    const [
      quotationResult,
      supplierResult,
      productResult,
      prResult,
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
        .from('ms_user')
        .select('user_id, username, full_name, email, role'),
    ])

    const errors = [
      quotationResult.error,
      supplierResult.error,
      productResult.error,
      prResult.error,
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
    const users = userResult.data || []

    const supplierMap = new Map(
      suppliers.map((supplier: any) => [supplier.supplier_id, supplier])
    )

    const productMap = new Map(
      products.map((product: any) => [product.product_id, product])
    )

    const userMap = new Map(users.map((user: any) => [user.user_id, user]))

    const prByProduct = new Map<string, any>()

    purchaseRequisitions.forEach((pr: any) => {
      const productId = pr.product_id || pr.product_code
      if (productId && !prByProduct.has(productId)) {
        prByProduct.set(productId, pr)
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
      productSku,
      requiredQty,
      supplierCode,
      candidateSupplierName,
      quotationDeadline,
      specificationNotes,
      status,
      proposedPrice,
    } = body

    if (!productSku || !requiredQty || !supplierCode) {
      return NextResponse.json(
        {
          message: 'Product SKU, required quantity, and supplier code are required',
        },
        { status: 400 }
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

    const quotationId =
      rfqNumber ||
      `QTN-${new Date().getFullYear()}${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}-${String(Date.now()).slice(-5)}`

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
        status: status || 'WAITING_RESPONSE',
        quotation_date: new Date().toISOString(),
        expiry_date: quotationDeadline || null,
        notes:
          specificationNotes ||
          candidateSupplierName ||
          'RFQ created from purchasing sourcing page',
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