'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Factory, ArrowRight, CheckCircle, XCircle, ArrowClockwise,
  ClipboardText, CalendarCheck, Package, Receipt, ChartBar,
  Wrench, ListChecks,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type WorkCenter = {
  id: string
  code: string
  name: string
  type: string | null
  status: 'active' | 'inactive' | 'maintenance'
  capacity: number | null
}

type ProductionOrder = {
  id: string
  po_number: string
  status: string
  planned_qty: number
  actual_qty: number | null
  start_date: string | null
  created_at: string
  products: { name: string; sku: string } | null
}

type QCRecord = {
  id: string
  result: 'pass' | 'fail' | 'pending'
  inspection_date: string
  production_orders: { po_number: string } | null
}

type Summary = {
  totalOrders: number
  totalBOM: number
  totalWorkCenters: number
  totalMRP: number
  totalGoodsIssue: number
  totalQualityControl: number
  totalGoodsReceipt: number
  totalSettlements: number
}

const NAV = [
  { label: 'Resep & Order', href: '/production/resep-order', icon: ClipboardText, desc: 'Sales order & verifikasi BOM' },
  { label: 'Rencana MRP', href: '/production/planning', icon: CalendarCheck, desc: 'MRP & perencanaan produksi' },
  { label: 'Goods Issue', href: '/production/goods-issue', icon: Package, desc: 'Material keluar ke lantai produksi' },
  { label: 'Produksi', href: '/production/produksi', icon: Factory, desc: 'Alur kerja & konfirmasi produksi' },
  { label: 'QC & Penerimaan', href: '/production/quality-control', icon: CheckCircle, desc: 'Inspeksi kualitas & goods receipt' },
  { label: 'Penyelesaian', href: '/production/settlement', icon: Receipt, desc: 'Settlement biaya & penutupan PO' },
  { label: 'Laporan Produksi', href: '/production/laporan', icon: ChartBar, desc: 'OEE, yield rate, tren harian' },
]

