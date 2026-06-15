import { AnyObject } from '@/lib/any';
import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    // Primary: try the view (fast, pre-aggregated)
    const { data, error } = await supabase
      .from('vw_stock_summary')
      .select('*')
      .order('product_id', { ascending: true })

    if (!error && data) {
      // Map view columns to UI-expected shape to avoid client crashes
      const mapped = (data || []).map((d: AnyObject) => ({
        product_id: d.product_id,
        product_code: d.product_id,
        product_name: d.product_name,
        category: d.category,
        units: d.uom || d.unit || d.units || null,
        minimum_stock: d.minimum_stock,
        current_stock: d.current_stock,
        stock_health: d.stock_health
      }))
      console.log('[STOCK] returning', mapped.length, 'items (from vw_stock_summary)')
      return NextResponse.json({ data: mapped })
    }

    // If the view is missing or PostgREST returns a schema error, fall back
    // to computing the stock summary from `ms_product` + `tr_stock_balance`.
    const errMsg = error?.message || ''
    if (error) console.error('[STOCK] vw_stock_summary error:', errMsg, error)
    if (error && /vw_stock_summary|could not find the table|PGRST205/i.test(errMsg)) {
      // Fetch master products and balances in parallel
      const [prodRes, balRes] = await Promise.all([
        supabase.from('ms_product').select('product_id, product_name, category, uom, minimum_stock, status, created_at, updated_at'),
        supabase.from('tr_stock_balance').select('product_id, quantity, status')
      ])

      if (prodRes.error) console.error('[STOCK] prodRes.error', prodRes.error)
      if (balRes.error) console.error('[STOCK] balRes.error', balRes.error)

      const products = prodRes.data || []
      const balances = balRes.data || []
      console.log('[STOCK] prodRes count', (prodRes.data || []).length, 'balRes count', (balRes.data || []).length)

      // Aggregate available quantities per product
      const availMap: Record<string, number> = {}
      for (const b of balances) {
        if (!b || !b.product_id) continue
        if (String(b.status).toUpperCase() !== 'AVAILABLE') continue
        const pid = String(b.product_id)
        const qty = Number(b.quantity) || 0
        availMap[pid] = (availMap[pid] || 0) + qty
      }

      const computed = products.map((p: AnyObject) => {
        const current = Number(availMap[String(p.product_id)] || 0)
        const minStock = Number(p.minimum_stock || 0)
        let stock_health = 'Adequate'
        if (current <= 0) stock_health = 'Out of Stock'
        else if (current < minStock) stock_health = 'Below Safety Stock'
        else if (current < minStock * 2) stock_health = 'Low'

        return {
          product_id: p.product_id,
          product_code: p.product_id,
          product_name: p.product_name,
          category: String(p.category),
          units: p.uom || p.unit || p.units || null,
          minimum_stock: minStock,
          current_stock: current,
          stock_health
        }
      })

      console.log('[STOCK] returning', computed.length, 'items (computed)')
      return NextResponse.json({ data: computed })
    }

    // Unknown error from view access
    if (error) throw error
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
