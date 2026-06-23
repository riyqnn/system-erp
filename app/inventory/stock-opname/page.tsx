import { Metadata } from 'next'
import StockOpnameClient from './StockOpnameClient'

export const metadata: Metadata = {
  title: 'Stock Opname | Inventory Management',
  description: 'Manage physical audit requests and valuation reconciliations',
}

export default function StockOpnamePage() {
  return <StockOpnameClient />
}
