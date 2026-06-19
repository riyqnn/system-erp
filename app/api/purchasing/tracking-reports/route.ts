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
    const { data: trackingData, error: trackingError } = await supabase
      .from('purchasing_tracking_reports')
      .select(`
        id,
        tracking_number,
        entity_type,
        entity_id,
        status,
        estimated_arrival_date,
        supplier_notes,
        created_by_name,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (trackingError) {
      return NextResponse.json(
        {
          message: 'Failed to fetch tracking reports',
          error: trackingError.message,
        },
        { status: 500 }
      )
    }

    const poIds =
      trackingData
        ?.filter((item: AnyObject) => item.entity_type === 'PURCHASE_ORDER' || item.entity_type === 'DELIVERY')
        .map((item: AnyObject) => item.entity_id)
        .filter(Boolean) || []

    const { data: poData, error: poError } = await supabase
      .from('purchasing_purchase_orders')
      .select(`
        id,
        po_number,
        po_date,
        expected_delivery_date,
        total_value,
        status,
        ms_suppliers (
          supplier_id,
          supplier_code,
          supplier_name,
          contact,
          address
        ),
        purchasing_purchase_order_items (
          id,
          qty,
          unit,
          products (
            id,
            sku,
            name,
            category,
            unit
          )
        )
      `)
      .in('id', poIds.length > 0 ? poIds : ['00000000-0000-0000-0000-000000000000'])

    if (poError) {
      return NextResponse.json(
        {
          message: 'Failed to fetch related purchase orders',
          error: poError.message,
        },
        { status: 500 }
      )
    }

    const purchaseOrderMap = new Map((poData || []).map((po: AnyObject) => [po.id, po]))

    const trackingReports = (trackingData || []).map((item: AnyObject) => {
      const po = purchaseOrderMap.get(item.entity_id)
      const firstItem = po?.purchasing_purchase_order_items?.[0]

      return {
        id: item.id,
        trackingNo: item.tracking_number,
        entityType: item.entity_type,
        entityId: item.entity_id,
        trackingStatus: item.status,
        estimatedArrivalDate: item.estimated_arrival_date,
        supplierNotes: item.supplier_notes || '-',
        reportedBy: item.created_by_name || '-',
        reportedAt: item.created_at,

        poNo: po?.po_number || '-',
        poDate: po?.po_date || null,
        expectedDeliveryDate: po?.expected_delivery_date || null,
        poStatus: po?.status || '-',
        totalValue: po?.total_value || 0,

        supplierId: po?.ms_suppliers?.supplier_code || '-',
        supplierName: po?.ms_suppliers?.supplier_name || '-',
        supplierContact: po?.ms_suppliers?.contact || '-',
        supplierAddress: po?.ms_suppliers?.address || '-',

        productCode: firstItem?.products?.sku || '-',
        productName: firstItem?.products?.name || '-',
        category: firstItem?.products?.category || '-',
        qty: firstItem?.qty || 0,
        unit: firstItem?.unit || firstItem?.products?.unit || '-',
      }
    })

    return NextResponse.json({
      message: 'Tracking reports fetched successfully',
      data: trackingReports,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching tracking reports',
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
      trackingNumber,
      entityType,
      poNumber,
      status,
      estimatedArrivalDate,
      supplierNotes,
      createdByName,
    } = body

    if (!trackingNumber || !entityType || !status) {
      return NextResponse.json(
        {
          message: 'Tracking number, entity type, and status are required',
        },
        { status: 400 }
      )
    }

    let entityId = null

    if (poNumber) {
      const { data: poData } = await supabase
        .from('purchasing_purchase_orders')
        .select('id')
        .eq('po_number', poNumber)
        .maybeSingle()

      entityId = poData?.id || null
    }

    const { data, error } = await supabase
      .from('purchasing_tracking_reports')
      .insert({
        tracking_number: trackingNumber,
        entity_type: entityType,
        entity_id: entityId,
        status,
        estimated_arrival_date: estimatedArrivalDate || null,
        supplier_notes: supplierNotes || null,
        created_by_name: createdByName || 'Purchasing Staff',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to save tracking report',
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tracking report saved successfully',
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while saving tracking report',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}