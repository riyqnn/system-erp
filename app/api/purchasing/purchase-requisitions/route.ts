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