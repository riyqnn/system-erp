/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  CaretLeft,
  CaretRight,
  CaretDown,
  GridFour,
  Package,
  ShoppingCart,
  Factory,
  ChartLineUp,
  Users,
  Gear,
  Truck,
  Receipt,
  Cube,
  ArrowsLeftRight,
  CheckSquare,
  ClipboardText,
  Coins,
  Book,
  Calculator,
  CreditCard,
  Megaphone,
} from '@phosphor-icons/react'

interface SubItem {
  label: string
  href: string
}

interface MenuItem {
  label: string
  href: string
  icon: any
  roles?: string[]
  children?: SubItem[]
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
      { label: 'Dashboard', href: '/admin', icon: GridFour },
      { label: 'Statistics', href: '/admin/statistics', icon: ChartLineUp },
      { label: 'Module Statistics', href: '/admin/module-statistics', icon: ChartLineUp },
      { label: 'User Management', href: '/admin/pending-users', icon: Users },
      { label: 'Settings', href: '/admin/settings', icon: Gear },
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
      { label: 'Dashboard', href: '/finance/dashboard', icon: GridFour },
      { label: 'Account Receivable', href: '/finance/account-receivable', icon: Receipt },
      { label: 'Account Payable', href: '/finance/account-payable', icon: CreditCard },
      { label: 'Treasury', href: '/finance/treasury', icon: Coins },
      { label: 'General Ledger', href: '/finance/general-ledger', icon: Book },
      { label: 'Cost Accounting', href: '/finance/cost-accounting', icon: Calculator },
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
      { label: 'Overview', href: '/snm', icon: GridFour },
      {
        label: 'Sales Orders',
        href: '/snm/sales',
        icon: ClipboardText,
        children: [
          { label: 'Semua SO', href: '/snm/sales' },
          { label: 'Menunggu Approval', href: '/snm/sales?status=WAITING_APPROVAL' },
          { label: 'Disetujui', href: '/snm/sales?status=APPROVED' },
          { label: 'Ditolak', href: '/snm/sales?status=REJECTED_CREDIT' },
        ],
      },
      {
        label: 'Customers',
        href: '/snm/customers',
        icon: Users,
        children: [
          { label: 'Semua Customer', href: '/snm/customers' },
          { label: 'Modern Trade', href: '/snm/customers?category=MODERN_TRADE' },
          { label: 'General Trade', href: '/snm/customers?category=GENERAL_TRADE' },
          { label: 'Agen Distributor', href: '/snm/customers?category=AGEN_DISTRIBUTOR' },
        ],
      },
      {
        label: 'Marketing',
        href: '/snm/marketing',
        icon: Megaphone,
        children: [
          { label: 'Ringkasan', href: '/snm/marketing' },
          { label: 'Sales Forecast', href: '/snm/marketing/forecast' },
          { label: 'Realisasi vs Target', href: '/snm/marketing/monitoring' },
        ],
      },
    ],
  }

  return moduleMenus[activeModule || ''] || []
}

/**
 * Sidebar Component
 * Collapsible white sidebar with thin right border.
 * Supports expandable submenus (dropdown) per menu item.
 */
export function Sidebar({ isOpen = true, onClose, activeModule }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const menuItems = getModuleNavigation(activeModule)

  // Parent is "active" when current path is under its base route.
  const isParentActive = (item: MenuItem) =>
    pathname === item.href || pathname?.startsWith(item.href + '/') || false

  // Manual expand/collapse state per parent href.
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (href: string) => setOpen((s) => ({ ...s, [href]: !s[href] }))

  // Exact-match active (used for the module root, e.g. "Overview").
  const isExactActive = (href: string) => pathname === href

  // Child active: match pathname + relevant query param.
  const isChildActive = (childHref: string) => {
    const [path, query] = childHref.split('?')
    if (pathname !== path) return false
    if (!query) {
      // "Semua / Ringkasan" child is active only when no filter query is present.
      return !searchParams?.get('status') && !searchParams?.get('category')
    }
    const [key, value] = query.split('=')
    return searchParams?.get(key) === value
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
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
            const hasChildren = !!item.children?.length

            // For parents with children, highlight via prefix; for leaf root items
            // (e.g. "Overview") use exact match so it isn't highlighted on sub-tabs.
            const active = hasChildren ? isParentActive(item) : isExactActive(item.href)
            const expanded = !collapsed && hasChildren && (open[item.href] ?? isParentActive(item))

            return (
              <div key={item.href}>
                <div
                  className={`
                    flex items-center rounded-md text-sm transition-colors duration-150
                    ${active ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}
                  `}
                >
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 flex-1 min-w-0 ${collapsed ? 'justify-center' : ''}`}
                  >
                    <Icon
                      weight={active ? 'fill' : 'regular'}
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: active ? '#dc2626' : '#64748b' }}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                  {hasChildren && !collapsed && (
                    <button
                      onClick={() => toggle(item.href)}
                      className="p-2 text-slate-400 hover:text-slate-700"
                      aria-label={`Toggle ${item.label}`}
                    >
                      <CaretDown
                        weight="bold"
                        className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>

                {/* Submenu */}
                {expanded && (
                  <div className="mt-0.5 ml-4 pl-3 border-l border-slate-100 space-y-0.5">
                    {item.children!.map((child) => {
                      const childActive = isChildActive(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`
                            block px-3 py-1.5 rounded-md text-[13px] transition-colors
                            ${childActive
                              ? 'bg-red-50 text-[#dc2626] font-medium'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }
                          `}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
