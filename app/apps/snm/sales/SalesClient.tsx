'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, X, Eye, Trash, Warning, ClipboardText, CheckCircle, XCircle,
  Truck, Receipt, Package,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { ModuleHeader } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'

// Batas nilai transaksi tunggal yang memicu approval manager (UC-SLS-06)
const SINGLE_TXN_LIMIT = 500_000_000

const rupiah = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

type CustomerLite = {
  id: string
  cust_code: string
  cust_name: string
  address: string | null
  payment_term: string
  credit_limit: number
  outstanding_receivable: number
  available_credit: number
}
type ProductLite = {
  id: string
  sku: string
  name: string
  unit: string
  selling_price: number
  stock_qty: number
}
type SalesOrder = {
  id: string
  so_number: string
  customer_id: string
  so_date: string
  so_type: 'REGULAR' | 'PO'
  approval_status: 'DRAFT' | 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED_CREDIT' | 'CANCELLED'
  grand_total: number
  rejection_reason: string | null
  customers: { cust_name: string; cust_code: string; address: string | null; payment_term: string } | null
}
type DeliveryOrder = { id: string; so_id: string; do_number: string; status: string; delivery_address: string | null; delivered_at: string | null }
type Invoice = { id: string; so_id: string; inv_number: string; payment_status: string; inv_date: string; due_date: string | null; grand_total: number }
type SoItem = { id: string; product_id: string; qty_order: number; unit_price: number; subtotal: number; products: { name: string; sku: string; unit: string } | null }

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED_CREDIT: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
}
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  WAITING_APPROVAL: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  REJECTED_CREDIT: 'Ditolak',
  CANCELLED: 'Dibatalkan',
}
const DO_BADGE: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-red-100 text-red-700',
}

type Line = { product_id: string; qty: string }

const VALID_STATUS = ['WAITING_APPROVAL', 'APPROVED', 'REJECTED_CREDIT', 'CANCELLED']

