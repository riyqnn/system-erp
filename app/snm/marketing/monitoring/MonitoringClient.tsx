'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChartLineUp } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { BarChart } from '@/components/shared/charts'
import { createClient } from '@/lib/supabase/client'

type Row = {
  forecast_id: string
  product_name: string
  sku: string
  unit: string
  wilayah: string
  periode: string
  target_qty: number
  actual_qty: number
  achievement_pct: number
}

const currentPeriode = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const pctColor = (p: number) => (p >= 100 ? 'text-green-600' : p >= 60 ? 'text-amber-600' : 'text-[#dc2626]')
const barColor = (p: number) => (p >= 100 ? 'bg-green-500' : p >= 60 ? 'bg-amber-500' : 'bg-[#dc2626]')

export function MonitoringClient() {
  const supabase = useMemo(() => createClient(), [])
  const [periode, setPeriode] = useState(currentPeriode())
  const [wilayah, setWilayah] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      let q = supabase.from('v_forecast_vs_actual').select('*').eq('periode', periode)
      if (wilayah) q = q.eq('wilayah', wilayah)
      const { data } = await q.order('product_name')
      if (!active) return
      setRows((data as Row[]) ?? [])
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 30000) // real-time refresh
    return () => { active = false; clearInterval(interval) }
  }, [supabase, periode, wilayah])

  const totalTarget = rows.reduce((s, r) => s + Number(r.target_qty), 0)
  const totalActual = rows.reduce((s, r) => s + Number(r.actual_qty), 0)
  const overallPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  const chartData = rows.map((r) => ({
    label: r.sku,
    value: Number(r.actual_qty),
    target: Number(r.target_qty),
  }))

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/snm' },
        { label: 'Marketing', href: '/snm/marketing' },
        { label: 'Realisasi vs Target' },
      ]}
    >
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Analytics</p>
          <ModuleHeader title="Monitoring Realisasi vs Target" />
          <p className="text-slate-500 -mt-4 text-sm">Perbandingan realisasi penjualan aktual (SO disetujui) terhadap target forecast.</p>
        </div>

        {/* Filter + summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm md:col-span-2">
            <CardContent className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Periode</label>
                <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-md text-sm bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Wilayah (opsional)</label>
                <Input value={wilayah} onChange={(e) => setWilayah(e.target.value)} placeholder="Semua wilayah" className="h-10 border-slate-200 w-48" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-slate-400 font-medium">Total Target</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{totalTarget.toLocaleString('id-ID')}</p>
              <p className="text-xs text-slate-400 mt-1">Realisasi: <span className="font-medium text-slate-600">{totalActual.toLocaleString('id-ID')}</span></p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs text-slate-400 font-medium">Pencapaian Keseluruhan</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${pctColor(overallPct)}`}>{overallPct}%</p>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${barColor(overallPct)}`} style={{ width: `${Math.min(100, overallPct)}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-black mb-4">Realisasi vs Target per Produk</h3>
              <BarChart data={chartData} color="#dc2626" height={240} showTarget />
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#dc2626]" /> Realisasi (aktual)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-slate-300" /> Target forecast</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Produk</th>
                  <th className="px-6 py-3.5 font-medium">Wilayah</th>
                  <th className="px-6 py-3.5 font-medium text-right">Target</th>
                  <th className="px-6 py-3.5 font-medium text-right">Realisasi</th>
                  <th className="px-6 py-3.5 font-medium w-64">Pencapaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <ChartLineUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Belum ada forecast untuk periode ini</p>
                    <p className="text-xs mt-1">Buat target di menu Sales Forecast terlebih dahulu.</p>
                  </td></tr>
                ) : rows.map((r) => {
                  const pct = Number(r.achievement_pct)
                  return (
                    <tr key={r.forecast_id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{r.product_name}</td>
                      <td className="px-6 py-3.5 text-slate-500 text-xs">{r.wilayah || 'Semua'}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-700">{Number(r.target_qty).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-slate-900 font-medium">{Number(r.actual_qty).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums w-12 text-right ${pctColor(pct)}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  )
}
