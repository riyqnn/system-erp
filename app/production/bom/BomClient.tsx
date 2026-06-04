'use client'

import { useEffect, useState } from 'react'
import {
  Plus, X, Eye, PencilSimple, Warning, Gear, MagnifyingGlass, Trash, CaretDown,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Product = { id: string; sku: string; name: string; unit: string }

type BomDetail = {
  id: string
  bom_id: string
  material_id: string | null
  quantity: number
  unit: string
  notes: string | null
  products: { id: string; sku: string; name: string } | null
}

type Bom = {
  id: string
  product_id: string | null
  version: string
  status: 'draft' | 'active' | 'obsolete'
  notes: string | null
  created_at: string
  products: { id: string; sku: string; name: string } | null
  production_bom_details?: BomDetail[]
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-50 text-green-700',
  obsolete: 'bg-red-50 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  obsolete: 'Obsolete',
}
const STATUSES = ['draft', 'active', 'obsolete']

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

type BomForm = { product_id: string; version: string; status: string; notes: string }
type DetailForm = { material_id: string; quantity: string; unit: string; notes: string }

const emptyBomForm: BomForm = { product_id: '', version: '1.0', status: 'draft', notes: '' }
const emptyDetailForm: DetailForm = { material_id: '', quantity: '', unit: 'kg', notes: '' }

export function BomClient() {
  const [rows, setRows] = useState<Bom[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Bom | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Bom | null>(null)
  const [form, setForm] = useState<BomForm>(emptyBomForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showDetailForm, setShowDetailForm] = useState(false)
  const [detailForm, setDetailForm] = useState<DetailForm>(emptyDetailForm)
  const [detailSaving, setDetailSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [bomRes, productsRes] = await Promise.all([
        fetch('/api/production/bom'),
        fetch('/api/production/products'),
      ])
      if (bomRes.ok) setRows(await bomRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
    } catch {
      setError('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const loadDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/production/bom/${id}`)
      if (res.ok) setDetail(await res.json())
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch =
      (r.products?.name ?? '').toLowerCase().includes(q) ||
      (r.products?.sku ?? '').toLowerCase().includes(q) ||
      r.version.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyBomForm)
    setFormError(null)
    setShowForm(true)
  }
  function openEdit(r: Bom) {
    setEditing(r)
    setForm({ product_id: r.product_id ?? '', version: r.version, status: r.status, notes: r.notes ?? '' })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSave() {
    setFormError(null)
    if (!form.version.trim()) { setFormError('Version wajib diisi.'); return }
    setSaving(true)
    const payload = {
      product_id: form.product_id || null,
      version: form.version.trim(),
      status: form.status,
      notes: form.notes.trim() || null,
    }
    try {
      const url = editing ? `/api/production/bom/${editing.id}` : '/api/production/bom'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json(); setFormError(e.error || 'Error'); return }
      setShowForm(false)
      await load()
    } catch { setFormError('Terjadi kesalahan.')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus BOM ini beserta semua detailnya?')) return
    await fetch(`/api/production/bom/${id}`, { method: 'DELETE' })
    setDetail(null)
    await load()
  }

  async function handleAddDetail() {
    if (!detail) return
    if (!detailForm.quantity || Number(detailForm.quantity) <= 0) return
    setDetailSaving(true)
    try {
      const res = await fetch('/api/production/bom-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bom_id: detail.id,
          material_id: detailForm.material_id || null,
          quantity: Number(detailForm.quantity),
          unit: detailForm.unit,
          notes: detailForm.notes.trim() || null,
        }),
      })
      if (res.ok) {
        setShowDetailForm(false)
        setDetailForm(emptyDetailForm)
        await loadDetail(detail.id)
      }
    } finally { setDetailSaving(false) }
  }

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Bill of Materials' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="Bill of Materials" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} BOM ·{' '}
              <span className="text-green-600 font-medium">{rows.filter(r => r.status === 'active').length} active</span>
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> New BOM
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari produk atau versi..."
              className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['All', ...STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === s
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {s === 'All' ? 'Semua' : STATUS_LABEL[s]}
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
                    <th className="px-6 py-3.5 font-medium w-8"></th>
                    <th className="px-6 py-3.5 font-medium">Produk</th>
                    <th className="px-6 py-3.5 font-medium">Version</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium">Dibuat</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Gear className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada Bill of Materials</p>
                      <p className="text-xs mt-1">Klik &quot;New BOM&quot; untuk membuat BOM baru</p>
                    </td></tr>
                  ) : filtered.map(r => (
                    <>
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (expanded === r.id) { setExpanded(null) }
                              else { setExpanded(r.id); loadDetail(r.id) }
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400"
                          >
                            <CaretDown
                              className={`w-3.5 h-3.5 transition-transform ${expanded === r.id ? 'rotate-180' : ''}`}
                              weight="bold"
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{r.products?.name ?? '—'}</div>
                          {r.products?.sku && <div className="text-xs text-slate-400 font-mono mt-0.5">{r.products.sku}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded">v{r.version}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                              onClick={() => { loadDetail(r.id) }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                              onClick={() => openEdit(r)}>
                              <PencilSimple className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-[#dc2626] hover:bg-red-50"
                              onClick={() => handleDelete(r.id)}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded BOM Details row */}
                      {expanded === r.id && (
                        <tr key={`${r.id}-detail`} className="bg-slate-50/50 border-b border-slate-100">
                          <td colSpan={6} className="px-8 py-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Material Components</p>
                            {detailLoading ? (
                              <p className="text-xs text-slate-400">Memuat komponen…</p>
                            ) : detail?.production_bom_details?.length === 0 ? (
                              <p className="text-xs text-slate-400">Belum ada komponen material.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500">
                                    <th className="py-1.5 pr-6 text-left font-medium">Material</th>
                                    <th className="py-1.5 pr-6 text-left font-medium">SKU</th>
                                    <th className="py-1.5 pr-6 text-right font-medium">Qty</th>
                                    <th className="py-1.5 text-left font-medium">Unit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {detail?.production_bom_details?.map(d => (
                                    <tr key={d.id}>
                                      <td className="py-2 pr-6 font-medium text-slate-800">{d.products?.name ?? '—'}</td>
                                      <td className="py-2 pr-6 font-mono text-slate-500">{d.products?.sku ?? '—'}</td>
                                      <td className="py-2 pr-6 text-right tabular-nums text-slate-800">{d.quantity.toLocaleString()}</td>
                                      <td className="py-2 text-slate-500">{d.unit}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail drawer with BOM details */}
      {detail && !showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setDetail(null)} />
          <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">BOM Detail</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                  {detail.products?.name ?? 'No Product'} — v{detail.version}
                </h2>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Status', value: STATUS_LABEL[detail.status] },
                  { label: 'Version', value: detail.version },
                  { label: 'SKU', value: detail.products?.sku ?? '—' },
                  { label: 'Dibuat', value: fmtDate(detail.created_at) },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{f.value}</p>
                  </div>
                ))}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Material Components ({detail.production_bom_details?.length ?? 0})</p>
                  <button
                    onClick={() => { setShowDetailForm(true); setDetailForm(emptyDetailForm) }}
                    className="flex items-center gap-1 text-xs font-medium text-[#dc2626] hover:underline"
                  >
                    <Plus className="w-3 h-3" weight="bold" /> Tambah
                  </button>
                </div>
                {detailLoading ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">Memuat…</div>
                ) : (detail.production_bom_details?.length ?? 0) === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400">Belum ada komponen. Klik &quot;Tambah&quot; untuk menambahkan.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/50">
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="px-4 py-2 text-left font-medium">Material</th>
                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                        <th className="px-4 py-2 text-left font-medium">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detail.production_bom_details?.map(d => (
                        <tr key={d.id}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{d.products?.name ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{d.quantity.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-slate-500">{d.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {showDetailForm && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-700">Tambah Komponen</p>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Material</label>
                    <select
                      value={detailForm.material_id}
                      onChange={e => setDetailForm({ ...detailForm, material_id: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-md text-xs bg-white"
                    >
                      <option value="">— Pilih material —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Quantity</label>
                      <Input
                        type="number"
                        value={detailForm.quantity}
                        onChange={e => setDetailForm({ ...detailForm, quantity: e.target.value })}
                        placeholder="e.g. 5"
                        className="h-9 border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Unit</label>
                      <select
                        value={detailForm.unit}
                        onChange={e => setDetailForm({ ...detailForm, unit: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-md text-xs bg-white"
                      >
                        {['kg', 'g', 'L', 'mL', 'pcs', 'roll', 'pack', 'carton', 'bag', 'drum'].map(u =>
                          <option key={u} value={u}>{u}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-slate-200"
                      onClick={() => setShowDetailForm(false)}>Batal</Button>
                    <Button size="sm" className="flex-1 h-8 text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                      onClick={handleAddDetail} disabled={detailSaving}>
                      {detailSaving ? 'Menyimpan…' : 'Tambah'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1 h-10 border-slate-200"
                onClick={() => { openEdit(detail); setDetail(null) }}>
                <PencilSimple className="w-4 h-4 mr-2" /> Edit BOM
              </Button>
              <Button variant="outline" className="h-10 px-4 border-red-200 text-[#dc2626] hover:bg-red-50"
                onClick={() => handleDelete(detail.id)}>
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit BOM modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit BOM' : 'New Bill of Materials'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Field label="Produk">
                  <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                    <option value="">— Pilih produk —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Version">
                    <Input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })}
                      placeholder="e.g. 1.0" className="h-10 border-slate-200" />
                  </Field>
                  <Field label="Status">
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={2} placeholder="Keterangan..." className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white resize-none" />
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
