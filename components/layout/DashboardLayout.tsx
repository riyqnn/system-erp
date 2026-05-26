'use client'

import { ModuleLayoutProps } from './ModuleLayout'

/**
 * Dashboard Layout Component (Deprecated)
 * This is now a thin wrapper around ModuleLayout for backward compatibility
 * Use ModuleLayout directly for new code
 *
 * @deprecated Use ModuleLayout instead
 */
export function DashboardLayout(props: ModuleLayoutProps) {
  // Dynamic import to avoid circular dependency
  const { ModuleLayout } = // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./ModuleLayout')
  return <ModuleLayout {...props} />
}

export type { ModuleLayoutProps as DashboardLayoutProps }
