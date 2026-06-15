import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { getUserFromRequest } from '@/lib/auth/rbac'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserFromRequest()
  let activeModule = 'admin'
  const r = user?.role?.toUpperCase() || ''
  
  if (r.includes('INVENTORY')) activeModule = 'inventory'
  else if (r.includes('FINANCE') || r.includes('ACCOUNT') || r.includes('TREASURY')) activeModule = 'finance'
  else if (r.includes('PURCHASING')) activeModule = 'purchasing'
  else if (r.includes('PRODUCTION')) activeModule = 'production'
  else if (r.includes('SALES') || r.includes('MARKETING')) activeModule = 'snm'

  return (
    <ModuleLayout
      activeModule={activeModule}
      moduleTitle="Settings"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings' },
      ]}
    >
      {children}
    </ModuleLayout>
  )
}
