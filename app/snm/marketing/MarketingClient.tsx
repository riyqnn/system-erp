'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Target, ChartLineUp, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { currentPeriode } from '@/lib/snm'

export function MarketingClient() {
  const supabase = useMemo(() => createClient(), [])
  const [forecastCount, setForecastCount] = useState<number | null>(null)
  const [avgAchievement, setAvgAchievement] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const periode = currentPeriode()
      // forecast targets for current period
      const fcRes = await supabase.from('an_sales_forecast')
        .select('forecast_id, product_id, wilayah, target_qty', { count: 'exact' })
        .eq('periode', periode)
      const forecasts = (fcRes.data as { product_id: string; wilayah: string; target_qty: number }[]) ?? []

      // approved SO in this period → realisasi per product+region
      const soRes = await supabase.from('tr_so_header')
        .select('so_id, so_date, ms_customer(wilayah)').eq('approval_status', 'APPROVED')
      const headerRegion: Record<string, string> = {}
      ;(soRes.data as unknown as { so_id: string; so_date: string; ms_customer: { wilayah: string } | null }[] ?? [])
        .filter((h) => (h.so_date ?? '').slice(0, 7) === periode)
        .forEach((h) => { headerRegion[h.so_id] = h.ms_customer?.wilayah ?? '' })

      const actual: Record<string, number> = {}
      const soIds = Object.keys(headerRegion)
      if (soIds.length) {
        const { data: dets } = await supabase.from('tr_so_detail').select('so_id, product_id, qty_order').in('so_id', soIds)
        ;(dets as { so_id: string; product_id: string; qty_order: number }[] ?? []).forEach((d) => {
          const key = `${d.product_id}|${headerRegion[d.so_id] ?? ''}`
          actual[key] = (actual[key] ?? 0) + (Number(d.qty_order) || 0)
        })
      }

      if (!active) return
      setForecastCount(fcRes.count ?? forecasts.length)
      if (forecasts.length) {
        const pcts = forecasts.map((f) => {
          const act = actual[`${f.product_id}|${f.wilayah}`] ?? 0
          const t = Number(f.target_qty) || 0
          return t > 0 ? (act / t) * 100 : 0
        })
        setAvgAchievement(Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length))
      } else {
        setAvgAchievement(0)
      }
    }
    load()
    return () => { active = false }
  }, [supabase])

  const cards = [
    {
      href: '/snm/marketing/forecast', icon: Target,
      title: 'Sales Forecast', desc: 'Input & kelola target penjualan per item, wilayah, dan periode (UC-SLS-03).',
      stat: forecastCount === null ? '…' : `${forecastCount} target periode ini`,
    },
    {
      href: '/snm/marketing/monitoring', icon: ChartLineUp,
      title: 'Realisasi vs Target', desc: 'Bandingkan realisasi aktual terhadap target forecast (UC-SLS-04).',
      stat: avgAchievement === null ? '…' : `Rata-rata pencapaian ${avgAchievement}%`,
    },
  ]

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/snm' },
        { label: 'Marketing' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Planning &amp; Analytics</p>
          <ModuleHeader title="Marketing &amp; Forecast" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}>
              <Card className="border-slate-200 bg-white hover:shadow-lg hover:border-red-200 transition-all h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="p-3 rounded-xl h-fit mb-4" style={{ backgroundColor: '#dc262610' }}>
                    <c.icon size={24} weight="bold" style={{ color: '#dc2626' }} />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-lg">{c.title}</h4>
                  <p className="text-sm text-slate-500 mt-1 flex-1">{c.desc}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-700">{c.stat}</span>
                    <ArrowRight weight="bold" className="w-4 h-4" style={{ color: '#dc2626' }} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ModuleLayout>
  )
}
