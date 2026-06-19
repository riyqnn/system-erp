'use client'

import { useEffect, useState } from 'react'
import { Warning, MagnifyingGlass, Truck, Info } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

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

export function GoodsReceiptClient() {
  const [rows, setRows] = useState<GoodsReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/production/good-receipt')
      if (res.ok) setRows(await res.json())
    } catch { setError('Gagal memuat data')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = rows.filter(r =>
    (r.production_orders?.po_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.batch_number ?? '').toLowerCase().includes(search.toLowerCase())
  )

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
          <ModuleHeader title="Goods Receipt" />
          <p className="text-slate-500 -mt-4 text-sm">
            {rows.length} records ·{' '}
            <span className="text-green-600 font-medium">{rows.filter(r => r.status === 'received').length} received</span>
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <Info size={18} weight="bold" className="text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">
            Goods Receipt dibuat <strong>otomatis</strong> oleh sistem saat hasil QC dinyatakan <strong>Approved</strong>. Tidak perlu input manual.
          </p>
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
                      <p className="text-xs mt-1">GR akan muncul otomatis setelah QC Approved</p>
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
    </ModuleLayout>
  )
}
