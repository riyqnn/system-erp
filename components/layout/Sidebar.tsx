'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CaretLeft,
  CaretRight,
  GridFour,
  Package,
  CurrencyDollar,
  ShoppingCart,
  Factory,
  TrendUp,
  ChartLineUp,
  Users,
  Gear,
  Truck,
  Receipt,
  Cube,
  ArrowsLeftRight,
  CheckSquare,
  ClipboardText,
} from '@phosphor-icons/react'

interface MenuItem {
  label: string
  href: string
  icon: any
  roles?: string[]
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  userRole?: string
  activeModule?: string
}

/**
 * Get module-specific navigation items based on active module
 */
const getModuleNavigation = (activeModule?: string): MenuItem[] => {
  const moduleMenus: Record<string, MenuItem[]> = {
    admin: [
      {
        label: 'Dashboard',
        href: '/admin',
        icon: GridFour,
      },
      {
        label: 'Statistics',
        href: '/admin/statistics',
        icon: ChartLineUp,
      },
      {
        label: 'Module Statistics',
        href: '/admin/module-statistics',
        icon: ChartLineUp,
      },
      {
        label: 'User Management',
        href: '/admin/pending-users',
        icon: Users,
      },
      {
        label: 'Settings',
        href: '/admin/settings',
        icon: Gear,
      },
    ],
    inventory: [
      { label: 'Dashboard', href: '/inventory/dashboard', icon: GridFour },
      { label: 'Produk', href: '/inventory/produk', icon: Package },
      { label: 'Monitoring Stok', href: '/inventory/monitoring-stok', icon: GridFour },
      { label: 'Permintaan Produksi', href: '/inventory/permintaan-produksi', icon: GridFour },
      { label: 'Verifikasi BOM', href: '/inventory/verifikasi-bom', icon: GridFour },
      { label: 'Purchase Requisition', href: '/inventory/purchase-requisition', icon: ShoppingCart },
      { label: 'Penerimaan Barang', href: '/inventory/goods-receipt', icon: Package },
      { label: 'Serah Terima Bahan', href: '/inventory/material-handover', icon: ArrowsLeftRight },
      { label: 'Penerimaan Barang Jadi', href: '/inventory/receive-fg', icon: Cube },
      { label: 'Validasi Sales Order', href: '/inventory/sales-order-validation', icon: CheckSquare },
      { label: 'Konfirmasi Pengiriman', href: '/inventory/shipping', icon: Truck },
      { label: 'Verifikasi Invoice', href: '/inventory/invoice-verification', icon: Receipt },
      { label: 'Laporan Inventory', href: '/inventory/ledger', icon: ClipboardText },
    ],
    finance: [
      { label: 'Overview', href: '/apps/finance', icon: GridFour },
      { label: 'Invoices', href: '/apps/finance/invoices', icon: CurrencyDollar },
      { label: 'Payments', href: '/apps/finance/payments', icon: CurrencyDollar },
      { label: 'Reports', href: '/apps/finance/reports', icon: CurrencyDollar },
    ],
    purchasing: [
      { label: 'Overview', href: '/apps/purchasing', icon: GridFour },
      { label: 'Purchase Orders', href: '/apps/purchasing/orders', icon: ShoppingCart },
      { label: 'Vendors', href: '/apps/purchasing/vendors', icon: ShoppingCart },
      { label: 'Requests', href: '/apps/purchasing/requests', icon: ShoppingCart },
    ],
    production: [
      { label: 'Overview', href: '/apps/production', icon: GridFour },
      { label: 'Production Orders', href: '/apps/production/orders', icon: Factory },
      { label: 'Bill of Materials', href: '/apps/production/bom', icon: Factory },
      { label: 'Planning', href: '/apps/production/planning', icon: Factory },
    ],
    snm: [
      { label: 'Overview', href: '/apps/snm', icon: GridFour },
      { label: 'Sales Orders', href: '/apps/snm/sales', icon: TrendUp },
      { label: 'Customers', href: '/apps/snm/customers', icon: TrendUp },
      { label: 'Marketing', href: '/apps/snm/marketing', icon: TrendUp },
    ],
  }

  return moduleMenus[activeModule || ''] || []
}

/**
 * Sidebar Component
 * Collapsible white sidebar with thin right border
 * Shows module-specific navigation when inside a module
 */
export function Sidebar({ isOpen = true, onClose, userRole, activeModule }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Get module-specific menu items or empty array
  const menuItems = getModuleNavigation(activeModule)

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-30
          bg-white border-r border-slate-200
          transition-all duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'w-16' : 'w-56'}
        `}
      >
        {/* Header with collapse toggle */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200">
          {!collapsed && (
            <Link href="/dashboard" className="text-sm font-semibold text-slate-900 truncate">
              {activeModule ? activeModule.charAt(0).toUpperCase() + activeModule.slice(1) : 'PT Mayora'}
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors hidden lg:flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <CaretRight weight="bold" className="w-4 h-4 text-slate-600" />
            ) : (
              <CaretLeft weight="bold" className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-2 space-y-0.5 overflow-y-auto h-[calc(100vh-3.5rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <Icon
                  weight={isActive ? 'fill' : 'regular'}
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: isActive ? '#dc2626' : '#64748b' }}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
