'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Target, ChartLineUp, ArrowRight } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'

const currentPeriode = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function MarketingClient() {
  const supabase = useMemo(() => createClient(), [])
  const [forecastCount, setForecastCount] = useState<number | null>(null)
  const [avgAchievement, setAvgAchievement] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      const periode = currentPeriode()
      const [fcRes, vaRes] = await Promise.all([
        supabase.from('an_sales_forecast').select('id', { count: 'exact', head: true }).eq('periode', periode),
        supabase.from('v_forecast_vs_actual').select('achievement_pct').eq('periode', periode),
      ])
      if (!active) return
      setForecastCount(fcRes.count ?? 0)
      const rows = (vaRes.data as { achievement_pct: number }[]) ?? []
      setAvgAchievement(rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.achievement_pct), 0) / rows.length) : 0)
    }
    load()
    return () => { active = false }
  }, [supabase])

  const cards = [
    {
      href: '/apps/snm/marketing/forecast', icon: Target,
      title: 'Sales Forecast', desc: 'Input & kelola target penjualan per item, wilayah, dan periode (UC-SLS-03).',
      stat: forecastCount === null ? '…' : `${forecastCount} target periode ini`,
    },
    {
      href: '/apps/snm/marketing/monitoring', icon: ChartLineUp,
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
        { label: 'Sales & Marketing', href: '/apps/snm' },
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
