'use client'

import { useEffect, useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type SupplierStatus = 'ACTIVE' | 'INACTIVE'

type Supplier = {
  id: string
  supplierId: string
  supplierName: string
  contact: string
  address: string
  productCode: string
  product: string
  category: string
  unit: string
  estimatedPrice: number
  leadTime: number
  termOfPayment: string
  status: SupplierStatus
}

type SupplierForm = {
  supplierCode: string
  supplierName: string
  contact: string
  address: string
  productSku: string
  estimatedPrice: string
  leadTimeDays: string
  paymentTerm: string
  status: SupplierStatus
}

const initialForm: SupplierForm = {
  supplierCode: '',
  supplierName: '',
  contact: '',
  address: '',
  productSku: 'RM-001',
  estimatedPrice: '',
  leadTimeDays: '',
  paymentTerm: 'NET_30',
  status: 'ACTIVE',
}

function formatCurrency(value: number, unit: string) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value)}/${unit}`
}

function formatPaymentTerm(value: string) {
  return value.replace('NET_', 'Net ')
}

function formatStatus(value: SupplierStatus) {
  return value === 'ACTIVE' ? 'Active' : 'Inactive'
}

export function SuppliersPageClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [status, setStatus] = useState('All Status')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [form, setForm] = useState<SupplierForm>(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/suppliers')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch suppliers')
      }

      setSuppliers(result.data || [])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch suppliers'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(suppliers.map((supplier) => supplier.category))
    )

    return ['All Categories', ...uniqueCategories]
  }, [suppliers])

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.supplierName.toLowerCase().includes(search.toLowerCase()) ||
        supplier.supplierId.toLowerCase().includes(search.toLowerCase()) ||
        supplier.product.toLowerCase().includes(search.toLowerCase()) ||
        supplier.productCode.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        category === 'All Categories' || supplier.category === category

      const matchesStatus =
        status === 'All Status' || formatStatus(supplier.status) === status

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [suppliers, search, category, status])

  const handleChange = (field: keyof SupplierForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleAddSupplier = async () => {
    try {
      setIsSaving(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save supplier')
      }

      setForm(initialForm)
      setIsAddModalOpen(false)
      await fetchSuppliers()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save supplier'
      )
    } finally {
      setIsSaving(false)
    }
  }

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

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

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
                {categories.map((categoryOption) => (
                  <option key={categoryOption}>{categoryOption}</option>
                ))}
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
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        Loading supplier data...
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-red-50/30">
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
                          {formatCurrency(
                            supplier.estimatedPrice,
                            supplier.unit
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {supplier.leadTime} Days
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {formatPaymentTerm(supplier.termOfPayment)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              supplier.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {formatStatus(supplier.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button className="text-xl font-bold text-red-700">
                            ⋮
                          </button>
                        </td>
                      </tr>
                    ))
                  )}

                  {!isLoading && filteredSuppliers.length === 0 && (
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
              <p>
                Showing {filteredSuppliers.length} of {suppliers.length} supplier
                data
              </p>

              <div className="flex items-center gap-2">
                <button className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                  ‹
                </button>
                <button className="rounded-lg bg-red-700 px-3 py-1 text-white">
                  1
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
              Supplier category distribution based on supplier product profile.
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
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Supplier ID
                </label>
                <input
                  type="text"
                  placeholder="Example: VND-RM-006"
                  value={form.supplierCode}
                  onChange={(event) =>
                    handleChange('supplierCode', event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Supplier Name
                </label>
                <input
                  type="text"
                  placeholder="Example: PT Supplier Baru"
                  value={form.supplierName}
                  onChange={(event) =>
                    handleChange('supplierName', event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Contact
                </label>
                <input
                  type="text"
                  placeholder="supplier@email.com"
                  value={form.contact}
                  onChange={(event) => handleChange('contact', event.target.value)}
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="City, Province"
                  value={form.address}
                  onChange={(event) => handleChange('address', event.target.value)}
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Product SKU
                </label>
                <select
                  value={form.productSku}
                  onChange={(event) =>
                    handleChange('productSku', event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                >
                  <option value="RM-001">RM-001</option>
                  <option value="RM-002">RM-002</option>
                  <option value="RM-003">RM-003</option>
                  <option value="RM-004">RM-004</option>
                  <option value="RM-005">RM-005</option>
                  <option value="PM-001">PM-001</option>
                  <option value="PM-002">PM-002</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Estimated Price
                </label>
                <input
                  type="number"
                  placeholder="Example: 16500"
                  value={form.estimatedPrice}
                  onChange={(event) =>
                    handleChange('estimatedPrice', event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Lead Time Days
                </label>
                <input
                  type="number"
                  placeholder="Example: 5"
                  value={form.leadTimeDays}
                  onChange={(event) =>
                    handleChange('leadTimeDays', event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Term of Payment
                </label>
                <select
                  value={form.paymentTerm}
                  onChange={(event) =>
                    handleChange('paymentTerm', event.target.value)
                  }
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                >
                  <option value="NET_14">Net 14</option>
                  <option value="NET_30">Net 30</option>
                  <option value="NET_45">Net 45</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    handleChange('status', event.target.value as SupplierStatus)
                  }
                  className="h-10 w-full rounded-lg border border-red-100 px-3 text-sm outline-none focus:border-red-300"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAddSupplier}
                disabled={isSaving}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isSaving ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  )
}