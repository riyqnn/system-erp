'use client'

import Link from 'next/link'
import { Package, Tag, ArrowsLeftRight, Warehouse } from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { ModuleLayout } from '@/components/layout/ModuleLayout'

const quickActions = [
  { label: 'Products', href: '/apps/inventory/products', icon: Package, count: '2,847', description: 'Manage product catalog' },
  { label: 'Categories', href: '/apps/inventory/categories', icon: Tag, count: '156', description: 'Product categories' },
  { label: 'Stock Operations', href: '/apps/inventory/stock', icon: ArrowsLeftRight, count: '1,234', description: 'Stock movements' },
  { label: 'Warehouses', href: '/apps/inventory/warehouses', icon: Warehouse, count: '12', description: 'Warehouse locations' },
]

export default function InventoryPage() {
  return (
    <ModuleLayout
      activeModule="inventory"
      moduleTitle="Inventory"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Inventory' },
      ]}
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Inventory Overview</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
