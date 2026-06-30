'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  ChartBar,
  Users,
  Gear,
  Truck,
  Receipt,
  ClipboardText,
  Coins,
  Book,
  Calculator,
  CreditCard,
  Megaphone,
  Wrench,
  CalendarCheck,
  FileText,
  Handshake,
  Scales,
  CheckSquare,

  Bell,

} from '@phosphor-icons/react'

interface SubItem {
  label: string
  href: string
}

interface MenuItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
  children?: SubItem[]
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  userRole?: string
  activeModule?: string
}

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
      { label: 'Products',  href: '/inventory/produk',    icon: Package },
      {
        label: 'Procurement',
        href: '/inventory/purchase-requisition',
        icon: ShoppingCart,
        children: [
          { label: 'Purchase Requisition', href: '/inventory/purchase-requisition' },
          { label: 'Goods Receipt',        href: '/inventory/goods-receipt' },
        ],
      },
      {
        label: 'Operations',
        href: '/inventory/permintaan-produksi',
        icon: Wrench,
        children: [
          { label: 'Production Request',     href: '/inventory/permintaan-produksi' },
          { label: 'BOM Verification',       href: '/inventory/verifikasi-bom' },
          { label: 'Material Handover',      href: '/inventory/material-handover' },
          { label: 'Finished Goods Receipt', href: '/inventory/receive-fg' },
        ],
      },
      {
        label: 'Outbound',
        href: '/inventory/sales-order-validation',
        icon: Truck,
        children: [
          { label: 'Sales Order Validation', href: '/inventory/sales-order-validation' },
          { label: 'Shipment Confirmation',  href: '/inventory/shipping' },
        ],
      },
      {
        label: 'Invoice',
        href: '/inventory/invoice-verification',
        icon: Receipt,
        children: [
          { label: 'Invoice Verification', href: '/inventory/invoice-verification' },
        ],
      },
      {
        label: 'Reports',
        href: '/inventory/monitoring-stok',
        icon: ChartBar,
        children: [
          { label: 'Stock Monitoring', href: '/inventory/monitoring-stok' },
          { label: 'Inventory Report', href: '/inventory/ledger' },
        ],
      },
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
      { label: 'Dashboard', href: '/apps/purchasing', icon: GridFour },
      { label: 'Suppliers', href: '/apps/purchasing/suppliers', icon: Users },
      { label: 'Purchase Requisition', href: '/apps/purchasing/purchase-requisition', icon: ClipboardText },
      { label: 'RFQ / Sourcing', href: '/apps/purchasing/rfq-sourcing', icon: FileText },
      { label: 'Price Negotiation', href: '/apps/purchasing/negotiation', icon: Handshake },
      { label: 'Purchase Order', href: '/apps/purchasing/purchase-orders', icon: ShoppingCart },
      { label: 'Monitoring', href: '/apps/purchasing/delivery-monitoring', icon: Truck },
      { label: 'Goods Receipt', href: '/apps/purchasing/goods-receipt', icon: Package },
      { label: 'Three-Way Matching', href: '/apps/purchasing/three-way-matching', icon: Scales },
    ],
    production: [
      { label: 'Dashboard', href: '/production', icon: GridFour },
      { label: 'Recipe & Order', href: '/production/resep-order', icon: ClipboardText },
      { label: 'MRP Planning', href: '/production/planning', icon: CalendarCheck },
      { label: 'Goods Issue', href: '/production/goods-issue', icon: Package },
      { label: 'Production', href: '/production/produksi', icon: Factory },
      { label: 'QC & Goods Receipt', href: '/production/quality-control', icon: CheckSquare },
      { label: 'Order Settlement', href: '/production/settlement', icon: Receipt },
      { label: 'Production Report', href: '/production/laporan', icon: ChartBar },
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
      { label: 'Approval Manager', href: '/snm/approvals', icon: CheckSquare },
      { label: 'Delivery Orders', href: '/snm/deliveries', icon: Truck },
      { label: 'Invoices', href: '/snm/invoices', icon: Receipt },
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
    notifications: [
      { label: 'All Notifications', href: '/notifications', icon: Bell },
    ],
  }

  return moduleMenus[activeModule || ''] || []
}

