'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, X, Trash, Warning, ClipboardText, CheckCircle,
  Truck, Receipt, Package, Factory,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import {
  SINGLE_TXN_LIMIT, FG_WAREHOUSE, rupiah, fmtDate, termDays,
  genDocId, invoiceNumberFromId, notify, loadOutstandingByCustomer,
  SO_STATUS_BADGE, SO_STATUS_LABEL, DO_BADGE, PAYMENT_BADGE,
} from '@/lib/snm'

type CustomerLite = {
  cust_id: string
  cust_name: string
  address: string | null
  wilayah: string | null
  payment_term: string
  credit_limit: number
  outstanding_receivable: number
  available_credit: number
}
type ProductLite = {
  product_id: string
  product_name: string
  uom: string
  unit_price: number   // net price after discount
  list_price: number   // gross price from ms_price_list
  discount_pct: number
  stock_qty: number
}
type SalesOrder = {
  so_id: string
  cust_id: string
  so_date: string
  so_type: 'REGULAR' | 'PO'
  approval_status: 'DRAFT' | 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED_CREDIT' | 'CANCELLED'
  grand_total: number
  rejection_reason: string | null
  created_at: string
  ms_customer: { cust_name: string; address: string | null; payment_term: string } | null
}
type DeliveryOrder = { do_id: string; so_id: string; status: string; delivery_address: string | null; delivered_at: string | null }
type Invoice = { inv_id: string; so_id: string; invoice_number: string | null; payment_status: string; inv_date: string; due_date: string | null; grand_total: number }
type SoItem = { so_detail_id: number; product_id: string; qty_order: number; unit_price: number; subtotal: number; ms_product: { product_name: string; uom: string } | null }

type Line = { product_id: string; qty: string }

const VALID_STATUS = ['WAITING_APPROVAL', 'APPROVED', 'REJECTED_CREDIT', 'CANCELLED']

