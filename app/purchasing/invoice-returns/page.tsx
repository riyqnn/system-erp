import InvoiceReturnsClient from './InvoiceReturnsClient'

export const metadata = {
  title: 'Invoice Returns | Purchasing Module',
  description: 'Handle returned invoices from Finance due to discrepancy.',
}

export default function InvoiceReturnsPage() {
  return (
    <div className="p-8">
      <InvoiceReturnsClient />
    </div>
  )
}
