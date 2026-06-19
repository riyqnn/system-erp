'use client'

import { useEffect, useState } from 'react'
import { X, Warning, MagnifyingGlass, CheckCircle, XCircle, Eye, ArrowRight, Flask } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Order = {
  id: string
  po_number: string
  product_id: string | null
  status: string
  planned_qty: number
  actual_qty?: number
  products: { name: string; sku: string } | null
}

type QCRecord = {
  id: string
  production_order_id: string | null
  inspector: string | null
  inspection_date: string
  result: 'pass' | 'fail' | 'pending'
  defect_qty: number | null
  notes?: string | null
  production_orders: { po_number: string } | null
}

const RESULT_BADGE: Record<string, string> = {
  pass: 'bg-green-50 text-green-700',
  fail: 'bg-red-50 text-red-700',
  pending: 'bg-amber-50 text-amber-700',
}
const RESULT_LABEL: Record<string, string> = {
  pass: 'Approved',
  fail: 'Fail',
  pending: 'Pending',
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

type TestItem = { label: string; field: 'visual' | 'weight' | 'taste' | 'expiry'; value: 'ok' | 'fail' | '' }
const emptyTests: TestItem[] = [
  { label: 'Pemeriksaan Visual', field: 'visual', value: '' },
  { label: 'Pemeriksaan Berat', field: 'weight', value: '' },
  { label: 'Pemeriksaan Rasa', field: 'taste', value: '' },
  { label: 'Cek Kadaluarsa', field: 'expiry', value: '' },
]

type FormState = {
  production_order_id: string
  inspector: string
  inspection_date: string
  defect_qty: string
  supervisor_decision: 'approved' | 'rework' | 'scrap' | ''
  rework_notes: string
  notes: string
}
const emptyForm: FormState = {
  production_order_id: '',
  inspector: '',
  inspection_date: new Date().toISOString().slice(0, 10),
  defect_qty: '',
  supervisor_decision: '',
  rework_notes: '',
  notes: '',
}

export function QualityControlClient() {
  const [rows, setRows] = useState<QCRecord[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [tests, setTests] = useState<TestItem[]>(emptyTests)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [detail, setDetail] = useState<QCRecord | null>(null)
  const [generatingGR, setGeneratingGR] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [qcRes, ordRes] = await Promise.all([
        fetch('/api/production/quality-control'),
        fetch('/api/production/orders'),
      ])
      if (qcRes.ok) setRows(await qcRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
    } catch { setError('Gagal memuat data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Orders eligible for QC: completed status, no existing QC record
  const pendingQC = orders.filter(o =>
    o.status === 'completed' &&
    !rows.some(qc => qc.production_order_id === o.id)
  )

  function openQCFor(order: Order) {
    setSelectedOrder(order)
    setForm({ ...emptyForm, production_order_id: order.id })
    setTests(emptyTests.map(t => ({ ...t, value: '' as const })))
    setFormError(null)
    setShowForm(true)
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = (r.production_orders?.po_number ?? '').toLowerCase().includes(q) ||
      (r.inspector ?? '').toLowerCase().includes(q)
    const matchResult = resultFilter === 'All' || r.result === resultFilter
    return matchSearch && matchResult
  })

  const computedResult = (): 'pass' | 'fail' | 'pending' => {
    if (tests.some(t => t.value === '')) return 'pending'
    return tests.every(t => t.value === 'ok') ? 'pass' : 'fail'
  }

  async function handleSave() {
    setFormError(null)
    const result = computedResult()
    setSaving(true)
    try {
      const res = await fetch('/api/production/quality-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: form.production_order_id || null,
          inspector: form.inspector.trim() || null,
          inspection_date: form.inspection_date,
          result,
          defect_qty: form.defect_qty ? Number(form.defect_qty) : 0,
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }

      if (result === 'pass' && form.production_order_id) {
        const order = orders.find(o => o.id === form.production_order_id)
        if (order) {
          const baseQty = order.actual_qty ?? order.planned_qty
          await fetch('/api/production/good-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              production_order_id: form.production_order_id,
              quantity_received: baseQty - (Number(form.defect_qty) || 0),
              receipt_date: form.inspection_date,
              status: 'received',
            }),
          })
        }
      }

      setShowForm(false)
      setForm(emptyForm)
      setSelectedOrder(null)
      setTests(emptyTests.map(t => ({ ...t, value: '' })))
      await load()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  async function generateGR(record: QCRecord) {
    setGeneratingGR(true)
    try {
      const order = orders.find(o => o.id === record.production_order_id)
      if (order) {
        const baseQty = order.actual_qty ?? order.planned_qty
        await fetch('/api/production/good-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            production_order_id: record.production_order_id,
            quantity_received: baseQty - (record.defect_qty ?? 0),
            receipt_date: record.inspection_date,
            status: 'received',
          }),
        })
      }
    } finally { setGeneratingGR(false); setDetail(null) }
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
        { label: 'QC & Penerimaan' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
          <ModuleHeader title="QC & Penerimaan" />
          <p className="text-slate-500 -mt-4 text-sm">
            {rows.length} inspeksi ·{' '}
            <span className="text-green-600 font-medium">{passCount} approved</span>
            {failCount > 0 && <> · <span className="text-red-600 font-medium">{failCount} fail</span></>}
            {pendingQC.length > 0 && <> · <span className="text-amber-600 font-medium">{pendingQC.length} menunggu inspeksi</span></>}
          </p>
        </div>

        {/* Pending QC section */}
        {pendingQC.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-200 flex items-center gap-2">
              <Flask size={16} weight="bold" className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Production Orders Siap Inspeksi QC</span>
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pendingQC.length} order</span>
            </div>
            <div className="divide-y divide-amber-100">
              {pendingQC.map(order => (
                <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-amber-50 transition-colors group">
                  <span className="font-mono text-xs bg-white border border-amber-200 px-2 py-0.5 rounded text-slate-700">{order.po_number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{order.products?.name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{order.planned_qty.toLocaleString()} unit diproduksi</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Selesai Produksi</span>
                  <Button size="sm" className="h-8 px-3 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openQCFor(order)}>
                    Mulai Inspeksi <ArrowRight size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

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
                {r === 'All' ? 'Semua' : RESULT_LABEL[r] ?? r}
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
                    <th className="px-6 py-3.5 font-medium">Inspector</th>
                    <th className="px-6 py-3.5 font-medium">Tanggal</th>
                    <th className="px-6 py-3.5 font-medium">Hasil</th>
                    <th className="px-6 py-3.5 font-medium text-right">Defect Qty</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Belum ada inspeksi QC</p>
                      <p className="text-xs mt-1">Klik &quot;Mulai Inspeksi&quot; pada order di atas</p>
                    </td></tr>
                  ) : filtered.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{r.production_orders?.po_number ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 text-sm">{r.inspector ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.inspection_date)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {r.result === 'pass' ? <CheckCircle size={15} weight="fill" className="text-green-500" /> :
                             r.result === 'fail' ? <XCircle size={15} weight="fill" className="text-red-500" /> : null}
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${RESULT_BADGE[r.result]}`}>
                              {RESULT_LABEL[r.result]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-700">
                          {r.defect_qty != null && r.defect_qty > 0 ? r.defect_qty.toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100"
                            onClick={() => setDetail(r)}>
                            <Eye className="w-4 h-4" />
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

      {/* QC Form Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">QC Inspection</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedOrder ? `${selectedOrder.po_number} · ${selectedOrder.products?.name ?? ''}` : ''}
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Production Order</label>
                    <div className="h-10 px-3 border border-slate-200 rounded-md text-sm bg-slate-50 flex items-center text-slate-700 font-mono">
                      {selectedOrder?.po_number ?? '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Inspector</label>
                    <Input value={form.inspector} onChange={e => setForm({ ...form, inspector: e.target.value })} placeholder="Nama inspector" className="h-10 border-slate-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Inspeksi</label>
                  <Input type="date" value={form.inspection_date} onChange={e => setForm({ ...form, inspection_date: e.target.value })} className="h-10 border-slate-200" />
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Parameter Pengujian</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {tests.map((test, idx) => (
                      <div key={test.field} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-slate-700">{test.label}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { const u = [...tests]; u[idx] = { ...test, value: 'ok' }; setTests(u) }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              test.value === 'ok' ? 'bg-green-500 text-white border-green-500' : 'bg-white text-slate-600 border-slate-200 hover:border-green-300'
                            }`}>
                            <CheckCircle size={13} weight={test.value === 'ok' ? 'fill' : 'regular'} /> OK
                          </button>
                          <button
                            onClick={() => { const u = [...tests]; u[idx] = { ...test, value: 'fail' }; setTests(u) }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              test.value === 'fail' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                            }`}>
                            <XCircle size={13} weight={test.value === 'fail' ? 'fill' : 'regular'} /> Fail
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Hasil Otomatis</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${RESULT_BADGE[computedResult()]}`}>
                      {computedResult() === 'pass' ? '✓ APPROVED' : computedResult() === 'fail' ? '✗ FAIL' : '⋯ Pending'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Defect Quantity</label>
                  <Input type="number" value={form.defect_qty} onChange={e => setForm({ ...form, defect_qty: e.target.value })}
                    placeholder="Jumlah unit yang defect" className="h-10 border-slate-200" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Keputusan Supervisor</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'approved', label: 'Approved', cls: 'border-green-300 bg-green-50 text-green-700' },
                      { key: 'rework', label: 'Rework', cls: 'border-amber-300 bg-amber-50 text-amber-700' },
                      { key: 'scrap', label: 'Scrap', cls: 'border-red-300 bg-red-50 text-red-700' },
                    ].map(d => (
                      <button key={d.key} onClick={() => setForm(f => ({ ...f, supervisor_decision: d.key as 'approved' | 'rework' | 'scrap' }))}
                        className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          form.supervisor_decision === d.key ? d.cls : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}>{d.label}</button>
                    ))}
                  </div>
                </div>

                {form.supervisor_decision === 'rework' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan Rework</label>
                    <textarea value={form.rework_notes} onChange={e => setForm({ ...form, rework_notes: e.target.value })}
                      rows={2} placeholder="Instruksi rework..." className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Catatan Inspeksi</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                    placeholder="Temuan, observasi, dll..." className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
                </div>

                {computedResult() === 'pass' && (
                  <div className="bg-green-50 rounded-lg px-4 py-3 text-xs text-green-700 border border-green-200">
                    <strong>Auto Goods Receipt:</strong> Sistem akan membuat Goods Receipt otomatis untuk barang jadi yang lulus QC.
                  </div>
                )}

                {formError && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {formError}</div>}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Submit QC'}
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
          <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-400">{detail.production_orders?.po_number}</span>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">QC Report</h2>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                {detail.result === 'pass'
                  ? <CheckCircle size={32} weight="fill" className="text-green-500" />
                  : detail.result === 'fail'
                  ? <XCircle size={32} weight="fill" className="text-red-500" />
                  : <Warning size={32} weight="fill" className="text-amber-500" />}
                <div>
                  <p className="font-semibold text-slate-900">{RESULT_LABEL[detail.result]}</p>
                  <p className="text-xs text-slate-500">{fmtDate(detail.inspection_date)} · {detail.inspector ?? 'Inspector'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Defect Qty', value: detail.defect_qty != null ? detail.defect_qty.toLocaleString() : '0' },
                  { label: 'Tanggal', value: fmtDate(detail.inspection_date) },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                    <p className="text-xs text-slate-400">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
              {detail.notes && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-sm font-semibold text-slate-700">Hasil Pengujian</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {['visual', 'weight', 'taste', 'expiry'].map(field => {
                      const match = detail.notes?.match(new RegExp(`\\[${field.toUpperCase()}:(\\w+)\\]`))
                      const val = match?.[1]
                      const labels: Record<string, string> = { visual: 'Visual', weight: 'Berat', taste: 'Rasa', expiry: 'Kadaluarsa' }
                      return (
                        <div key={field} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm text-slate-700">{labels[field]}</span>
                          {val ? (
                            <span className={`flex items-center gap-1 text-xs font-medium ${val === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                              {val === 'ok' ? <CheckCircle size={13} weight="fill" /> : <XCircle size={13} weight="fill" />}
                              {val === 'ok' ? 'OK' : 'Fail'}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 space-y-2">
              {detail.result === 'pass' && (
                <Button className="w-full h-10 bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={() => generateGR(detail)} disabled={generatingGR}>
                  {generatingGR ? 'Memproses…' : '✓ Generate Goods Receipt'}
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
