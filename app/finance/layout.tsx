import { ModuleLayout } from '@/components/layout/ModuleLayout'

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ModuleLayout
      activeModule="finance"
      moduleTitle="Finance"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance' },
      ]}
    >
      {children}
    </ModuleLayout>
  )
}
