'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Warning, MagnifyingGlass, Truck } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Order = { id: string; po_number: string }
type GoodsReceipt = {
  id: string
  production_order_id: string | null
  quantity_received: number
  receipt_date: string
  batch_number: string | null
  status: 'draft' | 'received' | 'rejected'
  production_orders: { po_number: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  received: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

type FormState = { production_order_id: string; quantity_received: string; receipt_date: string; batch_number: string; status: string }
const emptyForm: FormState = { production_order_id: '', quantity_received: '', receipt_date: new Date().toISOString().slice(0, 10), batch_number: '', status: 'received' }

export function GoodsReceiptClient() {
  const [rows, setRows] = useState<GoodsReceipt[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [grRes, ordRes] = await Promise.all([
        fetch('/api/production/good-receipt'),
        fetch('/api/production/orders'),
      ])
      if (grRes.ok) setRows(await grRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
    } catch { setError('Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    (r.production_orders?.po_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.batch_number ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    setFormError(null)
    if (!form.quantity_received || Number(form.quantity_received) <= 0) { setFormError('Quantity harus > 0'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/production/good-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: form.production_order_id || null,
          quantity_received: Number(form.quantity_received),
          receipt_date: form.receipt_date,
          batch_number: form.batch_number.trim() || null,
          status: form.status,
        }),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowForm(false)
      setForm(emptyForm)
      await load()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Goods Receipt' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="Goods Receipt" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} records ·{' '}
              <span className="text-green-600 font-medium">{rows.filter(r => r.status === 'received').length} received</span>
            </p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setFormError(null); setShowForm(true) }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> New Receipt
          </Button>
        </div>

        <div className="relative max-w-sm">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Cari PO atau batch number..." className="pl-9 h-10 border-slate-200 bg-white text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
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
                    <th className="px-6 py-3.5 font-medium text-right">Qty Received</th>
                    <th className="px-6 py-3.5 font-medium">Receipt Date</th>
                    <th className="px-6 py-3.5 font-medium">Batch Number</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada goods receipt</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {r.production_orders?.po_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-900">{r.quantity_received.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.receipt_date)}</td>
                      <td className="px-6 py-4">
                        {r.batch_number
                          ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{r.batch_number}</span>
                          : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status]}`}>
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
      </div>

      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">New Goods Receipt</h2>
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
                  <Field label="Quantity Received">
                    <Input type="number" value={form.quantity_received} onChange={e => setForm({ ...form, quantity_received: e.target.value })} placeholder="e.g. 980" className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Receipt Date">
                    <Input type="date" value={form.receipt_date} onChange={e => setForm({ ...form, receipt_date: e.target.value })} className="h-10 border-slate-200" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Batch Number">
                    <Input value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })} placeholder="e.g. BT-2026-001" className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Status">
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      <option value="draft">Draft</option>
                      <option value="received">Received</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </Field>
                </div>
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
