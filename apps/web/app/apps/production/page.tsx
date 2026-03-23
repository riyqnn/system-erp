'use client'

import Link from 'next/link'
import { Factory, Gear, ListChecks, CalendarCheck } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'

const quickActions = [
  { label: 'Production Orders', href: '/apps/production/orders', icon: ListChecks, count: '234', description: 'Active production orders' },
  { label: 'Bill of Materials', href: '/apps/production/bom', icon: Gear, count: '156', description: 'Product recipes & BOM' },
  { label: 'Planning', href: '/apps/production/planning', icon: CalendarCheck, count: '89', description: 'Production schedules' },
]

export default function ProductionPage() {
  return (
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production' },
      ]}
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Production Overview</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-sm transition-all">
                <CardContent className="p-6">
                  <action.icon weight="bold" size={32} className="mb-3" style={{ color: '#dc2626' }} />
                  <h3 className="font-semibold text-slate-900 mb-1">{action.label}</h3>
                  <p className="text-2xl font-semibold text-slate-900 mb-1">{action.count}</p>
                  <p className="text-sm text-slate-500">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ModuleLayout>
  )
}
