'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ListChecks, Gear, CalendarCheck, Package, Truck, CheckSquare, Receipt, ArrowRight, Factory } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { MiniChart } from '@/components/shared/charts'

const CHART_BASE = [35, 42, 48, 55, 62, 58, 68, 75, 70, 80, 78, 85]

type Summary = {
  totalOrders: number
  totalBOM: number
  totalWorkCenters: number
  totalRouting: number
  totalMRP: number
  totalGoodsIssue: number
  totalQualityControl: number
  totalGoodsReceipt: number
  totalSettlements: number
}

const quickActions = [
  {
    label: 'Production Orders',
    href: '/production/orders',
    icon: ListChecks,
    key: 'totalOrders' as keyof Summary,
    description: 'Active production orders',
    trend: '+15%',
    chartData: CHART_BASE,
  },
  {
    label: 'Bill of Materials',
    href: '/production/bom',
    icon: Gear,
    key: 'totalBOM' as keyof Summary,
    description: 'Product recipes & BOM',
    trend: '+5%',
    chartData: [25, 32, 38, 42, 48, 45, 52, 58, 55, 62, 60, 68],
  },
  {
    label: 'Planning',
    href: '/production/planning',
    icon: CalendarCheck,
    key: 'totalMRP' as keyof Summary,
    description: 'Production schedules',
    trend: '+8%',
    chartData: [40, 45, 50, 55, 60, 58, 65, 70, 68, 75, 72, 78],
  },
]

const secondaryActions = [
  { label: 'Goods Issue', href: '/production/goods-issue', icon: Package, key: 'totalGoodsIssue' as keyof Summary, description: 'Material issued to floor' },
  { label: 'Goods Receipt', href: '/production/goods-receipt', icon: Truck, key: 'totalGoodsReceipt' as keyof Summary, description: 'Finished goods received' },
  { label: 'Quality Control', href: '/production/quality-control', icon: CheckSquare, key: 'totalQualityControl' as keyof Summary, description: 'QC inspections' },
  { label: 'Settlement', href: '/production/settlement', icon: Receipt, key: 'totalSettlements' as keyof Summary, description: 'Order close-out' },
]

export function ProductionPageClient() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    fetch('/api/production')
      .then(r => r.json())
      .then(d => { if (d.summary) setSummary(d.summary) })
      .catch(() => null)
  }, [])

  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production' },
      ]}
    >
      <div className="space-y-8">
        <ModuleHeader title="Production Overview" />

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
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
                    <span className="text-3xl font-bold text-black">
                      {summary ? summary[action.key] : '—'}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
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

        {/* Secondary Stats */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Operations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {secondaryActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="border border-slate-200 bg-white hover:shadow-md hover:border-red-200 transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: '#dc262608' }}>
                        <action.icon weight="bold" size={18} style={{ color: '#dc2626' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-600 truncate">{action.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{action.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-slate-900">
                        {summary ? summary[action.key] : '—'}
                      </span>
                      <ArrowRight
                        className="w-4 h-4 text-slate-300 group-hover:text-[#dc2626] transition-colors"
                        weight="bold"
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Stats Summary */}
        {summary && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Factory size={16} weight="bold" style={{ color: '#dc2626' }} />
              <span className="text-sm font-semibold text-slate-700">Module Summary</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { label: 'Orders', value: summary.totalOrders },
                { label: 'BOM', value: summary.totalBOM },
                { label: 'Work Centers', value: summary.totalWorkCenters },
                { label: 'Routing', value: summary.totalRouting },
                { label: 'MRP', value: summary.totalMRP },
                { label: 'QC', value: summary.totalQualityControl },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}
