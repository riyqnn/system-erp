import { ModuleLayout } from '@/components/layout/ModuleLayout'

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ModuleLayout
      activeModule="inventory"
      moduleTitle="Inventory"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Inventory' },
      ]}
    >
      {children}
    </ModuleLayout>
  )
}
