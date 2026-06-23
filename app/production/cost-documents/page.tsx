import CostDocumentsClient from './CostDocumentsClient'

export const metadata = {
  title: 'Cost Documents | Production Module',
  description: 'Manage returned cost documents from Cost Accounting.',
}

export default function CostDocumentsPage() {
  return (
    <div className="p-8">
      <CostDocumentsClient />
    </div>
  )
}
