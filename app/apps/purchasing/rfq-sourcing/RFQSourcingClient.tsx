'use client'

import { useEffect, useMemo, useState } from 'react'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type RFQStatus =
  | 'WAITING_RESPONSE'
  | 'OFFER_RECEIVED'
  | 'SELECTED'
  | 'CLOSED'
  | 'CANCELLED'

type RFQSourcing = {
  id: string
  rfqNo: string
  requiredQty: number
  unit: string
  productCode: string
  productName: string
  category: string
  prNo: string
  requestDate: string | null
  requestedBy: string
  department: string
  supplierId: string
  supplierName: string
  candidateSupplierName: string
  picName: string
  email: string
  phone: string
  address: string
  quotationDeadline: string | null
  specificationNotes: string
  status: RFQStatus
  createdAt: string
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function formatStatus(status: RFQStatus) {
  const statusMap: Record<RFQStatus, string> = {
    WAITING_RESPONSE: 'Waiting Response',
    OFFER_RECEIVED: 'Offer Received',
    SELECTED: 'Selected',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  }

  return statusMap[status] || status
}

function getStatusClass(status: RFQStatus) {
  const statusClassMap: Record<RFQStatus, string> = {
    WAITING_RESPONSE: 'bg-yellow-100 text-yellow-700',
    OFFER_RECEIVED: 'bg-blue-100 text-blue-700',
    SELECTED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-slate-100 text-slate-600',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

const initialForm = {
  companyName: '',
  picName: '',
  email: '',
  phone: '',
  address: '',
  quotationDeadline: '',
  specificationNotes: '',
}

export function RFQSourcingClient() {
  const [rfqData, setRfqData] = useState<RFQSourcing[]>([])
  const [selectedRfqId, setSelectedRfqId] = useState('')
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchRFQData = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/rfq-sourcing')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch RFQ sourcing data')
      }

      const data = result.data || []
      setRfqData(data)

      if (data.length > 0) {
        setSelectedRfqId(data[0].id)
        setForm({
          companyName: data[0].candidateSupplierName || '',
          picName: data[0].picName === '-' ? '' : data[0].picName,
          email: data[0].email === '-' ? '' : data[0].email,
          phone: data[0].phone === '-' ? '' : data[0].phone,
          address: data[0].address === '-' ? '' : data[0].address,
          quotationDeadline: data[0].quotationDeadline || '',
          specificationNotes:
            data[0].specificationNotes === '-'
              ? ''
              : data[0].specificationNotes,
        })
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch RFQ sourcing data'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRFQData()
  }, [])

  const selectedRfq = useMemo(() => {
    return rfqData.find((item) => item.id === selectedRfqId) || null
  }, [rfqData, selectedRfqId])

  const handleSelectRFQ = (id: string) => {
    const selected = rfqData.find((item) => item.id === id)

    setSelectedRfqId(id)

    if (selected) {
      setForm({
        companyName: selected.candidateSupplierName || '',
        picName: selected.picName === '-' ? '' : selected.picName,
        email: selected.email === '-' ? '' : selected.email,
        phone: selected.phone === '-' ? '' : selected.phone,
        address: selected.address === '-' ? '' : selected.address,
        quotationDeadline: selected.quotationDeadline || '',
        specificationNotes:
          selected.specificationNotes === '-' ? '' : selected.specificationNotes,
      })
    }
  }

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleSendRFQ = async () => {
    if (!selectedRfq) return

    try {
      setIsSending(true)
      setErrorMessage('')

      const nextNumber = `RFQ-${Date.now()}`

      const response = await fetch('/api/purchasing/rfq-sourcing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rfqNumber: nextNumber,
          prNumber: selectedRfq.prNo,
          productSku: selectedRfq.productCode,
          requiredQty: selectedRfq.requiredQty,
          candidateSupplierName: form.companyName || selectedRfq.supplierName,
          picName: form.picName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          quotationDeadline: form.quotationDeadline,
          specificationNotes: form.specificationNotes,
          status: 'WAITING_RESPONSE',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send RFQ')
      }

      await fetchRFQData()
      alert('RFQ has been sent and saved to database.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send RFQ')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <ModuleLayout
      activeModule="purchasing"
      moduleTitle="Purchasing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Purchasing', href: '/apps/purchasing' },
        { label: 'RFQ / Sourcing' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="RFQ / Sourcing Supplier"
          description="Find and register new suppliers for products without registered suppliers."
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Sourcing Workflow
            </h3>

            <div className="mt-5 space-y-5">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    Send RFQ
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Send quotation request to candidate supplier.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Input Quotation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Record offer submitted by supplier.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Register Supplier
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Select and register supplier if approved.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
              <div className="border-b border-red-50 bg-yellow-50 px-5 py-3 text-sm text-yellow-800">
                This product does not have an active registered supplier. Please
                start sourcing a new supplier.
              </div>

              <div className="space-y-6 p-5">
                {isLoading ? (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Loading RFQ sourcing data...
                  </div>
                ) : (
                  <>
                    <section>
                      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Required Product Detail
                        </h3>

                        <select
                          value={selectedRfqId}
                          onChange={(event) => handleSelectRFQ(event.target.value)}
                          className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                        >
                          {rfqData.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.rfqNo} — {item.productName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Product
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {selectedRfq?.productName || '-'}
                          </p>
                          <p className="text-xs text-slate-600">
                            ({selectedRfq?.productCode || '-'})
                          </p>
                        </div>

                        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Category
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {selectedRfq?.category || '-'}
                          </p>
                        </div>

                        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Unit
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {selectedRfq?.unit || '-'}
                          </p>
                        </div>

                        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            Required Qty
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatNumber(selectedRfq?.requiredQty || 0)}{' '}
                            {selectedRfq?.unit || ''}
                          </p>
                        </div>

                        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            PR Reference
                          </p>
                          <p className="mt-1 text-sm font-bold text-indigo-700">
                            {selectedRfq?.prNo || '-'}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                        Candidate Supplier Data
                      </h3>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Company Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.companyName}
                            onChange={(event) =>
                              handleChange('companyName', event.target.value)
                            }
                            placeholder="Example: PT Sumber Pangan Jaya"
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            PIC / Contact Name
                          </label>
                          <input
                            type="text"
                            value={form.picName}
                            onChange={(event) =>
                              handleChange('picName', event.target.value)
                            }
                            placeholder="Full name of person in charge"
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Email
                          </label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(event) =>
                              handleChange('email', event.target.value)
                            }
                            placeholder="email@company.com"
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={form.phone}
                            onChange={(event) =>
                              handleChange('phone', event.target.value)
                            }
                            placeholder="+62 8xx xxxx xxxx"
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Address
                          </label>
                          <textarea
                            value={form.address}
                            onChange={(event) =>
                              handleChange('address', event.target.value)
                            }
                            placeholder="Complete office or warehouse address of supplier"
                            className="min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300"
                          />
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                        RFQ Detail
                      </h3>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Quotation Deadline
                          </label>
                          <input
                            type="date"
                            value={form.quotationDeadline}
                            onChange={(event) =>
                              handleChange(
                                'quotationDeadline',
                                event.target.value
                              )
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Specification Notes
                          </label>
                          <textarea
                            value={form.specificationNotes}
                            onChange={(event) =>
                              handleChange(
                                'specificationNotes',
                                event.target.value
                              )
                            }
                            placeholder="Example: Halal certification, 20L jerrycan packaging..."
                            className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300"
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => selectedRfq && handleSelectRFQ(selectedRfq.id)}
                          className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleSendRFQ}
                          disabled={isSending}
                          className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                        >
                          {isSending ? 'Sending...' : 'Send RFQ'}
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Sent RFQ History
              </h3>

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">
                        Candidate Supplier
                      </th>
                      <th className="px-4 py-3 font-semibold">Sent Date</th>
                      <th className="px-4 py-3 font-semibold">Deadline</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {rfqData.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.supplierName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(item.quotationDeadline)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {formatStatus(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSelectRFQ(item.id)}
                            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                          >
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!isLoading && rfqData.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          No RFQ sourcing data found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-xl bg-purple-700 p-5 text-white shadow-sm">
                <h3 className="font-semibold">Automated Sourcing Insight</h3>
                <p className="mt-2 text-sm leading-relaxed text-purple-100">
                  We found additional suppliers in your region that match the
                  selected product category. Please review candidate supplier data
                  before sending RFQ.
                </p>

                <button className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50">
                  View Recommendations
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase text-purple-700">
                    Supplier Integrity
                  </span>
                  <span className="text-yellow-500">◎</span>
                </div>

                <h3 className="mt-3 font-semibold text-slate-900">
                  Compliance Checklist
                </h3>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>✅ Legal Entity Verification</p>
                  <p>✅ Sustainability Certification</p>
                  <p>✅ Safety Management Audit</p>
                </div>

                <p className="mt-4 text-xs italic text-slate-400">
                  Update checklist in Master Supplier settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}