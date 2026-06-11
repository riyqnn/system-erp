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

    let query = supabase
      .from('ms_bom')
      .select(`
        *,
        ms_products!fk_bom_rm (product_code, product_name, units)
      `)

    if (fg_product_id) {
      query = query.eq('fg_product_id', fg_product_id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