export function Sidebar({ isOpen = true, onClose, activeModule }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const menuItems = getModuleNavigation(activeModule)

  const isChildActive = useCallback((childHref: string) => {
    const [path, query] = childHref.split('?')
    if (pathname !== path) return false
    if (!query) return !searchParams?.get('status') && !searchParams?.get('category')
    const [key, value] = query.split('=')
    return searchParams?.get(key) === value
  }, [pathname, searchParams])

  // ── A parent is active if any child matches current URL ───────────
  const isParentActive = (item: MenuItem): boolean => {
    if (item.children?.length) {
      return item.children.some((c) => isChildActive(c.href))
    }
    return pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false)
  }

  const isExactActive = (href: string) => pathname === href

  // ── Open state: undefined = not yet touched by user ───────────────
  const [open, setOpen] = useState<Record<string, boolean | undefined>>({})

  const toggle = (href: string) =>
    setOpen((prev) => {
      const current = prev[href]
      const wasOpen = current === undefined ? isParentActive(menuItems.find((m) => m.href === href)!) : current
      return { ...prev, [href]: !wasOpen }
    })

  // Auto-expand parent whose child matches current path (e.g. on page load or deep link)
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen((prev) => {
        const next = { ...prev }
      menuItems.forEach((item) => {
        if (item.children?.length) {
          const anyChildActive = item.children.some((c) => isChildActive(c.href))
          // Only auto-open, never auto-close (user close = explicit false)
          if (anyChildActive && next[item.href] !== false) {
            next[item.href] = true
          }
        }
      })
      return next
    })
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, searchParams, isChildActive, menuItems])

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
          transition-all duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'w-16' : 'w-56'}
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/logo mayora.png"
                alt="PT Mayora"
                width={110}
                height={38}
                className="object-contain"
                priority
              />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors hidden lg:flex items-center justify-center ml-auto"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <CaretRight weight="bold" className="w-4 h-4 text-slate-600" />
            ) : (
              <CaretLeft weight="bold" className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="p-2 space-y-0.5 overflow-y-auto h-[calc(100vh-3.5rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            const hasChildren = !!item.children?.length
            const active = hasChildren ? isParentActive(item) : isExactActive(item.href)

            // Resolve expanded state
            const rawOpen = open[item.href]
            const expanded = !collapsed && hasChildren && (
              rawOpen === undefined ? isParentActive(item) : rawOpen
            )

            const rowBase = `
              flex items-center rounded-lg text-sm select-none
              transition-colors duration-150
              ${active
                ? 'bg-red-50 text-red-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
            `

            return (
              <div key={item.href}>

                {/* ── Parent row ── */}
                {hasChildren ? (
                  // Parent with children: entire row is a toggle button — no navigation
                  <button
                    type="button"
                    onClick={() => toggle(item.href)}
                    className={`w-full ${rowBase} ${collapsed ? 'justify-center px-3 py-2.5' : 'px-3 py-2.5'}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      weight={active ? 'fill' : 'regular'}
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: active ? '#dc2626' : '#64748b' }}
                    />
                    {!collapsed && (
                      <>
                        <span className="ml-2.5 flex-1 text-left text-[13px] font-medium truncate">
                          {item.label}
                        </span>
                        <CaretDown
                          weight="bold"
                          className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 text-slate-400 ${expanded ? 'rotate-180' : ''}`}
                        />
                      </>
                    )}
                  </button>
                ) : (
                  // Leaf: Link navigates
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`${rowBase} ${collapsed ? 'justify-center px-3 py-2.5' : 'px-3 py-2.5'}`}
                  >
                    <Icon
                      weight={active ? 'fill' : 'regular'}
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: active ? '#dc2626' : '#64748b' }}
                    />
                    {!collapsed && (
                      <span className="ml-2.5 text-[13px] font-medium truncate">{item.label}</span>
                    )}
                  </Link>
                )}

                {/* ── Submenu — smooth height + opacity transition ── */}
                {hasChildren && (
                  <div
                    className="overflow-hidden transition-all duration-200 ease-in-out"
                    style={{
                      maxHeight: expanded ? `${(item.children?.length ?? 0) * 40}px` : '0px',
                      opacity: expanded ? 1 : 0,
                      pointerEvents: expanded ? 'auto' : 'none',
                    }}
                  >
                    <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5 pb-1.5">
                      {item.children?.map((child) => {
                        const childActive = isChildActive(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`
                              block px-2.5 py-[7px] rounded-md text-[12.5px]
                              transition-colors duration-150
                              ${childActive
                                ? 'bg-red-50 text-red-600 font-semibold'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                            `}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
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
