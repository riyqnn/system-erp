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

function normalizeStatus(value?: string | null) {
  const status = String(value || '').toUpperCase()

  if (['PENDING', 'DRAFT', 'REQUESTED'].includes(status)) {
    return 'PENDING_PO_CREATION'
  }

  if (['APPROVED', 'PROCESSED', 'PO_CREATED'].includes(status)) {
    return 'PROCESSED'
  }

  if (status === 'CLOSED') {
    return 'CLOSED'
  }

  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'CANCELLED'
  }

  return status || 'PENDING_PO_CREATION'
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('tr_purchase_requisition')
      .select(`
        pr_id,
        request_date,
        status,
        notes,
        ms_user (
          full_name,
          role
        ),
        tr_pr_detail (
          pr_detail_id,
          qty_requested,
          ms_product (
            product_id,
            product_name,
            category,
            uom,
            minimum_stock
          )
        )
      `)
      .order('request_date', { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          message: 'Failed to fetch purchase requisitions',
          error: error instanceof Error ? error.message : JSON.stringify(error),
        },
        { status: 500 }
      )
    }

    const purchaseRequisitions = (data || []).map((item: AnyObject) => {
      const items = item.tr_pr_detail || []
      const firstItem = items[0]
      const totalRequestQty = items.reduce(
        (total: number, prItem: AnyObject) => total + Number(prItem.qty_requested || 0),
        0
      )

      return {
        id: item.pr_id,
        prNo: item.pr_id,
        requestDate: item.request_date,
        requestedBy: item.ms_user?.full_name || '-',
        department: item.ms_user?.role || '-',
        status: item.status,
        notes: item.notes || '-',

        productCode: firstItem?.ms_product?.product_id || '-',
        productName: firstItem?.ms_product?.product_name || '-',
        category: firstItem?.ms_product?.category || '-',
        currentStock: 0, // no stock loaded in this query, maybe fetch if needed
        minimumStock: firstItem?.ms_product?.minimum_stock || 0,
        shortageQty: 0,
        requestQty: totalRequestQty,
        unit: firstItem?.ms_product?.uom || '-',

        items: items.map((prItem: AnyObject) => ({
          id: prItem.pr_detail_id,
          productCode: prItem.ms_product?.product_id || '-',
          productName: prItem.ms_product?.product_name || '-',
          category: prItem.ms_product?.category || '-',
          currentStock: 0,
          minimumStock: prItem.ms_product?.minimum_stock || 0,
          shortageQty: 0,
          requestQty: prItem.qty_requested || 0,
          unit: prItem.ms_product?.uom || '-',
        })),
      }
    })

    return NextResponse.json({
      message: 'Purchase requisitions fetched successfully',
      data,
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