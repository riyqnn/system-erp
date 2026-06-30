import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    const [supplierPriceResult, supplierResult, productResult] =
      await Promise.all([
        supabase.from('ms_supplier_price').select('*'),
        supabase
          .from('ms_supplier')
          .select('supplier_id, supplier_name, contact, address, lead_time, top, status'),
        supabase
          .from('ms_product')
          .select('product_id, product_name, category, uom'),
      ])

    const errors = [
      supplierPriceResult.error,
      supplierResult.error,
      productResult.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: 'Failed to fetch suppliers',
          error: errors[0] instanceof Error ? errors[0].message : String(errors[0]),
        },
        { status: 500 }
      )
    }

    const supplierPrices = supplierPriceResult.data || []
    const products = productResult.data || []
    
    const priceMap = new Map()
    supplierPrices.forEach((sp: { supplier_id: string; product_id: string; unit_price_estimate: number; uom: string; [key: string]: unknown }) => {
      if (!priceMap.has(sp.supplier_id)) priceMap.set(sp.supplier_id, sp)
    })
    
    const productMap = new Map()
    products.forEach((p: { product_id: string; product_name: string; category: string; uom: string; [key: string]: unknown }) => productMap.set(p.product_id, p))

    const suppliers = (supplierResult.data || []).map((item: { supplier_id: string; supplier_name: string; contact: string; address: string; lead_time: string; top: string; status: string; [key: string]: unknown }) => {
      const sp = priceMap.get(item.supplier_id)
      const p = sp ? productMap.get(sp.product_id) : null

      return {
        id: item.supplier_id,
        supplierId: item.supplier_id || '-',
        supplierName: item.supplier_name || '-',
        contact: item.contact || '-',
        address: item.address || '-',
        productCode: p?.product_id || '-',
        product: p?.product_name || '-',
        category: p?.category || '-',
        unit: p?.uom || sp?.uom || '-',
        estimatedPrice: sp?.unit_price_estimate || 0,
        leadTime: item.lead_time || 0,
        termOfPayment: item.top || '-',
        status: item.status || 'ACTIVE',
      }
    })

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    
    const total = suppliers.length
    const paginatedData = suppliers.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      message: 'Suppliers fetched successfully',
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching suppliers',
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
      supplierCode,
      supplierName,
      contact,
      address,
      productSku,
      estimatedPrice,
      leadTimeDays,
      paymentTerm,
      status,
    } = body

    if (!supplierCode || !supplierName || !productSku) {
      return NextResponse.json(
        {
          message: 'Supplier code, supplier name, and product SKU are required',
        },
        { status: 400 }
      )
    }

    const { error: supplierError } = await supabase
      .from('ms_supplier')
      .upsert(
        {
          supplier_id: supplierCode,
          supplier_name: supplierName,
          contact: contact || null,
          address: address || null,
          lead_time: Number(leadTimeDays || 0),
          top: paymentTerm || 'NET_30',
          status: status || 'ACTIVE',
        },
        {
          onConflict: 'supplier_id',
        }
      )

    if (supplierError) {
      return NextResponse.json(
        {
          message: 'Failed to save supplier',
          error: supplierError.message,
        },
        { status: 500 }
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

    const { data: supplierPriceData, error: supplierPriceError } =
      await supabase
        .from('ms_supplier_price')
        .upsert(
          {
            supplier_id: supplierCode,
            product_id: productData.product_id,
            estimated_price: Number(estimatedPrice || 0),
            lead_time_days: Number(leadTimeDays || 0),
            payment_term: paymentTerm || 'NET_30',
            status: status || 'ACTIVE',
          },
          {
            onConflict: 'supplier_id,product_id',
          }
        )
        .select()
        .single()

    if (supplierPriceError) {
      return NextResponse.json(
        {
          message: 'Failed to save supplier price profile',
          error: supplierPriceError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Supplier saved successfully',
      data: supplierPriceData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving supplier',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}