'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardText,
  CurrencyDollar,
  ShoppingCart,
  NotePencil,
  Trash,
  ChartBar,
} from '@phosphor-icons/react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

const initialItems = [
  {
    id: 1,
    product: 'Gula Pasir',
    qty: '500',
    unit: 'kg',
    unitPrice: 100000,
  },
  {
    id: 2,
    product: 'Glukosa',
    qty: '200',
    unit: 'kg',
    unitPrice: 16500,
  },
]

export function CreatePurchaseOrderClient() {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [notes, setNotes] = useState('')

  const handleCloseForm = () => {
    const isConfirmed = window.confirm(
      'Are you sure you want to leave this form? Unsaved changes will be lost.'
    )

    if (isConfirmed) {
      router.push('/apps/purchasing/purchase-orders')
    }
  }

  const handleSaveDraft = () => {
    router.push('/apps/purchasing/purchase-orders')
  }

  const handleSubmitForApproval = () => {
    router.push('/apps/purchasing/purchase-orders')
  }

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      return total + Number(item.qty || 0) * item.unitPrice
    }, 0)
  }, [items])

  const ppn = subtotal * 0.11
  const total = subtotal + ppn

  const updateQty = (id: number, qty: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, qty } : item
      )
    )
  }

  const removeItem = (id: number) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id))
  }

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: currentItems.length + 1,
        product: 'New Item',
        qty: '1',
        unit: 'pcs',
        unitPrice: 50000,
      },
    ])
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'Purchase Orders', href: '/apps/purchasing/purchase-orders' },
        { label: 'Create PO' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <ModuleHeader
            title="Create Purchase Order"
            description="Create a purchase order based on approved requisition and supplier quotation."
          />

          <button
            type="button"
            onClick={handleCloseForm}
            className="text-2xl font-semibold text-slate-400 hover:text-red-600"
            title="Close form"
          >
            ×
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardText size={20} className="text-red-600" />
            <h3 className="font-semibold text-slate-900">PO Information</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                PO No
              </label>
              <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200">
                <input
                  type="text"
                  value="PO-202604-005"
                  readOnly
                  className="w-full bg-slate-50 px-3 text-sm outline-none"
                />
                <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-[10px] font-bold text-slate-500">
                  AUTO
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Supplier
              </label>
              <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300">
                <option>VND-RM-001 — PT Jawamanis Rafinasi</option>
                <option>VND-RM-004 — PT Aneka Coffee</option>
                <option>VND-PM-001 — PT Supernova Flexible</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                PO Date
              </label>
              <input
                type="date"
                defaultValue="2026-04-12"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Status
              </label>
              <div className="flex h-10 items-center gap-2">
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Draft
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Ready for Approval
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Active
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                PR Reference
              </label>
              <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300">
                <option>PR-202604-001 — Gula Pasir, Glukosa</option>
                <option>PR-202604-002 — Ekstrak Kopi</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CurrencyDollar size={20} className="text-green-700" />
              <h3 className="font-semibold text-slate-900">
                Negotiated Price Source
              </h3>
            </div>

            <p className="text-sm text-slate-600">
              Final negotiated price has been approved and used as the PO basis.
            </p>

            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">Approved Price</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                Rp 100.000/kg
              </p>
              <p className="mt-1 text-xs text-green-700">
                Below reference price by 4.76%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ChartBar size={20} className="text-purple-700" />
              <h3 className="font-semibold text-slate-900">
                Reference Price Source
              </h3>
            </div>

            <p className="text-sm text-slate-600">
              Reference price from historical supplier quotation.
            </p>

            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">Reference Price</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                Rp 105.000/kg
              </p>
              <p className="mt-1 text-xs text-red-600">
                Price difference applied based on negotiation result.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-red-600" />
              <h3 className="font-semibold text-slate-900">
                Purchase Order Items
              </h3>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              + Add Item
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">No</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Qty Order</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 font-semibold">Unit Price</th>
                    <th className="px-4 py-3 font-semibold">Subtotal</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Delete
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 text-slate-600">{index + 1}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {item.product}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.qty}
                          onChange={(event) =>
                            updateQty(item.id, event.target.value)
                          }
                          className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                        />
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.unit}</td>
                      <td className="px-4 py-4 font-semibold text-green-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {formatCurrency(Number(item.qty || 0) * item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
              <div className="ml-auto w-full max-w-sm space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">PPN 11%</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(ppn)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-900">Total PO</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(total)}
                  </span>
                </div>

                <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700">
                  System detected that the negotiated price is lower than the
                  reference price.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <NotePencil size={20} className="text-red-600" />
            <h3 className="font-semibold text-slate-900">PO Notes</h3>
          </div>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add special notes for supplier or internal records."
            className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-300"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCloseForm}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="rounded-lg border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={handleSubmitForApproval}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Submit for Approval
          </button>
        </div>
      </div>
    </ModuleLayout>
  )
}