export function SalesClient({ initialStatus, userId }: { initialStatus?: string; userId: number }) {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [dos, setDos] = useState<DeliveryOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<string>(
    initialStatus && VALID_STATUS.includes(initialStatus) ? initialStatus : 'ALL'
  )

  const [customers, setCustomers] = useState<CustomerLite[]>([])
  const [products, setProducts] = useState<ProductLite[]>([])

  // create modal
  const [showForm, setShowForm] = useState(false)
  const [custId, setCustId] = useState('')
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: '' }])
  const [preOrder, setPreOrder] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // detail drawer
  const [detail, setDetail] = useState<SalesOrder | null>(null)
  const [detailItems, setDetailItems] = useState<SoItem[]>([])
  const [busy, setBusy] = useState(false)

  const loadAll = async () => {
    setLoading(true); setError(null)
    const [soRes, doRes, invRes] = await Promise.all([
      supabase.from('tr_so_header')
        .select('so_id, cust_id, so_date, so_type, approval_status, grand_total, rejection_reason, created_at, ms_customer(cust_name, address, payment_term)')
        .order('created_at', { ascending: false }),
      supabase.from('tr_delivery_order').select('do_id, so_id, status, delivery_address, delivered_at'),
      supabase.from('tr_sales_invoice').select('inv_id, so_id, invoice_number, payment_status, inv_date, due_date, grand_total'),
    ])
    if (soRes.error) setError(soRes.error.message)
    setOrders((soRes.data as unknown as SalesOrder[]) ?? [])
    setDos((doRes.data as DeliveryOrder[]) ?? [])
    setInvoices((invRes.data as Invoice[]) ?? [])
    setLoading(false)
  }

  const loadRefs = async () => {
    const [cRes, pRes, priceRes, stockRes, outstanding] = await Promise.all([
      supabase.from('ms_customer')
        .select('cust_id, cust_name, address, wilayah, payment_term, credit_limit')
        .eq('status_aktif', 1).order('cust_name'),
      supabase.from('ms_product')
        .select('product_id, product_name, uom').eq('category', 'FG').eq('status', 1).order('product_name'),
      supabase.from('ms_price_list').select('product_id, unit_price, discount_pct').eq('status', 1),
      supabase.from('tr_stock_balance').select('product_id, quantity').eq('status', 'AVAILABLE'),
      loadOutstandingByCustomer(supabase),
    ])

    const priceMap: Record<string, { unit_price: number; discount_pct: number }> = {}
    ;(priceRes.data as { product_id: string; unit_price: number; discount_pct: number }[] ?? []).forEach((p) => {
      priceMap[p.product_id] = { unit_price: Number(p.unit_price) || 0, discount_pct: Number(p.discount_pct) || 0 }
    })
    const stockMap: Record<string, number> = {}
    ;(stockRes.data as { product_id: string; quantity: number }[] ?? []).forEach((s) => {
      stockMap[s.product_id] = (stockMap[s.product_id] ?? 0) + (Number(s.quantity) || 0)
    })

    const prods: ProductLite[] = (pRes.data as { product_id: string; product_name: string; uom: string }[] ?? [])
      .map((p) => {
        const pr = priceMap[p.product_id]
        const list = pr?.unit_price ?? 0
        const disc = pr?.discount_pct ?? 0
        const net = Math.round(list * (1 - disc / 100))
        return { ...p, list_price: list, discount_pct: disc, unit_price: net, stock_qty: stockMap[p.product_id] ?? 0 }
      })
      // only sellable products that have an active price
      .filter((p) => p.list_price > 0)
    setProducts(prods)

    const custs: CustomerLite[] = (cRes.data as Omit<CustomerLite, 'outstanding_receivable' | 'available_credit'>[] ?? [])
      .map((c) => {
        const out = outstanding[c.cust_id] ?? 0
        return { ...c, outstanding_receivable: out, available_credit: (c.credit_limit || 0) - out }
      })
    setCustomers(custs)
  }

  useEffect(() => {
    loadAll(); loadRefs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doBySo = useMemo(() => Object.fromEntries(dos.map((d) => [d.so_id, d])), [dos])
  const invBySo = useMemo(() => Object.fromEntries(invoices.map((i) => [i.so_id, i])), [invoices])

  const filtered = tab === 'ALL' ? orders : orders.filter((o) => o.approval_status === tab)
  const waitingCount = orders.filter((o) => o.approval_status === 'WAITING_APPROVAL').length

  const selectedCust = customers.find((c) => c.cust_id === custId)
  const computedTotal = lines.reduce((sum, l) => {
    const p = products.find((pr) => pr.product_id === l.product_id)
    return sum + (p ? p.unit_price * Number(l.qty || 0) : 0)
  }, 0)
  // UC-SLS-05A trigger: any line exceeds available stock
  const hasInsufficientStock = lines.some((l) => {
    const p = products.find((pr) => pr.product_id === l.product_id)
    return p ? Number(l.qty || 0) > p.stock_qty : false
  })

  function addLine() { setLines([...lines, { product_id: '', qty: '' }]) }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function resetForm() {
    setCustId(''); setLines([{ product_id: '', qty: '' }]); setPreOrder(false); setFormError(null)
  }

  // UC-SLS-05 + UC-SLS-06 (+ UC-SLS-05A pre-order)
  async function handleCreateSO() {
    setFormError(null)
    if (!custId) { setFormError('Pilih customer terlebih dahulu.'); return }
    const valid = lines.filter((l) => l.product_id && Number(l.qty) > 0)
    if (valid.length === 0) { setFormError('Tambahkan minimal satu item dengan qty > 0.'); return }
    const cust = selectedCust!

    // Stock check (real-time, modul Inventory)
    if (hasInsufficientStock && !preOrder) {
      setFormError('Stok tidak mencukupi untuk salah satu item. Centang "Buat sebagai Pre-Order" untuk melanjutkan.')
      return
    }

    const grandTotal = computedTotal
    const soType: SalesOrder['so_type'] = preOrder ? 'PO' : 'REGULAR'

    // UC-SLS-06: credit validation
    const cond1 = grandTotal + cust.outstanding_receivable <= cust.credit_limit
    const cond2 = grandTotal < SINGLE_TXN_LIMIT
    // Pre-Order always needs manager approval (UC-SLS-05A)
    const status: SalesOrder['approval_status'] = !preOrder && cond1 && cond2 ? 'APPROVED' : 'WAITING_APPROVAL'

    setSaving(true)
    const so_id = await genDocId(supabase, 'tr_so_header', 'so_id', 'SO')
    const nowIso = new Date().toISOString()
    const { error: soErr } = await supabase.from('tr_so_header').insert({
      so_id,
      cust_id: custId,
      so_date: nowIso,
      so_type: soType,
      approval_status: status,
      grand_total: grandTotal,
      created_by: userId,
      approved_at: status === 'APPROVED' ? nowIso : null,
      approved_by: status === 'APPROVED' ? userId : null,
    })
    if (soErr) { setSaving(false); setFormError(soErr.message); return }

    const itemsPayload = valid.map((l) => {
      const p = products.find((pr) => pr.product_id === l.product_id)!
      const qty = Number(l.qty)
      return { so_id, product_id: l.product_id, qty_order: qty, unit_price: p.unit_price, subtotal: p.unit_price * qty }
    })
    const { error: itErr } = await supabase.from('tr_so_detail').insert(itemsPayload)
    setSaving(false)
    if (itErr) { setFormError(itErr.message); return }

    if (status === 'WAITING_APPROVAL') {
      await notify(supabase, {
        recipientRole: 'SNM', type: 'APPROVAL', priority: 'HIGH',
        title: soType === 'PO' ? 'Pre-Order menunggu approval' : 'Sales Order menunggu approval',
        message: `${so_id} — ${cust.cust_name} — ${rupiah(grandTotal)}${soType === 'PO' ? ' (Pre-Order, stok belum tersedia)' : ' (lewat batas kredit / nilai besar)'}`,
        sourceRefId: so_id, sourceRefType: 'SO', actionUrl: '/snm/approvals', createdBy: userId,
      })
    }
    setShowForm(false)
    resetForm()
    await Promise.all([loadAll(), loadRefs()])
  }

  async function openDetail(o: SalesOrder) {
    setDetail(o)
    setDetailItems([])
    const { data } = await supabase
      .from('tr_so_detail')
      .select('so_detail_id, product_id, qty_order, unit_price, subtotal, ms_product(product_name, uom)')
      .eq('so_id', o.so_id)
    setDetailItems((data as unknown as SoItem[]) ?? [])
  }

  async function refreshDetail(soId: string) {
    await loadAll()
    const { data } = await supabase.from('tr_so_header')
      .select('so_id, cust_id, so_date, so_type, approval_status, grand_total, rejection_reason, created_at, ms_customer(cust_name, address, payment_term)')
      .eq('so_id', soId).single()
    if (data) setDetail(data as unknown as SalesOrder)
  }

  // UC-SLS-07: Cancel
  async function cancelSO(o: SalesOrder) {
    if (doBySo[o.so_id]) { alert('SO tidak dapat dibatalkan karena Delivery Order sudah diterbitkan.'); return }
    const reason = prompt('Alasan pembatalan (wajib):')
    if (!reason || !reason.trim()) return
    setBusy(true)
    const { error } = await supabase.from('tr_so_header')
      .update({ approval_status: 'CANCELLED', rejection_reason: reason.trim(), cancelled_at: new Date().toISOString() })
      .eq('so_id', o.so_id)
    setBusy(false)
    if (error) { alert(error.message); return }
    await refreshDetail(o.so_id)
  }

  // UC-SLS-10: Issue Delivery Order → notify Staf Gudang (modul Inventory)
  async function issueDO(o: SalesOrder) {
    setBusy(true)
    const do_id = await genDocId(supabase, 'tr_delivery_order', 'do_id', 'DO')
    const { error } = await supabase.from('tr_delivery_order').insert({
      do_id,
      so_id: o.so_id,
      warehouse_id: FG_WAREHOUSE,
      do_date: new Date().toISOString(),
      delivery_address: o.ms_customer?.address ?? null,
      status: 'CREATED',
      created_by: userId,
    })
    setBusy(false)
    if (error) { alert(error.message); return }
    await notify(supabase, {
      recipientRole: 'Staf Gudang', type: 'INFORMATION', priority: 'HIGH', sourceModule: 'SNM',
      title: 'Instruksi pengiriman baru (Delivery Order)',
      message: `${do_id} dari ${o.so_id} (${o.ms_customer?.cust_name ?? ''}) siap diproses pengirimannya.`,
      sourceRefId: do_id, sourceRefType: 'DO', actionUrl: '/inventory/shipping', createdBy: userId,
    })
    await notify(supabase, {
      recipientRole: 'SNM', type: 'INFORMATION',
      title: 'Delivery Order diterbitkan', message: `${do_id} untuk ${o.so_id} diteruskan ke gudang.`,
      sourceRefId: do_id, sourceRefType: 'DO', actionUrl: '/snm/deliveries', createdBy: userId,
    })
    await refreshDetail(o.so_id)
  }

  // UC-SLS-12 + UC-SLS-13: Issue invoice and transmit receivable to Finance (piutang)
  async function createInvoice(o: SalesOrder, d: DeliveryOrder) {
    if (d.status !== 'DELIVERED') { alert('Invoice hanya dapat dibuat setelah DO berstatus Delivered.'); return }
    setBusy(true)
    const term = o.ms_customer?.payment_term ?? 'NET_30'
    const today = new Date()
    const due = new Date(today); due.setDate(due.getDate() + termDays(term))
    const inv_id = await genDocId(supabase, 'tr_sales_invoice', 'inv_id', 'INV')
    const dueStr = due.toISOString().slice(0, 10)
    const { error } = await supabase.from('tr_sales_invoice').insert({
      inv_id,
      invoice_number: invoiceNumberFromId(inv_id),
      so_id: o.so_id,
      do_id: d.do_id,
      cust_id: o.cust_id,
      inv_date: today.toISOString().slice(0, 10),
      due_date: dueStr,
      grand_total: o.grand_total,
      payment_status: 'UNPAID',
      payment_term: term,
      finance_status: 'SUBMITTED',
      sent_finance_at: new Date().toISOString(), // UC-SLS-13 transmit timestamp
      created_by: userId,
    })
    if (error) { setBusy(false); alert(error.message); return }

    // UC-SLS-13: transmit receivable to Finance module (piutang ledger)
    const { error: pErr } = await supabase.from('piutang').insert({
      inv_id,
      cust_id: o.cust_id,
      amount: o.grand_total,
      due_date: dueStr,
      status: 'OUTSTANDING',
      created_date: today.toISOString().slice(0, 10),
    })
    setBusy(false)
    if (pErr) {
      // invoice is created; surface the transmission issue but don't roll back
      alert('Invoice dibuat, namun transmisi piutang ke Finance gagal: ' + pErr.message)
    }
    await notify(supabase, {
      recipientRole: 'Account Receivable', type: 'INFORMATION', priority: 'HIGH', sourceModule: 'SNM',
      title: 'Piutang baru dari penjualan', message: `${inv_id} — ${o.ms_customer?.cust_name ?? ''} — ${rupiah(o.grand_total)} (jatuh tempo ${dueStr}).`,
      sourceRefId: inv_id, sourceRefType: 'INVOICE', actionUrl: '/finance/account-receivable', createdBy: userId,
    })
    await notify(supabase, {
      recipientRole: 'SNM', type: 'INFORMATION',
      title: 'Sales Invoice diterbitkan', message: `${inv_id}: ${rupiah(o.grand_total)} ditransmisikan otomatis ke Finance.`,
      sourceRefId: inv_id, sourceRefType: 'INVOICE', actionUrl: '/snm/invoices', createdBy: userId,
    })
    await refreshDetail(o.so_id)
  }

  const TABS = [
    { key: 'ALL', label: 'Semua' },
    { key: 'WAITING_APPROVAL', label: `Menunggu Approval${waitingCount ? ` (${waitingCount})` : ''}` },
    { key: 'APPROVED', label: 'Disetujui' },
    { key: 'REJECTED_CREDIT', label: 'Ditolak' },
    { key: 'CANCELLED', label: 'Dibatalkan' },
  ]

  const detailDO = detail ? doBySo[detail.so_id] : undefined
  const detailInv = detail ? invBySo[detail.so_id] : undefined

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/snm' },
        { label: 'Sales Orders' },
      ]}
    >
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#dc2626] mb-1">Transaksi</p>
            <ModuleHeader title="Sales Orders" />
            <p className="text-slate-500 -mt-4 text-sm">
              {orders.length} order
              {waitingCount > 0 && <> · <span className="text-amber-600 font-medium">{waitingCount} menunggu approval</span></>}
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true) }} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-5 gap-2">
            <Plus className="w-4 h-4" weight="bold" /> Buat Sales Order
          </Button>
        </div>

        {/* tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                tab === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Warning className="w-4 h-4" weight="fill" /> {error}
          </div>
        )}

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 font-medium">No. SO</th>
                    <th className="px-6 py-3.5 font-medium">Customer</th>
                    <th className="px-6 py-3.5 font-medium">Tanggal</th>
                    <th className="px-6 py-3.5 font-medium">Tipe</th>
                    <th className="px-6 py-3.5 font-medium text-right">Grand Total</th>
                    <th className="px-6 py-3.5 font-medium">Status SO</th>
                    <th className="px-6 py-3.5 font-medium">Pengiriman</th>
                    <th className="px-6 py-3.5 font-medium">Invoice</th>
                    <th className="px-6 py-3.5 font-medium">Delivery / Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                      <ClipboardText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada Sales Order</p>
                      <p className="text-xs mt-1">Klik “Buat Sales Order” untuk menginput pesanan customer</p>
                    </td></tr>
                  ) : filtered.map((o) => {
                    const d = doBySo[o.so_id]; const inv = invBySo[o.so_id]
                    return (
                      <tr key={o.so_id} className="hover:bg-slate-50/60 transition-colors group cursor-pointer" onClick={() => openDetail(o)}>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{o.so_id}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{o.ms_customer?.cust_name ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(o.so_date)}</td>
                        <td className="px-6 py-4">
                          {o.so_type === 'PO'
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Pre-Order</span>
                            : <span className="text-slate-400 text-xs">Regular</span>}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium text-slate-900">{rupiah(o.grand_total)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SO_STATUS_BADGE[o.approval_status]}`}>{SO_STATUS_LABEL[o.approval_status]}</span>
                        </td>
                        <td className="px-6 py-4">
                          {d ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DO_BADGE[d.status]}`}>{d.status}</span> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {inv ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_BADGE[inv.payment_status] ?? 'bg-slate-100 text-slate-600'}`}>{inv.payment_status}</span> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <Button onClick={(e) => { e.stopPropagation(); openDetail(o) }} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white h-10 px-2 gap-2">
                            <Plus className="w-4 h-4" weight="bold" /> Buat
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CREATE SO MODAL — UC-SLS-05 / 05A / 06 */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Buat Sales Order Baru</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer</label>
                  <select value={custId} onChange={(e) => setCustId(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white">
                    <option value="">— Pilih Customer —</option>
                    {customers.map((c) => <option key={c.cust_id} value={c.cust_id}>{c.cust_name} ({c.cust_id})</option>)}
                  </select>
                </div>

                {selectedCust && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Credit Limit', value: rupiah(selectedCust.credit_limit), tone: 'text-slate-900' },
                      { label: 'Saldo Piutang', value: rupiah(selectedCust.outstanding_receivable), tone: 'text-amber-600' },
                      { label: 'Sisa Kredit', value: rupiah(selectedCust.available_credit), tone: selectedCust.available_credit < 0 ? 'text-[#dc2626]' : 'text-green-600' },
                    ].map((b) => (
                      <div key={b.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-[11px] text-slate-400 font-medium">{b.label}</p>
                        <p className={`text-sm font-semibold tabular-nums mt-0.5 ${b.tone}`}>{b.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">Item Produk</label>
                    <Button variant="outline" size="sm" className="h-7 border-slate-200 text-xs gap-1" onClick={addLine}>
                      <Plus className="w-3 h-3" /> Tambah Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((l, i) => {
                      const p = products.find((pr) => pr.product_id === l.product_id)
                      const qty = Number(l.qty || 0)
                      const insufficient = p ? qty > p.stock_qty : false
                      return (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <select value={l.product_id} onChange={(e) => updateLine(i, { product_id: e.target.value })} className="w-full h-9 px-2 border border-slate-200 rounded-md text-sm bg-white">
                              <option value="">— Pilih Produk (FG) —</option>
                              {products.map((pr) => <option key={pr.product_id} value={pr.product_id}>{pr.product_name} · stok {pr.stock_qty}</option>)}
                            </select>
                            {p && (
                              <p className={`text-[11px] mt-1 ${insufficient ? 'text-[#dc2626]' : 'text-slate-400'}`}>
                                {rupiah(p.unit_price)}/{p.uom}
                                {p.discount_pct > 0 && <span className="text-slate-400"> (list {rupiah(p.list_price)} −{p.discount_pct}%)</span>}
                                {' · '}stok {p.stock_qty}
                                {insufficient && ' · stok tidak mencukupi'}
                              </p>
                            )}
                          </div>
                          <Input type="number" value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} placeholder="Qty" className="w-24 h-9 border-slate-200" />
                          <div className="w-28 h-9 flex items-center justify-end text-sm tabular-nums text-slate-600">
                            {p ? rupiah(p.unit_price * qty) : '—'}
                          </div>
                          <button onClick={() => removeLine(i)} className="h-9 w-9 flex items-center justify-center text-slate-300 hover:text-[#dc2626]" disabled={lines.length === 1}>
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* UC-SLS-05A pre-order option */}
                {hasInsufficientStock && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-xs text-purple-800 space-y-2">
                    <p className="flex items-center gap-1.5 font-medium"><Factory className="w-4 h-4" weight="fill" /> Stok tidak mencukupi untuk salah satu item.</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={preOrder} onChange={(e) => setPreOrder(e.target.checked)} />
                      Buat sebagai <b>Pre-Order</b> — pesanan diteruskan ke Sales Manager &amp; permintaan produksi dibuat saat disetujui.
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm font-medium text-slate-600">Grand Total</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{rupiah(computedTotal)}</span>
                </div>

                {selectedCust && computedTotal > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    {preOrder ? (
                      <span className="text-purple-700 flex items-center gap-1.5"><Factory className="w-4 h-4" weight="fill" /> Pre-Order → SO masuk antrian <b>WAITING_APPROVAL</b> (perlu persetujuan Sales Manager).</span>
                    ) : computedTotal + selectedCust.outstanding_receivable <= selectedCust.credit_limit && computedTotal < SINGLE_TXN_LIMIT ? (
                      <span className="text-green-700 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" weight="fill" /> Lolos validasi kredit → SO akan langsung <b>APPROVED</b>.</span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1.5"><Warning className="w-4 h-4" weight="fill" /> Melebihi batas kredit / nilai ≥ {rupiah(SINGLE_TXN_LIMIT)} → SO masuk antrian <b>WAITING_APPROVAL</b>.</span>
                    )}
                  </div>
                )}

                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <Warning className="w-4 h-4" weight="fill" /> {formError}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-10 border-slate-200" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
                <Button className="flex-1 h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" onClick={handleCreateSO} disabled={saving}>
                  {saving ? 'Menyimpan…' : 'Simpan Sales Order'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DETAIL DRAWER */}
      {detail && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setDetail(null)} />
          <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-mono">{detail.so_id}{detail.so_type === 'PO' ? ' · Pre-Order' : ''}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{detail.ms_customer?.cust_name}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${SO_STATUS_BADGE[detail.approval_status]}`}>{SO_STATUS_LABEL[detail.approval_status]}</span>
                <span className="text-xs text-slate-400">{fmtDate(detail.so_date)}</span>
              </div>

              {detail.rejection_reason && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <b>Alasan:</b> {detail.rejection_reason}
                </div>
              )}

              {/* items */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Item Pesanan</div>
                <div className="divide-y divide-slate-50">
                  {detailItems.map((it) => (
                    <div key={it.so_detail_id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{it.ms_product?.product_name}</p>
                        <p className="text-xs text-slate-400">{it.qty_order} {it.ms_product?.uom} × {rupiah(it.unit_price)}</p>
                      </div>
                      <span className="tabular-nums text-slate-700">{rupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-600">Grand Total</span>
                  <span className="tabular-nums text-slate-900">{rupiah(detail.grand_total)}</span>
                </div>
              </div>

              {/* Delivery */}
              {detailDO && (
                <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> {detailDO.do_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DO_BADGE[detailDO.status]}`}>{detailDO.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Pembaruan status pengiriman dilakukan Staf Gudang (modul Inventory).</p>
                </div>
              )}

              {/* Invoice */}
              {detailInv && (
                <div className="border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> {detailInv.invoice_number ?? detailInv.inv_id}</span>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_BADGE[detailInv.payment_status] ?? 'bg-slate-100 text-slate-600'}`}>{detailInv.payment_status}</span>
                    <p className="text-[11px] text-slate-400 mt-1">Jatuh tempo {fmtDate(detailInv.due_date)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* action footer */}
            <div className="p-6 border-t border-slate-100 space-y-2">
              {detail.approval_status === 'WAITING_APPROVAL' && (
                <p className="text-xs text-slate-400 text-center">Persetujuan dilakukan di halaman <b>Approval Manager</b>.</p>
              )}
              {detail.approval_status === 'APPROVED' && !detailDO && (
                <Button className="w-full h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" disabled={busy} onClick={() => issueDO(detail)}>
                  <Truck className="w-4 h-4 mr-1.5" weight="fill" /> Terbitkan Delivery Order
                </Button>
              )}
              {detail.approval_status === 'APPROVED' && detailDO?.status === 'DELIVERED' && !detailInv && (
                <Button className="w-full h-10 bg-[#dc2626] hover:bg-[#b91c1c] text-white" disabled={busy} onClick={() => createInvoice(detail, detailDO)}>
                  <Receipt className="w-4 h-4 mr-1.5" weight="fill" /> Buat Sales Invoice
                </Button>
              )}
              {(detail.approval_status === 'WAITING_APPROVAL' || detail.approval_status === 'APPROVED') && !detailDO && (
                <Button variant="ghost" className="w-full h-9 text-slate-400 hover:text-[#dc2626]" disabled={busy} onClick={() => cancelSO(detail)}>
                  Batalkan Sales Order
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  )
}
