'use client'

import { Megaphone, ChartLineUp, Target } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

const planned = [
  { icon: Target, title: 'Input & Kelola Sales Forecast', desc: 'Target kuantitas penjualan per item, per wilayah, per periode (UC-SLS-03).' },
  { icon: ChartLineUp, title: 'Monitoring Realisasi vs Target', desc: 'Perbandingan aktual SO terhadap target forecast dalam tabel & grafik (UC-SLS-04).' },
]

export function MarketingClient() {
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

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="inline-flex p-3 rounded-xl mb-4" style={{ backgroundColor: '#dc262610' }}>
              <Megaphone size={28} weight="bold" style={{ color: '#dc2626' }} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Segera Hadir (Tahap 2)</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Fitur forecasting dan monitoring realisasi vs target sedang disiapkan pada tahap berikutnya.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {planned.map((p) => (
            <Card key={p.title} className="border-slate-200 bg-white">
              <CardContent className="p-6 flex gap-4">
                <div className="p-3 rounded-xl h-fit" style={{ backgroundColor: '#dc262610' }}>
                  <p.icon size={22} weight="bold" style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{p.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{p.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ModuleLayout>
  )
}
