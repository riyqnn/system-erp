import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'FINANCE', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase
      .from('tr_goods_receipt')
      .select(`
        *,
        ms_products (product_code, product_name, units),
        ms_suppliers (supplier_name)
      `)
      .eq('status', 'Accepted')
      .order('receipt_date', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
