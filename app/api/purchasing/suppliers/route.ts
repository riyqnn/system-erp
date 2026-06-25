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

function getPriceValue(item: any) {
  return Number(
    item?.estimated_price ||
      item?.price ||
      item?.unit_price ||
      item?.supplier_price ||
      0
  )
}

function getLeadTimeValue(item: any, supplier: any) {
  return Number(
    item?.lead_time_days ||
      item?.lead_time ||
      supplier?.lead_time ||
      0
  )
}

function getPaymentTermValue(item: any, supplier: any) {
  return item?.payment_term || item?.term_of_payment || supplier?.top || '-'
}

export async function GET() {
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
      data,
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