export function SalesClient({ initialStatus }: { initialStatus?: string }) {
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
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // detail drawer
  const [detail, setDetail] = useState<SalesOrder | null>(null)
  const [detailItems, setDetailItems] = useState<SoItem[]>([])
  const [busy, setBusy] = useState(false)

  const loadAll = async () => {
    setLoading(true); setError(null)
    const [soRes, doRes, invRes] = await Promise.all([
      supabase.from('sales_orders').select('*, customers(cust_name, cust_code, address, payment_term)').order('created_at', { ascending: false }),
      supabase.from('delivery_orders').select('id, so_id, do_number, status, delivery_address, delivered_at'),
      supabase.from('sales_invoices').select('id, so_id, inv_number, payment_status, inv_date, due_date, grand_total'),
    ])
    if (soRes.error) setError(soRes.error.message)
    setOrders((soRes.data as SalesOrder[]) ?? [])
    setDos((doRes.data as DeliveryOrder[]) ?? [])
    setInvoices((invRes.data as Invoice[]) ?? [])
    setLoading(false)
  }

  const loadRefs = async () => {
    const [cRes, pRes] = await Promise.all([
      supabase.from('v_customer_credit').select('id, cust_code, cust_name, address, payment_term, credit_limit, outstanding_receivable, available_credit').eq('is_active', true).order('cust_name'),
      supabase.from('products').select('id, sku, name, unit, selling_price, stock_qty').eq('is_active', true).eq('type', 'FINISHED_GOOD').order('name'),
    ])
    setCustomers((cRes.data as CustomerLite[]) ?? [])
    setProducts((pRes.data as ProductLite[]) ?? [])
  }

  useEffect(() => {
    loadAll(); loadRefs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kirim notifikasi ke dashboard SNM (UC-SLS-09). Diam saja kalau tabel belum ada.
  async function notify(type: string, title: string, message: string) {
    try {
      await supabase.from('notifications').insert({
        recipient_role: 'SNM', type, title, message, link: '/apps/snm/sales',
      })
    } catch { /* ignore */ }
  }

  const doBySo = useMemo(() => Object.fromEntries(dos.map((d) => [d.so_id, d])), [dos])
  const invBySo = useMemo(() => Object.fromEntries(invoices.map((i) => [i.so_id, i])), [invoices])

  const filtered = tab === 'ALL' ? orders : orders.filter((o) => o.approval_status === tab)
  const waitingCount = orders.filter((o) => o.approval_status === 'WAITING_APPROVAL').length

  const selectedCust = customers.find((c) => c.id === custId)
  const computedTotal = lines.reduce((sum, l) => {
    const p = products.find((pr) => pr.id === l.product_id)
    return sum + (p ? p.selling_price * Number(l.qty || 0) : 0)
  }, 0)

  function addLine() { setLines([...lines, { product_id: '', qty: '' }]) }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function resetForm() {
    setCustId(''); setLines([{ product_id: '', qty: '' }]); setFormError(null)
  }

  // UC-SLS-05 + UC-SLS-06
  async function handleCreateSO() {
    setFormError(null)
    if (!custId) { setFormError('Pilih customer terlebih dahulu.'); return }
    const valid = lines.filter((l) => l.product_id && Number(l.qty) > 0)
    if (valid.length === 0) { setFormError('Tambahkan minimal satu item dengan qty > 0.'); return }
    const cust = selectedCust!

    // Validasi credit limit otomatis (UC-SLS-06)
    const grandTotal = computedTotal
    const cond1 = grandTotal + cust.outstanding_receivable <= cust.credit_limit
    const cond2 = grandTotal < SINGLE_TXN_LIMIT
    const status: SalesOrder['approval_status'] = cond1 && cond2 ? 'APPROVED' : 'WAITING_APPROVAL'

    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()
    const { data: soData, error: soErr } = await supabase
      .from('sales_orders')
      .insert({
        customer_id: custId,
        so_type: 'REGULAR',
        approval_status: status,
        grand_total: grandTotal,
        created_by: auth.user?.id ?? null,
        approved_at: status === 'APPROVED' ? new Date().toISOString() : null,
        approved_by: status === 'APPROVED' ? (auth.user?.id ?? null) : null,
      })
      .select('id')
      .single()
    if (soErr || !soData) { setSaving(false); setFormError(soErr?.message ?? 'Gagal membuat SO'); return }

    const itemsPayload = valid.map((l) => {
      const p = products.find((pr) => pr.id === l.product_id)!
      return { so_id: soData.id, product_id: l.product_id, qty_order: Number(l.qty), unit_price: p.selling_price }
    })
    const { error: itErr } = await supabase.from('sales_order_items').insert(itemsPayload)
    setSaving(false)
    if (itErr) { setFormError(itErr.message); return }

    await notify(
      status === 'WAITING_APPROVAL' ? 'SO_APPROVAL' : 'INFO',
      status === 'WAITING_APPROVAL' ? 'Sales Order menunggu approval' : 'Sales Order baru dibuat',
      `${cust.cust_name} — ${rupiah(grandTotal)}${status === 'WAITING_APPROVAL' ? ' (perlu persetujuan manager)' : ' (auto-approved)'}`,
    )
    setShowForm(false)
    resetForm()
    await loadAll()
  }

  async function openDetail(o: SalesOrder) {
    setDetail(o)
    setDetailItems([])
    const { data } = await supabase
      .from('sales_order_items')
      .select('id, product_id, qty_order, unit_price, subtotal, products(name, sku, unit)')
      .eq('so_id', o.id)
    setDetailItems((data as unknown as SoItem[]) ?? [])
  }

  async function refreshDetail(soId: string) {
    await loadAll()
    const { data } = await supabase.from('sales_orders').select('*, customers(cust_name, cust_code, address, payment_term)').eq('id', soId).single()
    if (data) setDetail(data as SalesOrder)
  }

  // UC-SLS-08: Approve
  async function approveSO(o: SalesOrder) {
    setBusy(true)
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('sales_orders')
      .update({ approval_status: 'APPROVED', approved_by: auth.user?.id ?? null, approved_at: new Date().toISOString(), rejection_reason: null })
      .eq('id', o.id)
    setBusy(false)
    if (error) { alert(error.message); return }
    await notify('SO_APPROVED', 'Sales Order disetujui', `${o.so_number} telah disetujui Sales Manager.`)
    await refreshDetail(o.id)
  }
  // UC-SLS-08 alt: Reject
  async function rejectSO(o: SalesOrder) {
    const reason = prompt('Alasan penolakan (wajib):')
    if (!reason || !reason.trim()) return
    setBusy(true)
    const { error } = await supabase.from('sales_orders')
      .update({ approval_status: 'REJECTED_CREDIT', rejection_reason: reason.trim() })
      .eq('id', o.id)
    setBusy(false)
    if (error) { alert(error.message); return }
    await notify('SO_REJECTED', 'Sales Order ditolak', `${o.so_number}: ${reason.trim()}`)
    await refreshDetail(o.id)
  }
  // UC-SLS-07: Cancel
  async function cancelSO(o: SalesOrder) {
    if (doBySo[o.id]) { alert('SO tidak dapat dibatalkan karena Delivery Order sudah diterbitkan.'); return }
    const reason = prompt('Alasan pembatalan (wajib):')
    if (!reason || !reason.trim()) return
    setBusy(true)
    const { error } = await supabase.from('sales_orders')
      .update({ approval_status: 'CANCELLED', rejection_reason: reason.trim(), cancelled_at: new Date().toISOString() })
      .eq('id', o.id)
    setBusy(false)
    if (error) { alert(error.message); return }
    await refreshDetail(o.id)
  }
  // UC-SLS-10: Terbitkan Delivery Order
  async function issueDO(o: SalesOrder) {
    setBusy(true)
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('delivery_orders').insert({
      so_id: o.id,
      delivery_address: o.customers?.address ?? null,
      status: 'CREATED',
      created_by: auth.user?.id ?? null,
    })
    setBusy(false)
    if (error) { alert(error.message); return }
    await notify('DELIVERY', 'Delivery Order diterbitkan', `${o.so_number} siap diproses pengirimannya oleh gudang.`)
    await refreshDetail(o.id)
  }
  // Update status DO (normalnya oleh Staf Gudang / modul Inventory)
  async function updateDOStatus(d: DeliveryOrder, status: string) {
    setBusy(true)
    const patch: Record<string, unknown> = { status }
    if (status === 'DELIVERED') patch.delivered_at = new Date().toISOString()
    const { error } = await supabase.from('delivery_orders').update(patch).eq('id', d.id)
    setBusy(false)
    if (error) { alert(error.message); return }
    if (status === 'DELIVERED') await notify('DELIVERY', 'Barang telah diterima customer', `${d.do_number} berstatus Delivered — invoice siap diterbitkan.`)
    await refreshDetail(d.so_id)
  }
  // UC-SLS-12 (+UC-SLS-13 transmisi ke Finance otomatis)
  async function createInvoice(o: SalesOrder, d: DeliveryOrder) {
    if (d.status !== 'DELIVERED') { alert('Invoice hanya dapat dibuat setelah DO berstatus Delivered.'); return }
    setBusy(true)
    const term = o.customers?.payment_term ?? 'NET_30'
    const days = term === 'COD' ? 0 : parseInt(term.replace('NET_', ''), 10) || 0
    const due = new Date(); due.setDate(due.getDate() + days)
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('sales_invoices').insert({
      so_id: o.id,
      do_id: d.id,
      customer_id: o.customer_id,
      grand_total: o.grand_total,
      payment_status: 'UNPAID',
      payment_term: term,
      due_date: due.toISOString().slice(0, 10),
      sent_finance_at: new Date().toISOString(), // transmisi ke Finance (UC-SLS-13)
      created_by: auth.user?.id ?? null,
    })
    setBusy(false)
    if (error) { alert(error.message); return }
    await notify('INVOICE', 'Sales Invoice diterbitkan', `${o.so_number}: ${rupiah(o.grand_total)} ditransmisikan ke Finance.`)
    await refreshDetail(o.id)
  }

  const TABS = [
    { key: 'ALL', label: 'Semua' },
    { key: 'WAITING_APPROVAL', label: `Menunggu Approval${waitingCount ? ` (${waitingCount})` : ''}` },
    { key: 'APPROVED', label: 'Disetujui' },
    { key: 'REJECTED_CREDIT', label: 'Ditolak' },
    { key: 'CANCELLED', label: 'Dibatalkan' },
  ]

  const detailDO = detail ? doBySo[detail.id] : undefined
  const detailInv = detail ? invBySo[detail.id] : undefined

  return (
    <ModuleLayout
      activeModule="snm"
      moduleTitle="Sales & Marketing"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Sales & Marketing', href: '/apps/snm' },
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
                    <th className="px-6 py-3.5 font-medium text-right">Grand Total</th>
                    <th className="px-6 py-3.5 font-medium">Status SO</th>
                    <th className="px-6 py-3.5 font-medium">Pengiriman</th>
                    <th className="px-6 py-3.5 font-medium">Invoice</th>
                    <th className="px-6 py-3.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400 text-sm">Memuat data…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                      <ClipboardText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Belum ada Sales Order</p>
                      <p className="text-xs mt-1">Klik “Buat Sales Order” untuk menginput pesanan customer</p>
                    </td></tr>
                  ) : filtered.map((o) => {
                    const d = doBySo[o.id]; const inv = invBySo[o.id]
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/60 transition-colors group cursor-pointer" onClick={() => openDetail(o)}>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{o.so_number}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{o.customers?.cust_name ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{fmtDate(o.so_date)}</td>
                        <td className="px-6 py-4 text-right tabular-nums font-medium text-slate-900">{rupiah(o.grand_total)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[o.approval_status]}`}>{STATUS_LABEL[o.approval_status]}</span>
                        </td>
                        <td className="px-6 py-4">
                          {d ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DO_BADGE[d.status]}`}>{d.status}</span> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {inv ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{inv.payment_status}</span> : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={(e) => { e.stopPropagation(); openDetail(o) }}>
                            <Eye className="w-4 h-4" />
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

      {/* CREATE SO MODAL — UC-SLS-05 / 06 */}
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
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.cust_name} ({c.cust_code})</option>)}
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
                      const p = products.find((pr) => pr.id === l.product_id)
                      const qty = Number(l.qty || 0)
                      const insufficient = p ? qty > p.stock_qty : false
                      return (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <select value={l.product_id} onChange={(e) => updateLine(i, { product_id: e.target.value })} className="w-full h-9 px-2 border border-slate-200 rounded-md text-sm bg-white">
                              <option value="">— Pilih Produk (FG) —</option>
                              {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name} · stok {pr.stock_qty}</option>)}
                            </select>
                            {p && (
                              <p className={`text-[11px] mt-1 ${insufficient ? 'text-[#dc2626]' : 'text-slate-400'}`}>
                                {rupiah(p.selling_price)}/{p.unit} · stok {p.stock_qty}
                                {insufficient && ' · stok tidak mencukupi'}
                              </p>
                            )}
                          </div>
                          <Input type="number" value={l.qty} onChange={(e) => updateLine(i, { qty: e.target.value })} placeholder="Qty" className="w-24 h-9 border-slate-200" />
                          <div className="w-28 h-9 flex items-center justify-end text-sm tabular-nums text-slate-600">
                            {p ? rupiah(p.selling_price * qty) : '—'}
                          </div>
                          <button onClick={() => removeLine(i)} className="h-9 w-9 flex items-center justify-center text-slate-300 hover:text-[#dc2626]" disabled={lines.length === 1}>
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm font-medium text-slate-600">Grand Total</span>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">{rupiah(computedTotal)}</span>
                </div>

                {selectedCust && computedTotal > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    {computedTotal + selectedCust.outstanding_receivable <= selectedCust.credit_limit && computedTotal < SINGLE_TXN_LIMIT ? (
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
                <p className="text-xs text-slate-400 font-mono">{detail.so_number}</p>
                <h2 className="text-lg font-semibold text-slate-900 mt-0.5">{detail.customers?.cust_name}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[detail.approval_status]}`}>{STATUS_LABEL[detail.approval_status]}</span>
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
                    <div key={it.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{it.products?.name}</p>
                        <p className="text-xs text-slate-400">{it.qty_order} {it.products?.unit} × {rupiah(it.unit_price)}</p>
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
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> {detailDO.do_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DO_BADGE[detailDO.status]}`}>{detailDO.status}</span>
                  </div>
                  {detailDO.status !== 'DELIVERED' && detailDO.status !== 'RETURNED' && (
                    <div className="flex gap-2">
                      {detailDO.status === 'CREATED' && (
                        <Button variant="outline" size="sm" className="h-8 border-slate-200 text-xs" disabled={busy} onClick={() => updateDOStatus(detailDO, 'SENT')}>Tandai Dikirim (Sent)</Button>
                      )}
                      {detailDO.status === 'SENT' && (
                        <Button variant="outline" size="sm" className="h-8 border-slate-200 text-xs" disabled={busy} onClick={() => updateDOStatus(detailDO, 'DELIVERED')}>Tandai Diterima (Delivered)</Button>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400">Pembaruan status pengiriman normalnya dilakukan Staf Gudang (modul Inventory).</p>
                </div>
              )}

              {/* Invoice */}
              {detailInv && (
                <div className="border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> {detailInv.inv_number}</span>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{detailInv.payment_status}</span>
                    <p className="text-[11px] text-slate-400 mt-1">Jatuh tempo {fmtDate(detailInv.due_date)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* action footer */}
            <div className="p-6 border-t border-slate-100 space-y-2">
              {detail.approval_status === 'WAITING_APPROVAL' && (
                <div className="flex gap-2">
                  <Button className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white" disabled={busy} onClick={() => approveSO(detail)}>
                    <CheckCircle className="w-4 h-4 mr-1.5" weight="fill" /> Setujui
                  </Button>
                  <Button variant="outline" className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50" disabled={busy} onClick={() => rejectSO(detail)}>
                    <XCircle className="w-4 h-4 mr-1.5" /> Tolak
                  </Button>
                </div>
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
