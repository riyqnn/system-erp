'use client'

import { useEffect, useMemo, useState } from 'react'
import { Truck, Warning } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, DO_BADGE } from '@/lib/snm'

type DO = {
  do_id: string
  so_id: string
  warehouse_id: string | null
  do_date: string | null
  delivery_address: string | null
  status: 'CREATED' | 'SENT' | 'DELIVERED' | 'RETURNED' | 'VOID'
  delivered_at: string | null
  tr_so_header: { cust_id: string; ms_customer: { cust_name: string } | null } | null
}

const TABS = ['ALL', 'CREATED', 'SENT', 'DELIVERED', 'RETURNED'] as const
const TAB_LABEL: Record<string, string> = {
  ALL: 'Semua', CREATED: 'Dibuat', SENT: 'Dikirim', DELIVERED: 'Diterima', RETURNED: 'Dikembalikan',
}

export function DeliveriesClient() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<DO[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('ALL')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('tr_delivery_order')
      .select('do_id, so_id, warehouse_id, do_date, delivery_address, status, delivered_at, tr_so_header(cust_id, ms_customer(cust_name))')
      .order('do_date', { ascending: false })
    setRows((data as unknown as DO[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // real-time monitoring
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = tab === 'ALL' ? rows : rows.filter((d) => d.status === tab)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    rows.forEach((d) => { c[d.status] = (c[d.status] ?? 0) + 1 })
    return c
  }, [rows])

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/snm' },
        { label: 'Delivery Orders' },
      ]}
    >
      <div className="space-y-6 max-w-[1300px] mx-auto">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Logistik</p>
          <ModuleHeader title="Monitoring Pengiriman" />
          <p className="text-slate-500 -mt-4 text-sm">Pantau status Delivery Order secara real-time (Created → Sent → Delivered).</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['CREATED', 'SENT', 'DELIVERED', 'RETURNED'] as const).map((s) => (
            <Card key={s} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400 font-medium">{TAB_LABEL[s]}</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{counts[s] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                tab === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">No. DO</th>
                    <th className="px-6 py-3.5 font-medium">SO</th>
                    <th className="px-6 py-3.5 font-medium">Customer</th>
                    <th className="px-6 py-3.5 font-medium">Tanggal</th>
                    <th className="px-6 py-3.5 font-medium">Status</th>
                    <th className="px-6 py-3.5 font-medium">Diterima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                      <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada Delivery Order</p>
                    </td></tr>
                  ) : filtered.map((d) => (
                    <tr key={d.do_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4"><span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{d.do_id}</span></td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{d.so_id}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{d.tr_so_header?.ms_customer?.cust_name ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(d.do_date)}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DO_BADGE[d.status]}`}>{d.status}</span></td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{d.delivered_at ? fmtDate(d.delivered_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <Warning className="w-3.5 h-3.5" /> Pembaruan status pengiriman normalnya dilakukan Staf Gudang pada modul Inventory; halaman ini menampilkannya secara real-time untuk tim Sales.
        </p>
      </div>
    </ModuleLayout>
  )
}
