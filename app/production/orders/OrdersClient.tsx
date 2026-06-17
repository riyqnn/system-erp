'use client'

import { useEffect, useState } from 'react'
import {
  Plus, X, Eye, PencilSimple, Warning, Factory, MagnifyingGlass, Trash,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type Product = { id: string; sku: string; name: string; unit: string }

type ProductionOrder = {
  id: string
  po_number: string
  product_id: string | null
  planned_qty: number
  actual_qty: number | null
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  created_at: string
  products: { id: string; sku: string; name: string } | null
}

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
}
const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
const STATUSES = ['planned', 'in_progress', 'completed', 'cancelled']

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

type FormState = {
  product_id: string
  planned_qty: string
  actual_qty: string
  start_date: string
  end_date: string
}
const emptyForm: FormState = {
  product_id: '',
  planned_qty: '',
  actual_qty: '',
  start_date: '',
  end_date: '',
}

export function OrdersClient() {
  const [rows, setRows] = useState<ProductionOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProductionOrder | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProductionOrder | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/production/orders'),
        fetch('/api/production/products'),
      ])
      if (ordersRes.ok) setRows(await ordersRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
    } catch {
      setError('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch =
      r.po_number.toLowerCase().includes(q) ||
      (r.products?.name ?? '').toLowerCase().includes(q) ||
      (r.products?.sku ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(r: ProductionOrder) {
    setEditing(r)
    setForm({
      product_id: r.product_id ?? '',
      planned_qty: String(r.planned_qty),
      actual_qty: r.actual_qty != null ? String(r.actual_qty) : '',
      start_date: r.start_date ?? '',
      end_date: r.end_date ?? '',
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSave() {
    setFormError(null)
    if (!form.planned_qty || Number(form.planned_qty) <= 0) {
      setFormError('Planned quantity harus lebih dari 0.')
      return
    }
    setSaving(true)
    const payload = {
      product_id: form.product_id || null,
      planned_qty: Number(form.planned_qty),
      actual_qty: form.actual_qty ? Number(form.actual_qty) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      ...(!editing && { status: 'planned' }),
    }
    try {
      const url = editing
        ? `/api/production/orders/${editing.id}`
        : '/api/production/orders'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        setFormError(err.error || 'Terjadi kesalahan.')
        return
      }
      setShowForm(false)
      await load()
    } catch {
      setFormError('Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/production/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: status as ProductionOrder['status'] } : null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus production order ini?')) return
    await fetch(`/api/production/orders/${id}`, { method: 'DELETE' })
    setDetail(null)
    await load()
  }

  const inProgressCount = rows.filter(r => r.status === 'in_progress').length
  const completedCount = rows.filter(r => r.status === 'completed').length

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Production Orders' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
            <ModuleHeader title="Production Orders" />
            <p className="text-slate-500 -mt-4 text-sm">
              {rows.length} orders ·{' '}
              <span className="text-amber-600 font-medium">{inProgressCount} in progress</span>
              {completedCount > 0 && (
                <> · <span className="text-green-600 font-medium">{completedCount} completed</span></>
              )}
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2"
          >
            <Plus className="w-4 h-4" weight="bold" /> New Order
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari PO number atau produk..."
              className="pl-9 h-10 border-slate-200 bg-white text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
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
                    <th className="px-6 py-3.5 font-medium">PO Number</th>
                    <th className="px-6 py-3.5 font-medium">Produk</th>
                    <th className="px-6 py-3.5 font-medium text-right">Planned Qty</th>
                    <th className="px-6 py-3.5 font-medium text-right">Actual Qty</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium">Start Date</th>
                    <th className="px-6 py-3.5 font-medium">End Date</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-sm">
                        Memuat data…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                        <Factory className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">Belum ada production order</p>
                        <p className="text-xs mt-1">Klik &quot;New Order&quot; untuk membuat production order baru</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">
                            {r.po_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{r.products?.name ?? '—'}</div>
                          {r.products?.sku && (
                            <div className="text-xs text-slate-400 font-mono mt-0.5">{r.products.sku}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-900">
                          {r.planned_qty.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-slate-500">
                          {r.actual_qty != null ? r.actual_qty.toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.start_date)}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(r.end_date)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                              onClick={() => setDetail(r)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                              onClick={() => openEdit(r)}
                            >
                              <PencilSimple className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-[#dc2626] hover:bg-red-50"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail drawer */}
      {detail && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setDetail(null)} />
          <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{detail.po_number}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                  {detail.products?.name ?? 'No Product'}
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
                  { label: 'SKU', value: detail.products?.sku ?? '—' },
                  { label: 'Planned Qty', value: detail.planned_qty.toLocaleString() },
                  { label: 'Actual Qty', value: detail.actual_qty?.toLocaleString() ?? '—' },
                  { label: 'Start Date', value: fmtDate(detail.start_date) },
                  { label: 'End Date', value: fmtDate(detail.end_date) },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-500 font-semibold mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(detail.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        detail.status === s
                          ? STATUS_BADGE[s] + ' border-transparent font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-10 border-slate-200"
                onClick={() => { openEdit(detail); setDetail(null) }}
              >
                <PencilSimple className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button
                variant="outline"
                className="h-10 px-4 border-red-200 text-[#dc2626] hover:bg-red-50"
                onClick={() => handleDelete(detail.id)}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editing ? 'Edit Production Order' : 'New Production Order'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <Field label="Produk">
                  <select
                    value={form.product_id}
                    onChange={e => setForm({ ...form, product_id: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                  >
                    <option value="">— Pilih produk —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Planned Quantity">
                    <Input
                      type="number"
                      value={form.planned_qty}
                      onChange={e => setForm({ ...form, planned_qty: e.target.value })}
                      placeholder="e.g. 1000"
                      className="h-10 border-slate-200"
                    />
                  </Field>
                  <Field label="Actual Quantity">
                    <Input
                      type="number"
                      value={form.actual_qty}
                      onChange={e => setForm({ ...form, actual_qty: e.target.value })}
                      placeholder="e.g. 980"
                      className="h-10 border-slate-200"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date">
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="h-10 border-slate-200"
                    />
                  </Field>
                  <Field label="End Date">
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="h-10 border-slate-200"
                    />
                  </Field>
                </div>
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <Warning className="w-4 h-4" weight="fill" /> {formError}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-10 border-slate-200"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                  onClick={handleSave}
                  disabled={saving}
                >
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
