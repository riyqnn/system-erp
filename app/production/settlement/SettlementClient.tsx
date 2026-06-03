'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Warning, MagnifyingGlass, Receipt, Eye, Lock, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Order = { id: string; po_number: string; planned_qty: number; products: { name: string; sku: string } | null }
type Settlement = {
  id: string
  production_order_id: string | null
  settlement_date: string
  actual_cost: number | null
  variance: number | null
  status: 'draft' | 'settled' | 'cancelled'
  notes: string | null
  production_orders: { po_number: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  settled: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  settled: 'Closed',
  cancelled: 'Cancelled',
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const rupiah = (n: number | null) =>
  n != null ? 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID') : '—'

type FormState = {
  production_order_id: string
  settlement_date: string
  material_cost: string
  labor_cost: string
  overhead_cost: string
  standard_cost: string
  notes: string
  root_cause: string
}
const emptyForm: FormState = {
  production_order_id: '',
  settlement_date: new Date().toISOString().slice(0, 10),
  material_cost: '',
  labor_cost: '',
  overhead_cost: '',
  standard_cost: '',
  notes: '',
  root_cause: '',
}

const VARIANCE_THRESHOLD = 5 // percent

export function SettlementClient() {
  const [rows, setRows] = useState<Settlement[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [detail, setDetail] = useState<Settlement | null>(null)
  const [closing, setClosing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [stRes, ordRes] = await Promise.all([
        fetch('/api/production/settlement'),
        fetch('/api/production/orders'),
      ])
      if (stRes.ok) setRows(await stRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
    } catch { setError('Gagal memuat data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = (r.production_orders?.po_number ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  // Compute totals from form
  const actualTotal = (Number(form.material_cost) || 0) + (Number(form.labor_cost) || 0) + (Number(form.overhead_cost) || 0)
  const standard = Number(form.standard_cost) || 0
  const variance = standard > 0 ? actualTotal - standard : 0
  const variancePct = standard > 0 ? ((variance / standard) * 100) : 0
  const overThreshold = Math.abs(variancePct) > VARIANCE_THRESHOLD

  async function handleSave() {
    setFormError(null)
    if (!actualTotal) { setFormError('Total biaya aktual harus diisi'); return }
    setSaving(true)
    const noteParts = [
      form.notes.trim(),
      form.root_cause ? `[ROOT_CAUSE] ${form.root_cause}` : '',
      `[MAT:${Number(form.material_cost) || 0}]`,
      `[LAB:${Number(form.labor_cost) || 0}]`,
      `[OVH:${Number(form.overhead_cost) || 0}]`,
      form.standard_cost ? `[STD:${standard}]` : '',
      overThreshold ? `[VARIANCE_NOTE] Variance ${variancePct.toFixed(1)}% melewati threshold ${VARIANCE_THRESHOLD}%` : '',
    ].filter(Boolean).join(' ')

    try {
      const res = await fetch('/api/production/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: form.production_order_id || null,
          settlement_date: form.settlement_date,
          actual_cost: actualTotal,
          variance: variance || null,
          status: 'draft',
          notes: noteParts || null,
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowForm(false)
      setForm(emptyForm)
      await load()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  async function closeOrder(settlement: Settlement) {
    setClosing(true)
    try {
      await Promise.all([
        fetch(`/api/production/orders/${settlement.production_order_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }),
        fetch(`/api/production/settlement/${settlement.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'settled' }),
        }),
      ])
      setDetail(null)
      await load()
    } finally { setClosing(false) }
  }

  const settledCount = rows.filter(r => r.status === 'settled').length
  const totalCost = rows.filter(r => r.status === 'settled').reduce((s, r) => s + (r.actual_cost ?? 0), 0)
  const cogm = totalCost

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Penyelesaian' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production · UC-08</p>
            <ModuleHeader title="Penyelesaian (Order Settlement)" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} records ·{' '}
              <span className="text-green-600 font-medium">{settledCount} closed</span>
              {totalCost > 0 && <> · COGM total {rupiah(cogm)}</>}
            </p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setFormError(null); setShowForm(true) }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> New Settlement
          </Button>
        </div>

        {/* COGM Summary Card */}
        {totalCost > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total COGM', value: rupiah(cogm), cls: 'text-slate-900' },
              { label: 'Orders Closed', value: settledCount, cls: 'text-green-600' },
              { label: 'Rata-rata per Order', value: settledCount > 0 ? rupiah(cogm / settledCount) : '—', cls: 'text-slate-700' },
            ].map(s => (
              <Card key={s.label} className="border-slate-200 bg-white">
                <CardContent className="p-4">
                  <p className={`text-xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari PO number..." className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['All', 'draft', 'settled', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                {s === 'All' ? 'Semua' : STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {error}</div>}

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">Production Order</th>
                    <th className="px-6 py-3.5 font-medium">Settlement Date</th>
                    <th className="px-6 py-3.5 font-medium text-right">Actual Cost</th>
                    <th className="px-6 py-3.5 font-medium text-right">Variance</th>
                    <th className="px-6 py-3.5 font-medium text-right">Variance %</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Belum ada data settlement</p>
                    </td></tr>
                  ) : filtered.map(r => {
                    const stdNote = r.notes?.match(/\[STD:(\d+)\]/)?.[1]
                    const std = stdNote ? Number(stdNote) : null
                    const vPct = std && r.actual_cost ? ((r.actual_cost - std) / std) * 100 : null
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{r.production_orders?.po_number ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.settlement_date)}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-semibold text-slate-900">{rupiah(r.actual_cost)}</td>
                        <td className={`px-6 py-4 text-right tabular-nums font-medium ${
                          r.variance != null && r.variance < 0 ? 'text-[#dc2626]' :
                          r.variance != null && r.variance > 0 ? 'text-green-600' : 'text-slate-400'
                        }`}>
                          {r.variance != null ? (r.variance > 0 ? '+' : '') + rupiah(r.variance) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {vPct != null ? (
                            <span className={`text-xs font-semibold tabular-nums ${
                              Math.abs(vPct) > VARIANCE_THRESHOLD ? 'text-red-600' :
                              Math.abs(vPct) > 2 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                              {vPct > 0 ? '+' : ''}{vPct.toFixed(1)}%
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setDetail(r)}>
                            <Eye className="w-4 h-4" />
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

      {/* New Settlement Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">New Order Settlement</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Hitung actual cost vs standard cost</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Production Order">
                    <select value={form.production_order_id} onChange={e => setForm({ ...form, production_order_id: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      <option value="">— Pilih production order —</option>
                      {orders.map(o => <option key={o.id} value={o.id}>{o.po_number}{o.products ? ` · ${o.products.name}` : ''}</option>)}
                    </select>
                  </Field>
                  <Field label="Settlement Date">
                    <Input type="date" value={form.settlement_date} onChange={e => setForm({ ...form, settlement_date: e.target.value })} className="h-10 border-slate-200" />
                  </Field>
                </div>

                {/* Cost Breakdown */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Rincian Biaya Aktual</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Material Cost (Rp)">
                        <Input type="number" value={form.material_cost} onChange={e => setForm({ ...form, material_cost: e.target.value })} placeholder="0" className="h-10 border-slate-200 text-sm" />
                      </Field>
                      <Field label="Labor Cost (Rp)">
                        <Input type="number" value={form.labor_cost} onChange={e => setForm({ ...form, labor_cost: e.target.value })} placeholder="0" className="h-10 border-slate-200 text-sm" />
                      </Field>
                      <Field label="Overhead Cost (Rp)">
                        <Input type="number" value={form.overhead_cost} onChange={e => setForm({ ...form, overhead_cost: e.target.value })} placeholder="0" className="h-10 border-slate-200 text-sm" />
                      </Field>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                      <span className="text-sm font-semibold text-slate-700">Total Actual Cost</span>
                      <span className="text-lg font-bold text-slate-900 tabular-nums">{rupiah(actualTotal || null)}</span>
                    </div>
                  </div>
                </div>

                {/* Variance Analysis */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Variance Analysis</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <Field label="Standard Cost (Rp)">
                      <Input type="number" value={form.standard_cost} onChange={e => setForm({ ...form, standard_cost: e.target.value })} placeholder="Masukkan standard cost" className="h-10 border-slate-200" />
                    </Field>
                    {standard > 0 && actualTotal > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Variance</span>
                          <span className={`font-semibold ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {variance > 0 ? '+' : ''}{rupiah(variance)} ({variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${overThreshold ? 'bg-red-500' : Math.abs(variancePct) > 2 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, Math.abs(variancePct) * 5)}%` }}
                          />
                        </div>
                        {overThreshold && (
                          <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700 border border-red-200">
                            <Warning size={13} weight="fill" />
                            Variance melewati threshold {VARIANCE_THRESHOLD}% — Variance Note diperlukan
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {overThreshold && (
                  <Field label="Root Cause Analysis">
                    <textarea value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })}
                      rows={2} placeholder="Jelaskan penyebab variance yang tinggi..."
                      className="w-full px-3 py-2 border border-red-200 rounded-md text-sm bg-red-50/30 resize-none" />
                  </Field>
                )}

                <Field label="Notes">
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                    placeholder="Catatan settlement..." className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
                </Field>

                <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-700 border border-blue-200">
                  <strong>COGM:</strong> Setelah settlement dikunci (Closed), nilai COGM akan diteruskan ke Modul Finance secara otomatis.
                </div>

                {formError && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {formError}</div>}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan Settlement'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Drawer */}
      {detail && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setDetail(null)} />
          <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">{detail.production_orders?.po_number}</span>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">Closing Report</h2>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${STATUS_BADGE[detail.status]}`}>
                  {STATUS_LABEL[detail.status]}
                </span>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Actual Cost', value: rupiah(detail.actual_cost) },
                  { label: 'Settlement Date', value: fmtDate(detail.settlement_date) },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <p className="text-xs text-slate-400">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Cost breakdown from notes */}
              {detail.notes && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Rincian Biaya</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {[
                      { label: 'Material', key: 'MAT' },
                      { label: 'Labor', key: 'LAB' },
                      { label: 'Overhead', key: 'OVH' },
                    ].map(({ label, key }) => {
                      const match = detail.notes?.match(new RegExp(`\\[${key}:(\\d+)\\]`))
                      const val = match ? Number(match[1]) : null
                      return (
                        <div key={key} className="flex justify-between px-4 py-2.5">
                          <span className="text-sm text-slate-600">{label}</span>
                          <span className="text-sm font-medium text-slate-900 tabular-nums">{rupiah(val)}</span>
                        </div>
                      )
                    })}
                    <div className="flex justify-between px-4 py-2.5 bg-slate-50">
                      <span className="text-sm font-semibold text-slate-700">Total</span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">{rupiah(detail.actual_cost)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Variance */}
              {detail.variance != null && (
                <div className={`rounded-xl p-4 border ${detail.variance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Variance</span>
                    <span className={`text-sm font-bold tabular-nums ${detail.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {detail.variance > 0 ? '+' : ''}{rupiah(detail.variance)}
                    </span>
                  </div>
                </div>
              )}

              {/* Root Cause */}
              {detail.notes?.includes('[ROOT_CAUSE]') && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Root Cause Analysis</p>
                  <p className="text-sm text-amber-800">{detail.notes.match(/\[ROOT_CAUSE\] ([^\[]*)/)?.[1]?.trim()}</p>
                </div>
              )}

              {/* COGM info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                  <ArrowRight size={12} className="text-[#dc2626]" /> COGM ke Finance
                </p>
                <p className="text-sm text-slate-700">
                  {detail.status === 'settled'
                    ? `COGM sebesar ${rupiah(detail.actual_cost)} sudah dikirim ke Modul Finance.`
                    : 'COGM akan dikirim ke Modul Finance setelah order ditutup.'}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 space-y-2">
              {detail.status === 'draft' && (
                <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white gap-2"
                  onClick={() => closeOrder(detail)} disabled={closing}>
                  <Lock size={15} /> {closing ? 'Menutup…' : 'Kunci & Tutup Order (Closed)'}
                </Button>
              )}
              <Button variant="outline" className="w-full h-10 border-slate-200" onClick={() => setDetail(null)}>Tutup</Button>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>
}
