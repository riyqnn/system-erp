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
      .from('purchasing_purchase_requisitions')
      .select(`
        id,
        pr_number,
        request_date,
        requested_by_name,
        department,
        status,
        notes,
        purchasing_purchase_requisition_items (
          id,
          current_stock,
          minimum_stock,
          shortage_qty,
          request_qty,
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
      .order('request_date', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase requisitions',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const purchaseRequisitions = (data || []).map((item: any) => {
      const items = item.purchasing_purchase_requisition_items || []

      const firstItem = items[0]
      const totalRequestQty = items.reduce(
        (total: number, prItem: any) => total + Number(prItem.request_qty || 0),
        0
      )

      return {
        id: item.id,
        prNo: item.pr_number,
        requestDate: item.request_date,
        requestedBy: item.requested_by_name || '-',
        department: item.department || '-',
        status: item.status,
        notes: item.notes || '-',

        productCode: firstItem?.products?.sku || '-',
        productName: firstItem?.products?.name || '-',
        category: firstItem?.products?.category || '-',
        currentStock: firstItem?.current_stock || 0,
        minimumStock: firstItem?.minimum_stock || 0,
        shortageQty: firstItem?.shortage_qty || 0,
        requestQty: totalRequestQty,
        unit: firstItem?.unit || firstItem?.products?.unit || '-',

        items: items.map((prItem: any) => ({
          id: prItem.id,
          productCode: prItem.products?.sku || '-',
          productName: prItem.products?.name || '-',
          category: prItem.products?.category || '-',
          currentStock: prItem.current_stock || 0,
          minimumStock: prItem.minimum_stock || 0,
          shortageQty: prItem.shortage_qty || 0,
          requestQty: prItem.request_qty || 0,
          unit: prItem.unit || prItem.products?.unit || '-',
        })),
      }
    })

    return NextResponse.json({
      message: 'Purchase requisitions fetched successfully',
      data: purchaseRequisitions,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while fetching purchase requisitions',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}