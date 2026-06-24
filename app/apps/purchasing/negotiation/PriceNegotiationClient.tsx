'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  WarningCircle,
  PaperPlaneTilt,
  ClockCounterClockwise,
  CheckCircle,
  ArrowRight,
  Target,
} from '@phosphor-icons/react'
import { TrackingReportModal } from '@/app/apps/purchasing/_components/TrackingReportModal'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type NegotiationStatus =
  | 'SENT'
  | 'RESPONDED'
  | 'COUNTERED'
  | 'AGREED'
  | 'REJECTED'
  | 'CANCELLED'
  | string

type PriceNegotiation = {
  id: string
  negotiationNo: string
  rfqNo: string
  rfqStatus: string
  quotationDeadline: string | null
  specificationNotes: string
  supplierId: string
  supplierName: string
  supplierContact: string
  supplierAddress: string
  productCode: string
  productName: string
  category: string
  referencePrice: number
  proposedPrice: number
  supplierResponsePrice: number
  finalPrice: number
  qty: number
  unit: string
  confirmationDeadline: string | null
  status: NegotiationStatus
  notes: string
  createdAt: string | null
}

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(value || 0)}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatStatus(status: NegotiationStatus) {
  const statusMap: Record<string, string> = {
    SENT: 'Sent',
    RESPONDED: 'Responded',
    COUNTERED: 'Countered',
    AGREED: 'Agreed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  }

  return statusMap[status] || status
}

function getStatusClass(status: NegotiationStatus) {
  const statusClassMap: Record<string, string> = {
    SENT: 'bg-blue-100 text-blue-700',
    RESPONDED: 'bg-amber-100 text-amber-700',
    COUNTERED: 'bg-purple-100 text-purple-700',
    AGREED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(/\./g, '').replace(/,/g, '')) || 0
}

function formatCurrencyInput(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

export function PriceNegotiationClient() {
  const [negotiations, setNegotiations] = useState<PriceNegotiation[]>([])
  const [selectedNegotiationId, setSelectedNegotiationId] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchNegotiations = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await fetch('/api/purchasing/negotiations')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch negotiations')
      }

      const data: PriceNegotiation[] = result.data || []
      setNegotiations(data)

      if (data.length > 0) {
        const firstData = data[0]
        setSelectedNegotiationId(firstData.id)
        setOfferPrice(
          formatCurrencyInput(
            firstData.finalPrice ||
              firstData.supplierResponsePrice ||
              firstData.proposedPrice ||
              firstData.referencePrice ||
              0
          )
        )
        setQuantity(String(firstData.qty || ''))
        setDeadline(firstData.confirmationDeadline || '')
        setNotes(firstData.notes === '-' ? '' : firstData.notes)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch negotiations'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNegotiations()
  }, [])

  const selectedNegotiation = useMemo(() => {
    return negotiations.find((item) => item.id === selectedNegotiationId) || null
  }, [negotiations, selectedNegotiationId])

  const agreedCount = negotiations.filter((item) => item.status === 'AGREED').length

  const waitingCount = negotiations.filter((item) =>
    ['SENT', 'RESPONDED', 'COUNTERED'].includes(item.status)
  ).length

  const handleSelectNegotiation = (id: string) => {
    const selected = negotiations.find((item) => item.id === id)

    setSelectedNegotiationId(id)

    if (selected) {
      setOfferPrice(
        formatCurrencyInput(
          selected.finalPrice ||
            selected.supplierResponsePrice ||
            selected.proposedPrice ||
            selected.referencePrice ||
            0
        )
      )
      setQuantity(String(selected.qty || ''))
      setDeadline(selected.confirmationDeadline || '')
      setNotes(selected.notes === '-' ? '' : selected.notes)
    }
  }

  const handleSubmitOffer = async () => {
    if (!selectedNegotiation) return

    try {
      setIsSaving(true)
      setErrorMessage('')

      const finalPrice = parseCurrencyInput(offerPrice)

      const response = await fetch('/api/purchasing/negotiations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          negotiationNumber: selectedNegotiation.negotiationNo,
          supplierResponsePrice: finalPrice,
          finalPrice,
          status: 'AGREED',
          notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update negotiation')
      }

      await fetchNegotiations()
      alert('Negotiation offer has been saved to database.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update negotiation'
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
        { label: 'Price Negotiation' },
      ]}
    >
      <div className="space-y-6">
        <ModuleHeader
          title="Price Negotiation"
          description="Record supplier price negotiation before creating a purchase order."
        />

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Total Negotiation
            </p>
            <h3 className="mt-2 text-4xl font-bold text-slate-900">
              {negotiations.length}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Waiting Response
            </p>
            <h3 className="mt-2 text-4xl font-bold text-slate-900">
              {waitingCount}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Agreed
            </p>
            <h3 className="mt-2 text-4xl font-bold text-slate-900">
              {agreedCount}
            </h3>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4 shadow-sm">
          {isLoading ? (
            <p className="text-sm text-slate-500">
              Loading price negotiation data...
            </p>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <WarningCircle size={22} className="mt-0.5 text-yellow-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Price negotiation is required for the following product.
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                      {selectedNegotiation?.productCode || '-'} —{' '}
                      {selectedNegotiation?.productName || '-'}
                    </span>
                    <span className="rounded-full bg-purple-100 px-3 py-1 font-semibold text-purple-700">
                      Supplier: {selectedNegotiation?.supplierName || '-'} (
                      {selectedNegotiation?.supplierId || '-'})
                    </span>
                    {selectedNegotiation && (
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${getStatusClass(
                          selectedNegotiation.status
                        )}`}
                      >
                        {formatStatus(selectedNegotiation.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Reference Price
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(selectedNegotiation?.referencePrice || 0)} /{' '}
                  {selectedNegotiation?.unit || '-'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <PaperPlaneTilt size={20} className="text-purple-700" />
              <h3 className="text-lg font-semibold text-slate-900">
                Submit Offer
              </h3>
            </div>

            <select
              value={selectedNegotiationId}
              onChange={(event) => handleSelectNegotiation(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
            >
              {negotiations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.negotiationNo} — {item.productName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_220px_1fr]">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Proposed / Final Price
              </label>
              <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 focus-within:border-red-300">
                <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">
                  Rp
                </span>
                <input
                  type="text"
                  value={offerPrice}
                  onChange={(event) => setOfferPrice(event.target.value)}
                  className="w-full px-3 text-sm outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Reference: {formatCurrency(selectedNegotiation?.referencePrice || 0)}
                /{selectedNegotiation?.unit || '-'}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Quantity
              </label>
              <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200">
                <input
                  type="text"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full px-3 text-sm outline-none"
                />
                <span className="flex items-center border-l border-slate-200 px-3 text-sm text-slate-500">
                  {selectedNegotiation?.unit || '-'}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Confirmation Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add negotiation notes"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setIsTrackingModalOpen(true)}
              className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Input Tracking Report
            </button>

            <button
              type="button"
              onClick={handleSubmitOffer}
              disabled={isSaving || !selectedNegotiation}
              className="rounded-lg bg-purple-700 px-5 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-purple-300"
            >
              {isSaving ? 'Saving...' : 'Submit Offer'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ClockCounterClockwise size={20} className="text-slate-700" />
              <h3 className="text-lg font-semibold text-slate-900">
                Offer History
              </h3>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Negotiation No</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Proposed</th>
                    <th className="px-4 py-3 font-semibold">Final</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {negotiations.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {item.negotiationNo}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.supplierName}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.productName}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatCurrency(item.proposedPrice)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {item.finalPrice ? formatCurrency(item.finalPrice) : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {formatStatus(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!isLoading && negotiations.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No negotiation data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-green-100 bg-green-50 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-700" />
                <h3 className="font-semibold text-green-900">
                  Final Agreed Price
                </h3>
              </div>

              <p className="mt-4 text-3xl font-bold text-green-800">
                {formatCurrency(
                  selectedNegotiation?.finalPrice ||
                    selectedNegotiation?.supplierResponsePrice ||
                    selectedNegotiation?.proposedPrice ||
                    0
                )}
              </p>

              <p className="mt-1 text-sm text-green-700">
                For {formatNumber(selectedNegotiation?.qty || 0)}{' '}
                {selectedNegotiation?.unit || '-'}
              </p>

              <Link
                href={`/apps/purchasing/purchase-orders/create?negotiationNo=${
                  selectedNegotiation?.negotiationNo || ''
                }`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Continue to PO
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="rounded-xl bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <Target size={20} className="text-purple-300" />
                <h3 className="font-semibold">VRM Insight</h3>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Supplier response and historical price comparison can be used to
                determine the final negotiation decision before issuing PO.
              </p>
            </div>
          </div>
        </div>
      </div>

      <TrackingReportModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        title="Input Tracking Report"
        contextLabel="Price Negotiation"
      />
    </ModuleLayout>
  )
}