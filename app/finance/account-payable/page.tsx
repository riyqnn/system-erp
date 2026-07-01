/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  CheckSquare,
  FileCheck2,
  Plus,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Link
} from 'lucide-react'
import Swal from 'sweetalert2'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Hutang {
  id_hutang: number;
  no_invoice: string;
  supplier_id: number;
  supplier_name: string;
  jumlah: number;
  sisa_pembayaran: number;
  due_date: string;
  status: 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE';
  ap_status?: string;
  created_at: string;
}

interface PurchaseOrder {
  id_po: number;
  no_po: string;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  qty: number;
  harga_satuan: number;
  total_harga: number;
}

interface GoodsReceipt {
  receipt_id: number;
  gr_code: string;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
  status: 'Accepted' | 'Rejected' | 'Partial';
}

interface PermintaanPembayaran {
  id_permintaan: number;
  no_permintaan: string;
  hutang_id: number;
  jumlah_bayar: number;
  metode_pembayaran: 'TRANSFER' | 'KAS_KECIL' | 'GIRO';
  keterangan: string;
  status: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK' | 'TEREKSEKUSI';
  created_at: string;
  tr_hutang?: {
    no_invoice: string;
    supplier_name: string;
  };
}

function GlassCard({
  children,
  className = "",
  hover = false,
  onMouseEnter,
  onMouseLeave,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      className={`
        bg-white/95 backdrop-blur-md
        border border-slate-100
        shadow-[0_4px_20px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.01)]
        rounded-3xl overflow-hidden
        ${hover ? "hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5" : ""}
        transition-all duration-300 ease-out
        ${className}
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

export default function AccountPayablePage() {
  const [userRole, setUserRole] = useState<'AP_STAFF' | 'MANAGEMENT'>('AP_STAFF')
  const [hutangList, setHutangList] = useState<Hutang[]>([])
  const [poList, setPoList] = useState<PurchaseOrder[]>([])
  const [grList, setGrList] = useState<GoodsReceipt[]>([])
  const [permintaanList, setPermintaanList] = useState<PermintaanPembayaran[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [totalHutang, setTotalHutang] = useState(0)

  // Modals Toggles
  const [isMatchingOpen, setIsMatchingOpen] = useState(false)
  const [isRequestOpen, setIsRequestOpen] = useState(false)

  useEffect(() => {
    const savedRole = localStorage.getItem('ap_user_role')
    if (savedRole === 'AP_STAFF' || savedRole === 'MANAGEMENT') {
      setUserRole(savedRole)
    }
  }, [])

  const handleUpdateRole = (role: 'AP_STAFF' | 'MANAGEMENT') => {
    setUserRole(role)
    localStorage.setItem('ap_user_role', role)
  }

  // Matching Form States
  const [noInvoiceInput, setNoInvoiceInput] = useState('')
  const [selectedPoNo, setSelectedPoNo] = useState('')
  const [selectedGrCode, setSelectedGrCode] = useState('')
  const [supplierIdInput, setSupplierIdInput] = useState<number>(0)
  const [jumlahInput, setJumlahInput] = useState<number>(0)
  const [tanggalInvoiceInput, setTanggalInvoiceInput] = useState(new Date().toISOString().substring(0, 10))
  const [dueDateInput, setDueDateInput] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10))

  // Request Payment Form States
  const [selectedHutang, setSelectedHutang] = useState<Hutang | null>(null)
  const [jumlahBayarPengajuan, setJumlahBayarPengajuan] = useState<number>(0)
  const [metodeBayar, setMetodeBayar] = useState<'TRANSFER' | 'KAS_KECIL' | 'GIRO'>('TRANSFER')
  const [keteranganPengajuan, setKeteranganPengajuan] = useState('')

  // Search
  const [searchSup, setSearchSup] = useState('')

  // Load AP and PO/GR lists
  const loadData = async () => {
    try {
      setLoading(true)
      const apRes = await fetch(`/api/finance/payable?page=${currentPage}&limit=10`)
      const apJson = await apRes.json()
      if (apJson.data) {
        setHutangList(apJson.data)
        setTotalHutang(apJson.total || 0)
      }

      const matchRes = await fetch('/api/finance/payable?mode=matching_data')
      const matchJson = await matchRes.json()
      if (matchJson.data) {
        setPoList(matchJson.data.poList || [])
        setGrList(matchJson.data.grList || [])
      }

      // Fetch pending requests for approval panel
      const reqRes = await fetch('/api/finance/treasury')
      const reqJson = await reqRes.json()
      if (reqJson.data) setPermintaanList(reqJson.data)
    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data dari API. Beralih ke data mock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentPage])

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotif({ type, message })
    setTimeout(() => setNotif(null), 6000)
  }

  // Handle PO Selection in Form to autofill fields
  const handlePoChange = (poNo: string) => {
    setSelectedPoNo(poNo)
    const po = poList.find(p => p.no_po === poNo)
    if (po) {
      setSupplierIdInput(po.supplier_id)

      // Auto-select corresponding GR if available
      const matchingGr = grList.find(g => g.product_id === po.product_id && g.supplier_id === po.supplier_id)
      if (matchingGr) {
        setSelectedGrCode(matchingGr.gr_code)
        // Autofill amount = GR qty * PO unit price
        setJumlahInput(matchingGr.quantity * po.harga_satuan)
      } else {
        setSelectedGrCode('')
        setJumlahInput(0)
      }
    }
  }

  // Submit Three-Way Matching (POST /api/finance/payable)
  const handleMatchingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!noInvoiceInput.trim() || !selectedPoNo || !selectedGrCode || supplierIdInput === 0 || jumlahInput <= 0) {
      showNotif('error', 'Semua kolom pencocokan invoice harus diisi dengan benar.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'match',
          no_invoice: noInvoiceInput,
          no_po: selectedPoNo,
          gr_code: selectedGrCode,
          supplier_id: supplierIdInput,
          jumlah: jumlahInput,
          tanggal_invoice: tanggalInvoiceInput,
          due_date: dueDateInput
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', json.message || 'Matching Sukses! Faktur pembelian terverifikasi cocok dan telah dicatat sebagai hutang usaha.')
        setNoInvoiceInput('')
        setSelectedPoNo('')
        setSelectedGrCode('')
        setSupplierIdInput(0)
        setJumlahInput(0)
        setIsMatchingOpen(false)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal memverifikasi Three-Way Matching.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mengirim data verifikasi.')
    } finally {
      setLoading(false)
    }
  }

  // Submit Payment Request (POST /api/finance/payable action: request_payment)
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!selectedHutang) return
    if (jumlahBayarPengajuan <= 0 || jumlahBayarPengajuan > selectedHutang.sisa_pembayaran) {
      showNotif('error', 'Jumlah pengajuan harus valid (> 0) dan tidak melebihi sisa hutang.')
      return
    }
    if (!keteranganPengajuan.trim()) {
      showNotif('error', 'Harap isi alasan/keterangan pengajuan pembayaran.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/payable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_payment',
          hutang_id: selectedHutang.id_hutang,
          jumlah_bayar: jumlahBayarPengajuan,
          metode_pembayaran: metodeBayar,
          keterangan: keteranganPengajuan
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Sukses mengajukan pembayaran untuk faktur ${selectedHutang.no_invoice} senilai Rp ${jumlahBayarPengajuan.toLocaleString()}. Menunggu persetujuan Management.`)
        setSelectedHutang(null)
        setJumlahBayarPengajuan(0)
        setKeteranganPengajuan('')
        setIsRequestOpen(false)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal mengajukan permintaan pembayaran.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mengirim pengajuan pembayaran.')
    } finally {
      setLoading(false)
    }
  }

  // Approve / Reject Request from Sidebar directly
  const handleReviewAction = async (pmtId: number, status: 'DISETUJUI' | 'DITOLAK') => {
    try {
      setLoading(true)
      const res = await fetch('/api/finance/treasury?mock_role=MANAGEMENT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          permintaan_id: pmtId,
          status,
          alasan: status === 'DITOLAK' ? 'Ditolak via Dashboard AP' : ''
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Permintaan pembayaran berhasil ${status.toLowerCase()}!`)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal merespon permintaan.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat merespon pengajuan.')
    } finally {
      setLoading(false)
    }
  }

  // Summary stats
  const outstandingHutangSum = (hutangList || [])
    .filter(h => h.status !== 'LUNAS')
    .reduce((sum, h) => sum + h.sisa_pembayaran, 0)

  const pendingPO = poList.length

  const filteredHutang = (hutangList || []).filter(h =>
    h.supplier_name.toLowerCase().includes(searchSup.toLowerCase()) || h.no_invoice.includes(searchSup)
  )

  const pendingReviews = permintaanList.filter(p => p.status === 'MENUNGGU_PERSETUJUAN')

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-6 pb-12">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-red-600" style={{ width: '4px', backgroundColor: '#dc2626' }} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#dc2626' }}>
                Finance Module
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Accounts Payable Dashboard
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Manage verifications, payment requests, and approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Simulated Role Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => handleUpdateRole('AP_STAFF')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${userRole === 'AP_STAFF'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Staf AP
            </button>
            <button
              onClick={() => handleUpdateRole('MANAGEMENT')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${userRole === 'MANAGEMENT'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Pimpinan
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          {notif.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <FileCheck2 className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices to Verify</span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-800 mt-2">
                {pendingPO}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <ArrowUpRight className="w-3 h-3" />
              +12%
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckSquare className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requests for Review</span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-800 mt-2">
                {pendingReviews.length}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
              <ArrowDownRight className="w-3 h-3" />
              -5%
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="relative">
          {/* Sparkline gradient line background for Outstanding AP card */}
          <div className="absolute left-0 bottom-0 right-0 h-10 opacity-30">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,15 Q20,2 40,16 T80,10 T100,5" fill="none" stroke="#EE4444" strokeWidth="2" />
            </svg>
          </div>
          <CardContent className="p-6 flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outstanding AP</span>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-800 mt-2">
                Rp {outstandingHutangSum.toLocaleString('id-ID')}
              </p>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Columns: Invoice Verification Table and Action Card */}
        <div className={`${userRole === 'MANAGEMENT' ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-6`}>

          {/* Invoice Verification Table Card */}
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Invoice Verification</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search Supplier / Inv..."
                    value={searchSup}
                    onChange={(e) => setSearchSup(e.target.value)}
                    className="pl-8 pr-4 h-8 text-xs font-medium w-[180px] bg-slate-50/50 border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => showNotif('success', 'Semua invoice ditampilkan.')}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  View All &gt;
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-32">Invoice #</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Supplier</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-28">Status</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center">Date</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs text-slate-700">
                  {filteredHutang.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 font-semibold text-slate-400">
                        Tidak ada tagihan hutang terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHutang.map((h) => (
                      <TableRow key={h.id_hutang} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                        <TableCell className="font-mono font-bold text-slate-800 px-6 py-4">{h.no_invoice}</TableCell>
                        <TableCell className="font-bold text-slate-800 px-6 py-4">{h.supplier_name}</TableCell>
                        <TableCell className="text-center px-6 py-4">
                          {h.ap_status === 'PRICE_MISMATCH' && (
                            <span className="text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 font-bold">Returned</span>
                          )}
                          {h.ap_status === 'PENDING_VERIFICATION' && (
                            <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-bold">Resubmitted</span>
                          )}
                          {h.ap_status === 'DRAFT' && (
                            <span className="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 font-bold">Draft</span>
                          )}
                          {h.ap_status === 'OUTSTANDING' && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 font-bold">Outstanding</span>
                          )}
                          {h.ap_status === 'PAID' && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-bold">Paid</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-500 px-6 py-4">
                          {new Date(h.due_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800 px-6 py-4">Rp {h.jumlah.toLocaleString()}</TableCell>
                        <TableCell className="text-center px-6 py-4">
                          {h.status !== 'LUNAS' ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => {
                                  if (h.ap_status === 'PRICE_MISMATCH') {
                                    Swal.fire('Info', 'Invoice ini sedang dikembalikan ke Purchasing untuk koreksi.', 'info');
                                    return;
                                  }
                                  setSelectedHutang(h);
                                  setJumlahBayarPengajuan(h.sisa_pembayaran);
                                  setIsRequestOpen(true);
                                }}
                                disabled={h.ap_status === 'PRICE_MISMATCH'}
                                className={`px-2 py-1 rounded-lg text-white font-bold transition-colors cursor-pointer text-[10px] ${h.ap_status === 'PRICE_MISMATCH' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                              >
                                Verify
                              </button>
                              <button
                                onClick={async () => {
                                  if (h.ap_status === 'PRICE_MISMATCH') {
                                    Swal.fire('Info', 'Invoice ini sudah dikembalikan ke Purchasing.', 'info');
                                    return;
                                  }
                                  const result = await Swal.fire({
                                    title: 'Kembalikan ke Purchasing?',
                                    text: `Tandai invoice ${h.no_invoice} sebagai Discrepancy dan minta Purchasing untuk review ulang?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Ya, Kembalikan',
                                    cancelButtonText: 'Batal'
                                  });
                                  if (result.isConfirmed) {
                                    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                                    try {
                                      const res = await fetch('/api/finance/invoice-discrepancy', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ap_id: h.id_hutang, no_invoice: h.no_invoice })
                                      });
                                      if (res.ok) {
                                        Swal.fire('Berhasil!', 'Invoice dikembalikan ke antrean Purchasing.', 'success');
                                        loadData();
                                      } else {
                                        const json = await res.json();
                                        Swal.fire('Gagal', json.error || 'Terjadi kesalahan sistem.', 'error');
                                      }
                                    } catch (e) {
                                      Swal.fire('Gagal', 'Koneksi bermasalah', 'error');
                                    }
                                  }
                                }}
                                disabled={h.ap_status === 'PRICE_MISMATCH'}
                                className={`px-2 py-1 rounded-lg text-white font-bold transition-colors cursor-pointer text-[10px] ${h.ap_status === 'PRICE_MISMATCH' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}
                              >
                                Return
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Paid</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalHutang > 10 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                <span className="text-xs text-slate-500 font-medium">
                  Menampilkan {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, totalHutang)} dari {totalHutang} data
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    variant="outline"
                    className="h-8 text-xs font-bold px-3 rounded-xl cursor-pointer"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalHutang / 10)))}
                    disabled={currentPage * 10 >= totalHutang || loading}
                    variant="outline"
                    className="h-8 text-xs font-bold px-3 rounded-xl cursor-pointer"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Initiate Payment Request Dashed Card (Always Shown below Table as per mockup) */}
          <div className="relative border border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-white/40 space-y-4 min-h-[200px]">
            {/* Top Right Action Buttons (Moved & grouped at the blue circle area) */}
            <div className="absolute right-6 top-6 flex items-center gap-2">
              <Button
                onClick={() => setIsMatchingOpen(true)}
                variant="outline"
                className="h-9 gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 rounded-xl cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" /> Match PO/GR
              </Button>
              <Button
                onClick={() => {
                  const pendingAp = filteredHutang.filter(h => h.status !== 'LUNAS');
                  if (pendingAp.length > 0) {
                    setSelectedHutang(pendingAp[0]);
                    setJumlahBayarPengajuan(pendingAp[0].sisa_pembayaran);
                  }
                  setIsRequestOpen(true);
                }}
                className="h-9 gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer shadow-sm shadow-red-100"
              >
                <Plus className="w-4 h-4" /> New Payment Request
              </Button>
            </div>

            <div className="w-12 h-12 rounded-full bg-red-50 text-[#800000] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 max-w-[480px]">
              <h4 className="text-base font-bold text-slate-800">Initiate Payment Request</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compile verified invoices and submit a new payment request for managerial review and treasury processing.
              </p>
            </div>
          </div>

        </div>

        {/* Right Side: Payment Review (UC-AP-04) Sidebar */}
        {userRole === 'MANAGEMENT' && (
          <div className="xl:col-span-1">
            <GlassCard className="h-full flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-red-600" /> Payment Review
                </h3>
                <p className="text-xs text-slate-400 mt-1">{pendingReviews.length} pengajuan menunggu persetujuan</p>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[400px] p-6 space-y-4">
                {pendingReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                    <p className="text-xs font-medium text-slate-400 italic">
                      Tidak ada pengajuan pembayaran yang perlu ditinjau.
                    </p>
                  </div>
                ) : (
                  pendingReviews.map((pmt) => (
                    <div key={pmt.id_permintaan} className="border border-slate-100 bg-slate-50/30 rounded-2xl p-4 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[10px] font-bold text-slate-400">{pmt.no_permintaan}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Pending Review</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700">{pmt.keterangan}</p>
                        <p className="text-[10px] text-slate-400">Invoice: {pmt.tr_hutang?.no_invoice} ({pmt.tr_hutang?.supplier_name})</p>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <p className="text-base font-bold text-slate-800">Rp {pmt.jumlah_bayar.toLocaleString()}</p>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReviewAction(pmt.id_permintaan, 'DITOLAK')}
                            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReviewAction(pmt.id_permintaan, 'DISETUJUI')}
                            className="w-8 h-8 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50">
                <Link href="/finance/treasury" className="text-xs font-semibold text-red-600 hover:underline">
                  View all pending requests
                </Link>
              </div>
            </GlassCard>
          </div>
        )}

      </div>

      {/* =====================================================================
          OVERLAY MODALS
          ===================================================================== */}

      {/* 1. THREE-WAY MATCHING MODAL */}
      {isMatchingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-red-600" /> Three-Way Matching Validator
              </h3>
              <button
                onClick={() => setIsMatchingOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMatchingSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Nomor Invoice Baru</label>
                <Input
                  placeholder="PINV-202606-9901"
                  value={noInvoiceInput}
                  onChange={(e) => setNoInvoiceInput(e.target.value)}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Purchase Order (PO)</label>
                <select
                  value={selectedPoNo}
                  onChange={(e) => handlePoChange(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  <option value="">-- PILIH NOMOR PO --</option>
                  {poList.map((po) => (
                    <option key={po.id_po} value={po.no_po}>{po.no_po} ({po.supplier_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Goods Receipt (GR)</label>
                <select
                  value={selectedGrCode}
                  onChange={(e) => setSelectedGrCode(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  <option value="">-- PILIH KODE GR --</option>
                  {grList.map((gr) => (
                    <option key={gr.receipt_id} value={gr.gr_code}>{gr.gr_code} (Qty: {gr.quantity} - {gr.product_name})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">ID Supplier</label>
                  <Input
                    type="number"
                    value={supplierIdInput || ''}
                    onChange={(e) => setSupplierIdInput(Number(e.target.value))}
                    className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 bg-slate-50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jumlah Tagihan (IDR)</label>
                  <Input
                    type="number"
                    value={jumlahInput || ''}
                    onChange={(e) => setJumlahInput(Number(e.target.value))}
                    className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tanggal Invoice</label>
                  <Input
                    type="date"
                    value={tanggalInvoiceInput}
                    onChange={(e) => setTanggalInvoiceInput(e.target.value)}
                    className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl text-xs font-medium mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jatuh Tempo</label>
                  <Input
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl text-xs font-medium mt-1"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsMatchingOpen(false)}
                  variant="ghost"
                  disabled={loading}
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer disabled:opacity-75 flex items-center justify-center gap-1.5"
                >
                  {loading && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {loading ? 'Memverifikasi...' : 'Simpan Hutang'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PAYMENT REQUEST MODAL */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-red-600" /> Form Pengajuan Pembayaran
              </h3>
              <button
                onClick={() => setIsRequestOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Kewajiban Invoice (AP)</label>
                <select
                  value={selectedHutang?.id_hutang || 0}
                  onChange={(e) => {
                    const h = hutangList.find(x => x.id_hutang === Number(e.target.value))
                    if (h) {
                      setSelectedHutang(h);
                      setJumlahBayarPengajuan(h.sisa_pembayaran);
                    }
                  }}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  <option value={0}>-- PILIH FAKTUR TERVERIFIKASI --</option>
                  {hutangList.filter(h => h.status !== 'LUNAS').map((h) => (
                    <option key={h.id_hutang} value={h.id_hutang}>{h.no_invoice} - {h.supplier_name} (Sisa: Rp {h.sisa_pembayaran.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              {selectedHutang && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Supplier:</span>
                    <span className="font-bold text-slate-800">{selectedHutang.supplier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Sisa Hutang:</span>
                    <span className="font-mono font-bold text-red-600">Rp {selectedHutang.sisa_pembayaran.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Metode Pembayaran</label>
                  <select
                    value={metodeBayar}
                    onChange={(e) => setMetodeBayar(e.target.value as 'TRANSFER' | 'KAS_KECIL' | 'GIRO')}
                    className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                    required
                  >
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="KAS_KECIL">Kas Kecil</option>
                    <option value="GIRO">Giro / Cek</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Diajukan (IDR)</label>
                  <Input
                    type="number"
                    value={jumlahBayarPengajuan || ''}
                    onChange={(e) => setJumlahBayarPengajuan(Number(e.target.value))}
                    max={selectedHutang?.sisa_pembayaran || 0}
                    className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Keterangan / Alasan Diajukan</label>
                <textarea
                  value={keteranganPengajuan}
                  onChange={(e) => setKeteranganPengajuan(e.target.value)}
                  className="w-full min-h-[80px] p-3 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 mt-1"
                  placeholder="Contoh: Pelunasan sisa pembelian bahan kemasan Cikande"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsRequestOpen(false)}
                  variant="ghost"
                  disabled={loading}
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !selectedHutang}
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer disabled:opacity-75 flex items-center justify-center gap-1.5"
                >
                  {loading && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
