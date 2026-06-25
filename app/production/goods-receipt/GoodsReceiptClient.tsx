'use client'

import { useEffect, useState } from 'react'
import { Warning, MagnifyingGlass, Truck, Info, Package, CheckCircle, XCircle } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import Swal from 'sweetalert2'

/* ── Types ─────────────────────────────────────────────────────────── */

type MaterialHandover = {
  issue_id: string
  issue_code: string
  product_id: string
  batch_number: string | null
  quantity: number
  purpose: string
  issue_date: string
  ms_products: {
    product_code: string
    product_name: string
    units: string
  } | null
  ms_warehouses: {
    warehouse_name: string
  } | null
}

type GoodsReceipt = {
  id: string
  production_order_id: string | null
  quantity_received: number
  receipt_date: string
  batch_number: string | null
  status: 'draft' | 'received' | 'rejected'
  production_orders: { po_number: string } | null
}

/* ── Constants ─────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  received: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/* ── Component ─────────────────────────────────────────────────────── */

export function GoodsReceiptClient() {
  const [rows, setRows] = useState<GoodsReceipt[]>([])
  const [handovers, setHandovers] = useState<MaterialHandover[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'handovers' | 'receipts'>('handovers')

  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('confirmed_handovers')
    if (saved) {
      try { setHiddenIds(JSON.parse(saved)) } catch {}
    }
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [resGR, resHandover] = await Promise.all([
        fetch('/api/production/good-receipt', { cache: 'no-store' }),
        fetch('/api/inventory/goods-issues', { cache: 'no-store' })
      ])
      if (resGR.ok) setRows(await resGR.json())
      if (resHandover.ok) {
        const json = await resHandover.json()
        setHandovers(json.data || [])
      }
    } catch {
      setError('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const hideItem = (id: string) => {
    setHiddenIds(prev => {
      const next = [...prev, id]
      localStorage.setItem('confirmed_handovers', JSON.stringify(next))
      return next
    })
  }

  /* ── Actions ───────────────────────────────────────────────────── */

  const handleReceive = async (item: MaterialHandover) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Terima Material',
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.6;">
          <p><strong>Issue Code:</strong> ${item.issue_code}</p>
          <p><strong>Material:</strong> ${item.ms_products?.product_name}</p>
          <p><strong>Batch:</strong> ${item.batch_number || '—'}</p>
          <p><strong>Qty:</strong> ${item.quantity.toLocaleString()} ${item.ms_products?.units}</p>
          <p><strong>Dari Gudang:</strong> ${item.ms_warehouses?.warehouse_name}</p>
          <hr style="margin:12px 0;" />
          <label style="font-weight:600; font-size:12px;">Catatan (opsional)</label>
          <textarea id="swal-notes" class="swal2-textarea" placeholder="Kondisi barang sesuai, dst..." style="margin-top:4px;"></textarea>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ Terima Material',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const notesEl = document.getElementById('swal-notes') as HTMLTextAreaElement
        return notesEl?.value || ''
      }
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/production/goods-receipt/confirm-handover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issue_id: item.issue_code, action: 'RECEIVE', notes: result.value })
        })
        if (res.ok) {
          hideItem(item.issue_code)
          Swal.fire({
            icon: 'success',
            title: 'Feedback Terkirim!',
            text: `Penerimaan ${item.issue_code} berhasil dilaporkan ke Inventory.`,
            timer: 2500,
            showConfirmButton: false
          })
        } else {
          const data = await res.json()
          Swal.fire('Error', data.error || 'Gagal mengirim feedback', 'error')
        }
      } catch {
        Swal.fire('Error', 'Koneksi bermasalah', 'error')
      }
    }
  }

  const handleReject = async (item: MaterialHandover) => {
    const result = await Swal.fire({
      title: 'Tolak Material?',
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.6;">
          <p><strong>${item.issue_code}</strong> — ${item.ms_products?.product_name}</p>
          <p>Qty: ${item.quantity.toLocaleString()} ${item.ms_products?.units}, Batch: ${item.batch_number || '—'}</p>
          <hr style="margin:12px 0;" />
          <label style="font-weight:600; font-size:12px;">Alasan penolakan *</label>
          <textarea id="swal-reject-notes" class="swal2-textarea" placeholder="Material rusak / tidak sesuai spec..." style="margin-top:4px;" required></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '❌ Tolak Material',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      preConfirm: () => {
        const notesEl = document.getElementById('swal-reject-notes') as HTMLTextAreaElement
        if (!notesEl?.value) {
          Swal.showValidationMessage('Alasan penolakan wajib diisi')
          return false
        }
        return notesEl.value
      }
    })

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/production/goods-receipt/confirm-handover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issue_id: item.issue_code, action: 'REJECT', notes: result.value })
        })
        if (res.ok) {
          hideItem(item.issue_code)
          Swal.fire({
            icon: 'info',
            title: 'Material Ditolak',
            text: `Feedback penolakan untuk ${item.issue_code} berhasil dikirim ke Inventory.`,
            timer: 2500,
            showConfirmButton: false
          })
        } else {
          const data = await res.json()
          Swal.fire('Error', data.error || 'Gagal mengirim feedback', 'error')
        }
      } catch {
        Swal.fire('Error', 'Koneksi bermasalah', 'error')
      }
    }
  }

  /* ── Filtered Data ─────────────────────────────────────────────── */

  const filteredHandovers = handovers.filter(h => !hiddenIds.includes(h.issue_code)).filter(h =>
    h.issue_code.toLowerCase().includes(search.toLowerCase()) ||
    (h.ms_products?.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (h.batch_number ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredReceipts = rows.filter(r =>
    (r.production_orders?.po_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.batch_number ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const pendingCount = filteredHandovers.length
  const receivedCount = hiddenIds.length

  /* ── Render ────────────────────────────────────────────────────── */

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
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Production</p>
          <ModuleHeader title="Goods Receipt & Material Handover" />
          <p className="text-slate-500 -mt-4 text-sm">
            {handovers.length} material handovers ·{' '}
            <span className="text-amber-600 font-medium">{pendingCount} pending</span>
            {receivedCount > 0 && (
              <> · <span className="text-green-600 font-medium">{receivedCount} confirmed</span></>
            )}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('handovers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              activeTab === 'handovers'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4 inline mr-1.5 -mt-0.5" weight="bold" />
            Material Handover
            {pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              activeTab === 'receipts'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-1.5 -mt-0.5" weight="bold" />
            QC Goods Receipt
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={activeTab === 'handovers' ? 'Cari issue code, material, batch...' : 'Cari PO atau batch...'}
            className="pl-9 h-10 border-slate-200 bg-white text-sm"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="w-4 h-4" weight="fill" /> {error}
          </div>
        )}

        {/* ── Material Handover Tab ── */}
        {activeTab === 'handovers' && (
          <>
            {pendingCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <Info size={18} weight="bold" className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  Ada <strong>{pendingCount} material</strong> dari Inventory yang menunggu konfirmasi penerimaan. 
                  Lakukan validasi fisik, lalu tekan <strong>Terima Material</strong>.
                </p>
              </div>
            )}

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3.5 font-medium">Issue Code</th>
                        <th className="px-6 py-3.5 font-medium">Material</th>
                        <th className="px-6 py-3.5 font-medium">Batch</th>
                        <th className="px-6 py-3.5 font-medium text-right">Qty</th>
                        <th className="px-6 py-3.5 font-medium">Gudang</th>
                        <th className="px-6 py-3.5 font-medium">Tanggal</th>
                        <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                      ) : filteredHandovers.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-medium">Belum ada material handover</p>
                          <p className="text-xs mt-1">Data akan muncul ketika Inventory mengirim material</p>
                        </td></tr>
                      ) : filteredHandovers.map(h => {
                        return (
                          <tr key={h.issue_id} className="hover:bg-slate-50/60 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                {h.issue_code}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-900">{h.ms_products?.product_name || '—'}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{h.ms_products?.product_code}</p>
                            </td>
                            <td className="px-6 py-4">
                              {h.batch_number
                                ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{h.batch_number}</span>
                                : <span className="text-slate-400 text-xs">—</span>
                              }
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-semibold text-slate-900 tabular-nums">{h.quantity.toLocaleString()}</span>
                              <span className="text-slate-400 text-xs ml-1">{h.ms_products?.units}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-xs">{h.ms_warehouses?.warehouse_name || '—'}</td>
                            <td className="px-6 py-4 text-slate-500 text-xs">{fmtDateTime(h.issue_date)}</td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                                    onClick={() => handleReject(h)}
                                  >
                                    <XCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                                    Tolak
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                    onClick={() => handleReceive(h)}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                                    Terima Material
                                  </Button>
                                </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── QC Goods Receipt Tab ── */}
        {activeTab === 'receipts' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
              <Info size={18} weight="bold" className="text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Goods Receipt dibuat <strong>otomatis</strong> oleh sistem saat hasil QC dinyatakan <strong>Approved</strong>. Tidak perlu input manual.
              </p>
            </div>

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
                      ) : filteredReceipts.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-medium">Belum ada goods receipt</p>
                          <p className="text-xs mt-1">GR akan muncul otomatis setelah QC Approved</p>
                        </td></tr>
                      ) : filteredReceipts.map(r => (
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
          </>
        )}
      </div>
    </ModuleLayout>
  )
}
