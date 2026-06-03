'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Warning, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Order = { id: string; po_number: string }
type QCRecord = {
  id: string
  production_order_id: string | null
  inspector: string | null
  inspection_date: string
  result: 'pass' | 'fail' | 'pending'
  defect_qty: number | null
  notes: string | null
  production_orders: { po_number: string } | null
}

const RESULT_BADGE: Record<string, string> = {
  pass: 'bg-green-50 text-green-700',
  fail: 'bg-red-50 text-red-700',
  pending: 'bg-amber-50 text-amber-700',
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

type FormState = { production_order_id: string; inspector: string; inspection_date: string; result: string; defect_qty: string; notes: string }
const emptyForm: FormState = { production_order_id: '', inspector: '', inspection_date: new Date().toISOString().slice(0, 10), result: 'pending', defect_qty: '', notes: '' }

export function QualityControlClient() {
  const [rows, setRows] = useState<QCRecord[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [qcRes, ordRes] = await Promise.all([
        fetch('/api/production/quality-control'),
        fetch('/api/production/orders'),
      ])
      if (qcRes.ok) setRows(await qcRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
    } catch { setError('Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch =
      (r.production_orders?.po_number ?? '').toLowerCase().includes(q) ||
      (r.inspector ?? '').toLowerCase().includes(q)
    const matchResult = resultFilter === 'All' || r.result === resultFilter
    return matchSearch && matchResult
  })

  async function handleSave() {
    setFormError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/production/quality-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: form.production_order_id || null,
          inspector: form.inspector.trim() || null,
          inspection_date: form.inspection_date,
          result: form.result,
          defect_qty: form.defect_qty ? Number(form.defect_qty) : 0,
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

  const passCount = rows.filter(r => r.result === 'pass').length
  const failCount = rows.filter(r => r.result === 'fail').length

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Quality Control' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="Quality Control" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} inspeksi ·{' '}
              <span className="text-green-600 font-medium">{passCount} pass</span>
              {failCount > 0 && <> · <span className="text-red-600 font-medium">{failCount} fail</span></>}
            </p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setFormError(null); setShowForm(true) }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> New Inspection
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari PO atau inspector..." className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['All', 'pass', 'fail', 'pending'].map(r => (
              <button key={r} onClick={() => setResultFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  resultFilter === r ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                {r === 'All' ? 'Semua' : r.charAt(0).toUpperCase() + r.slice(1)}
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
                    <th className="px-6 py-3.5 font-medium">Inspector</th>
                    <th className="px-6 py-3.5 font-medium">Inspection Date</th>
                    <th className="px-6 py-3.5 font-medium">Result</th>
                    <th className="px-6 py-3.5 font-medium text-right">Defect Qty</th>
                    <th className="px-6 py-3.5 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada data quality control</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {r.production_orders?.po_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{r.inspector ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.inspection_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${RESULT_BADGE[r.result]}`}>
                          {r.result.charAt(0).toUpperCase() + r.result.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-700">
                        {r.defect_qty != null && r.defect_qty > 0 ? r.defect_qty.toLocaleString() : '—'}
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
                <h2 className="text-lg font-semibold text-slate-900">New QC Inspection</h2>
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
                  <Field label="Inspector">
                    <Input value={form.inspector} onChange={e => setForm({ ...form, inspector: e.target.value })} placeholder="Nama inspector" className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Inspection Date">
                    <Input type="date" value={form.inspection_date} onChange={e => setForm({ ...form, inspection_date: e.target.value })} className="h-10 border-slate-200" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Result">
                    <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      <option value="pending">Pending</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </Field>
                  <Field label="Defect Quantity">
                    <Input type="number" value={form.defect_qty} onChange={e => setForm({ ...form, defect_qty: e.target.value })} placeholder="e.g. 10" className="h-10 border-slate-200" />
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
