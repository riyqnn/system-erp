'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'

type RFQStatus =
  | 'WAITING_RESPONSE'
  | 'OFFER_RECEIVED'
  | 'RESPONDED'
  | 'SELECTED'
  | 'CLOSED'
  | 'CANCELLED'
  | string

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
  createdAt: string | null
  isFromPR?: boolean
}

type SupplierOption = {
  supplierId: string
  supplierName: string
  contact: string
  address: string
  productCode: string
  productName: string
  category: string
  unit: string
}

type PurchaseRequisitionItem = {
  id: string
  productCode: string
  productName: string
  category: string
  qty: number
  unit: string
  estimatedPrice: number
  subtotal: number
}

type PurchaseRequisition = {
  id: string
  prNo: string
  requestDate: string | null
  requiredDate: string | null
  requesterName: string
  department: string
  priority: string
  status: string
  purpose: string
  notes: string
  totalEstimatedValue: number
  items: PurchaseRequisitionItem[]
}

const initialForm = {
  supplierId: '',
  companyName: '',
  picName: '',
  email: '',
  phone: '',
  address: '',
  quotationDeadline: '',
  specificationNotes: '',
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0)
}

function formatStatus(status: RFQStatus) {
  const statusMap: Record<string, string> = {
    WAITING_RESPONSE: 'Waiting Response',
    OFFER_RECEIVED: 'Offer Received',
    RESPONDED: 'Responded',
    SELECTED: 'Selected',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  }

  return statusMap[status] || status
}

