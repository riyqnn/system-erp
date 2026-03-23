'use client'

import Link from 'next/link'
import {
  Package,
  CurrencyDollar,
  ShoppingCart,
  Factory,
  TrendUp,
  MagnifyingGlass,
  User,
} from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Module configuration
 * Each module with Phosphor Icons and corporate red branding
 */
const MODULES = [
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Manage products, stock, and warehouse',
    icon: Package,
    href: '/apps/inventory',
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Invoices, payments, and accounting',
    icon: CurrencyDollar,
    href: '/apps/finance',
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Manufacturing and production planning',
    icon: Factory,
    href: '/apps/production',
  },
  {
    id: 'purchasing',
    name: 'Purchasing',
    description: 'Purchase orders and vendor management',
    icon: ShoppingCart,
    href: '/apps/purchasing',
  },
  {
    id: 'snm',
    name: 'Sales & Marketing',
    description: 'Sales, marketing, and customer management',
    icon: TrendUp,
    href: '/apps/snm',
  },
]

interface AppSwitcherProps {
  userRole?: string
}

/**
 * App Switcher Component
 * Odoo-style dashboard with top navbar and module grid
 */
export function AppSwitcher({ userRole }: AppSwitcherProps) {
  // Filter modules based on user role (admin sees all)
  const accessibleModules = MODULES.filter(module => {
    // For now, all modules are accessible
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 bg-white border border-slate-200 rounded-lg">
                <Package weight="bold" className="w-5 h-5" style={{ color: '#dc2626' }} />
              </div>
              <span className="text-lg font-semibold text-slate-900">
                PT Mayora ERP
              </span>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search modules, products, or actions..."
                  className="pl-10 border-slate-200 bg-slate-50 focus-visible:bg-white"
                />
              </div>
            </div>

            {/* Right: User Profile */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">Administrator</p>
                <p className="text-xs text-slate-500">admin@mayora.id</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <User weight="bold" className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">
            Welcome to PT Mayora ERP
          </h1>
          <p className="text-sm text-slate-500">
            Select a module to begin your work
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {accessibleModules.map((module) => {
            const Icon = module.icon
            return (
              <Link
                key={module.id}
                href={module.href}
                className="group bg-white border border-slate-200 rounded-lg p-6 hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col items-center text-center"
              >
                {/* Icon */}
                <div className="w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-150">
                  <Icon
                    weight="bold"
                    size={48}
                    style={{ color: '#dc2626' }}
                  />
                </div>

                {/* Module Name */}
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  {module.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2">
                  {module.description}
                </p>
              </Link>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-slate-400 text-center">
            © 2025 PT Mayora. Enterprise Resource Planning System.
          </p>
        </div>
      </footer>
    </div>
  )
}
