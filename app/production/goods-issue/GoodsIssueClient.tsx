'use client'

import { useEffect, useState } from 'react'
import { Plus, X, Warning, MagnifyingGlass, Package, Eye, DownloadSimple } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Order = { id: string; po_number: string; product_id: string | null }
type BomDetail = { id: string; material_id: string | null; quantity: number; unit: string; products: { id: string; name: string; sku: string } | null }
type Bom = { id: string; product_id: string | null; version: string; status: string; production_bom_details?: BomDetail[] }

type GoodsIssue = {
  id: string
  production_order_id: string | null
  product_id: string | null
  quantity: number
  issue_date: string
  status: 'draft' | 'issued' | 'cancelled'
  notes: string | null
  production_orders: { po_number: string } | null
  products: { name: string; sku: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  issued: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  issued: 'Issued',
  cancelled: 'Cancelled',
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

type MaterialLine = { product_id: string; product_name: string; sku: string; unit: string; qty_required: number; qty_actual: string }
type FormState = { production_order_id: string; issue_date: string; status: string; notes: string }
const emptyForm: FormState = { production_order_id: '', issue_date: new Date().toISOString().slice(0, 10), status: 'issued', notes: '' }

export function GoodsIssueClient() {
  const [rows, setRows] = useState<GoodsIssue[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [boms, setBoms] = useState<Bom[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [materialLines, setMaterialLines] = useState<MaterialLine[]>([])
  const [loadingBom, setLoadingBom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [showMIS, setShowMIS] = useState<GoodsIssue | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [giRes, ordRes, bomRes] = await Promise.all([
        fetch('/api/production/good-issue'),
        fetch('/api/production/orders'),
        fetch('/api/production/bom'),
      ])
      if (giRes.ok) setRows(await giRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
      if (bomRes.ok) setBoms(await bomRes.json())
    } catch { setError('Gagal memuat data') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function onOrderChange(orderId: string) {
    setForm(f => ({ ...f, production_order_id: orderId }))
    setMaterialLines([])
    if (!orderId) return
    setLoadingBom(true)
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order?.product_id) { setLoadingBom(false); return }
      const bom = boms.find(b => b.product_id === order.product_id && b.status === 'active')
      if (!bom) { setLoadingBom(false); return }
      const res = await fetch(`/api/production/bom/${bom.id}`)
      if (res.ok) {
        const data: Bom = await res.json()
        if (data.production_bom_details) {
          setMaterialLines(data.production_bom_details.map(d => ({
            product_id: d.material_id ?? '',
            product_name: d.products?.name ?? '—',
            sku: d.products?.sku ?? '',
            unit: d.unit,
            qty_required: d.quantity,
            qty_actual: String(d.quantity),
          })))
        }
      }
    } finally { setLoadingBom(false) }
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = (r.production_orders?.po_number ?? '').toLowerCase().includes(q) ||
      (r.products?.name ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleSave() {
    setFormError(null)
    if (!form.production_order_id) { setFormError('Pilih production order'); return }
    if (materialLines.length === 0) { setFormError('Tidak ada material yang dikeluarkan'); return }

    setSaving(true)
    try {
      for (const line of materialLines) {
        if (!line.product_id) continue
        const qty = Number(line.qty_actual)
        if (qty <= 0) continue
        await fetch('/api/production/good-issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            production_order_id: form.production_order_id,
            product_id: line.product_id,
            quantity: qty,
            issue_date: form.issue_date,
            status: form.status,
            notes: form.notes.trim() || null,
          }),
        })
      }
      setShowForm(false)
      setForm(emptyForm)
      setMaterialLines([])
      await load()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  const issuedCount = rows.filter(r => r.status === 'issued').length
  const draftCount = rows.filter(r => r.status === 'draft').length

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Goods Issue' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production · UC-05</p>
            <ModuleHeader title="Goods Issue (Keluar Barang)" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} records ·{' '}
              <span className="text-green-600 font-medium">{issuedCount} issued</span>
              {draftCount > 0 && <> · <span className="text-slate-500">{draftCount} draft</span></>}
            </p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setMaterialLines([]); setFormError(null); setShowForm(true) }}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> New Goods Issue
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Cari PO atau material..." className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['All', 'draft', 'issued', 'cancelled'].map(s => (
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
                    <th className="px-6 py-3.5 font-medium">Material</th>
                    <th className="px-6 py-3.5 font-medium text-right">Quantity</th>
                    <th className="px-6 py-3.5 font-medium">Tanggal Issue</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium">Notes</th>
                    <th className="px-6 py-3.5 font-medium text-right">MIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada goods issue</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{r.production_orders?.po_number ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{r.products?.name ?? '—'}</div>
                        {r.products?.sku && <div className="text-xs text-slate-400 font-mono">{r.products.sku}</div>}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums font-semibold text-slate-900">{r.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.issue_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{r.notes ?? '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-[#dc2626]"
                          onClick={() => setShowMIS(r)}>
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

      {/* New GI Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">New Goods Issue</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Material Issue Slip akan dibuat otomatis dari BOM</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Production Order">
                    <select value={form.production_order_id}
                      onChange={e => onOrderChange(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      <option value="">— Pilih production order —</option>
                      {orders.map(o => <option key={o.id} value={o.id}>{o.po_number}</option>)}
                    </select>
                  </Field>
                  <Field label="Tanggal Issue">
                    <Input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} className="h-10 border-slate-200" />
                  </Field>
                </div>

                {/* Material Lines from BOM */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={15} weight="bold" className="text-slate-500" />
                      <span className="text-sm font-semibold text-slate-700">Daftar Material (dari BOM)</span>
                    </div>
                    {loadingBom && <span className="text-xs text-slate-400">Memuat BOM…</span>}
                  </div>
                  {materialLines.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">
                      {form.production_order_id
                        ? loadingBom ? 'Memuat BOM…'
                        : 'Tidak ada BOM aktif untuk produk ini. Tambah material manual di bawah.'
                        : 'Pilih production order untuk otomatis memuat material dari BOM'}
                    </div>
                  ) : (
                    <div>
                      <div className="px-4 py-2 bg-slate-50/50 flex text-xs text-slate-400 font-medium">
                        <span className="flex-1">Material</span>
                        <span className="w-24 text-right pr-2">Qty Rencana</span>
                        <span className="w-28 text-right pr-2">Qty Aktual</span>
                        <span className="w-16 text-right">Unit</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {materialLines.map((line, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-900">{line.product_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{line.sku}</p>
                            </div>
                            <span className="w-24 text-right text-xs text-slate-500 tabular-nums pr-2">{line.qty_required.toLocaleString()}</span>
                            <div className="w-28">
                              <Input
                                type="number"
                                value={line.qty_actual}
                                onChange={e => {
                                  const updated = [...materialLines]
                                  updated[idx] = { ...line, qty_actual: e.target.value }
                                  setMaterialLines(updated)
                                }}
                                className="h-8 text-xs border-slate-200 text-right"
                              />
                            </div>
                            <span className="w-16 text-right text-xs text-slate-400">{line.unit}</span>
                          </div>
                        ))}
                      </div>
                      {/* Discrepancy check */}
                      {materialLines.some(l => Number(l.qty_actual) !== l.qty_required) && (
                        <div className="mx-4 mb-3 mt-2 bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700 border border-amber-200">
                          Ada selisih quantity. Sistem akan mencatat sebagai rekonsiliasi.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Status">
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      <option value="draft">Draft</option>
                      <option value="issued">Issued (langsung keluar)</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </Field>
                  <Field label="Notes">
                    <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Catatan tambahan..." className="h-10 border-slate-200" />
                  </Field>
                </div>
                {formError && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><Warning className="w-4 h-4" weight="fill" /> {formError}</div>}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={handleSave} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Terbitkan Goods Issue'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Material Issue Slip (MIS) */}
      {showMIS && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowMIS(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Material Issue Slip (MIS)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{showMIS.production_orders?.po_number ?? '—'}</p>
                </div>
                <button onClick={() => setShowMIS(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="border border-slate-200 rounded-xl p-4 text-sm">
                  <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Material Issue Slip</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">PO</span><span className="font-semibold text-slate-900">{showMIS.production_orders?.po_number ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Material</span><span className="font-medium">{showMIS.products?.name ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">SKU</span><span className="font-mono">{showMIS.products?.sku ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Qty Keluar</span><span className="font-bold text-slate-900">{showMIS.quantity.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Tanggal</span><span>{fmtDate(showMIS.issue_date)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Status</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[showMIS.status]}`}>{STATUS_LABEL[showMIS.status]}</span>
                    </div>
                    {showMIS.notes && <div className="flex justify-between"><span className="text-slate-500">Catatan</span><span className="text-right max-w-[200px]">{showMIS.notes}</span></div>}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowMIS(null)}>Tutup</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white gap-2"
                  onClick={() => window.print()}>
                  <DownloadSimple className="w-4 h-4" /> Cetak MIS
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
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>
}
