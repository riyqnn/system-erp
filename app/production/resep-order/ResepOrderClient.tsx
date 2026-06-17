'use client'

import { useEffect, useState } from 'react'
import { X, Warning, MagnifyingGlass, CheckCircle, XCircle, ClipboardText, ArrowRight, Gear } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Product = { id: string; sku: string; name: string; unit: string }
type BomItem = { id: string; material_id: string | null; quantity: number; unit: string; products: { name: string; sku: string } | null }
type Bom = { id: string; product_id: string | null; version: string; status: string; production_bom_details?: BomItem[] }
type RoutingRow = { id: string; work_center_id: string | null; sequence: number; operation_name: string; duration_hours: number | null }

type Order = {
  id: string
  po_number: string
  product_id: string | null
  planned_qty: number
  start_date: string | null
  end_date: string | null
  status: string
  products: { id: string; sku: string; name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  mrp_ready: 'Siap MRP',
  in_progress: 'In Progress',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}
const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700',
  mrp_ready: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function ResepOrderClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [boms, setBoms] = useState<Bom[]>([])
  const [routingRows, setRoutingRows] = useState<RoutingRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'no_bom' | 'mrp_ready'>('all')
  const [detail, setDetail] = useState<Order | null>(null)
  const [detailBom, setDetailBom] = useState<Bom | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewOrderForm, setShowNewOrderForm] = useState(false)
  const [newForm, setNewForm] = useState({ product_id: '', planned_qty: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [ordRes, bomRes, routRes, prodRes] = await Promise.all([
        fetch('/api/production/orders'),
        fetch('/api/production/bom'),
        fetch('/api/production/routing'),
        fetch('/api/production/products'),
      ])
      if (ordRes.ok) setOrders(await ordRes.json())
      if (bomRes.ok) setBoms(await bomRes.json())
      if (routRes.ok) setRoutingRows(await routRes.json())
      if (prodRes.ok) setProducts(await prodRes.json())
    } catch { setError('Gagal memuat data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const hasBom = (productId: string | null) => productId && boms.some(b => b.product_id === productId && b.status === 'active')

  const displayOrders = orders.filter(o => ['planned', 'mrp_ready'].includes(o.status))
  const filtered = displayOrders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = o.po_number.toLowerCase().includes(q) || (o.products?.name ?? '').toLowerCase().includes(q)
    if (filter === 'no_bom') return matchSearch && !hasBom(o.product_id)
    if (filter === 'mrp_ready') return matchSearch && o.status === 'mrp_ready'
    return matchSearch
  })

  async function openDetail(order: Order) {
    setDetail(order)
    if (order.product_id) {
      const bom = boms.find(b => b.product_id === order.product_id && b.status === 'active') ?? null
      if (bom) {
        try {
          const res = await fetch(`/api/production/bom/${bom.id}`)
          if (res.ok) setDetailBom(await res.json())
          else setDetailBom(bom)
        } catch { setDetailBom(bom) }
      } else setDetailBom(null)
    }
  }

  async function confirmMRP() {
    if (!detail) return
    setConfirming(true)
    try {
      await fetch(`/api/production/orders/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'mrp_ready' }),
      })
      setDetail(prev => prev ? { ...prev, status: 'mrp_ready' } : null)
      await load()
    } finally { setConfirming(false) }
  }

  async function saveNewOrder() {
    if (!newForm.planned_qty || Number(newForm.planned_qty) <= 0) { setFormError('Planned qty harus > 0'); return }
    setSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: newForm.product_id || null,
          planned_qty: Number(newForm.planned_qty),
          start_date: newForm.start_date || null,
          end_date: newForm.end_date || null,
          status: 'planned',
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowNewOrderForm(false)
      setNewForm({ product_id: '', planned_qty: '', start_date: '', end_date: '' })
      await load()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  const bomReadyCount = displayOrders.filter(o => hasBom(o.product_id)).length
  const mrpReadyCount = displayOrders.filter(o => o.status === 'mrp_ready').length

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Resep & Order' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production · UC-02</p>
            <ModuleHeader title="Resep & Order" />
            <p className="text-slate-500 -mt-4 text-sm">
              {displayOrders.length} orders masuk ·{' '}
              <span className="text-emerald-600 font-medium">{bomReadyCount} BOM verified</span>
              {mrpReadyCount > 0 && <> · <span className="text-emerald-700 font-semibold">{mrpReadyCount} Siap MRP</span></>}
            </p>
          </div>
          <Button onClick={() => { setNewForm({ product_id: '', planned_qty: '', start_date: '', end_date: '' }); setFormError(null); setShowNewOrderForm(true) }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <ClipboardText className="w-4 h-4" weight="bold" /> New Order
          </Button>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <ClipboardText size={18} weight="bold" className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold">Alur Resep & Order (UC-02)</p>
            <p className="text-xs mt-0.5 text-blue-600">1. Terima order → 2. Verifikasi BOM & Routing → 3. Konfirmasi <span className="font-semibold">Siap MRP</span> → 4. Lanjut ke Rencana MRP</p>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari PO atau produk..." className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([['all', 'Semua'], ['no_bom', 'Belum BOM'], ['mrp_ready', 'Siap MRP']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  filter === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>{l}</button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="w-4 h-4" weight="fill" /> {error}
          </div>
        )}

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">PO Number</th>
                    <th className="px-6 py-3.5 font-medium">Produk</th>
                    <th className="px-6 py-3.5 font-medium text-right">Qty</th>
                    <th className="px-6 py-3.5 font-medium">Deadline</th>
                    <th className="px-6 py-3.5 font-medium text-center">BOM</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <ClipboardText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada order</p>
                      <p className="text-xs mt-1">Klik &quot;New Order&quot; untuk membuat production order baru</p>
                    </td></tr>
                  ) : filtered.map(order => {
                    const bomOk = hasBom(order.product_id)
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors group cursor-pointer" onClick={() => openDetail(order)}>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-900">{order.po_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{order.products?.name ?? '—'}</div>
                          {order.products?.sku && <div className="text-xs text-slate-400 font-mono mt-0.5">{order.products.sku}</div>}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums font-semibold text-slate-900">{order.planned_qty.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(order.end_date)}</td>
                        <td className="px-6 py-4 text-center">
                          {bomOk
                            ? <CheckCircle size={18} weight="fill" className="text-green-500 mx-auto" />
                            : <XCircle size={18} weight="fill" className="text-slate-300 mx-auto" />}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => { e.stopPropagation(); openDetail(order) }}>
                            Detail <ArrowRight size={12} />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Drawer */}
      {detail && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => { setDetail(null); setDetailBom(null) }} />
          <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">{detail.po_number}</span>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{detail.products?.name ?? 'No Product'}</h2>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${STATUS_BADGE[detail.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABEL[detail.status] ?? detail.status}
                </span>
              </div>
              <button onClick={() => { setDetail(null); setDetailBom(null) }} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'SKU', value: detail.products?.sku ?? '—' },
                  { label: 'Qty Rencana', value: detail.planned_qty.toLocaleString() + ' unit' },
                  { label: 'Start Date', value: fmtDate(detail.start_date) },
                  { label: 'Deadline', value: fmtDate(detail.end_date) },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* BOM Verification */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gear size={15} weight="bold" className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">Bill of Materials</span>
                  </div>
                  {detailBom
                    ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">v{detailBom.version} · Active</span>
                    : <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Belum ada BOM</span>}
                </div>
                {detailBom?.production_bom_details && detailBom.production_bom_details.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/50 text-slate-400">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Material</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                        <th className="px-4 py-2 text-left font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailBom.production_bom_details.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5 text-slate-700">{item.products?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 font-medium">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-slate-400">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">
                    {detailBom ? 'Tidak ada material detail di BOM' : 'BOM belum tersedia untuk produk ini'}
                  </div>
                )}
              </div>

              {/* Routing */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2">
                  <Gear size={15} weight="bold" className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Routing / Alur Produksi</span>
                </div>
                {routingRows.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {routingRows.sort((a, b) => a.sequence - b.sequence).slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded w-6 text-center">{r.sequence}</span>
                        <span className="text-xs font-medium text-slate-900 flex-1">{r.operation_name}</span>
                        {r.duration_hours && <span className="text-xs text-slate-400">{r.duration_hours}h</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">Routing belum dikonfigurasi</div>
                )}
              </div>

            </div>

            <div className="p-6 border-t border-slate-100 space-y-3">
              {detail.status !== 'mrp_ready' && (
                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
                  onClick={confirmMRP}
                  disabled={confirming || !hasBom(detail.product_id)}
                >
                  {confirming ? 'Mengonfirmasi…' : (
                    hasBom(detail.product_id)
                      ? '✓ Konfirmasi Siap MRP'
                      : 'Perlu BOM untuk konfirmasi'
                  )}
                </Button>
              )}
              {detail.status === 'mrp_ready' && (
                <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Sudah Siap MRP</span>
                </div>
              )}
              <Button variant="outline" className="w-full h-10 border-slate-200" onClick={() => { setDetail(null); setDetailBom(null) }}>
                Tutup
              </Button>
            </div>
          </div>
        </>
      )}

      {/* New Order Modal */}
      {showNewOrderForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowNewOrderForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">New Production Order</h2>
                <button onClick={() => setShowNewOrderForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <Field label="Produk">
                  <select value={newForm.product_id} onChange={e => setNewForm({ ...newForm, product_id: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                    <option value="">— Pilih produk —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </Field>
                <Field label="Planned Quantity">
                  <Input type="number" value={newForm.planned_qty} onChange={e => setNewForm({ ...newForm, planned_qty: e.target.value })}
                    placeholder="e.g. 5000" className="h-10 border-slate-200" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date">
                    <Input type="date" value={newForm.start_date} onChange={e => setNewForm({ ...newForm, start_date: e.target.value })} className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Deadline">
                    <Input type="date" value={newForm.end_date} onChange={e => setNewForm({ ...newForm, end_date: e.target.value })} className="h-10 border-slate-200" />
                  </Field>
                </div>
                {formError && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {formError}</div>}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowNewOrderForm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={saveNewOrder} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
