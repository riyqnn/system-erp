'use client'

import { useEffect, useState } from 'react'
import { X, Eye, Warning, Factory, MagnifyingGlass, Trash, Info } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type ProductionOrder = {
  id: string
  po_number: string
  product_id: string | null
  planned_qty: number
  actual_qty: number | null
  status: 'planned' | 'mrp_ready' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  start_date: string | null
  end_date: string | null
  created_at: string
  products: { id: string; sku: string; name: string } | null
}

interface ProductionRequestItem {
  id: string | number;
  status: string;
  request_date: string;
  qty_requested: number;
  notes?: string;
  product_id: string | number;
  start_date?: string;
  end_date?: string;
  products?: {
    name: string;
    units: string;
  };
}

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700',
  mrp_ready: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
  on_hold: 'bg-orange-50 text-orange-700',
}
const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  mrp_ready: 'Siap MRP',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}
const STATUSES = ['planned', 'mrp_ready', 'in_progress', 'completed', 'cancelled', 'on_hold']

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function OrdersClient() {
  const [rows, setRows] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProductionOrder | null>(null)
  const [processReq, setProcessReq] = useState<ProductionRequestItem | null>(null)

  const [requests, setRequests] = useState<ProductionRequestItem[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [resOrders, resReqs] = await Promise.all([
        fetch('/api/production/orders', { cache: 'no-store' }),
        fetch('/api/production/requests', { cache: 'no-store' })
      ])
      if (resOrders.ok) setRows(await resOrders.json())
      if (resReqs.ok) {
        const reqsJson = await resReqs.json()
        setRequests(reqsJson.data || [])
      }
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

  async function handleRequestAction(req: ProductionRequestItem, action: 'PROCESS' | 'REJECT') {
    if (action === 'REJECT') {
      if (!confirm(`Are you sure you want to reject request ${req.id}?`)) return
    }
    try {
      const res = await fetch(`/api/production/requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          product_id: req.product_id,
          qty_requested: req.qty_requested,
          notes: req.notes,
          start_date: req.start_date,
          end_date: req.end_date
        })
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== req.id)) // Optimistic update
        await load()
      } else {
        const data = await res.json()
        alert(data.error || 'Terjadi kesalahan')
      }
    } catch {
      alert('Koneksi bermasalah')
    }
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

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <Info size={18} weight="bold" className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Production Orders dibuat otomatis melalui alur <strong>Resep & Order → Rencana MRP</strong>. Halaman ini menampilkan semua PO yang aktif di sistem.
          </p>
        </div>

        {/* Incoming Requests Section */}
        {requests.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Factory className="w-4 h-4 text-amber-600" />
              Incoming Production Requests ({requests.length})
            </h3>
            <div className="grid gap-3">
              {requests.map(req => (
                <div key={req.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{req.id}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {req.status}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">{fmtDate(req.request_date)}</span>
                    </div>
                    <p className="font-semibold text-slate-900">{req.products?.name ?? 'Unknown Product'}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Requested Qty: <strong className="text-slate-800">{req.qty_requested.toLocaleString()}</strong> {req.products?.units}
                    </p>
                    {req.notes && (
                      <p className="text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded italic">
                        &quot; {String(req.notes)} &quot;
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleRequestAction(req, 'REJECT')}
                    >
                      Reject
                    </Button>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      onClick={() => setProcessReq(req)}
                    >
                      Process & Create PO
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                {s === 'All' ? 'Semua' : STATUS_LABEL[s] ?? s}
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
                        <p className="text-xs mt-1 text-slate-400">Orders akan muncul otomatis setelah proses MRP di menu Rencana MRP</p>
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
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABEL[r.status] ?? r.status}
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
                  { label: 'Status', value: STATUS_LABEL[detail.status] ?? detail.status },
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
                          ? (STATUS_BADGE[s] ?? 'bg-slate-100') + ' border-transparent font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {STATUS_LABEL[s] ?? s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button
                variant="outline"
                className="h-10 px-4 border-red-200 text-[#dc2626] hover:bg-red-50"
                onClick={() => handleDelete(detail.id)}
              >
                <Trash className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setDetail(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Process Request Modal */}
      {processReq && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setProcessReq(null)} />
          <div className="fixed inset-y-0 right-0 w-[440px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-3">
                <Factory className="w-6 h-6 text-amber-600" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 leading-tight">Process Request</h2>
                  <p className="text-xs text-amber-700 font-medium">Create PO for {processReq.id}</p>
                </div>
              </div>
              <button onClick={() => setProcessReq(null)} className="p-2 rounded-full hover:bg-amber-100 text-amber-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form 
              className="flex-1 flex flex-col"
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const qty = Number(formData.get('target_qty'))
                const notes = formData.get('notes') as string
                const start_date = formData.get('start_date') as string
                const end_date = formData.get('end_date') as string
                handleRequestAction({ ...processReq, qty_requested: qty, notes, start_date, end_date }, 'PROCESS')
                setProcessReq(null)
              }}
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-slate-400 font-medium mb-1">Product to Produce</p>
                  <p className="text-sm font-semibold text-slate-900">{processReq.products?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-1">Requested originally: {processReq.qty_requested} {processReq.products?.units}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Quantity</label>
                    <Input 
                      name="target_qty" 
                      type="number" 
                      required 
                      defaultValue={processReq.qty_requested} 
                      className="bg-slate-50 border-slate-200"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Adjust quantity if needed before creating PO.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
                      <Input 
                        name="start_date" 
                        type="date" 
                        required 
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">End Date</label>
                      <Input 
                        name="end_date" 
                        type="date" 
                        required 
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reply Notes to Inventory</label>
                    <textarea 
                      name="notes"
                      className="w-full min-h-[80px] p-3 text-sm rounded-md border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                      placeholder="e.g., PO created, scheduled for next week..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setProcessReq(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
                  Confirm & Create PO
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </ModuleLayout>
  )
}
