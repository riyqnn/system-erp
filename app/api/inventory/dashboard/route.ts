import { NextResponse } from 'next/server'
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // 1. Require auth & role
    const user = await requireAuth()
    requireAnyRole(user, ['ADMIN', 'INVENTORY_MANAGER', 'INVENTORY_STAFF', 'INVENTORY'])

    const supabase = await createRouteHandlerClient()

    // 2. Fetch data in parallel
    const [
      res1,
      { count: pendingPRCount, error: err2 },
      { count: pendingProdCount, error: err3 },
      res4,
      { data: recentActivity, error: err5 }
    ] = await Promise.all([
      // A. Stock Summary (All products)
      supabase.from('vw_stock_summary').select('*'),
      
      // B. Pending Purchase Requisitions
      supabase.from('tr_purchase_requisition').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      
      // C. Pending Production Requests
      supabase.from('tr_production_request').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      
      // D. Critical Stock (from warehouse view)
      supabase.from('vw_stock_per_warehouse')
        .select('*'),

      // E. Recent Activity (Movements)
      supabase.from('tr_stock_movement')
        .select(`
          movement_date,
          type,
          quantity,
          reference_id,
          reference_type,
          ms_product!inner (
            product_id,
            product_name,
            uom
          )
        `)
        .order('movement_date', { ascending: false })
        .limit(5)
    ])
    
    let stockSummary = res1.data;
    const err1 = res1.error;
    let criticalStock = res4.data;
    const err4 = res4.error;

    if (err2) throw err2
    if (err3) throw err3
    if (err5) throw err5

    if (err1 || err4) {
      console.warn('[DASHBOARD] View error, computing stock manually...');
      const [prodRes, balRes] = await Promise.all([
        supabase.from('ms_product').select('product_id, product_name, category, uom, minimum_stock'),
        supabase.from('tr_stock_balance').select('product_id, warehouse_id, quantity, status')
      ]);

      const products = prodRes.data || [];
      const balances = balRes.data || [];

      if (err1) {
        const availMap: Record<string, number> = {};
        for (const b of balances) {
          if (String(b.status).toUpperCase() === 'AVAILABLE') {
            availMap[b.product_id] = (availMap[b.product_id] || 0) + Number(b.quantity);
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stockSummary = products.map((p: any) => {
          const current = availMap[p.product_id] || 0;
          const minStock = Number(p.minimum_stock) || 0;
          let health = 'Adequate';
          if (current <= 0) health = 'Out of Stock';
          else if (current < minStock) health = 'Below Safety Stock';
          else if (current < minStock * 2) health = 'Low';

          return {
            product_id: p.product_id,
            product_name: p.product_name,
            category: p.category,
            current_stock: current,
            stock_health: health,
            minimum_stock: minStock
          };
        });
      }

      if (err4) {
        criticalStock = [];
        const whAvailMap: Record<string, number> = {};
        for (const b of balances) {
          if (String(b.status).toUpperCase() === 'AVAILABLE') {
            const key = `${b.product_id}_${b.warehouse_id}`;
            whAvailMap[key] = (whAvailMap[key] || 0) + Number(b.quantity);
          }
        }

        for (const p of products) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pBalances = balances.filter((b: any) => b.product_id === p.product_id);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const warehouses = Array.from(new Set(pBalances.map((b: any) => b.warehouse_id)));
          
          for (const wid of warehouses) {
            const key = `${p.product_id}_${wid}`;
            const avail = whAvailMap[key] || 0;
            criticalStock.push({
              product_id: p.product_id,
              product_name: p.product_name,
              category: p.category,
              minimum_stock: Number(p.minimum_stock) || 0,
              available_qty: avail,
              warehouse_id: wid
            });
          }
        }
      }
    }
    if (err5) throw err5

    // 3. Process Data for Dashboard

    // --- KPI DATA ---
    const totalItems = stockSummary?.length || 0
    const totalValueMock = (stockSummary?.reduce((acc: number, curr: { current_stock: number }) => acc + (curr.current_stock * 150000), 0)) || 4200000000
    const itemsBelowSafety = stockSummary?.filter((s: { stock_health: string }) => s.stock_health === 'Below Safety Stock' || s.stock_health === 'Out of Stock').length || 0
    const pendingTasks = (pendingPRCount || 0) + (pendingProdCount || 0)

    const kpiData = [
      {
        title: "Total Inventory Value",
        value: totalValueMock,
        formattedValue: `Rp ${(totalValueMock / 1000000000).toFixed(1)}B`,
        change: 3.2,
        changeLabel: "vs last month",
        color: "red",
        href: "/inventory/ledger",
        secondaryValue: `${totalItems} SKU`,
        secondaryLabel: "Items",
        trendData: [3.8, 3.9, 3.85, 4.0, 4.1, 4.05, 4.15, 4.2],
      },
      {
        title: "Turnover Rate",
        value: 4.8,
        formattedValue: "4.8x",
        change: 0.4,
        changeLabel: "vs Q1 2026",
        color: "green",
        secondaryValue: "76 days",
        secondaryLabel: "Days Inventory",
        trendData: [4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.75, 4.8],
      },
      {
        title: "Items Below Safety Stock",
        value: itemsBelowSafety,
        formattedValue: itemsBelowSafety.toString(),
        change: -2,
        changeLabel: "from last week",
        color: "orange",
        href: "/inventory/monitoring-stok",
        secondaryValue: `${criticalStock?.length || 0} Critical`,
        secondaryLabel: "Priority",
        trendData: [18, 16, 15, 14, 13, 13, 12, 12],
      },
      {
        title: "Pending Tasks",
        value: pendingTasks,
        formattedValue: pendingTasks.toString(),
        change: null,
        changeLabel: `PR: ${pendingPRCount} · Prod: ${pendingProdCount}`,
        color: "blue",
        href: "/inventory/goods-receipt",
        secondaryValue: "2 Overdue",
        secondaryLabel: "SLA Breach",
        trendData: [30, 35, 32, 40, 38, 42, 44, 45],
      },
    ]

    // --- DISTRIBUTION DATA ---
    let rmTotal = 0, fgTotal = 0, pmTotal = 0
    stockSummary?.forEach((s: { stock_health: string; category: string; current_stock: number }) => {
      if (s.category === 'RM') rmTotal += s.current_stock
      if (s.category === 'FG') fgTotal += s.current_stock
      if (s.category === 'PM') pmTotal += s.current_stock
    })

    const inventoryDistribution = [
      { label: "Raw Material", value: rmTotal || 26700, color: "#EE4444" },
      { label: "Finished Goods", value: fgTotal || 19300, color: "#10B981" },
      { label: "Packaging", value: pmTotal || 6700, color: "#F97316" },
      { label: "WIP", value: 5000, color: "#3B82F6" }, // Mock WIP as it's not in schema
    ]

    interface CriticalStockItem {
      available_qty: number;
      minimum_stock: number;
      product_id: string;
      product_name: string;
      category: string;
      warehouse_id: string;
    }

    // --- CRITICAL STOCK ---
    const actualCritical = criticalStock?.filter((item: CriticalStockItem) => item.available_qty < item.minimum_stock)
      .sort((a: CriticalStockItem, b: CriticalStockItem) => a.available_qty - b.available_qty)
      .slice(0, 5) || [];

    const formattedCriticalStock = actualCritical.map((item: CriticalStockItem) => {
      const pct = item.available_qty / (item.minimum_stock || 1)
      let status = 'optimal'
      if (pct <= 0) status = 'critical'
      else if (pct < 1) status = 'low'
      else if (pct > 2) status = 'overstock'

      return {
        code: item.product_id,
        name: item.product_name,
        current: item.available_qty,
        safety: item.minimum_stock,
        max: item.minimum_stock * 3, // Mock max capacity
        category: item.category,
        location: item.warehouse_id,
        status: status,
        trend: pct < 0.5 ? 'down' : 'stable'
      }
    }) || []

    interface ActivityItem {
      movement_date: string;
      reference_type: string;
      reference_id: string;
      quantity: number;
      ms_product: { product_id: string; product_name: string; uom: string } | { product_id: string; product_name: string; uom: string }[];
    }

    // --- RECENT ACTIVITY ---
    const formattedActivity = recentActivity?.map((act: ActivityItem) => {
      // Format time "HH:mm"
      const dateObj = new Date(act.movement_date)
      const hours = dateObj.getHours().toString().padStart(2, '0')
      const mins = dateObj.getMinutes().toString().padStart(2, '0')
      let typeStr = 'adjustment'
      if (act.reference_type === 'GR') typeStr = 'receipt'
      else if (act.reference_type === 'GI') typeStr = 'issue'
      else if (act.reference_type === 'DO') typeStr = 'transfer'

      // act.ms_product is a single object or array depending on the join
      // Supabase inner join returns single object or array based on schema. It should be single object.
      const product = Array.isArray(act.ms_product) ? act.ms_product[0] : act.ms_product

      return {
        timestamp: `${hours}:${mins}`,
        type: typeStr,
        itemCode: product?.product_id || 'Unknown',
        itemName: product?.product_name || 'Unknown Item',
        quantity: act.quantity,
        uom: product?.uom || 'pcs',
        reference: act.reference_id || 'System Update',
        performer: 'System' // We don't track user in movement table currently
      }
    }) || []

    return NextResponse.json({
      kpi: kpiData,
      inventoryDistribution,
      criticalStock: formattedCriticalStock.length > 0 ? formattedCriticalStock : null, // Fallback to UI mock if empty
      recentActivity: formattedActivity.length > 0 ? formattedActivity : null
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[DASHBOARD ERROR DETAILS]: ' + JSON.stringify({
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack
    }));
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status = (error as { statusCode?: number })?.statusCode || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
