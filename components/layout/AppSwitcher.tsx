'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Package,
  CurrencyDollar,
  ShoppingCart,
  Factory,
  TrendUp,
  MagnifyingGlass,
  User,
  CaretDown,
  Bell,
  ChatCircle,
  SignOut,
  Gear,
  SquaresFour,
  Users,
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
    roles: ['INVENTORY', 'ADMIN'],
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Invoices, payments, and accounting',
    icon: CurrencyDollar,
    href: '/apps/finance',
    roles: ['FINANCE', 'ADMIN'],
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Manufacturing and production planning',
    icon: Factory,
    href: '/apps/production',
    roles: ['PRODUCTION', 'ADMIN'],
  },
  {
    id: 'purchasing',
    name: 'Purchasing',
    description: 'Purchase orders and vendor management',
    icon: ShoppingCart,
    href: '/apps/purchasing',
    roles: ['PURCHASING', 'ADMIN'],
  },
  {
    id: 'snm',
    name: 'Sales & Marketing',
    description: 'Sales, marketing, and customer management',
    icon: TrendUp,
    href: '/apps/snm',
    roles: ['SNM', 'SALES', 'ADMIN'],
  },
]

/**
 * Admin modules - only visible to ADMIN role
 */
const ADMIN_MODULES = [
  {
    id: 'admin',
    name: 'User Management',
    description: 'Manage users and approve registrations',
    icon: Users,
    href: '/admin/pending-users',
    roles: ['ADMIN'],
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Fetch user data
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(({ user: userData }) => setUser(userData))
      .catch(() => setUser(null))
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (err) {
      window.location.href = '/login'
    }
  }

  // Filter modules based on user role (admin sees all)
  const accessibleModules = [...ADMIN_MODULES, ...MODULES].filter(module => {
    if (module.roles && module.roles.length > 0) {
      const userRole = user?.role?.name?.toUpperCase()
      return module.roles.includes(userRole || '')
    }
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

            {/* Right: Notifications, Messages, Profile */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                  className="p-2 hover:bg-slate-100 rounded-md transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell weight="bold" className="w-5 h-5 text-slate-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Notification Dropdown */}
                {notifMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setNotifMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-sm border border-slate-200 z-20">
                      <div className="p-4 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-slate-500 text-center">No new notifications</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <button
                className="p-2 hover:bg-slate-100 rounded-md transition-colors relative"
                aria-label="Messages"
              >
                <ChatCircle weight="bold" className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <User weight="bold" className="w-4 h-4 text-slate-600" />
                  </div>
                  <CaretDown weight="bold" className="w-3 h-3 text-slate-500 hidden sm:block" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-sm border border-slate-200 z-20">
                      <div className="p-4 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">
                          {user?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {user?.role?.name || 'Role'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {user?.email || 'email@example.com'}
                        </p>
                      </div>

                      <div className="p-2">
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                        >
                          <SquaresFour weight="regular" className="w-5 h-5 text-slate-500" />
                          Dashboard
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                        >
                          <Gear weight="regular" className="w-5 h-5 text-slate-500" />
                          Settings
                        </Link>
                      </div>

                      <hr className="my-1 border-slate-100" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"
                      >
                        <SignOut weight="regular" className="w-5 h-5" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
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