function getStatusClass(status: RFQStatus) {
  const statusClassMap: Record<string, string> = {
    WAITING_RESPONSE: 'bg-yellow-100 text-yellow-700',
    OFFER_RECEIVED: 'bg-blue-100 text-blue-700',
    RESPONDED: 'bg-blue-100 text-blue-700',
    SELECTED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-slate-100 text-slate-600',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return statusClassMap[status] || 'bg-slate-100 text-slate-600'
}

function normalizePR(raw: any): PurchaseRequisition {
  const rawItems =
    raw.items ||
    raw.purchasing_purchase_requisition_items ||
    raw.purchase_requisition_items ||
    []

  const items: PurchaseRequisitionItem[] = rawItems.map(
    (item: any, index: number) => {
      const product = item.products || item.product || {}

      const qty = Number(item.qty || item.quantity || item.qty_requested || 0)
      const estimatedPrice = Number(
        item.estimated_price || item.estimatedPrice || item.unit_price || 0
      )

      return {
        id: String(
          item.id || item.detail_id || `${raw.prNo || raw.pr_number}-${index}`
        ),
        productCode:
          item.productCode ||
          item.product_code ||
          item.product_id ||
          product.sku ||
          product.product_code ||
          product.product_id ||
          '-',
        productName:
          item.productName ||
          item.product_name ||
          item.product ||
          product.name ||
          product.product_name ||
          '-',
        category: item.category || product.category || '-',
        qty,
        unit: item.unit || item.uom || product.unit || product.uom || '-',
        estimatedPrice,
        subtotal: Number(item.subtotal || qty * estimatedPrice || 0),
      }
    }
  )

  const totalEstimatedValue =
    Number(raw.totalEstimatedValue || raw.total_estimated_value || 0) ||
    items.reduce((total, item) => total + item.subtotal, 0)

  return {
    id: String(raw.id || raw.pr_id || raw.prNo || raw.pr_number || '-'),
    prNo:
      raw.prNo ||
      raw.prNumber ||
      raw.requisitionNumber ||
      raw.requisition_number ||
      raw.pr_number ||
      raw.pr_id ||
      '-',
    requestDate: raw.requestDate || raw.request_date || raw.created_at || null,
    requiredDate: raw.requiredDate || raw.required_date || null,
    requesterName:
      raw.requesterName ||
      raw.requester_name ||
      raw.requestedBy ||
      raw.requested_by ||
      '-',
    department: raw.department || raw.requester_department || 'Inventory',
    priority: raw.priority || '-',
    status: raw.status || 'PENDING_SOURCING',
    purpose: raw.purpose || raw.description || '-',
    notes: raw.notes || '-',
    totalEstimatedValue,
    items,
  }
}

function normalizeSupplier(raw: any): SupplierOption {
  return {
    supplierId: raw.supplierId || raw.supplier_id || '-',
    supplierName:
      raw.supplierName || raw.supplier_name || raw.companyName || '-',
    contact: raw.contact || raw.picName || raw.pic_name || '-',
    address: raw.address || '-',
    productCode: raw.productCode || raw.product_code || raw.product_id || '-',
    productName: raw.product || raw.productName || raw.product_name || '-',
    category: raw.category || '-',
    unit: raw.unit || raw.uom || '-',
  }
}

function supplierMatchesProduct(
  supplier: SupplierOption,
  product: PurchaseRequisitionItem | RFQSourcing
) {
  const supplierProductCode = String(supplier.productCode || '').toLowerCase()
  const supplierProductName = String(supplier.productName || '').toLowerCase()
  const productCode = String(product.productCode || '').toLowerCase()
  const productName = String(product.productName || '').toLowerCase()

  return (
    (!!supplierProductCode && supplierProductCode === productCode) ||
    (!!supplierProductName && supplierProductName === productName) ||
    (!!supplierProductName &&
      !!productName &&
      supplierProductName.includes(productName)) ||
    (!!productName &&
      !!supplierProductName &&
      productName.includes(supplierProductName))
  )
}

function buildRFQFromPR(
  pr: PurchaseRequisition,
  supplierOptions: SupplierOption[]
): RFQSourcing | null {
  const firstItem = pr.items?.[0]

  if (!firstItem) return null

  const matchedSupplier =
    supplierOptions.find((supplier) => supplierMatchesProduct(supplier, firstItem)) ||
    supplierOptions[0] ||
    null

  return {
    id: `FROM-PR-${pr.prNo}`,
    rfqNo: `RFQ-DRAFT-${pr.prNo}`,
    requiredQty: firstItem.qty,
    unit: firstItem.unit,
    productCode: firstItem.productCode,
    productName: firstItem.productName,
    category: firstItem.category,
    prNo: pr.prNo,
    requestDate: pr.requestDate,
    requestedBy: pr.requesterName,
    department: pr.department,
    supplierId: matchedSupplier?.supplierId || '',
    supplierName: matchedSupplier?.supplierName || '',
    candidateSupplierName: matchedSupplier?.supplierName || '',
    picName: matchedSupplier?.contact || '',
    email: '-',
    phone: '-',
    address: matchedSupplier?.address || '',
    quotationDeadline: '',
    specificationNotes: pr.notes === '-' ? pr.purpose : pr.notes,
    status: 'WAITING_RESPONSE',
    createdAt: null,
    isFromPR: true,
  }
}

export function RFQSourcingClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prNoFromUrl = searchParams.get('prNo')

  const [rfqData, setRfqData] = useState<RFQSourcing[]>([])
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  const [selectedRfqId, setSelectedRfqId] = useState('')
  const [form, setForm] = useState(initialForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const applyFormFromRFQ = (selected: RFQSourcing) => {
    setForm({
      supplierId: selected.supplierId || '',
      companyName: selected.candidateSupplierName || selected.supplierName || '',
      picName: selected.picName === '-' ? '' : selected.picName,
      email: selected.email === '-' ? '' : selected.email,
      phone: selected.phone === '-' ? '' : selected.phone,
      address: selected.address === '-' ? '' : selected.address,
      quotationDeadline: selected.quotationDeadline || '',
      specificationNotes:
        selected.specificationNotes === '-' ? '' : selected.specificationNotes,
    })
  }

  const fetchRFQData = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const [rfqResponse, prResponse, supplierResponse] = await Promise.all([
        fetch('/api/purchasing/rfq-sourcing'),
        fetch('/api/purchasing/purchase-requisitions'),
        fetch('/api/purchasing/suppliers'),
      ])

      const rfqResult = await rfqResponse.json()
      const prResult = await prResponse.json()
      const supplierResult = await supplierResponse.json()

      if (!rfqResponse.ok) {
        throw new Error(rfqResult.message || 'Failed to fetch RFQ sourcing data')
      }

      const normalizedSuppliers: SupplierOption[] = (supplierResult.data || [])
        .map((item: any) => normalizeSupplier(item))
        .filter(
          (item: SupplierOption) => item.supplierId && item.supplierId !== '-'
        )

      const uniqueSupplierMap = new Map<string, SupplierOption>()

      normalizedSuppliers.forEach((supplier) => {
        const key = `${supplier.supplierId}-${supplier.productCode}`
        if (!uniqueSupplierMap.has(key)) {
          uniqueSupplierMap.set(key, supplier)
        }
      })

      const suppliers = Array.from(uniqueSupplierMap.values())
      setSupplierOptions(suppliers)

      const databaseRFQ: RFQSourcing[] = rfqResult.data || []
      let combinedRFQ = databaseRFQ
      let selectedId = databaseRFQ[0]?.id || ''

      if (prNoFromUrl && prResponse.ok) {
        const prList: PurchaseRequisition[] = (prResult.data || []).map(
          (item: any) => normalizePR(item)
        )

        const selectedPR = prList.find(
          (item) =>
            item.prNo === prNoFromUrl ||
            encodeURIComponent(item.prNo) === prNoFromUrl
        )

        const existingRFQFromPR = databaseRFQ.find(
          (item) => item.prNo === selectedPR?.prNo
        )

        if (existingRFQFromPR) {
          selectedId = existingRFQFromPR.id
        } else if (selectedPR) {
          const draftRFQ = buildRFQFromPR(selectedPR, suppliers)

          if (draftRFQ) {
            combinedRFQ = [draftRFQ, ...databaseRFQ]
            selectedId = draftRFQ.id
          }
        }
      }

      setRfqData(combinedRFQ)

      if (combinedRFQ.length > 0) {
        const selected =
          combinedRFQ.find((item) => item.id === selectedId) || combinedRFQ[0]

        setSelectedRfqId(selected.id)
        applyFormFromRFQ(selected)
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to fetch RFQ sourcing data'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRFQData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prNoFromUrl])

  const selectedRfq = useMemo(() => {
    return rfqData.find((item) => item.id === selectedRfqId) || null
  }, [rfqData, selectedRfqId])

  const filteredSupplierOptions = useMemo(() => {
    if (!selectedRfq) return supplierOptions

    const matched = supplierOptions.filter((supplier) =>
      supplierMatchesProduct(supplier, selectedRfq)
    )

    return matched.length > 0 ? matched : supplierOptions
  }, [selectedRfq, supplierOptions])

  const handleSelectRFQ = (id: string) => {
    const selected = rfqData.find((item) => item.id === id)

    setSelectedRfqId(id)

    if (selected) {
      applyFormFromRFQ(selected)
    }
  }

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleSupplierChange = (supplierId: string) => {
    const selectedSupplier = supplierOptions.find(
      (supplier) => supplier.supplierId === supplierId
    )

    setForm((currentForm) => ({
      ...currentForm,
      supplierId,
      companyName: selectedSupplier?.supplierName || currentForm.companyName,
      picName:
        selectedSupplier?.contact && selectedSupplier.contact !== '-'
          ? selectedSupplier.contact
          : currentForm.picName,
      address:
        selectedSupplier?.address && selectedSupplier.address !== '-'
          ? selectedSupplier.address
          : currentForm.address,
    }))
  }

  const handleSendRFQ = async () => {
    if (!selectedRfq) return

    if (!form.supplierId) {
      setErrorMessage('Please select a registered supplier before sending RFQ.')
      return
    }

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
          productName: selectedRfq.productName,
          category: selectedRfq.category,
          unit: selectedRfq.unit,
          requiredQty: selectedRfq.requiredQty,
          supplierCode: form.supplierId,
          candidateSupplierName: form.companyName || selectedRfq.supplierName,
          picName: form.picName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          quotationDeadline: form.quotationDeadline,
          specificationNotes: form.specificationNotes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || 'Failed to save RFQ sourcing data'
        )
      }

      await fetchRFQData()
      alert('RFQ has been sent and saved. Continue to Price Negotiation.')
      router.push('/apps/purchasing/negotiation')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save RFQ sourcing data'
      )
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
          description="Process purchase requisition data into RFQ and sourcing before entering price negotiation."
        />

        {prNoFromUrl && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Processing RFQ from PR reference:{' '}
            <span className="font-bold">{prNoFromUrl}</span>. Product and
            quantity data are carried from the selected Purchase Requisition.
          </div>
        )}

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
                  <p className="text-sm font-semibold text-red-600">Send RFQ</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Send quotation request based on selected purchase
                    requisition data.
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
                    Price Negotiation
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Continue quotation data to negotiation before PO generation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
              <div className="border-b border-red-50 bg-yellow-50 px-5 py-3 text-sm text-yellow-800">
                This page can receive PR data from Purchase Requisition and use
                it as the basis for RFQ/Sourcing.
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
                          onChange={(event) =>
                            handleSelectRFQ(event.target.value)
                          }
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
                            Registered Supplier{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={form.supplierId}
                            onChange={(event) =>
                              handleSupplierChange(event.target.value)
                            }
                            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-red-300"
                          >
                            <option value="">Select supplier</option>
                            {filteredSupplierOptions.map((supplier, index) => (
                              <option
                                key={`${supplier.supplierId}-${supplier.productCode}-${index}`}
                                value={supplier.supplierId}
                              >
                                {supplier.supplierName} — {supplier.productName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">
                            Company Name
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

                      <div className="mt-4">
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
                          placeholder="Example: Halal certification, packaging specification, delivery requirement..."
                          className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300"
                        />
                      </div>

                      <div className="mt-5 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            selectedRfq && handleSelectRFQ(selectedRfq.id)
                          }
                          className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={handleSendRFQ}
                          disabled={isSending || !selectedRfq}
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
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">PR Ref</th>
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
                          {item.supplierName ||
                            item.candidateSupplierName ||
                            '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-indigo-700">
                          {item.prNo}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.isFromPR
                            ? 'Draft from PR'
                            : formatDate(item.createdAt)}
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
                            {item.isFromPR ? 'Draft RFQ' : formatStatus(item.status)}
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
                          colSpan={7}
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
                  The selected PR product is carried into RFQ/Sourcing, so the
                  sourcing team can select a matching supplier and send RFQ based
                  on actual request data.
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