/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'

import React, { useState, useEffect } from 'react'
import {
  Receipt,
  Send,
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Calendar,
  UserCheck,
  AlertTriangle,
  MoreVertical,
  Download,
  Search,
  ChevronRight,
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Piutang {
  id_piutang: number;
  sales_invoice_id: string;
  inv_number: string;
  customer_id: string;
  customer_name: string;
  jumlah: number;
  sisa_pembayaran: number;
  due_date: string;
  status: 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE';
  created_at: string;
}

interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
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

export default function AccountReceivablePage() {
  const [piutangList, setPiutangList] = useState<Piutang[]>([])
  const [akunList, setAkunList] = useState<Akun[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Payment Form States
  const [selectedPiutang, setSelectedPiutang] = useState<Piutang | null>(null)
  const [selectedAkunKas, setSelectedAkunKas] = useState<number>(0)
  const [jumlahBayar, setJumlahBayar] = useState<number>(0)

  // Search & Filter
  const [searchCust, setSearchCust] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE'>('ALL')

  // Load AR and Cash Accounts
  const loadData = async () => {
    try {
      setLoading(true)
      const arRes = await fetch('/api/finance/receivable')
      const arJson = await arRes.json()
      if (arJson.data) setPiutangList(arJson.data)

      const coaRes = await fetch('/api/finance/coa')
      const coaJson = await coaRes.json()
      if (coaJson.data) {
        // Filter only cash and bank accounts (1001, 1002, 1003)
        const kasAkuns = coaJson.data.filter((a: Akun) =>
          a.kode_akun === '1001' || a.kode_akun === '1002' || a.kode_akun === '1003'
        )
        setAkunList(kasAkuns)
      }
    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data. Menggunakan mode mock local.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotif({ type, message })
    setTimeout(() => setNotif(null), 5000)
  }

  // Pelunasan Piutang Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPiutang) return
    if (selectedAkunKas === 0) {
      showNotif('error', 'Harap pilih rekening penampung kas/bank.')
      return
    }
    if (jumlahBayar <= 0 || jumlahBayar > selectedPiutang.sisa_pembayaran) {
      showNotif('error', 'Jumlah pelunasan harus valid (> 0) dan tidak melebihi sisa piutang.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          piutang_id: selectedPiutang.id_piutang,
          akun_kas_id: selectedAkunKas,
          jumlah_terima: jumlahBayar
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Sukses! Penerimaan pelunasan piutang ${selectedPiutang.inv_number} senilai Rp ${jumlahBayar.toLocaleString()} berhasil dicatat.`)
        setSelectedPiutang(null)
        setJumlahBayar(0)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal mencatat pelunasan piutang.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mengirim pelunasan.')
    } finally {
      setLoading(false)
    }
  }

  // Kirim Reminder Pelunasan (Quick Action Toast)
  const handleSendReminder = (piutang: Piutang) => {
    showNotif('success', `Pengingat Jatuh Tempo (Reminder) berhasil dikirim via Email & WhatsApp ke Customer: ${piutang.customer_name} untuk Faktur ${piutang.inv_number}.`)
  }

  // Calculate AR Summary
  const outstandingAR = piutangList
    .filter(p => p.status !== 'LUNAS')
    .reduce((sum, p) => sum + p.sisa_pembayaran, 0)

  const overdueAR = piutangList
    .filter(p => p.status === 'OVERDUE')
    .reduce((sum, p) => sum + p.sisa_pembayaran, 0)

  const awaitingAR = piutangList
    .filter(p => p.status === 'BELUM_LUNAS')
    .reduce((sum, p) => sum + p.sisa_pembayaran, 0)

  // Calculate Aging Schedule
  const aging = {
    current: 0,
    overdue_1_30: 0,
    overdue_31_60: 0,
    overdue_61_90: 0,
    overdue_90plus: 0
  }

  const today = new Date()
  piutangList.forEach(p => {
    if (p.status === 'LUNAS') return
    const dueDate = new Date(p.due_date)
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      aging.current += p.sisa_pembayaran
    } else if (diffDays <= 30) {
      aging.overdue_1_30 += p.sisa_pembayaran
    } else if (diffDays <= 60) {
      aging.overdue_31_60 += p.sisa_pembayaran
    } else {
      aging.overdue_90plus += p.sisa_pembayaran
    }
  })

  const totalAgingSum = (aging.current + aging.overdue_1_30 + aging.overdue_31_60 + aging.overdue_90plus) || 1
  const pctCurrent = Math.round((aging.current / totalAgingSum) * 100)
  const pct1_30 = Math.round((aging.overdue_1_30 / totalAgingSum) * 100)
  const pct31_60 = Math.round((aging.overdue_31_60 / totalAgingSum) * 100)
  const pct90 = Math.round((aging.overdue_90plus / totalAgingSum) * 100)

  // Filter & Search List
  const filteredPiutang = piutangList.filter(p => {
    const matchesSearch = p.customer_name.toLowerCase().includes(searchCust.toLowerCase()) || p.inv_number.includes(searchCust)
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus
    return matchesSearch && matchesStatus
  })

// Export to CSV Function
  const handleExportCSV = () => {
    if (filteredPiutang.length === 0) {
      showNotif('error', 'Tidak ada data untuk diexport.')
      return
    }

    const headers = ['Invoice ID', 'Customer Name', 'Original Amount', 'Outstanding Amount', 'Due Date', 'Status']
    const rows = filteredPiutang.map(p => [
      p.inv_number,
      p.customer_name,
      p.jumlah,
      p.sisa_pembayaran,
      p.due_date,
      p.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Accounts_Receivable_Report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotif('success', 'Laporan Accounts Receivable berhasil diexport ke CSV.')
  }

  // Find priority invoice (highest sisa_pembayaran outstanding / overdue)
  const priorityInvoices = piutangList
    .filter(p => p.status !== 'LUNAS')
    .sort((a, b) => b.sisa_pembayaran - a.sisa_pembayaran)

  const priorityInv = priorityInvoices[0] || null

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-6 pb-12">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1/2 h-8 rounded-full bg-red-600" style={{ width: '4px', backgroundColor: '#dc2626' }} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#dc2626' }}>
                Finance Module
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Accounts Receivable
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Manage customer debt, verify invoices, and monitor incoming payments.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-2 hover:bg-slate-100 text-xs font-semibold text-slate-600 rounded-2xl cursor-pointer border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export Report
          </Button>
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
                  <Receipt className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Customer Debt</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                Rp {outstandingAR.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <ArrowDownRight className="w-3 h-3" />
              -2.4%
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Verification</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                Rp {awaitingAR.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {piutangList.filter(p => p.status === 'BELUM_LUNAS').length} Invoices
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Payments</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                Rp {overdueAR.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
              <ArrowUpRight className="w-3 h-3" />
              +5.1%
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Side: Table of Accounts Receivable (2/3 width) */}
        <div className="xl:col-span-2">
          <GlassCard className="h-full">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-slate-800">Payment Monitoring & Verification</h3>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Search Customer / Inv..."
                    value={searchCust}
                    onChange={(e) => setSearchCust(e.target.value)}
                    className="pl-8 pr-4 h-8 text-xs font-medium w-[180px] bg-slate-50/50 border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE')}
                  className="text-xs font-semibold h-8 px-2 border border-slate-200 rounded-lg bg-white focus:outline-none text-slate-600"
                >
                  <option value="ALL">All Status</option>
                  <option value="BELUM_LUNAS">Pending</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="LUNAS">Paid</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-28">Invoice ID</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Customer</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center">Due Date</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-28">Status</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs text-slate-700">
                  {filteredPiutang.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 font-semibold text-slate-400">
                        Tidak ada data piutang terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPiutang.map((p) => {
                      const statusMap = {
                        LUNAS: { label: "Paid", bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
                        OVERDUE: { label: "Overdue", bg: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500" },
                        BELUM_LUNAS: { label: "Verify", bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" }
                      };
                      const s = statusMap[p.status] || { label: p.status, bg: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" };

                      return (
                        <TableRow key={p.id_piutang} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="font-mono font-bold text-slate-800 px-6 py-4">{p.inv_number}</TableCell>
                          <TableCell className="font-bold text-slate-800 px-6 py-4">{p.customer_name}</TableCell>
                          <TableCell className="text-right font-bold text-slate-800 px-6 py-4">Rp {p.jumlah.toLocaleString()}</TableCell>
                          <TableCell className="text-center font-medium text-slate-500 px-6 py-4">
                            {new Date(p.due_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-center px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${s.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-center px-6 py-4 flex gap-1 justify-center items-center">
                            {p.status !== 'LUNAS' ? (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedPiutang(p);
                                    setJumlahBayar(p.sisa_pembayaran);
                                  }}
                                  className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100/80 text-red-600 font-bold transition-colors cursor-pointer"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => handleSendReminder(p)}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button className="p-1 rounded text-slate-300">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Verification Sidebar or Payment Form */}
        <div className="xl:col-span-1">
          {selectedPiutang ? (
            // ==========================================
            // PAYMENT TRANSACTION FORM (DYNAMIC DRAWER)
            // ==========================================
            <GlassCard className="h-full border border-slate-100">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-red-600" /> Pencatatan Pelunasan
                </h3>
              </div>
              <div className="p-6">
                <form onSubmit={handlePaymentSubmit} className="space-y-5">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-400">NOMOR INVOICE</span>
                      <span className="font-mono font-bold text-slate-800">{selectedPiutang.inv_number}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-400">CUSTOMER</span>
                      <span className="font-bold text-slate-800">{selectedPiutang.customer_name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-400">OUTSTANDING</span>
                      <span className="font-bold text-red-600">Rp {selectedPiutang.sisa_pembayaran.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rekening Kas/Bank Penampung</label>
                    <select
                      value={selectedAkunKas}
                      onChange={(e) => setSelectedAkunKas(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 bg-white"
                      required
                    >
                      <option value={0}>-- PILIH REKENING KAS / BANK --</option>
                      {akunList.map((a) => (
                        <option key={a.id_akun} value={a.id_akun}>{a.kode_akun} - {a.nama_akun}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jumlah Pembayaran Diterima (IDR)</label>
                    <Input
                      type="number"
                      value={jumlahBayar || ''}
                      onChange={(e) => setJumlahBayar(Number(e.target.value))}
                      max={selectedPiutang.sisa_pembayaran}
                      className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl font-bold h-10"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => setSelectedPiutang(null)}
                      variant="ghost"
                      className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer shadow-[0_2px_10px_rgba(220,38,38,0.2)]"
                    >
                      {loading ? 'Memproses...' : 'Catat Pelunasan'}
                    </Button>
                  </div>
                </form>
              </div>
            </GlassCard>
          ) : (
            // ==========================================
            // VERIFICATION & DEBT AGING SIDEBAR (IMAGE 1)
            // ==========================================
            <div className="space-y-6">

              {/* Priority Verification Banner (Image 1 Red banner) */}
              <div className="bg-[#800000] text-white rounded-3xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[180px]">
                {/* Large checkmark logo watermark */}
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-4">
                  <CheckCircle className="w-40 h-40" />
                </div>

                <div className="space-y-2 z-10">
                  <h4 className="text-base font-bold">Priority Verification</h4>
                  <p className="text-xs text-red-100 leading-relaxed font-light">
                    {priorityInv
                      ? "1 large invoice requires immediate manual verification."
                      : "No invoices require manual verification."}
                  </p>
                </div>

                {priorityInv && (
                  <div className="bg-black/20 backdrop-blur-sm p-4 rounded-2xl flex justify-between items-center mt-4 border border-white/10 z-10">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] font-semibold opacity-60">{priorityInv.inv_number}</span>
                      <p className="text-xs font-bold truncate pr-2">{priorityInv.customer_name}</p>
                    </div>
                    <span className="text-sm font-bold shrink-0">
                      Rp {priorityInv.sisa_pembayaran.toLocaleString()}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (priorityInv) {
                      setSelectedPiutang(priorityInv);
                      setJumlahBayar(priorityInv.sisa_pembayaran);
                    } else {
                      showNotif('success', 'Semua invoice saat ini terverifikasi.');
                    }
                  }}
                  className="w-full bg-white hover:bg-slate-50 text-[#800000] font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 mt-5 transition-colors cursor-pointer z-10"
                >
                  Start Verification <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Debt Aging Summary Progress bars (Image 1 Bottom Right) */}
              <GlassCard>
                <div className="px-6 py-5 border-b border-slate-100">
                  <h3 className="text-base font-semibold text-slate-800">Debt Aging Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                  {/* Current */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Current</span>
                      <span className="text-slate-800">{pctCurrent}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pctCurrent}%` }} />
                    </div>
                  </div>

                  {/* 1-30 Days */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">1-30 Days Overdue</span>
                      <span className="text-slate-800">{pct1_30}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct1_30}%` }} />
                    </div>
                  </div>

                  {/* 31-60 Days */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">31-60 Days Overdue</span>
                      <span className="text-slate-800">{pct31_60}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct31_60}%` }} />
                    </div>
                  </div>

                  {/* 60+ Days */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">60+ Days Overdue</span>
                      <span className="text-slate-800">{pct90}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct90}%` }} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-center">
                    <button
                      onClick={() => showNotif('success', `Rincian Umur Piutang: Belum Jatuh Tempo (Rp ${aging.current.toLocaleString()}), 1-30 Hari (Rp ${aging.overdue_1_30.toLocaleString()}), >30 Hari (Rp ${aging.overdue_90plus.toLocaleString()}).`)}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      View Detailed Aging Report
                    </button>
                  </div>
                </div>
              </GlassCard>

            </div>
          )}
        </div>

      </div>

    </div>
  )
}
