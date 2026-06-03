'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Warning, MagnifyingGlass, CalendarCheck, Wrench, ArrowsClockwise, Trash, PencilSimple } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Product = { id: string; sku: string; name: string }
type WorkCenter = { id: string; code: string; name: string; type: string | null; capacity: number | null; capacity_unit: string | null; status: string; notes: string | null }
type MrpRow = { id: string; product_id: string | null; planned_qty: number; planned_start: string | null; planned_end: string | null; status: string; notes: string | null; products: { id: string; sku: string; name: string } | null }
type RoutingRow = { id: string; bom_id: string | null; work_center_id: string | null; sequence: number; operation_name: string; duration_hours: number | null; notes: string | null }

const MRP_STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700',
  released: 'bg-amber-50 text-amber-700',
  closed: 'bg-green-50 text-green-700',
}
const WC_STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',
  maintenance: 'bg-amber-50 text-amber-700',
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

type Tab = 'mrp' | 'work-centers' | 'routing'

export function PlanningClient() {
  const [tab, setTab] = useState<Tab>('mrp')
  const [mrpRows, setMrpRows] = useState<MrpRow[]>([])
  const [wcRows, setWcRows] = useState<WorkCenter[]>([])
  const [routingRows, setRoutingRows] = useState<RoutingRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  // MRP Form
  const [showMrpForm, setShowMrpForm] = useState(false)
  const [mrpForm, setMrpForm] = useState({ product_id: '', planned_qty: '', planned_start: '', planned_end: '', status: 'open', notes: '' })
  const [mrpSaving, setMrpSaving] = useState(false)

  // WC Form
  const [showWcForm, setShowWcForm] = useState(false)
  const [editingWc, setEditingWc] = useState<WorkCenter | null>(null)
  const [wcForm, setWcForm] = useState({ code: '', name: '', type: '', capacity: '', capacity_unit: 'unit/hr', status: 'active', notes: '' })
  const [wcSaving, setWcSaving] = useState(false)

  // Routing Form
  const [showRoutingForm, setShowRoutingForm] = useState(false)
  const [routingForm, setRoutingForm] = useState({ bom_id: '', work_center_id: '', sequence: '1', operation_name: '', duration_hours: '', notes: '' })
  const [routingSaving, setRoutingSaving] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [mrpRes, wcRes, routingRes, prodRes] = await Promise.all([
        fetch('/api/production/mrp'),
        fetch('/api/production/work-centers'),
        fetch('/api/production/routing'),
        fetch('/api/production/products'),
      ])
      if (mrpRes.ok) setMrpRows(await mrpRes.json())
      if (wcRes.ok) setWcRows(await wcRes.json())
      if (routingRes.ok) setRoutingRows(await routingRes.json())
      if (prodRes.ok) setProducts(await prodRes.json())
    } catch { setError('Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const filteredMrp = mrpRows.filter(r =>
    (r.products?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredWc = wcRows.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase())
  )
  const filteredRouting = routingRows.filter(r =>
    r.operation_name.toLowerCase().includes(search.toLowerCase())
  )

  async function saveMrp() {
    if (!mrpForm.planned_qty || Number(mrpForm.planned_qty) <= 0) { setFormError('Planned quantity harus > 0'); return }
    setMrpSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/production/mrp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: mrpForm.product_id || null,
          planned_qty: Number(mrpForm.planned_qty),
          planned_start: mrpForm.planned_start || null,
          planned_end: mrpForm.planned_end || null,
          status: mrpForm.status,
          notes: mrpForm.notes.trim() || null,
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowMrpForm(false)
      setMrpForm({ product_id: '', planned_qty: '', planned_start: '', planned_end: '', status: 'open', notes: '' })
      await loadAll()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setMrpSaving(false) }
  }

  async function saveWc() {
    if (!wcForm.code.trim() || !wcForm.name.trim()) { setFormError('Kode dan nama wajib diisi'); return }
    setWcSaving(true); setFormError(null)
    try {
      const payload = {
        code: wcForm.code.trim(),
        name: wcForm.name.trim(),
        type: wcForm.type.trim() || null,
        capacity: wcForm.capacity ? Number(wcForm.capacity) : null,
        capacity_unit: wcForm.capacity_unit || null,
        status: wcForm.status,
        notes: wcForm.notes.trim() || null,
      }
      const url = editingWc ? `/api/production/work-centers/${editingWc.id}` : '/api/production/work-centers'
      const res = await fetch(url, {
        method: editingWc ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowWcForm(false)
      setEditingWc(null)
      await loadAll()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setWcSaving(false) }
  }

  async function deleteWc(id: string) {
    if (!confirm('Hapus work center ini?')) return
    await fetch(`/api/production/work-centers/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function saveRouting() {
    if (!routingForm.operation_name.trim()) { setFormError('Nama operasi wajib diisi'); return }
    setRoutingSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/production/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bom_id: routingForm.bom_id || null,
          work_center_id: routingForm.work_center_id || null,
          sequence: Number(routingForm.sequence) || 1,
          operation_name: routingForm.operation_name.trim(),
          duration_hours: routingForm.duration_hours ? Number(routingForm.duration_hours) : null,
          notes: routingForm.notes.trim() || null,
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowRoutingForm(false)
      setRoutingForm({ bom_id: '', work_center_id: '', sequence: '1', operation_name: '', duration_hours: '', notes: '' })
      await loadAll()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setRoutingSaving(false) }
  }

  const tabs: { key: Tab; label: string; icon: typeof CalendarCheck; count: number }[] = [
    { key: 'mrp', label: 'MRP', icon: CalendarCheck, count: mrpRows.length },
    { key: 'work-centers', label: 'Work Centers', icon: Wrench, count: wcRows.length },
    { key: 'routing', label: 'Routing', icon: ArrowsClockwise, count: routingRows.length },
  ]

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Planning' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="Planning" />
            <p className="text-slate-500 -mt-4 text-sm">
              {mrpRows.length} MRP · {wcRows.length} work centers · {routingRows.length} routing steps
            </p>
          </div>
          <Button
            onClick={() => {
              setFormError(null)
              if (tab === 'mrp') setShowMrpForm(true)
              else if (tab === 'work-centers') { setEditingWc(null); setWcForm({ code: '', name: '', type: '', capacity: '', capacity_unit: 'unit/hr', status: 'active', notes: '' }); setShowWcForm(true) }
              else setShowRoutingForm(true)
            }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2"
          >
            <Plus className="w-4 h-4" weight="bold" />
            {tab === 'mrp' ? 'New MRP' : tab === 'work-centers' ? 'New Work Center' : 'New Routing'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 rounded-xl p-1 w-fit">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch('') }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
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
          <Input
            placeholder="Cari..."
            className="pl-9 h-10 border-slate-200 bg-white text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="w-4 h-4" weight="fill" /> {error}
          </div>
        )}

        {/* MRP Tab */}
        {tab === 'mrp' && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 font-medium">Produk</th>
                      <th className="px-6 py-3.5 font-medium text-right">Planned Qty</th>
                      <th className="px-6 py-3.5 font-medium">Start</th>
                      <th className="px-6 py-3.5 font-medium">End</th>
                      <th className="px-6 py-3.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                    ) : filteredMrp.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                        <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Belum ada MRP</p>
                      </td></tr>
                    ) : filteredMrp.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{r.products?.name ?? '—'}</div>
                          {r.products?.sku && <div className="text-xs text-slate-400 font-mono mt-0.5">{r.products.sku}</div>}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-900">{r.planned_qty.toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.planned_start)}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.planned_end)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${MRP_STATUS_BADGE[r.status]}`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
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
              <p className="text-sm text-slate-400 col-span-3">Memuat data…</p>
            ) : filteredWc.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-slate-400">
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Belum ada work center</p>
              </div>
            ) : filteredWc.map(wc => (
              <Card key={wc.id} className="border-slate-200 shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{wc.code}</span>
                      <h3 className="font-semibold text-slate-900 mt-1.5">{wc.name}</h3>
                      {wc.type && <p className="text-xs text-slate-500 mt-0.5">{wc.type}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WC_STATUS_BADGE[wc.status]}`}>
                      {wc.status.charAt(0).toUpperCase() + wc.status.slice(1)}
                    </span>
                  </div>
                  {wc.capacity && (
                    <p className="text-sm text-slate-700 mb-3">
                      <span className="font-semibold">{wc.capacity.toLocaleString()}</span>
                      <span className="text-slate-400 text-xs ml-1">{wc.capacity_unit}</span>
                    </p>
                  )}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-slate-200"
                      onClick={() => { setEditingWc(wc); setWcForm({ code: wc.code, name: wc.name, type: wc.type ?? '', capacity: wc.capacity != null ? String(wc.capacity) : '', capacity_unit: wc.capacity_unit ?? 'unit/hr', status: wc.status, notes: wc.notes ?? '' }); setFormError(null); setShowWcForm(true) }}>
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
                      <th className="px-6 py-3.5 font-medium text-right">Seq</th>
                      <th className="px-6 py-3.5 font-medium">Operation</th>
                      <th className="px-6 py-3.5 font-medium text-right">Duration (hr)</th>
                      <th className="px-6 py-3.5 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                    ) : filteredRouting.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                        <ArrowsClockwise className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Belum ada routing</p>
                      </td></tr>
                    ) : filteredRouting.sort((a, b) => a.sequence - b.sequence).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{r.sequence}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{r.operation_name}</td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700">
                          {r.duration_hours != null ? r.duration_hours : '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{r.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MRP Modal */}
      {showMrpForm && (
        <Modal title="New MRP Entry" onClose={() => setShowMrpForm(false)}>
          <div className="space-y-4">
            <Field label="Produk">
              <select value={mrpForm.product_id} onChange={e => setMrpForm({ ...mrpForm, product_id: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                <option value="">— Pilih produk —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Planned Qty">
                <Input type="number" value={mrpForm.planned_qty} onChange={e => setMrpForm({ ...mrpForm, planned_qty: e.target.value })} placeholder="e.g. 5000" className="h-10 border-slate-200" />
              </Field>
              <Field label="Status">
                <select value={mrpForm.status} onChange={e => setMrpForm({ ...mrpForm, status: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                  <option value="open">Open</option>
                  <option value="released">Released</option>
                  <option value="closed">Closed</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Planned Start">
                <Input type="date" value={mrpForm.planned_start} onChange={e => setMrpForm({ ...mrpForm, planned_start: e.target.value })} className="h-10 border-slate-200" />
              </Field>
              <Field label="Planned End">
                <Input type="date" value={mrpForm.planned_end} onChange={e => setMrpForm({ ...mrpForm, planned_end: e.target.value })} className="h-10 border-slate-200" />
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={mrpForm.notes} onChange={e => setMrpForm({ ...mrpForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
            </Field>
            {formError && <ErrorMsg msg={formError} />}
          </div>
          <ModalFooter onClose={() => setShowMrpForm(false)} onSave={saveMrp} saving={mrpSaving} />
        </Modal>
      )}

      {/* Work Center Modal */}
      {showWcForm && (
        <Modal title={editingWc ? 'Edit Work Center' : 'New Work Center'} onClose={() => { setShowWcForm(false); setEditingWc(null) }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kode">
                <Input value={wcForm.code} onChange={e => setWcForm({ ...wcForm, code: e.target.value })} placeholder="e.g. WC-001" className="h-10 border-slate-200" disabled={!!editingWc} />
              </Field>
              <Field label="Status">
                <select value={wcForm.status} onChange={e => setWcForm({ ...wcForm, status: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </Field>
            </div>
            <Field label="Nama Work Center">
              <Input value={wcForm.name} onChange={e => setWcForm({ ...wcForm, name: e.target.value })} placeholder="e.g. Mixing Station A" className="h-10 border-slate-200" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Input value={wcForm.type} onChange={e => setWcForm({ ...wcForm, type: e.target.value })} placeholder="e.g. Mixing, Packaging" className="h-10 border-slate-200" />
              </Field>
              <Field label="Capacity">
                <Input type="number" value={wcForm.capacity} onChange={e => setWcForm({ ...wcForm, capacity: e.target.value })} placeholder="e.g. 100" className="h-10 border-slate-200" />
              </Field>
            </div>
            <Field label="Capacity Unit">
              <Input value={wcForm.capacity_unit} onChange={e => setWcForm({ ...wcForm, capacity_unit: e.target.value })} placeholder="e.g. unit/hr" className="h-10 border-slate-200" />
            </Field>
            <Field label="Notes">
              <textarea value={wcForm.notes} onChange={e => setWcForm({ ...wcForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
            </Field>
            {formError && <ErrorMsg msg={formError} />}
          </div>
          <ModalFooter onClose={() => { setShowWcForm(false); setEditingWc(null) }} onSave={saveWc} saving={wcSaving} />
        </Modal>
      )}

      {/* Routing Modal */}
      {showRoutingForm && (
        <Modal title="New Routing Step" onClose={() => setShowRoutingForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sequence">
                <Input type="number" value={routingForm.sequence} onChange={e => setRoutingForm({ ...routingForm, sequence: e.target.value })} className="h-10 border-slate-200" />
              </Field>
              <Field label="Duration (hr)">
                <Input type="number" value={routingForm.duration_hours} onChange={e => setRoutingForm({ ...routingForm, duration_hours: e.target.value })} placeholder="e.g. 2.5" className="h-10 border-slate-200" />
              </Field>
            </div>
            <Field label="Operation Name">
              <Input value={routingForm.operation_name} onChange={e => setRoutingForm({ ...routingForm, operation_name: e.target.value })} placeholder="e.g. Mixing, Coating, Packaging" className="h-10 border-slate-200" />
            </Field>
            <Field label="Work Center">
              <select value={routingForm.work_center_id} onChange={e => setRoutingForm({ ...routingForm, work_center_id: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                <option value="">— Pilih work center —</option>
                {wcRows.map(wc => <option key={wc.id} value={wc.id}>{wc.name} ({wc.code})</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea value={routingForm.notes} onChange={e => setRoutingForm({ ...routingForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
            </Field>
            {formError && <ErrorMsg msg={formError} />}
          </div>
          <ModalFooter onClose={() => setShowRoutingForm(false)} onSave={saveRouting} saving={routingSaving} />
        </Modal>
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

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <Warning className="w-4 h-4" weight="fill" /> {msg}
    </div>
  )
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
      <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={onClose} disabled={saving}>Batal</Button>
      <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={onSave} disabled={saving}>
        {saving ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </div>
  )
}
