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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('purchasing_supplier_products')
      .select(`
        id,
        estimated_price,
        lead_time_days,
        payment_term,
        status,
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
          message: 'Failed to fetch suppliers',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

    const suppliers = (data || []).map((item: AnyObject) => ({
      id: item.id,
      supplierId: item.ms_suppliers?.supplier_code || '-',
      supplierName: item.ms_suppliers?.supplier_name || '-',
      contact: item.ms_suppliers?.contact || '-',
      address: item.ms_suppliers?.address || '-',
      productCode: item.products?.sku || '-',
      product: item.products?.name || '-',
      category: item.products?.category || '-',
      unit: item.products?.unit || '-',
      estimatedPrice: item.estimated_price || 0,
      leadTime: item.lead_time_days || 0,
      termOfPayment: item.payment_term || '-',
      status: item.status || 'ACTIVE',
    }))

    return NextResponse.json({
      message: 'Suppliers fetched successfully',
      data: suppliers,
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

    const { data: supplierData, error: supplierError } = await supabase
      .from('ms_suppliers')
      .upsert(
        {
          supplier_code: supplierCode,
          supplier_name: supplierName,
          contact: contact || null,
          address: address || null,
        },
        {
          onConflict: 'supplier_code',
        }
      )
      .select('supplier_id')
      .single()

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
      .from('products')
      .select('id')
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

    const { data: supplierProductData, error: supplierProductError } =
      await supabase
        .from('purchasing_supplier_products')
        .upsert(
          {
            supplier_id: supplierData.supplier_id,
            product_id: productData.id,
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

    if (supplierProductError) {
      return NextResponse.json(
        {
          message: 'Failed to save supplier product profile',
          error: supplierProductError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Supplier saved successfully',
      data: supplierProductData,
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