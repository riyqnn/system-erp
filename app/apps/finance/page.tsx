'use client'

import Link from 'next/link'
import { CurrencyDollar, Receipt, Wallet, ChartBar } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'

const quickActions = [
  { label: 'Invoices', href: '/apps/finance/invoices', icon: Receipt, count: '847', description: 'Customer & vendor invoices' },
  { label: 'Payments', href: '/apps/finance/payments', icon: Wallet, count: '1,523', description: 'Payment transactions' },
  { label: 'Reports', href: '/apps/finance/reports', icon: ChartBar, count: '45', description: 'Financial reports' },
]

export default function FinancePage() {
  return (
    <ModuleLayout
      activeModule="finance"
      moduleTitle="Finance"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
      ]}
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Finance Overview</h1>

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
