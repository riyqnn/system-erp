import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('product_id')
  const bomId = searchParams.get('bom_id')
  const targetQty = Number(searchParams.get('target_qty') || 0)

  if (!productId && !bomId) return NextResponse.json({ error: 'Product ID atau BOM ID wajib diisi' }, { status: 400 })

  const supabase = await createRouteHandlerClient()

  // 1. Tarik Master BOM — by bom_id if supplied, else by product_id + active
  let bomQuery = supabase
    .from('ms_bom_header')
    .select(`
      bom_id,
      ms_bom_detail (
        component_id,
        qty_required,
        ms_product ( product_name, uom )
      )
    `)

  if (bomId) {
    bomQuery = bomQuery.eq('bom_id', bomId)
  } else {
    bomQuery = bomQuery.eq('product_id', productId!).eq('is_active', 1)
  }

  const { data: bomData, error: bomError } = await bomQuery.single()

  if (bomError || !bomData) {
    return NextResponse.json({ error: 'BOM tidak ditemukan' }, { status: 404 })
  }

  // 2. Kalkulasi MRP (Stok vs Kebutuhan)
  const materials = await Promise.all(
    bomData.ms_bom_detail.map(async (detail) => {
      const compId = detail.component_id
      const qtyRequiredPerUnit = detail.qty_required
      const totalNeeded = qtyRequiredPerUnit * targetQty 

      const { data: stockData } = await supabase
        .from('tr_stock_balance')
        .select('quantity')
        .eq('product_id', compId)

      const totalStock = stockData ? stockData.reduce((sum, item) => sum + Number(item.quantity), 0) : 0
      const isSafe = totalStock >= totalNeeded

      const product = Array.isArray(detail.ms_product)
        ? detail.ms_product[0]
        : detail.ms_product

      return {
        kode_bahan: compId,
        nama_material: product?.product_name || 'Unknown',
        satuan: product?.uom || 'KG',
        kebutuhan_total: totalNeeded,
        stok_aktual: totalStock,
        status_stok: isSafe ? 'STOK AMAN' : 'PESAN LAGI'
      }
    })
  )

  // 3. Tarik Data Routing
  const { data: routingData } = await supabase
    .from('ms_routing')
    .select('operation_name, setup_time, process_time, ms_work_center(wc_name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    bom_materials: materials,
    routing: routingData || [],
    is_all_material_ready: materials.every(m => m.status_stok === 'STOK AMAN')
  })
}