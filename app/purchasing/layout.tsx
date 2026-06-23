import { ModuleLayout } from '@/components/layout/ModuleLayout'

export default function PurchasingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing' },
      ]}
    >
      {children}
    </ModuleLayout>
  )
}
