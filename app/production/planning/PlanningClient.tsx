'use client'

import { useEffect, useState } from 'react'
import {
  Plus, X, Warning, MagnifyingGlass, CalendarCheck, Wrench, ArrowsClockwise,
  Trash, PencilSimple, Play, ArrowRight, CheckCircle, Package,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Product = { id: string; sku: string; name: string }
type WorkCenter = { id: string; name: string; capacity_per_hour: number | null; cost_per_hour: number | null }
type RoutingRow = { id: string; product_id: string | null; work_center_id: string | null; operation_name: string; setup_time: number | null; process_time: number | null; work_center_name: string | null }
type Order = { id: string; po_number: string; status: string; planned_qty: number; actual_qty: number | null; start_date: string | null; end_date: string | null; bom_id: string | null; product_id: string | null; products: { name: string; sku: string } | null }

type MrpCalcResult = {
  order: Order
  materials: { kode_bahan: string; nama_material: string; satuan: string; kebutuhan_total: number; stok_aktual: number; status_stok: string }[]
  routing: { operation_name: string; setup_time: number | null; process_time: number | null; ms_work_center: { wc_name: string } | null }[]
  is_all_material_ready: boolean
}

const ORDER_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700',
  mrp_ready: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
}
const ORDER_LABEL: Record<string, string> = {
  planned: 'Planned', mrp_ready: 'MRP Ready', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

type Tab = 'pending' | 'orders' | 'work-centers' | 'routing'

export function PlanningClient() {
  const [tab, setTab] = useState<Tab>('pending')
  const [wcRows, setWcRows] = useState<WorkCenter[]>([])
  const [routingRows, setRoutingRows] = useState<RoutingRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // MRP calculation result per order
  const [calcResult, setCalcResult] = useState<MrpCalcResult | null>(null)
  const [calculating, setCalculating] = useState<string | null>(null)

  // New Order form
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({ product_id: '', planned_qty: '', start_date: '', end_date: '' })
  const [orderSaving, setOrderSaving] = useState(false)

  // WC Form
  const [showWcForm, setShowWcForm] = useState(false)
  const [editingWc, setEditingWc] = useState<WorkCenter | null>(null)
  const [wcForm, setWcForm] = useState({ name: '', capacity_per_hour: '', cost_per_hour: '' })
  const [wcSaving, setWcSaving] = useState(false)

  // Routing Form
  const [showRoutingForm, setShowRoutingForm] = useState(false)
  const [routingForm, setRoutingForm] = useState({ product_id: '', work_center_id: '', operation_name: '', setup_time: '', process_time: '' })
  const [routingSaving, setRoutingSaving] = useState(false)

  const [releasingSaving, setReleasingSaving] = useState<string | null>(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [wcRes, routingRes, prodRes, ordRes] = await Promise.all([
        fetch('/api/production/work-centers'),
        fetch('/api/production/routing'),
        fetch('/api/production/products'),
        fetch('/api/production/orders'),
      ])
      if (wcRes.ok) setWcRows(await wcRes.json())
      if (routingRes.ok) setRoutingRows(await routingRes.json())
      if (prodRes.ok) setProducts(await prodRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
    } catch { setError('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const pendingMRP = orders.filter(o => o.status === 'planned')
  const activeOrders = orders.filter(o => ['planned', 'mrp_ready', 'in_progress'].includes(o.status))

  async function runMRP(order: Order) {
    setCalculating(order.id)
    setCalcResult(null)
    try {
      const params = new URLSearchParams({ target_qty: String(order.planned_qty) })
      if (order.bom_id) params.set('bom_id', order.bom_id)
      else if (order.product_id) params.set('product_id', order.product_id)
      const res = await fetch(`/api/production/mrp?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCalcResult({
          order,
          materials: data.bom_materials ?? [],
          routing: data.routing ?? [],
          is_all_material_ready: data.is_all_material_ready ?? false,
        })
      } else {
        setError('MRP calculation failed — BOM not found for this product')
      }
    } catch { setError('MRP calculation failed') }
    finally { setCalculating(null) }
  }

  async function confirmMRPReady(orderId: string) {
    const res = await fetch(`/api/production/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'mrp_ready' }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      setError(`Gagal update status: ${e.error ?? res.status}`)
      return
    }
    setCalcResult(null)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'mrp_ready' } : o))
    loadAll().catch(() => {})
  }

  async function releaseOrder(orderId: string) {
    setReleasingSaving(orderId)
    try {
      const res = await fetch(`/api/production/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', start_date: new Date().toISOString().slice(0, 10) }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        setError(`Gagal release order: ${e.error ?? res.status}`)
        return
      }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'in_progress' } : o))
      loadAll().catch(() => {})
    } finally {
      setReleasingSaving(null)
    }
  }

  async function saveOrder() {
    if (!orderForm.product_id) { setFormError('Product is required'); return }
    if (!orderForm.planned_qty || Number(orderForm.planned_qty) <= 0) { setFormError('Planned quantity must be > 0'); return }
    setOrderSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: orderForm.product_id,
          planned_qty: Number(orderForm.planned_qty),
          start_date: orderForm.start_date || null,
          end_date: orderForm.end_date || null,
          status: 'planned',
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowOrderForm(false)
      setOrderForm({ product_id: '', planned_qty: '', start_date: '', end_date: '' })
      await loadAll()
    } catch { setFormError('An error occurred.') } finally { setOrderSaving(false) }
  }

  async function saveWc() {
    if (!wcForm.name.trim()) { setFormError('Work center name is required'); return }
    setWcSaving(true); setFormError(null)
    try {
      const payload = {
        name: wcForm.name.trim(),
        capacity_per_hour: wcForm.capacity_per_hour ? Number(wcForm.capacity_per_hour) : null,
        cost_per_hour: wcForm.cost_per_hour ? Number(wcForm.cost_per_hour) : null,
      }
      const url = editingWc ? `/api/production/work-centers/${editingWc.id}` : '/api/production/work-centers'
      const res = await fetch(url, { method: editingWc ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowWcForm(false); setEditingWc(null); await loadAll()
    } catch { setFormError('An error occurred.') } finally { setWcSaving(false) }
  }

  async function deleteWc(id: string) {
    if (!confirm('Delete this work center?')) return
    await fetch(`/api/production/work-centers/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function saveRouting() {
    if (!routingForm.operation_name.trim()) { setFormError('Operation name is required'); return }
    setRoutingSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/production/routing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: routingForm.product_id || null,
          work_center_id: routingForm.work_center_id || null,
          operation_name: routingForm.operation_name.trim(),
          setup_time: routingForm.setup_time ? Number(routingForm.setup_time) : null,
          process_time: routingForm.process_time ? Number(routingForm.process_time) : null,
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowRoutingForm(false)
      setRoutingForm({ product_id: '', work_center_id: '', operation_name: '', setup_time: '', process_time: '' })
      await loadAll()
    } catch { setFormError('An error occurred.') } finally { setRoutingSaving(false) }
  }

  const filteredOrders = activeOrders.filter(o =>
    o.po_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.products?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredPending = pendingMRP.filter(o =>
    o.po_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.products?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredWc = wcRows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  const filteredRouting = routingRows.filter(r => r.operation_name.toLowerCase().includes(search.toLowerCase()))

  const TABS = [
    { key: 'pending' as Tab, label: 'MRP Queue', icon: CalendarCheck, count: pendingMRP.length },
    { key: 'orders' as Tab, label: 'Production Orders', icon: Play, count: activeOrders.length },
    { key: 'work-centers' as Tab, label: 'Work Centers', icon: Wrench, count: wcRows.length },
    { key: 'routing' as Tab, label: 'Routing', icon: ArrowsClockwise, count: routingRows.length },
  ]

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'MRP Planning' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="MRP Planning" />
            <p className="text-slate-500 -mt-4 text-sm">
              {pendingMRP.length} pending MRP · {wcRows.length} work centers · {routingRows.length} routing steps
            </p>
          </div>
          <Button
            onClick={() => {
              setFormError(null)
              if (tab === 'orders') { setOrderForm({ product_id: '', planned_qty: '', start_date: '', end_date: '' }); setShowOrderForm(true) }
              else if (tab === 'work-centers') { setEditingWc(null); setWcForm({ name: '', capacity_per_hour: '', cost_per_hour: '' }); setShowWcForm(true) }
              else if (tab === 'routing') setShowRoutingForm(true)
            }}
            className={`bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2 ${tab === 'pending' ? 'invisible' : ''}`}
          >
            <Plus className="w-4 h-4" weight="bold" />
            {tab === 'orders' ? 'New Order' : tab === 'work-centers' ? 'New Work Center' : tab === 'routing' ? 'New Routing' : ''}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 rounded-xl p-1 w-fit overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setCalcResult(null) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <Icon className="w-4 h-4" />
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-[#dc2626]/10 text-[#dc2626]' : 'bg-slate-200 text-slate-500'}`}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search..." className="pl-9 h-10 border-slate-200 bg-white text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="w-4 h-4" weight="fill" /> {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* MRP Queue Tab */}
        {tab === 'pending' && (
          <div className="space-y-4">
            {/* MRP Calc Result */}
            {calcResult && (
              <Card className="border-blue-200 bg-blue-50/40">
                <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={16} weight="bold" className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">
                      MRP Result — {calcResult.order.po_number} · {calcResult.order.products?.name ?? '—'}
                    </span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${calcResult.is_all_material_ready ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {calcResult.is_all_material_ready ? 'All materials ready' : 'Material shortage'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => confirmMRPReady(calcResult.order.id)}>
                      <CheckCircle size={13} /> Confirm MRP Ready
                    </Button>
                    <button onClick={() => setCalcResult(null)} className="text-xs text-blue-400 hover:text-blue-700 p-1"><X size={16} /></button>
                  </div>
                </div>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="text-blue-600 text-xs border-b border-blue-100">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">Material</th>
                        <th className="px-6 py-3 text-right font-medium">Required</th>
                        <th className="px-6 py-3 text-right font-medium">Stock</th>
                        <th className="px-6 py-3 text-left font-medium">Unit</th>
                        <th className="px-6 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                      {calcResult.materials.map((m, i) => (
                        <tr key={i} className="hover:bg-blue-50/50">
                          <td className="px-6 py-3 font-medium text-slate-900">{m.nama_material}</td>
                          <td className="px-6 py-3 text-right tabular-nums text-slate-700">{m.kebutuhan_total.toLocaleString()}</td>
                          <td className="px-6 py-3 text-right tabular-nums text-slate-700">{m.stok_aktual.toLocaleString()}</td>
                          <td className="px-6 py-3 text-slate-500 text-xs">{m.satuan}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status_stok === 'STOK AMAN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {m.status_stok === 'STOK AMAN' ? 'Ready' : 'Short'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5 font-medium">PO Number</th>
                        <th className="px-6 py-3.5 font-medium">Product</th>
                        <th className="px-6 py-3.5 font-medium text-right">Planned Qty</th>
                        <th className="px-6 py-3.5 font-medium">Start</th>
                        <th className="px-6 py-3.5 font-medium">End</th>
                        <th className="px-6 py-3.5 font-medium">Status</th>
                        <th className="px-6 py-3.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
                      ) : filteredPending.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                          <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-medium">No orders pending MRP</p>
                          <p className="text-xs mt-1 text-slate-400">
                            Go to <span className="font-semibold">Production Orders</span> tab to create a new order
                          </p>
                        </td></tr>
                      ) : filteredPending.map(o => (
                        <tr key={o.id} className="hover:bg-slate-50/60 group">
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{o.po_number}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{o.products?.name ?? '—'}</div>
                            {o.products?.sku && <div className="text-xs text-slate-400 font-mono">{o.products.sku}</div>}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums font-semibold text-slate-900">{o.planned_qty.toLocaleString()}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(o.start_date)}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(o.end_date)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ORDER_BADGE[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {ORDER_LABEL[o.status] ?? o.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm"
                              className="h-8 px-3 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => runMRP(o)}
                              disabled={calculating === o.id || (!o.product_id && !o.bom_id)}>
                              <CalendarCheck size={12} />
                              {calculating === o.id ? 'Calculating…' : 'Run MRP'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Production Orders Tab */}
        {tab === 'orders' && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 font-medium">PO Number</th>
                      <th className="px-6 py-3.5 font-medium">Product</th>
                      <th className="px-6 py-3.5 font-medium text-right">Planned Qty</th>
                      <th className="px-6 py-3.5 font-medium text-right">Actual Qty</th>
                      <th className="px-6 py-3.5 font-medium">Status</th>
                      <th className="px-6 py-3.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No production orders yet</p>
                        <p className="text-xs mt-1">Click <span className="font-semibold">New Order</span> to create one</p>
                      </td></tr>
                    ) : filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/60 group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{o.po_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{o.products?.name ?? '—'}</div>
                          {o.products?.sku && <div className="text-xs text-slate-400 font-mono">{o.products.sku}</div>}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700">{o.planned_qty.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-500">{o.actual_qty != null ? o.actual_qty.toLocaleString() : '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ORDER_BADGE[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {ORDER_LABEL[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(o.status === 'planned' || o.status === 'mrp_ready') && (
                              <Button size="sm" className="h-8 px-3 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                                onClick={() => releaseOrder(o.id)} disabled={releasingSaving === o.id}>
                                <ArrowRight size={11} />
                                {releasingSaving === o.id ? 'Releasing…' : 'Release'}
                              </Button>
                            )}
                            {(o.status === 'mrp_ready' || o.status === 'in_progress') && (
                              <Button size="sm" variant="outline" className="h-8 px-3 text-xs border-slate-300 text-slate-500 hover:text-slate-700"
                                onClick={async () => {
                                  await fetch(`/api/production/orders/${o.id}`, {
                                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'planned' }),
                                  })
                                  loadAll().catch(() => {})
                                }}>
                                ↺ Reset
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work Centers Tab */}
        {tab === 'work-centers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-sm text-slate-400 col-span-3">Loading…</p>
            ) : filteredWc.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-slate-400">
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No work centers registered</p>
              </div>
            ) : filteredWc.map(wc => (
              <Card key={wc.id} className="border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{wc.id}</span>
                      <h3 className="font-semibold text-slate-900 mt-1.5">{wc.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(wc.capacity_per_hour ?? 0) > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {(wc.capacity_per_hour ?? 0) > 0 ? 'Active' : 'Idle'}
                    </span>
                  </div>
                  {wc.capacity_per_hour != null && (
                    <p className="text-sm text-slate-700 mb-1">
                      <span className="font-semibold">{wc.capacity_per_hour.toLocaleString()}</span>
                      <span className="text-slate-400 text-xs ml-1">unit/hr</span>
                    </p>
                  )}
                  {wc.cost_per_hour != null && (
                    <p className="text-xs text-slate-400 mb-3">
                      Cost: Rp {wc.cost_per_hour.toLocaleString()}/hr
                    </p>
                  )}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-slate-200"
                      onClick={() => { setEditingWc(wc); setWcForm({ name: wc.name, capacity_per_hour: wc.capacity_per_hour != null ? String(wc.capacity_per_hour) : '', cost_per_hour: wc.cost_per_hour != null ? String(wc.cost_per_hour) : '' }); setFormError(null); setShowWcForm(true) }}>
                      <PencilSimple className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 border-red-200 text-[#dc2626] hover:bg-red-50 text-xs"
                      onClick={() => deleteWc(wc.id)}>
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Routing Tab */}
        {tab === 'routing' && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 font-medium">Operation</th>
                      <th className="px-6 py-3.5 font-medium">Work Center</th>
                      <th className="px-6 py-3.5 font-medium text-right">Setup (hr)</th>
                      <th className="px-6 py-3.5 font-medium text-right">Process (hr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-400 text-sm">Loading…</td></tr>
                    ) : filteredRouting.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-16 text-center text-slate-400">
                        <ArrowsClockwise className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No routing steps configured</p>
                      </td></tr>
                    ) : filteredRouting.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4 font-medium text-slate-900">{r.operation_name}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{r.work_center_name ?? '—'}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700">{r.setup_time ?? '—'}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700">{r.process_time ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Order Modal */}
      {showOrderForm && (
        <Modal title="New Production Order" onClose={() => setShowOrderForm(false)}>
          <div className="space-y-4">
            <Field label="Product">
              <select value={orderForm.product_id} onChange={e => setOrderForm({ ...orderForm, product_id: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                <option value="">— Select product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </Field>
            <Field label="Planned Qty">
              <Input type="number" value={orderForm.planned_qty} onChange={e => setOrderForm({ ...orderForm, planned_qty: e.target.value })} placeholder="e.g. 5000" className="h-10 border-slate-200" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date"><Input type="date" value={orderForm.start_date} onChange={e => setOrderForm({ ...orderForm, start_date: e.target.value })} className="h-10 border-slate-200" /></Field>
              <Field label="End Date"><Input type="date" value={orderForm.end_date} onChange={e => setOrderForm({ ...orderForm, end_date: e.target.value })} className="h-10 border-slate-200" /></Field>
            </div>
            {formError && <ErrorMsg msg={formError} />}
          </div>
          <ModalFooter onClose={() => setShowOrderForm(false)} onSave={saveOrder} saving={orderSaving} />
        </Modal>
      )}

      {/* WC Modal */}
      {showWcForm && (
        <Modal title={editingWc ? 'Edit Work Center' : 'New Work Center'} onClose={() => { setShowWcForm(false); setEditingWc(null) }}>
          <div className="space-y-4">
            <Field label="Name"><Input value={wcForm.name} onChange={e => setWcForm({ ...wcForm, name: e.target.value })} placeholder="e.g. Mixing Station A" className="h-10 border-slate-200" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Capacity (unit/hr)"><Input type="number" value={wcForm.capacity_per_hour} onChange={e => setWcForm({ ...wcForm, capacity_per_hour: e.target.value })} placeholder="e.g. 100" className="h-10 border-slate-200" /></Field>
              <Field label="Cost (Rp/hr)"><Input type="number" value={wcForm.cost_per_hour} onChange={e => setWcForm({ ...wcForm, cost_per_hour: e.target.value })} placeholder="e.g. 50000" className="h-10 border-slate-200" /></Field>
            </div>
            {formError && <ErrorMsg msg={formError} />}
          </div>
          <ModalFooter onClose={() => { setShowWcForm(false); setEditingWc(null) }} onSave={saveWc} saving={wcSaving} />
        </Modal>
      )}

      {/* Routing Modal */}
      {showRoutingForm && (
        <Modal title="New Routing Step" onClose={() => setShowRoutingForm(false)}>
          <div className="space-y-4">
            <Field label="Product">
              <select value={routingForm.product_id} onChange={e => setRoutingForm({ ...routingForm, product_id: e.target.value })} className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                <option value="">— Select product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </Field>
            <Field label="Operation Name"><Input value={routingForm.operation_name} onChange={e => setRoutingForm({ ...routingForm, operation_name: e.target.value })} placeholder="e.g. Mixing, Packaging" className="h-10 border-slate-200" /></Field>
            <Field label="Work Center">
              <select value={routingForm.work_center_id} onChange={e => setRoutingForm({ ...routingForm, work_center_id: e.target.value })} className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                <option value="">— Select work center —</option>
                {wcRows.map(wc => <option key={wc.id} value={wc.id}>{wc.name} ({wc.id})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Setup Time (hr)"><Input type="number" value={routingForm.setup_time} onChange={e => setRoutingForm({ ...routingForm, setup_time: e.target.value })} placeholder="e.g. 0.5" className="h-10 border-slate-200" /></Field>
              <Field label="Process Time (hr)"><Input type="number" value={routingForm.process_time} onChange={e => setRoutingForm({ ...routingForm, process_time: e.target.value })} placeholder="e.g. 2.0" className="h-10 border-slate-200" /></Field>
            </div>
            {formError && <ErrorMsg msg={formError} />}
          </div>
          <ModalFooter onClose={() => setShowRoutingForm(false)} onSave={saveRouting} saving={routingSaving} />
        </Modal>
      )}
    </ModuleLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>
}
function ErrorMsg({ msg }: { msg: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {msg}</div>
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 max-h-[65vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  )
}
function ModalFooter({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 -mx-6 -mb-6 mt-6">
      <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={onClose} disabled={saving}>Cancel</Button>
      <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}