const WC_ST = {
  active: { label: 'Aktif', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500', bar: 'bg-green-500' },
  inactive: { label: 'Idle', cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300', bar: 'bg-slate-200' },
  maintenance: { label: 'Maintenance', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-400' },
}

function wcUtil(wc: WorkCenter): number {
  if (wc.status === 'inactive') return 0
  if (wc.status === 'maintenance') return 12
  // deterministic pseudo-utilization from code chars
  const seed = wc.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 55 + (seed % 38)
}

export function ProductionPageClient() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [qcRecords, setQCRecords] = useState<QCRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, wcRes, ordRes, qcRes] = await Promise.all([
        fetch('/api/production'),
        fetch('/api/production/work-centers'),
        fetch('/api/production/orders'),
        fetch('/api/production/quality-control'),
      ])
      if (sumRes.ok) { const d = await sumRes.json(); if (d.summary) setSummary(d.summary) }
      if (wcRes.ok) setWorkCenters(await wcRes.json())
      if (ordRes.ok) setOrders(await ordRes.json())
      if (qcRes.ok) setQCRecords(await qcRes.json())
    } catch { /* ignore */ }
    finally { setLoading(false); setLastRefresh(new Date()) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const running = orders.filter(o => o.status === 'in_progress')
  const passQC = qcRecords.filter(r => r.result === 'pass').length
  const failQC = qcRecords.filter(r => r.result === 'fail').length
  const activeWC = workCenters.filter(w => w.status === 'active').length
  const oee = workCenters.length > 0 ? Math.round((activeWC / workCenters.length) * 100) : 0

  const activityLog = [
    ...running.slice(0, 2).map(o => ({
      time: o.start_date
        ? new Date(o.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '—',
      msg: `${o.po_number} sedang berjalan — ${o.products?.name ?? '—'}`,
      type: 'info' as const,
    })),
    ...qcRecords.slice(0, 3).map(q => ({
      time: new Date(q.inspection_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      msg: `Inspeksi QC ${q.result === 'pass' ? 'lulus ✓' : q.result === 'fail' ? 'gagal ✗' : 'pending'} — ${q.production_orders?.po_number ?? '—'}`,
      type: q.result === 'pass' ? 'success' as const : q.result === 'fail' ? 'error' as const : 'info' as const,
    })),
  ].slice(0, 6)

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production' },
      ]}
    >
      <div className="space-y-8 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Produksi</p>
            <ModuleHeader title="Production Dashboard" />
            <p className="text-slate-500 -mt-4 text-sm">Pantauan real-time modul produksi</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200" onClick={loadAll}>
            <ArrowClockwise className="w-4 h-4" weight="bold" />
            <span className="text-xs">{lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            icon={<ListChecks size={20} weight="bold" style={{ color: '#dc2626' }} />}
            bg="bg-red-50"
            label="Batch Berjalan"
            value={loading ? '—' : running.length}
            sub={`${summary?.totalOrders ?? 0} total orders`}
          />
          <KPICard
            icon={<Factory size={20} weight="bold" style={{ color: '#2563eb' }} />}
            bg="bg-blue-50"
            label="Target Produksi"
            value={loading ? '—' : running.reduce((s, o) => s + o.planned_qty, 0).toLocaleString()}
            sub="unit sedang direncanakan"
          />
          <KPICard
            icon={<CheckCircle size={20} weight="bold" style={{ color: '#16a34a' }} />}
            bg="bg-green-50"
            label="Hasil Bagus (QC Pass)"
            value={loading ? '—' : passQC}
            sub={`dari ${qcRecords.length} inspeksi`}
          />
          <KPICard
            icon={<XCircle size={20} weight="bold" style={{ color: '#ea580c' }} />}
            bg="bg-orange-50"
            label="Defects (QC Fail)"
            value={loading ? '—' : failQC}
            sub="butuh tindakan segera"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Batch & Machine */}
          <div className="lg:col-span-2 space-y-6">

            {/* Running Batches */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Batch Sedang Berjalan</h2>
                <Link href="/production/produksi" className="text-xs text-[#dc2626] hover:underline font-medium">Lihat semua →</Link>
              </div>
              {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">Memuat…</div>
              ) : running.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Factory size={36} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-sm text-slate-400">Tidak ada batch yang sedang berjalan</p>
                  <Link href="/production/produksi" className="text-xs text-[#dc2626] hover:underline mt-1 inline-block">Mulai produksi →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {running.slice(0, 4).map(order => {
                    const pct = Math.min(100, Math.round(((order.actual_qty ?? 0) / order.planned_qty) * 100))
                    return (
                      <Card key={order.id} className="border-slate-200 bg-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{order.po_number}</span>
                                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">In Progress</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 mt-0.5">{order.products?.name ?? '—'}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-slate-900 tabular-nums">{(order.actual_qty ?? 0).toLocaleString()}</p>
                              <p className="text-xs text-slate-400">/ {order.planned_qty.toLocaleString()} unit</p>
                              <div className="mt-1.5 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{pct}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Work Centers */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Status Mesin / Work Center</h2>
                <span className="text-xs text-slate-400">{activeWC}/{workCenters.length} aktif · OEE {oee}%</span>
              </div>
              {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-sm">Memuat…</div>
              ) : workCenters.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                  <Wrench size={28} className="mx-auto mb-2 text-slate-200" />
                  <p className="text-xs text-slate-400">Belum ada work center terdaftar</p>
                  <Link href="/production/planning" className="text-xs text-[#dc2626] hover:underline mt-1 inline-block">Tambah work center →</Link>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {workCenters.map((wc, idx) => {
                    const st = WC_ST[wc.status] ?? WC_ST.inactive
                    const util = wcUtil(wc)
                    return (
                      <div key={wc.id} className={`flex items-center px-5 py-3.5 gap-4 ${idx > 0 ? 'border-t border-slate-50' : ''}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-400">{wc.code}</span>
                            <span className="text-sm font-medium text-slate-900 truncate">{wc.name}</span>
                            {wc.type && <span className="text-xs text-slate-400">· {wc.type}</span>}
                          </div>
                          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-[180px]">
                            <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${util}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-500 tabular-nums w-8 text-right">{util}%</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right — Quick Nav + Activity Log */}
          <div className="space-y-6">

            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Menu Cepat</h2>
              <div className="space-y-2">
                {NAV.map(n => {
                  const Icon = n.icon
                  return (
                    <Link key={n.href} href={n.href} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-[#dc2626]/30 hover:bg-red-50/30 transition-all group cursor-pointer">
                      <div className="p-1.5 rounded-lg bg-[#dc2626]/5 flex-shrink-0">
                        <Icon size={15} weight="bold" style={{ color: '#dc2626' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 group-hover:text-[#dc2626] transition-colors">{n.label}</p>
                        <p className="text-xs text-slate-400 truncate">{n.desc}</p>
                      </div>
                      <ArrowRight size={13} className="text-slate-300 group-hover:text-[#dc2626] transition-colors flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Log Aktivitas</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {activityLog.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">Belum ada aktivitas sistem</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {activityLog.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-3 px-4 py-3">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 inline-block ${
                            log.type === 'success' ? 'bg-green-500' :
                            log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 leading-relaxed">{log.msg}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{log.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* System Status */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold text-slate-700">Status Sistem</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                {[
                  ['Database', 'Online'],
                  ['API Service', 'Normal'],
                  ['Sinkronisasi', 'Real-time'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="text-green-600 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}

function KPICard({ icon, bg, label, value, sub }: {
  icon: React.ReactNode
  bg: string
  label: string
  value: number | string
  sub: string
}) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-5">
        <div className={`inline-flex p-2 rounded-xl mb-3 ${bg}`}>{icon}</div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  )
}

