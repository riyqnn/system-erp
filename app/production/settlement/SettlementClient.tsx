'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Warning, MagnifyingGlass, Receipt } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Order = { id: string; po_number: string }
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

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const rupiah = (n: number | null) =>
  n != null ? 'Rp ' + Math.round(n).toLocaleString('id-ID') : '—'

type FormState = { production_order_id: string; settlement_date: string; actual_cost: string; variance: string; status: string; notes: string }
const emptyForm: FormState = { production_order_id: '', settlement_date: new Date().toISOString().slice(0, 10), actual_cost: '', variance: '', status: 'draft', notes: '' }

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

  const load = async () => {
    setLoading(true)
    try {
      const [stRes, ordRes] = await Promise.all([
        fetch('/api/production/settlement'),
        fetch('/api/production/orders'),
      ])
      if (stRes.ok) setRows(await stRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
    } catch { setError('Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = (r.production_orders?.po_number ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleSave() {
    setFormError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/production/settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: form.production_order_id || null,
          settlement_date: form.settlement_date,
          actual_cost: form.actual_cost ? Number(form.actual_cost) : null,
          variance: form.variance ? Number(form.variance) : null,
          status: form.status,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowForm(false)
      setForm(emptyForm)
      await load()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  const settledCount = rows.filter(r => r.status === 'settled').length
  const totalCost = rows.filter(r => r.status === 'settled').reduce((s, r) => s + (r.actual_cost ?? 0), 0)

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Settlement' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="Order Settlement" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} records ·{' '}
              <span className="text-green-600 font-medium">{settledCount} settled</span>
              {totalCost > 0 && <> · total {rupiah(totalCost)}</>}
            </p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setFormError(null); setShowForm(true) }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> New Settlement
          </Button>
        </div>

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
                {s === 'All' ? 'Semua' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
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
                    <th className="px-6 py-3.5 font-medium">Production Order</th>
                    <th className="px-6 py-3.5 font-medium">Settlement Date</th>
                    <th className="px-6 py-3.5 font-medium text-right">Actual Cost</th>
                    <th className="px-6 py-3.5 font-medium text-right">Variance</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada data settlement</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {r.production_orders?.po_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.settlement_date)}</td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-900 font-medium">{rupiah(r.actual_cost)}</td>
                      <td className={`px-6 py-4 text-right tabular-nums font-medium ${
                        r.variance != null && r.variance < 0 ? 'text-[#dc2626]' : r.variance != null && r.variance > 0 ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {r.variance != null ? (r.variance > 0 ? '+' : '') + rupiah(r.variance) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{r.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">New Settlement</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <Field label="Production Order">
                  <select value={form.production_order_id} onChange={e => setForm({ ...form, production_order_id: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                    <option value="">— Pilih production order —</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.po_number}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Settlement Date">
                    <Input type="date" value={form.settlement_date} onChange={e => setForm({ ...form, settlement_date: e.target.value })} className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Status">
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      <option value="draft">Draft</option>
                      <option value="settled">Settled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Actual Cost (Rp)">
                    <Input type="number" value={form.actual_cost} onChange={e => setForm({ ...form, actual_cost: e.target.value })} placeholder="e.g. 50000000" className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Variance (Rp)">
                    <Input type="number" value={form.variance} onChange={e => setForm({ ...form, variance: e.target.value })} placeholder="e.g. -500000" className="h-10 border-slate-200" />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
                </Field>
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <Warning className="w-4 h-4" weight="fill" /> {formError}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={handleSave} disabled={saving}>
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
