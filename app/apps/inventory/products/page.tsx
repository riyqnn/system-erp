'use client'

import { useState } from 'react'
import { Plus, DotsThree, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ModuleLayout } from '@/components/layout/ModuleLayout'

// Mock data for products
const mockProducts = [
  {
    id: 'PRD001',
    name: 'Kopi Kapal Api Special',
    category: 'Beverages',
    sku: 'KA-001',
    quantity: 1520,
    unit: 'pcs',
    price: 15000,
    status: 'In Stock',
  },
  {
    id: 'PRD002',
    name: 'Chacha 200g',
    category: 'Confectionery',
    sku: 'CH-200',
    quantity: 8500,
    unit: 'pcs',
    price: 3500,
    status: 'In Stock',
  },
  {
    id: 'PRD003',
    name: 'Beng-Beng 20g',
    category: 'Confectionery',
    sku: 'BB-020',
    quantity: 120,
    unit: 'box',
    price: 45000,
    status: 'Low Stock',
  },
  {
    id: 'PRD004',
    name: 'Biskuat 130g',
    category: 'Confectionery',
    sku: 'BS-130',
    quantity: 0,
    unit: 'box',
    price: 38000,
    status: 'Out of Stock',
  },
  {
    id: 'PRD005',
    name: 'Nutrijell Plain',
    category: 'Desserts',
    sku: 'NJ-PL',
    quantity: 3200,
    unit: 'pcs',
    price: 6500,
    status: 'In Stock',
  },
  {
    id: 'PRD006',
    name: 'Slai O Lai 150g',
    category: 'Confectionery',
    sku: 'SO-150',
    quantity: 45,
    unit: 'box',
    price: 52000,
    status: 'Low Stock',
  },
  {
    id: 'PRD007',
    name: 'Kopiko 78g',
    category: 'Confectionery',
    sku: 'KP-078',
    quantity: 8900,
    unit: 'pcs',
    price: 4000,
    status: 'In Stock',
  },
  {
    id: 'PRD008',
    name: 'Mytea 250g',
    category: 'Beverages',
    sku: 'MT-250',
    quantity: 2300,
    unit: 'pcs',
    price: 8500,
    status: 'In Stock',
  },
  {
    id: 'PRD009',
    name: 'Zee Premium 100g',
    category: 'Confectionery',
    sku: 'ZP-100',
    quantity: 56,
    unit: 'box',
    price: 75000,
    status: 'Low Stock',
  },
  {
    id: 'PRD010',
    name: 'Astor 120g',
    category: 'Confectionery',
    sku: 'AS-120',
    quantity: 0,
    unit: 'box',
    price: 28000,
    status: 'Out of Stock',
  },
]

export default function InventoryProductsPage() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  // Pagination calculations
  const totalPages = Math.ceil(mockProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = mockProducts.slice(startIndex, endIndex)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(paginatedProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, id])
    } else {
      setSelectedProducts(selectedProducts.filter(productId => productId !== id))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Low Stock':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Out of Stock':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <ModuleLayout
      activeModule="inventory"
      moduleTitle="Inventory"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Inventory', href: '/apps/inventory' },
        { label: 'Products' },
      ]}
    >
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">
              Products
            </h1>
            <p className="text-sm text-slate-500">
              Manage your product inventory
            </p>
          </div>
          <Button
            className="shadow-sm"
            style={{ backgroundColor: '#dc2626' }}
          >
            <Plus weight="bold" className="w-4 h-4" />
            Create Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: '2,847', change: '+12%' },
          { label: 'In Stock', value: '2,520', change: '+8%' },
          { label: 'Low Stock', value: '245', change: '-3%' },
          { label: 'Out of Stock', value: '82', change: '+5%' },
        ].map((stat) => (
          <Card key={stat.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    className="w-4 h-4 border-slate-300 rounded"
                    checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="w-4 h-4 border-slate-300 rounded"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => handleSelectOne(product.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    <span className="text-slate-900">{product.quantity.toLocaleString()}</span>
                    <span className="text-slate-500 text-xs ml-1">/{product.unit}</span>
                  </TableCell>
                  <TableCell className="text-slate-600">{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
                      <DotsThree weight="bold" className="w-5 h-5 text-slate-400" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Table Footer / Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {startIndex + 1} to {Math.min(endIndex, mockProducts.length)} of {mockProducts.length} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="border-slate-200"
              >
                <CaretLeft weight="bold" className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="border-slate-200"
              >
                <CaretRight weight="bold" className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ModuleLayout>
  )
}
