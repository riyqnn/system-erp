import { AnyObject } from '@/lib/any';
import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const { searchParams } = new URL(request.url)
    const fg_product_id = searchParams.get('fg_product_id')

    const supabase = await createRouteHandlerClient()

    // 1. Fetch active BOM Header for this FG product
    let headerQuery = supabase
      .from('ms_bom_header')
      .select('bom_id')
      .eq('is_active', 1)

    if (fg_product_id) {
      headerQuery = headerQuery.eq('product_id', fg_product_id)
    }

    const { data: headers, error: hError } = await headerQuery
    if (hError) throw hError

    if (!headers || headers.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const bomIds = headers.map((h: AnyObject) => h.bom_id)

    // 2. Fetch BOM details containing components
    const { data: details, error: dError } = await supabase
      .from('ms_bom_detail')
      .select(`
        bom_id,
        component_id,
        qty_required,
        ms_product!ms_bom_detail_component_id_fkey (
          product_id,
          product_name,
          uom
        )
      `)
      .in('bom_id', bomIds)

    if (dError) throw dError

    // 3. Map details to BOMData format expected by frontend
    const mappedData = details?.map((item: AnyObject) => ({
      bom_id: item.bom_id,
      rm_product_id: item.component_id,
      qty_required: Number(item.qty_required),
      ms_products: item.ms_product ? {
        product_code: item.ms_product.product_id,
        product_name: item.ms_product.product_name,
        units: item.ms_product.uom
      } : null
    }))

    return NextResponse.json({ data: mappedData })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
