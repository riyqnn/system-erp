'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MagnifyingGlass, ClipboardText, Clock, CheckCircle } from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

const requisitions = [
  {
    prNo: 'PR-202604-001',
    requestDate: '08 Apr 2026',
    requestedBy: 'Andi (Warehouse Staff)',
    item: 'Gula Pasir, Glukosa',
    qty: '500 kg, 200 kg',
    status: 'Pending PO Creation',
  },
  {
    prNo: 'PR-202604-002',
    requestDate: '08 Apr 2026',
    requestedBy: 'Budi (Warehouse Staff)',
    item: 'Ekstrak Kopi',
    qty: '300 kg',
    status: 'Pending PO Creation',
  },
  {
    prNo: 'PR-202604-003',
    requestDate: '09 Apr 2026',
    requestedBy: 'Citra (Warehouse Staff)',
    item: 'Plastik Roll',
    qty: '150 roll',
    status: 'Processed',
  },
  {
    prNo: 'PR-202604-004',
    requestDate: '10 Apr 2026',
    requestedBy: 'Dewi (Warehouse Staff)',
    item: 'Karton Box',
    qty: '800 pcs',
    status: 'Pending PO Creation',
  },
  {
    prNo: 'PR-202604-005',
    requestDate: '10 Apr 2026',
    requestedBy: 'Eko (Warehouse Staff)',
    item: 'Garam Industri',
    qty: '250 kg',
    status: 'Closed',
  },
]

export function PurchaseRequisitionClient() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Status')
  const [product, setProduct] = useState('All Products')
  const [requestDate, setRequestDate] = useState('')

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((item) => {
      const matchesSearch =
        item.prNo.toLowerCase().includes(search.toLowerCase()) ||
        item.requestedBy.toLowerCase().includes(search.toLowerCase()) ||
        item.item.toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        status === 'All Status' || item.status === status

      const matchesProduct =
        product === 'All Products' || item.item.toLowerCase().includes(product.toLowerCase())

      const matchesDate =
        !requestDate || item.requestDate === requestDate

      return matchesSearch && matchesStatus && matchesProduct && matchesDate
    })
  }, [search, status, product, requestDate])

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Purchase Requisition' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <ModuleHeader
            title="Purchase Requisition"
            description="Manage purchase requests submitted by warehouse staff."
          />

          <Link
            href="/apps/purchasing/purchase-requisition/create"
            className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
          >
            + Create PR
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Active PR
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">12</h3>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <ClipboardText size={22} className="text-red-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Pending PO Creation
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">7</h3>
              </div>
              <div className="rounded-xl bg-orange-50 p-3">
                <Clock size={22} className="text-orange-500" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Processed
                </p>
                <h3 className="mt-2 text-4xl font-bold text-slate-900">5</h3>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <CheckCircle size={22} className="text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search PR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-red-300 md:w-64"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            >
              <option>All Status</option>
              <option>Pending PO Creation</option>
              <option>Processed</option>
              <option>Closed</option>
            </select>

            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            >
              <option>All Products</option>
              <option>Gula Pasir</option>
              <option>Glukosa</option>
              <option>Ekstrak Kopi</option>
              <option>Plastik Roll</option>
              <option>Karton Box</option>
              <option>Garam Industri</option>
            </select>

            <input
              type="text"
              placeholder="Request Date"
              value={requestDate}
              onChange={(e) => setRequestDate(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">PR No</th>
                    <th className="px-4 py-3 font-semibold">Request Date</th>
                    <th className="px-4 py-3 font-semibold">Requested By</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRequisitions.map((row) => (
                    <tr key={row.prNo} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {row.prNo}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {row.requestDate}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {row.requestedBy}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {row.item}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {row.qty}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            row.status === 'Pending PO Creation'
                              ? 'bg-orange-100 text-orange-700'
                              : row.status === 'Processed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-slate-400">
                          <button type="button" className="hover:text-slate-700">
                            👁
                          </button>
                          <button type="button" className="hover:text-red-600">
                            →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRequisitions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No requisition data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>Showing 1-5 of 12 data</p>

              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50">
                  ‹
                </button>
                <button className="rounded-lg bg-red-600 px-3 py-1 text-white">
                  1
                </button>
                <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50">
                  2
                </button>
                <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50">
                  3
                </button>
                <button className="rounded-lg border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}