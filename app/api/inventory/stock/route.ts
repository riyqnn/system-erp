import { AnyObject } from '@/lib/any';
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || 'All'

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Helper to escape special characters for PostgREST ilike/or
    const escapedSearch = search.replace(/,/g, '\\,').replace(/%/g, '\\%');

    // Primary: try the view (fast, pre-aggregated)
    let query = supabase
      .from('vw_stock_summary')
      .select('*', { count: 'exact' })
      .order('product_id', { ascending: true })

    if (search) {
      query = query.or(`product_id.ilike.%${escapedSearch}%,product_name.ilike.%${escapedSearch}%`)
    }
    if (category && category !== 'All') {
      query = query.eq('category', category)
    }
    
    query = query.range(from, to)

    const { data, error, count } = await query

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
      return NextResponse.json({ 
        data: mapped,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    }

    // If the view is missing or PostgREST returns a schema error, fall back
    const errMsg = error?.message || ''
    if (error && /vw_stock_summary|could not find the table|PGRST205/i.test(errMsg)) {
      console.warn('[STOCK] vw_stock_summary not in cache, using fallback computation...');
      
      let prodQuery = supabase.from('ms_product').select('product_id, product_name, category, uom, minimum_stock, status, created_at, updated_at', { count: 'exact' })
      
      if (search) {
        prodQuery = prodQuery.or(`product_id.ilike.%${escapedSearch}%,product_name.ilike.%${escapedSearch}%`)
      }
      if (category && category !== 'All') {
        prodQuery = prodQuery.eq('category', category)
      }
      
      prodQuery = prodQuery.range(from, to)

      const { data: products, error: prodError, count } = await prodQuery

      if (prodError) console.error('[STOCK] prodRes.error', prodError)

      const productList = products || []
      const productIds = productList.map(p => p.product_id)

      let balances: AnyObject[] = []
      if (productIds.length > 0) {
        const balRes = await supabase.from('tr_stock_balance').select('product_id, quantity, status').in('product_id', productIds)
        if (balRes.error) console.error('[STOCK] balRes.error', balRes.error)
        balances = balRes.data || []
      }

      console.log('[STOCK] prodRes count', productList.length, 'balRes count', balances.length)

      // Aggregate available quantities per product
      const availMap: Record<string, number> = {}
      for (const b of balances) {
        if (!b || !b.product_id) continue
        if (String(b.status).toUpperCase() !== 'AVAILABLE') continue
        const pid = String(b.product_id)
        const qty = Number(b.quantity) || 0
        availMap[pid] = (availMap[pid] || 0) + qty
      }

      const computed = productList.map((p: AnyObject) => {
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
      return NextResponse.json({ 
        data: computed,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    }

    // Unknown error from view access
    if (error) throw error
    
    return NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}