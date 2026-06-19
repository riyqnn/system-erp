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
      .from('purchasing_rfq_sourcing')
      .select(`
        id,
        rfq_number,
        required_qty,
        unit,
        candidate_supplier_name,
        pic_name,
        email,
        phone,
        address,
        quotation_deadline,
        specification_notes,
        status,
        created_at,
        purchasing_purchase_requisitions (
          id,
          pr_number,
          request_date,
          requested_by_name,
          department,
          status
        ),
        products (
          id,
          sku,
          name,
          category,
          unit
        ),
        ms_suppliers (
          supplier_id,
          supplier_code,
          supplier_name,
          contact,
          address
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch RFQ sourcing data',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

    const rfqSourcing = (data || []).map((item: AnyObject) => ({
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
      requiredQty,
      supplierCode,
      candidateSupplierName,
      picName,
      email,
      phone,
      address,
      quotationDeadline,
      specificationNotes,
      status,
    } = body

    if (!rfqNumber || !productSku || !requiredQty || !candidateSupplierName) {
      return NextResponse.json(
        {
          message:
            'RFQ number, product SKU, required quantity, and supplier name are required',
        },
        { status: 400 }
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

    let prId = null

    if (prNumber) {
      const { data: prData } = await supabase
        .from('purchasing_purchase_requisitions')
        .select('id')
        .eq('pr_number', prNumber)
        .maybeSingle()

      prId = prData?.id || null
    }

    let supplierId = null

    if (supplierCode) {
      const { data: supplierData } = await supabase
        .from('ms_suppliers')
        .select('supplier_id')
        .eq('supplier_code', supplierCode)
        .maybeSingle()

      supplierId = supplierData?.supplier_id || null
    }

    const { data: rfqData, error: rfqError } = await supabase
      .from('purchasing_rfq_sourcing')
      .insert({
        rfq_number: rfqNumber,
        pr_id: prId,
        product_id: productData.id,
        required_qty: Number(requiredQty || 0),
        unit: productData.unit || '-',
        candidate_supplier_id: supplierId,
        candidate_supplier_name: candidateSupplierName,
        pic_name: picName || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        quotation_deadline: quotationDeadline || null,
        specification_notes: specificationNotes || null,
        status: status || 'WAITING_RESPONSE',
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