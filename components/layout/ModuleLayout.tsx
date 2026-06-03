'use client'

import { Suspense, useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export interface ModuleLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  activeModule: string
  moduleTitle: string
}

/**
 * Module Layout Component
 * Shared layout for all module pages with sidebar and topbar
 * Use this to ensure consistent UI across all modules
 */
export function ModuleLayout({ children, breadcrumbs = [], activeModule, moduleTitle }: ModuleLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Default breadcrumbs if not provided
  const defaultBreadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: moduleTitle, href: `/apps/${activeModule}` },
  ]

  const finalBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : defaultBreadcrumbs

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar (Suspense required because Sidebar uses useSearchParams) */}
      <Suspense fallback={<aside className="hidden lg:block w-56 border-r border-slate-200 bg-white" />}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeModule={activeModule}
        />
      </Suspense>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar
          moduleName={moduleTitle}
          breadcrumbs={finalBreadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
