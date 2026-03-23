'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { usePathname } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

/**
 * Dashboard Layout Component
 * Wraps the application with Sidebar, Top Bar, and content area
 * Odoo-style layout with responsive design
 */
export function DashboardLayout({ children, title, breadcrumbs }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Determine active module from path
  const activeModule = pathname.match(/^\/apps\/([^/]+)/)?.[1]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeModule={activeModule}
        // userRole will be populated from session
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Bar */}
        <TopBar
          title={title}
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
