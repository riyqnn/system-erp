'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardText, Users, Megaphone, ArrowRight, Bell, Receipt, CheckCircle } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'
import { createClient } from '@/lib/supabase/client'
import { rupiah, fmtDateShort, SO_STATUS_BADGE } from '@/lib/snm'

type SO = { so_id: string; so_date: string; grand_total: number; approval_status: string; created_at: string; ms_customer: { cust_name: string } | null }
type Notif = { id: string; title: string; message: string | null; created_at: string; status: string }

// Bucket timestamps into the last `months` monthly counts.
function monthlyCounts(dates: string[], months = 12): number[] {
  const now = new Date()
  const buckets = new Array(months).fill(0)
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${d.getMonth()}`)
  }
  dates.forEach((s) => {
    const d = new Date(s)
    const k = `${d.getFullYear()}-${d.getMonth()}`
    const idx = keys.indexOf(k)
    if (idx >= 0) buckets[idx]++
  })
  return buckets
}

function cumulative(arr: number[]): number[] {
  let sum = 0
  return arr.map((v) => (sum += v))
}

function trendPct(series: number[]): string {
  if (series.length < 2) return '0%'
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  if (prev === 0) return last > 0 ? '+100%' : '0%'
  const pct = Math.round(((last - prev) / prev) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

export function SnmPageClient() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<SO[]>([])
  const [custDates, setCustDates] = useState<string[]>([])
  const [forecastDates, setForecastDates] = useState<string[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [waiting, setWaiting] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      const [soRes, custRes, fcRes, ntRes, waitRes] = await Promise.all([
        supabase.from('tr_so_header').select('so_id, so_date, grand_total, approval_status, created_at, ms_customer(cust_name)').order('created_at', { ascending: false }),
        supabase.from('ms_customer').select('created_at'),
        supabase.from('an_sales_forecast').select('created_at'),
        supabase.from('notifications').select('id, title, message, created_at, status').eq('recipient_role', 'SNM').order('created_at', { ascending: false }).limit(6),
        supabase.from('tr_so_header').select('so_id', { count: 'exact', head: true }).eq('approval_status', 'WAITING_APPROVAL'),
      ])
      if (!active) return
      setOrders((soRes.data as unknown as SO[]) ?? [])
      setCustDates(((custRes.data as { created_at: string }[]) ?? []).map((r) => r.created_at))
      setForecastDates(((fcRes.data as { created_at: string }[]) ?? []).map((r) => r.created_at))
      setNotifs((ntRes.data as Notif[]) ?? [])
      setWaiting(waitRes.count ?? 0)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [supabase])

  const soMonthly = monthlyCounts(orders.map((o) => o.created_at))
  const custMonthly = cumulative(monthlyCounts(custDates))
  const fcMonthly = monthlyCounts(forecastDates)

  const totalRevenue = orders.filter((o) => o.approval_status === 'APPROVED').reduce((s, o) => s + (o.grand_total || 0), 0)

  const cards = [
    {
      label: 'Sales Orders', href: '/snm/sales', icon: ClipboardText,
      count: orders.length.toLocaleString('id-ID'), description: 'Total pesanan customer',
      trend: trendPct(soMonthly), chartData: soMonthly,
    },
    {
      label: 'Customers', href: '/snm/customers', icon: Users,
      count: custDates.length.toLocaleString('id-ID'), description: 'Database pelanggan B2B',
      trend: trendPct(monthlyCounts(custDates)), chartData: custMonthly.length ? custMonthly : [0],
    },
    {
      label: 'Forecast', href: '/snm/marketing', icon: Megaphone,
      count: forecastDates.length.toLocaleString('id-ID'), description: 'Target forecast aktif',
      trend: trendPct(fcMonthly), chartData: fcMonthly,
    },
  ]

  const recent = orders.slice(0, 6)

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <ModuleHeader title="Sales & Marketing Overview" />
          <div className="text-right">
            <p className="text-xs text-slate-400">Total Nilai SO Disetujui</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{rupiah(totalRevenue)}</p>
          </div>
        </div>

        {waiting > 0 && (
          <Link href="/snm/approvals" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors">
            <CheckCircle className="w-4 h-4" weight="fill" />
            <span><b>{waiting}</b> Sales Order menunggu persetujuan manager.</span>
            <ArrowRight className="w-4 h-4 ml-auto" weight="bold" />
          </Link>
        )}

        {/* Stats Cards with Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((action) => (
            <Card key={action.href} className="border border-slate-200 bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#dc262610' }}>
                    <action.icon weight="bold" size={24} style={{ color: '#dc2626' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-black">{action.label}</h3>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-black">{action.count}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${action.trend.startsWith('-') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {action.trend}
                    </span>
                  </div>
                </div>

                <MiniChart data={action.chartData} color="#dc2626" height={80} />

                <Link
                  href={action.href}
                  className="mt-4 flex items-center justify-center w-full py-2 text-sm font-medium rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-all"
                  style={{ color: '#dc2626' }}
                >
                  View Details
                  <ArrowRight weight="bold" className="h-4 w-4 ml-2" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border border-slate-200 bg-white lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-black flex items-center gap-2"><Receipt weight="bold" size={18} style={{ color: '#dc2626' }} /> Sales Order Terbaru</h3>
                <Link href="/snm/sales" className="text-xs font-medium text-[#dc2626]">Lihat semua</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {recent.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Belum ada Sales Order</p>
                ) : recent.map((o) => (
                  <div key={o.so_id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{o.ms_customer?.cust_name ?? '—'}</p>
                      <p className="text-xs text-slate-400 font-mono">{o.so_id} · {fmtDateShort(o.so_date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{rupiah(o.grand_total)}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${SO_STATUS_BADGE[o.approval_status] ?? 'bg-slate-100 text-slate-600'}`}>{o.approval_status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white">
            <CardContent className="p-6">
              <h3 className="font-semibold text-black flex items-center gap-2 mb-4"><Bell weight="bold" size={18} style={{ color: '#dc2626' }} /> Notifikasi Terbaru</h3>
              <div className="space-y-3">
                {notifs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Belum ada notifikasi</p>
                ) : notifs.map((n) => (
                  <div key={n.id} className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.status === 'UNREAD' ? 'bg-red-500' : 'bg-slate-200'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {n.message && <p className="text-xs text-slate-500">{n.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  )
}
