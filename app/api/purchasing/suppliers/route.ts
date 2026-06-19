import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeStatus(value?: string | number | null) {
  const status = String(value || '').toUpperCase()

  if (status === '1' || status === 'ACTIVE') return 'ACTIVE'
  if (status === '0' || status === 'INACTIVE') return 'INACTIVE'

  return status || 'ACTIVE'
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ms_supplier_price')
      .select(`
        supplier_price_id,
        supplier_id,
        product_id,
        unit_price_estimate,
        uom,
        ms_supplier (
          supplier_id,
          supplier_name,
          category,
          contact,
          address,
          lead_time,
          top,
          status,
          created_at
        ),
        ms_product (
          product_id,
          product_name,
          category,
          uom,
          status
        )
      `)
      .order('supplier_price_id', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch suppliers',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const suppliers = (data || []).map((item: any) => ({
      id: String(item.supplier_price_id),
      supplierId: item.ms_supplier?.supplier_id || item.supplier_id || '-',
      supplierName: item.ms_supplier?.supplier_name || '-',
      contact: item.ms_supplier?.contact || '-',
      address: item.ms_supplier?.address || '-',
      productCode: item.ms_product?.product_id || item.product_id || '-',
      product: item.ms_product?.product_name || '-',
      category: item.ms_product?.category || item.ms_supplier?.category || '-',
      unit: item.uom || item.ms_product?.uom || '-',
      estimatedPrice: Number(item.unit_price_estimate || 0),
      leadTime: Number(item.ms_supplier?.lead_time || 0),
      termOfPayment: item.ms_supplier?.top || '-',
      status: normalizeStatus(item.ms_supplier?.status),
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

    const { data: existingSupplier } = await supabase
      .from('ms_supplier')
      .select('supplier_id')
      .eq('supplier_id', supplierCode)
      .maybeSingle()

    if (existingSupplier) {
      const { error: updateSupplierError } = await supabase
        .from('ms_supplier')
        .update({
          supplier_name: supplierName,
          contact: contact || null,
          address: address || null,
          lead_time: Number(leadTimeDays || 0),
          top: paymentTerm || 'NET_30',
          status: status || 'ACTIVE',
        })
        .eq('supplier_id', supplierCode)

      if (updateSupplierError) {
        return NextResponse.json(
          {
            message: 'Failed to update supplier',
            error: updateSupplierError.message,
          },
          { status: 500 }
        )
      }
    } else {
      const { error: insertSupplierError } = await supabase
        .from('ms_supplier')
        .insert({
          supplier_id: supplierCode,
          supplier_name: supplierName,
          contact: contact || null,
          address: address || null,
          lead_time: Number(leadTimeDays || 0),
          top: paymentTerm || 'NET_30',
          status: status || 'ACTIVE',
        })

      if (insertSupplierError) {
        return NextResponse.json(
          {
            message: 'Failed to save supplier',
            error: insertSupplierError.message,
          },
          { status: 500 }
        )
      }
    }

    const { data: existingSupplierPrice } = await supabase
      .from('ms_supplier_price')
      .select('supplier_price_id')
      .eq('supplier_id', supplierCode)
      .eq('product_id', productSku)
      .maybeSingle()

    let supplierPriceData = null

    if (existingSupplierPrice) {
      const { data: updatedPrice, error: updatePriceError } = await supabase
        .from('ms_supplier_price')
        .update({
          unit_price_estimate: Number(estimatedPrice || 0),
          uom: productData.uom || null,
        })
        .eq('supplier_price_id', existingSupplierPrice.supplier_price_id)
        .select()
        .single()

      if (updatePriceError) {
        return NextResponse.json(
          {
            message: 'Failed to update supplier product price',
            error: updatePriceError.message,
          },
          { status: 500 }
        )
      }

      supplierPriceData = updatedPrice
    } else {
      const { data: insertedPrice, error: insertPriceError } = await supabase
        .from('ms_supplier_price')
        .insert({
          supplier_id: supplierCode,
          product_id: productSku,
          unit_price_estimate: Number(estimatedPrice || 0),
          uom: productData.uom || null,
        })
        .select()
        .single()

      if (insertPriceError) {
        return NextResponse.json(
          {
            message: 'Failed to save supplier product price',
            error: insertPriceError.message,
          },
          { status: 500 }
        )
      }

      supplierPriceData = insertedPrice
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