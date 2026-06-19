'use client'

import { useEffect, useState } from 'react'
import { X, Warning, MagnifyingGlass, Factory, Play, Pause, CheckCircle, PencilSimple } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Order = {
  id: string
  po_number: string
  product_id: string | null
  planned_qty: number
  actual_qty: number | null
  status: string
  start_date: string | null
  end_date: string | null
  products: { id: string; sku: string; name: string } | null
}

type RoutingRow = {
  id: string
  product_id: string | null
  work_center_id: string | null
  operation_name: string
  setup_time: number | null
  process_time: number | null
  work_center_name: string | null
}

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700',
  mrp_ready: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  on_hold: 'bg-orange-50 text-orange-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
}
const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  mrp_ready: 'Siap MRP',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export function ProduksiClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [routing, setRouting] = useState<RoutingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('in_progress')
  const [selected, setSelected] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Input confirmation form
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmForm, setConfirmForm] = useState({ qty_good: '', qty_scrap: '' })
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null)

  // On Hold form
  const [showHold, setShowHold] = useState(false)
  const [holdReason, setHoldReason] = useState('')

  // Step tracking per order (client-side)
  const [stepProgress, setStepProgress] = useState<Record<string, number>>({})
  const getStep = (orderId: string) => stepProgress[orderId] ?? 1
  const goToStep = (orderId: string, step: number) =>
    setStepProgress(prev => ({ ...prev, [orderId]: step }))

  const load = async () => {
    setLoading(true)
    try {
      const [ordRes, routRes] = await Promise.all([
        fetch('/api/production/orders'),
        fetch('/api/production/routing'),
      ])
      if (ordRes.ok) setOrders(await ordRes.json())
      if (routRes.ok) setRouting(await routRes.json())
    } catch { setError('Gagal memuat data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const FILTER_TABS = [
    { key: 'in_progress', label: 'In Progress' },
    { key: 'on_hold', label: 'On Hold' },
    { key: 'all', label: 'Semua' },
  ]

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = o.po_number.toLowerCase().includes(q) || (o.products?.name ?? '').toLowerCase().includes(q)
    if (statusFilter === 'all') return matchSearch
    return matchSearch && o.status === statusFilter
  })

  async function startProduction(order: Order) {
    setSaving(true)
    await fetch(`/api/production/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress', start_date: new Date().toISOString().slice(0, 10) }),
    })
    await load()
    setSaving(false)
  }

  async function holdProduction() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/production/orders/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'on_hold' }),
    })
    setShowHold(false)
    setHoldReason('')
    await load()
    setSaving(false)
  }

  async function resumeProduction(order: Order) {
    setSaving(true)
    await fetch(`/api/production/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    await load()
    setSaving(false)
  }

  async function confirmProduction() {
    if (!selected) return
    setConfirmError(null)
    const good = Number(confirmForm.qty_good)
    if (!good || good <= 0) { setConfirmError('Qty good harus > 0'); return }
    setSaving(true)
    const scrap = Number(confirmForm.qty_scrap) || 0
    const total = good + scrap
    try {
      const res = await fetch(`/api/production/orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          actual_qty: total,
          end_date: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        setConfirmError(e.error || 'Gagal menyimpan. Coba lagi.')
        setSaving(false)
        return
      }
      setShowConfirm(false)
      setConfirmForm({ qty_good: '', qty_scrap: '' })
      setConfirmSuccess(`Order ${selected.po_number} selesai. Lanjutkan ke QC & Penerimaan.`)
      setStatusFilter('all')
      await load()
    } catch {
      setConfirmError('Terjadi kesalahan koneksi.')
    } finally {
      setSaving(false)
    }
  }

  const inProgressCount = orders.filter(o => o.status === 'in_progress').length
  const onHoldCount = orders.filter(o => o.status === 'on_hold').length

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Produksi' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="Produksi" />
            <p className="text-slate-500 -mt-4 text-sm">
              <span className="text-amber-600 font-medium">{inProgressCount} in progress</span>
              {onHoldCount > 0 && <> · <span className="text-orange-600 font-medium">{onHoldCount} on hold</span></>}
            </p>
          </div>
        </div>

        {/* OEE Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'In Progress', value: inProgressCount, cls: 'text-amber-600' },
            { label: 'On Hold', value: onHoldCount, cls: 'text-orange-600' },
            { label: 'Selesai Hari Ini', value: orders.filter(o => o.status === 'completed' && o.end_date === new Date().toISOString().slice(0, 10)).length, cls: 'text-green-600' },
          ].map(s => (
            <Card key={s.label} className="border-slate-200 bg-white">
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari PO atau produk..." className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {FILTER_TABS.map(t => (
              <button key={t.key} onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>{t.label}</button>
            ))}
          </div>
        </div>

        {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {error}</div>}
        {confirmSuccess && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" weight="fill" /> {confirmSuccess}
            </div>
            <button onClick={() => setConfirmSuccess(null)} className="text-green-500 hover:text-green-700 ml-4">✕</button>
          </div>
        )}

        {/* Order Cards */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">Memuat data…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Factory size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">Tidak ada produksi yang sesuai filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => {
              const orderRouting = routing.filter(r => r.product_id === order.product_id)
              const currentStep = order.status === 'completed' ? orderRouting.length + 1 : getStep(order.id)
              const totalSteps = orderRouting.length
              const stepPct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0
              const pct = order.status === 'completed' ? 100 : order.status === 'on_hold' ? stepPct : stepPct
              return (
                <Card key={order.id} className="border-slate-200 bg-white hover:shadow-sm transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{order.po_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                          {order.status === 'in_progress' && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Sedang berjalan
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-900">{order.products?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{order.products?.sku}</p>

                        {/* Progress */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              order.status === 'completed' ? 'bg-green-500' :
                              order.status === 'on_hold' ? 'bg-orange-400' : 'bg-amber-500'
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                            {totalSteps > 0
                              ? `Step ${Math.min(currentStep, totalSteps)}/${totalSteps} (${pct}%)`
                              : `0 / ${order.planned_qty.toLocaleString()} unit`}
                          </span>
                        </div>

                        {/* Routing Steps — klik untuk advance */}
                        {orderRouting.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                            {orderRouting.slice(0, 6).map((step, idx) => {
                              const stepNum = idx + 1
                              const isDone = order.status === 'completed' || stepNum < currentStep
                              const isActive = stepNum === currentStep && order.status === 'in_progress'
                              const isClickable = order.status === 'in_progress' && stepNum !== currentStep
                              return (
                                <div key={step.id} className="flex items-center gap-1.5 flex-shrink-0">
                                  {idx > 0 && <span className="text-slate-300 text-xs">→</span>}
                                  <button
                                    onClick={() => isClickable && goToStep(order.id, stepNum)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                                      isDone ? 'bg-green-50 border-green-200 text-green-700' :
                                      isActive ? 'bg-amber-50 border-amber-300 text-amber-700 ring-1 ring-amber-300' :
                                      isClickable ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 cursor-pointer' :
                                      'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
                                    }`}
                                  >
                                    {isDone
                                      ? <span className="text-green-500 font-bold">✓</span>
                                      : <span className="font-mono w-4 text-center">{stepNum}</span>}
                                    <span className="font-medium">{step.operation_name}</span>
                                    {(step.setup_time || step.process_time) && (
                                      <span className="opacity-60">· {((step.setup_time ?? 0) + (step.process_time ?? 0))}m</span>
                                    )}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {order.status === 'mrp_ready' ? (
                          <Button size="sm" className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-xs"
                            onClick={() => startProduction(order)} disabled={saving}>
                            <Play size={13} weight="fill" /> Mulai
                          </Button>
                        ) : order.status === 'in_progress' ? (
                          <>
                            <Button size="sm" className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
                              onClick={() => { setSelected(order); setShowConfirm(true) }} disabled={saving}>
                              <CheckCircle size={13} weight="fill" /> Konfirmasi
                            </Button>
                            <Button size="sm" variant="outline" className="h-9 px-4 border-orange-300 text-orange-600 hover:bg-orange-50 gap-1.5 text-xs"
                              onClick={() => { setSelected(order); setShowHold(true) }} disabled={saving}>
                              <Pause size={13} weight="fill" /> On Hold
                            </Button>
                          </>
                        ) : order.status === 'on_hold' ? (
                          <Button size="sm" className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-xs"
                            onClick={() => resumeProduction(order)} disabled={saving}>
                            <Play size={13} weight="fill" /> Lanjut
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" className="h-9 px-4 text-xs gap-1 text-slate-500"
                          onClick={() => setSelected(order)}>
                          <PencilSimple size={13} /> Detail
                        </Button>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Production Confirmation Modal */}
      {showConfirm && selected && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Konfirmasi Produksi</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selected.po_number} · {selected.products?.name}</p>
                </div>
                <button onClick={() => setShowConfirm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Planned Qty</p>
                  <p className="text-xl font-bold text-slate-900">{selected.planned_qty.toLocaleString()} unit</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Qty Good (Lulus QC)">
                    <Input type="number" value={confirmForm.qty_good}
                      onChange={e => setConfirmForm({ ...confirmForm, qty_good: e.target.value })}
                      placeholder="e.g. 4850" className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Qty Scrap">
                    <Input type="number" value={confirmForm.qty_scrap}
                      onChange={e => setConfirmForm({ ...confirmForm, qty_scrap: e.target.value })}
                      placeholder="e.g. 50" className="h-10 border-slate-200" />
                  </Field>
                </div>
                {(Number(confirmForm.qty_good) + Number(confirmForm.qty_scrap)) > 0 && (
                  <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-700">
                    <strong>Yield Rate:</strong>{' '}
                    {Math.round((Number(confirmForm.qty_good) / (Number(confirmForm.qty_good) + Number(confirmForm.qty_scrap))) * 100)}%
                    ({Number(confirmForm.qty_good).toLocaleString()} good dari {(Number(confirmForm.qty_good) + Number(confirmForm.qty_scrap)).toLocaleString()} total)
                  </div>
                )}
                {confirmError && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {confirmError}</div>}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowConfirm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white" onClick={confirmProduction} disabled={saving}>
                  {saving ? 'Menyimpan…' : '✓ Konfirmasi Selesai'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* On Hold Modal */}
      {showHold && selected && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowHold(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Tahan Produksi (On Hold)</h2>
                <button onClick={() => setShowHold(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 rounded-lg px-4 py-3 text-sm text-orange-700 border border-orange-200">
                  <strong>{selected.po_number}</strong> akan ditahan. Masukkan alasan kendala.
                </div>
                <Field label="Alasan On Hold">
                  <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)}
                    rows={3} placeholder="Mesin rusak, bahan baku habis, dll..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
                </Field>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowHold(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 text-white" onClick={holdProduction} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Tahan Produksi'}
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
