'use client'

import { useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

const suppliers = [
  {
    supplierId: 'VND-RM-001',
    supplierName: 'PT Jawamanis Rafinasi',
    category: 'Raw Material',
    product: 'Gula Pasir',
    estimatedPrice: 'Rp 16.500/kg',
    leadTime: '2 Days',
    top: 'Net 30',
    status: 'Active',
  },
  {
    supplierId: 'VND-RM-004',
    supplierName: 'PT Aneka Coffee',
    category: 'Raw Material',
    product: 'Ekstrak Kopi',
    estimatedPrice: 'Rp 105.000/kg',
    leadTime: '5 Days',
    top: 'Net 30',
    status: 'Active',
  },
  {
    supplierId: 'VND-PM-001',
    supplierName: 'PT Supernova Flexible',
    category: 'Packaging',
    product: 'Plastik Roll',
    estimatedPrice: 'Rp 65.000/roll',
    leadTime: '5 Days',
    top: 'Net 30',
    status: 'Active',
  },
  {
    supplierId: 'VND-RM-012',
    supplierName: 'PT Sumber Roso',
    category: 'Raw Material',
    product: 'Garam Industri',
    estimatedPrice: 'Rp 8.000/kg',
    leadTime: '3 Days',
    top: 'Net 14',
    status: 'Inactive',
  },
  {
    supplierId: 'VND-PM-005',
    supplierName: 'CV Kemas Jaya',
    category: 'Packaging',
    product: 'Karton Box',
    estimatedPrice: 'Rp 12.000/pcs',
    leadTime: '7 Days',
    top: 'Net 45',
    status: 'Active',
  },
]

export function SuppliersPageClient() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [status, setStatus] = useState('All Status')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Inactive'>(
    'Active'
  )

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        supplier.supplierId.toLowerCase().includes(search.toLowerCase()) ||
        supplier.product.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        category === 'All Categories' || supplier.category === category

      const matchesStatus = status === 'All Status' || supplier.status === status

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [search, category, status])

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Suppliers' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Suppliers"
          description="Manage and monitor all approved suppliers."
        />

        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search supplier..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-lg border border-red-100 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-red-300 md:w-64"
                />
              </div>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 rounded-lg border border-red-100 bg-white px-3 text-sm outline-none transition focus:border-red-300"
              >
                <option>All Categories</option>
                <option>Raw Material</option>
                <option>Packaging</option>
              </select>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded-lg border border-red-100 bg-white px-3 text-sm outline-none transition focus:border-red-300"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 rounded-lg bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800"
            >
              + Add Supplier
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-red-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Supplier ID</th>
                    <th className="px-4 py-3 font-semibold">Supplier Name</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Estimated Price</th>
                    <th className="px-4 py-3 font-semibold">Lead Time</th>
                    <th className="px-4 py-3 font-semibold">TOP</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-red-50">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.supplierId} className="hover:bg-red-50/30">
                      <td className="px-4 py-4 text-xs font-medium text-slate-700">
                        {supplier.supplierId}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {supplier.supplierName}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {supplier.category}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {supplier.product}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {supplier.estimatedPrice}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {supplier.leadTime}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {supplier.top}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            supplier.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {supplier.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="text-xl font-bold text-red-700">
                          ⋮
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No supplier data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-red-50 px-4 py-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>Showing {filteredSuppliers.length} of 18 supplier data</p>

              <div className="flex items-center gap-2">
                <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                  ‹
                </button>
                <button className="rounded-lg bg-red-700 px-3 py-1 text-white">
                  1
                </button>
                <button className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100">
                  2
                </button>
                <button className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100">
                  3
                </button>
                <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">Supplier Statistics</h3>
            <p className="mt-1 text-sm text-slate-500">
              Supplier category distribution based on this year procurement
              volume.
            </p>

            <div className="mt-6 flex h-32 items-end gap-6">
              <div className="h-28 w-28 rounded-t-lg bg-red-700" />
              <div className="h-16 w-28 rounded-t-lg bg-red-500" />
              <div className="h-24 w-28 rounded-t-lg bg-teal-600" />
            </div>
          </div>

          <div className="rounded-xl bg-red-700 p-5 text-white shadow-sm">
            <h3 className="font-semibold">Need Help?</h3>
            <p className="mt-2 text-sm text-red-50">
              Contact procurement support for supplier registration assistance.
            </p>

            <button className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50">
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Add New Supplier
              </h2>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  Supplier ID
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    AUTO-GENERATE
                  </span>
                </label>
                <input
                  type="text"
                  value="VND-RM-001"
                  readOnly
                  className="h-10 w-full rounded-lg border border-red-100 bg-slate-100 px-3 text-sm text-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Estimated Price / Unit
                </label>
                <div className="flex h-10 overflow-hidden rounded-lg border border-red-100 focus-within:border-red-300">
                  <span className="flex items-center border-r border-red-100 px-3 text-sm text-slate-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    placeholder="16.500"
                    className="w-full px-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Supplier Name
                </label>
                <input
                  type="text"
                  placeholder="PT Jawamanis Rafinasi"
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Unit of Measure
                </label>
                <input
                  type="text"
                  placeholder="kg"
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Category
                </label>
                <select className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300">
                  <option>Raw Material</option>
                  <option>Packaging</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Lead Time
                </label>
                <div className="flex h-10 overflow-hidden rounded-lg border border-red-100 focus-within:border-red-300">
                  <input
                    type="text"
                    placeholder="2"
                    className="w-full px-3 text-sm outline-none"
                  />
                  <span className="flex items-center border-l border-red-100 px-3 text-sm text-slate-500">
                    Days
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Product
                </label>
                <select className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300">
                  <option>Gula Pasir</option>
                  <option>Ekstrak Kopi</option>
                  <option>Plastik Roll</option>
                  <option>Garam Industri</option>
                  <option>Karton Box</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Term of Payment
                </label>
                <input
                  type="text"
                  placeholder="Net 30"
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold text-slate-600">
                  Status
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Active')}
                    className={`rounded-full px-5 py-2 text-xs font-semibold transition ${
                      selectedStatus === 'Active'
                        ? 'bg-red-700 text-white'
                        : 'border border-red-100 text-slate-500 hover:bg-red-50'
                    }`}
                  >
                    Active
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('Inactive')}
                    className={`rounded-full px-5 py-2 text-xs font-semibold transition ${
                      selectedStatus === 'Inactive'
                        ? 'bg-red-700 text-white'
                        : 'border border-red-100 text-slate-500 hover:bg-red-50'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  )
}