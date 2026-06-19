/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Coins, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle, 
  XCircle, 
  Play, 
  Search, 
  Filter, 
  ShieldCheck,
  Briefcase,
  X,
  Check,
  ChevronRight,
  Download,
  MoreVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AreaChart } from '@/components/shared/charts'

interface PermintaanPembayaran {
  id_permintaan: number;
  no_permintaan: string;
  hutang_id: string | number;
  jumlah_bayar: number;
  metode_pembayaran: 'TRANSFER' | 'KAS_KECIL' | 'GIRO';
  keterangan: string;
  status: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK' | 'TEREKSEKUSI';
  created_at: string;
  rejection_reason?: string;
  tr_hutang?: {
    no_invoice: string;
    supplier_name: string;
  };
}

interface TransaksiKas {
  id_transaksi_kas: number;
  no_transaksi: string;
  tipe: 'MASUK' | 'KELUAR';
  tanggal: string;
  jumlah: number;
  keterangan: string;
  akun_kas_id: number;
  akun_lawan_id: number;
  reference_id?: string;
  created_at?: string;
  transaction_date?: string;
}

interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
  saldo_berjalan: number;
}

interface ReconcilingEntry {
  id: number;
  type: string;
  amount: number;
  sender: string;
  ref: string;
  isCredit: boolean;
  verified: boolean;
  transaction_id?: number | string;
}

interface ReconcileInvoice {
  id_piutang?: number;
  inv_number?: string;
  customer_name?: string;
  jumlah?: number;
  sisa_pembayaran: number;
  status: string;
  ap_id?: number;
  no_invoice?: string;
  supplier_name?: string;
  ap_amount?: number;
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

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<'approvals' | 'history'>('approvals')
  
  // Mock Role Switcher for evaluation: MANAGEMENT vs TREASURY
  const [userRole, setUserRole] = useState<'MANAGEMENT' | 'TREASURY'>('TREASURY')
  
  const [permintaanList, setPermintaanList] = useState<PermintaanPembayaran[]>([])
  const [historyKasList, setHistoryKasList] = useState<TransaksiKas[]>([])
  const [rekeningList, setRekeningList] = useState<Akun[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filter states
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'NORMAL'>('ALL')

  // Bank Reconciliation states
  const [arList, setArList] = useState<ReconcileInvoice[]>([])
  const [apList, setApList] = useState<ReconcileInvoice[]>([])
  const [reconcilingEntry, setReconcilingEntry] = useState<ReconcilingEntry | null>(null)
  const [selectedReconcileInvoice, setSelectedReconcileInvoice] = useState<ReconcileInvoice | null>(null)
  const [reconcileBankAccountId, setReconcileBankAccountId] = useState<number>(0)

  // Rejection Dialog State
  const [rejectingPmt, setRejectingPmt] = useState<PermintaanPembayaran | null>(null)
  const [alasanTolak, setAlasanTolak] = useState('')

  // Execution State
  const [executingPmt, setExecutingPmt] = useState<PermintaanPembayaran | null>(null)
  const [selectedRekeningBayar, setSelectedRekeningBayar] = useState<number>(0)

  // Batch Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBatchExecuting, setIsBatchExecuting] = useState(false)

  // 30-Day Liquidity Forecast View: 'inflow' | 'outflow'
  const [chartView, setChartView] = useState<'inflow' | 'outflow'>('inflow')

  // Unverified cash entries mock state
  const [unverifiedCount, setUnverifiedCount] = useState(3)
  const [recentCashEntries, setRecentCashEntries] = useState([
    { id: 1, type: 'Wire Transfer In', amount: 420000000, sender: 'PT Indomarco Prismatama', ref: 'WT-9921', isCredit: true, verified: false },
    { id: 2, type: 'ACH Auto-Debit', amount: -156000000, sender: 'PT Gelora Karya Utama', ref: 'ACH-001', isCredit: false, verified: false },
    { id: 3, type: 'Check Deposit', amount: 365000000, sender: 'PT Sumber Alfaria Trijaya Tbk', ref: 'CHK-442', isCredit: true, verified: false },
  ])

  // Mock Liquidity Forecast Data (calibrated USD scale)
  const inflowData = [
    { label: 'Oct 01', value: 80000 },
    { label: 'Oct 05', value: 95000 },
    { label: 'Oct 10', value: 110000 },
    { label: 'Oct 15', value: 150000 },
    { label: 'Oct 20', value: 240000 },
    { label: 'Oct 25', value: 210000 },
    { label: 'Oct 31', value: 220000 },
  ]

  const outflowData = [
    { label: 'Oct 01', value: 120000 },
    { label: 'Oct 05', value: 105000 },
    { label: 'Oct 10', value: 95000 },
    { label: 'Oct 15', value: 80000 },
    { label: 'Oct 20', value: 70000 },
    { label: 'Oct 25', value: 90000 },
    { label: 'Oct 31', value: 110000 },
  ]

  // Load Treasury Data
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get COA (Rekening Kas/Bank)
      const coaRes = await fetch(`/api/finance/coa?mock_role=${userRole}`)
      const coaJson = await coaRes.json()
      if (coaJson.data) {
        const cashRekening = coaJson.data.filter((a: Akun) => 
          a.kode_akun === '1001' || a.kode_akun === '1002' || a.kode_akun === '1003'
        )
        setRekeningList(cashRekening)
      }

      // Get Payment Requests
      const pmtRes = await fetch(`/api/finance/treasury?mock_role=${userRole}`)
      const pmtJson = await pmtRes.json()
      if (pmtJson.data) setPermintaanList(pmtJson.data)

      // Get Cash Flow History
      const histRes = await fetch(`/api/finance/treasury?mode=history&mock_role=${userRole}`)
      const histJson = await histRes.json()
      if (histJson.data) setHistoryKasList(histJson.data)

      // Get AR list for reconciliation
      const arRes = await fetch(`/api/finance/receivable?mock_role=${userRole}`)
      const arJson = await arRes.json()
      if (arJson.data) {
        const data = arJson.data as ReconcileInvoice[]
        setArList(data.filter((x) => x.status !== 'LUNAS'))
      }

      // Get AP list for reconciliation
      const apRes = await fetch(`/api/finance/payable?mock_role=${userRole}`)
      const apJson = await apRes.json()
      if (apJson.data) {
        const data = apJson.data as ReconcileInvoice[]
        setApList(data.filter((x) => x.status !== 'LUNAS'))
      }

      // Get unverified cash entries from database
      const unverifiedRes = await fetch(`/api/finance/treasury?mode=unverified&mock_role=${userRole}`)
      const unverifiedJson = await unverifiedRes.json()
      if (unverifiedJson.data) {
        const data = unverifiedJson.data as ReconcilingEntry[]
        setRecentCashEntries(data)
        setUnverifiedCount(data.filter((x) => !x.verified).length)
      }

      // Reset selection on reload
      setSelectedIds([])
    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data. Menjalankan mode mock offline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userRole])

  useEffect(() => {
    if (reconcilingEntry) {
      setSelectedReconcileInvoice(null)
      setReconcileBankAccountId(0)
    }
  }, [reconcilingEntry])

  const showNotif = (type: 'success' | 'error', message: string) => {
    setNotif({ type, message })
    setTimeout(() => setNotif(null), 5000)
  }

  // Management Approve Action
  const handleApprove = async (pmtId: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          permintaan_id: pmtId,
          status: 'DISETUJUI'
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Pengajuan pembayaran disetujui! Status permintaan kini disetujui.`)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal menyetujui pengajuan.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat menyetujui pengajuan.')
    } finally {
      setLoading(false)
    }
  }

  // Management Reject Action
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingPmt) return
    if (!alasanTolak.trim()) {
      showNotif('error', 'Alasan penolakan wajib diisi.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          permintaan_id: rejectingPmt.id_permintaan,
          status: 'DITOLAK',
          alasan: alasanTolak
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Pengajuan pembayaran ditolak. Status berhasil diperbarui.`)
        setRejectingPmt(null)
        setAlasanTolak('')
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal menolak pengajuan.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat menolak pengajuan.')
    } finally {
      setLoading(false)
    }
  }

  // Treasury Single Execute Action with Safety Gate
  const handleExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!executingPmt) return
    if (selectedRekeningBayar === 0) {
      showNotif('error', 'Pilih rekening kas/bank pembayar.')
      return
    }

    // Client-side Safety Gate: check balance sufficiency
    const selectedRekening = rekeningList.find(r => r.id_akun === selectedRekeningBayar)
    if (selectedRekening && selectedRekening.saldo_berjalan < executingPmt.jumlah_bayar) {
      showNotif('error', `Gagal: Saldo ${selectedRekening.nama_akun} (${formatCalibrated(selectedRekening.saldo_berjalan)}) tidak mencukupi untuk pembayaran sebesar ${formatCalibrated(executingPmt.jumlah_bayar)}.`)
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          permintaan_id: executingPmt.id_permintaan,
          akun_kas_id: selectedRekeningBayar
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Eksekusi Pembayaran Sukses! Rekening kas terdebet dan entri jurnal Buku Besar otomatis tercatat.`)
        setExecutingPmt(null)
        setSelectedRekeningBayar(0)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal mengeksekusi pembayaran.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat eksekusi kas.')
    } finally {
      setLoading(false)
    }
  }

  // Treasury Batch Execute Action with Safety Gate
  const handleBatchExecuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0) return
    if (selectedRekeningBayar === 0) {
      showNotif('error', 'Pilih rekening kas/bank pembayar.')
      return
    }

    // Calculate total batch amount
    const batchTotal = permintaanList
      .filter(p => selectedIds.includes(p.id_permintaan))
      .reduce((sum, p) => sum + p.jumlah_bayar, 0)

    // Client-side Safety Gate: check balance sufficiency for total batch
    const selectedRekening = rekeningList.find(r => r.id_akun === selectedRekeningBayar)
    if (selectedRekening && selectedRekening.saldo_berjalan < batchTotal) {
      showNotif('error', `Gagal: Saldo ${selectedRekening.nama_akun} (${formatCalibrated(selectedRekening.saldo_berjalan)}) tidak mencukupi untuk total batch sebesar ${formatCalibrated(batchTotal)}.`)
      return
    }

    try {
      setLoading(true)
      let successCount = 0
      const errors: string[] = []
      
      for (const id of selectedIds) {
        const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'execute',
            permintaan_id: id,
            akun_kas_id: selectedRekeningBayar
          })
        })
        const json = await res.json()
        if (res.ok) {
          successCount++
        } else {
          errors.push(`ID ${id}: ${json.error || 'Gagal'}`)
        }
      }

      if (successCount > 0) {
        showNotif('success', `Berhasil mengeksekusi ${successCount} pembayaran! Rekening kas terdebet dan entri jurnal Buku Besar dicatat otomatis.`)
        setSelectedIds([])
        setIsBatchExecuting(false)
        setSelectedRekeningBayar(0)
        loadData()
      }
      if (errors.length > 0) {
        showNotif('error', `Gagal mengeksekusi beberapa pembayaran: ${errors.join(', ')}`)
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat eksekusi batch.')
    } finally {
      setLoading(false)
    }
  }

  // Verify & Reconcile Recent Cash Entry Action
  const handleVerifyEntry = async (entry: ReconcilingEntry, invoiceId: string | number, selectedKasId: number) => {
    if (selectedKasId === 0) {
      showNotif('error', 'Pilih rekening kas/bank pembayar/penerima.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/finance/treasury?mock_role=${userRole}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reconcile',
          transaction_id: entry.transaction_id || entry.id,
          type: entry.isCredit ? 'inflow' : 'outflow',
          invoice_id: invoiceId,
          amount: Math.abs(entry.amount),
          akun_kas_id: selectedKasId
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Sukses: Arus kas berhasil direkonsiliasi dengan invoice dan jurnal terposting!`)
        // Update local mock list state
        setRecentCashEntries(prev => prev.map(item => item.id === entry.id ? { ...item, verified: true } : item))
        setUnverifiedCount(c => Math.max(0, c - 1))
        setReconcilingEntry(null)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal memproses rekonsiliasi.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mengirim data rekonsiliasi.')
    } finally {
      setLoading(false)
    }
  }

  // Get Cash / Bank Rekening Info
  const kasUtama = rekeningList.find(r => r.kode_akun === '1001')?.saldo_berjalan || 0
  const bankMandiri = rekeningList.find(r => r.kode_akun === '1002')?.saldo_berjalan || 0
  const bankBCA = rekeningList.find(r => r.kode_akun === '1003')?.saldo_berjalan || 0

  // Format Currency Calibrated to IDR (Rupiah) instead of USD
  const formatCalibrated = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }

  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }

  // Filter approved payments ready for execution (status: DISETUJUI)
  const approvedPayments = permintaanList
    .filter(p => p.status === 'DISETUJUI')
    .filter(p => {
      const supplierMatch = (p.tr_hutang?.supplier_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const invoiceMatch = (p.tr_hutang?.no_invoice || '').toLowerCase().includes(searchQuery.toLowerCase())
      const priority = getPriority(p.jumlah_bayar)
      const priorityMatch = priorityFilter === 'ALL' || priority === priorityFilter
      return (supplierMatch || invoiceMatch) && priorityMatch
    })

  // Filter pending approvals (status: MENUNGGU_PERSETUJUAN)
  const pendingPayments = permintaanList
    .filter(p => p.status === 'MENUNGGU_PERSETUJUAN')
    .filter(p => {
      const supplierMatch = (p.tr_hutang?.supplier_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      const invoiceMatch = (p.tr_hutang?.no_invoice || '').toLowerCase().includes(searchQuery.toLowerCase())
      const priority = getPriority(p.jumlah_bayar)
      const priorityMatch = priorityFilter === 'ALL' || priority === priorityFilter
      return (supplierMatch || invoiceMatch) && priorityMatch
    })

  // Checkboxes select helpers
  const handleSelectAll = (checked: boolean, items: PermintaanPembayaran[]) => {
    if (checked) {
      setSelectedIds(items.map(p => p.id_permintaan))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (checked: boolean, id: number) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id))
    }
  }

  // Calculate Batch Total
  const batchTotal = permintaanList
    .filter(p => selectedIds.includes(p.id_permintaan))
    .reduce((sum, p) => sum + p.jumlah_bayar, 0)

  // Determine Priority (High vs Normal) based on amount
  function getPriority(amount: number) {
    return amount >= 150000000 ? 'HIGH' : 'NORMAL'
  }

  // Format Due Date
  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      return <span className="text-red-600 font-semibold">Today</span>
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-6 pb-12">
      
      {/* Header & Simulation Switcher Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pt-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-red-600" style={{ width: '4px', backgroundColor: '#dc2626' }} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#dc2626' }}>
                Finance Module
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Treasury Management
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Monitor liquidity, verify cash entries, and execute supplier payments.
          </p>
        </div>

        {/* Buttons & Simulation Switcher Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start md:self-auto">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-1.5 border-slate-200 text-slate-700 font-semibold rounded-xl text-xs px-3 py-1.5 h-auto cursor-pointer"
              onClick={() => showNotif('success', 'Bank statement statement exported successfully!')}
            >
              <Download className="w-3.5 h-3.5" /> Export Statement
            </Button>
            <Button 
              className="flex items-center gap-1.5 text-white bg-red-700 hover:bg-red-800 font-semibold rounded-xl text-xs px-3 py-1.5 h-auto cursor-pointer"
              onClick={() => {
                if (selectedIds.length > 0) {
                  setIsBatchExecuting(true)
                } else {
                  showNotif('error', 'Select one or more approved payments from the table below to run execution.')
                }
              }}
            >
              <Play className="w-3.5 h-3.5 fill-white text-white" /> Execute Payment Run
            </Button>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1.5 pr-0.5 flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3 text-blue-600" /> Role:
            </span>
            <button
              onClick={() => setUserRole('MANAGEMENT')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-xl transition-all cursor-pointer ${
                userRole === 'MANAGEMENT' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Management
            </button>
            <button
              onClick={() => setUserRole('TREASURY')}
              className={`px-2 py-1 text-[10px] font-semibold rounded-xl transition-all cursor-pointer ${
                userRole === 'TREASURY' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Treasury
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all animate-in fade-in duration-300 ${
          notif.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Consolidated Cash */}
        <GlassCard className="relative hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-50 border border-red-100/60 flex items-center justify-center">
                  <Wallet className="w-4.5 h-4.5 text-red-600" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Consolidated Cash</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                <ArrowUpRight className="w-3 h-3" /> +3.2%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                {formatCalibrated(kasUtama + bankMandiri + bankBCA)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Consolidated from 3 active cash/bank accounts</p>
            </div>
            {/* Sparkline SVG */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-8">
                <defs>
                  <linearGradient id="trend-consolidated" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#EE4444" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#EE4444" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  points="0,15 20,14 40,16 60,11 80,10 100,5"
                  fill="none"
                  stroke="#EE4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polygon
                  points="0,20 0,15 20,14 40,16 60,11 80,10 100,5 100,20"
                  fill="url(#trend-consolidated)"
                />
              </svg>
            </div>
          </CardContent>
        </GlassCard>

        {/* Card 2: Available Operating Cash */}
        <GlassCard className="relative hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-50 border border-red-100/60 flex items-center justify-center">
                  <Coins className="w-4.5 h-4.5 text-red-600" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Operating Cash</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">
                <ArrowDownRight className="w-3 h-3" /> -1.5%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                {formatCalibrated(bankMandiri - 299500000)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Directly accessible operational balance</p>
            </div>
            {/* Sparkline SVG */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-8">
                <defs>
                  <linearGradient id="trend-operating" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#EE4444" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#EE4444" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polyline
                  points="0,5 20,6 40,8 60,11 80,12 100,15"
                  fill="none"
                  stroke="#EE4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polygon
                  points="0,20 0,5 20,6 40,8 60,11 80,12 100,15 100,20"
                  fill="url(#trend-operating)"
                />
              </svg>
            </div>
          </CardContent>
        </GlassCard>

        {/* Card 3: Unverified Cash Entries */}
        <GlassCard className="relative hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100/60 flex items-center justify-center">
                  <Briefcase className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unverified Cash Entries</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                Needs Action
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                {unverifiedCount} <span className="text-sm font-medium text-slate-400 font-sans">items</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Pending reconciliation confirmation</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <button 
                onClick={() => {
                  const element = document.getElementById('recent-cash-entries-panel');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                Review Entries <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
          <button 
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'approvals' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dashboard & Eksekusi
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Buku Kas (Inflow & Outflow)
          </button>
        </div>

        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Active Role: <span className="font-bold text-slate-700">{userRole}</span>
        </div>
      </div>

      {/* TAB 1: DASHBOARD & EXECUTION */}
      {activeTab === 'approvals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Liquidity Forecast, Management approvals, Approved Payments Table */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Liquidity Forecast Card */}
            <GlassCard className="border border-slate-100">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">30-Day Liquidity Forecast</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Estimated cash flow trends for next 30 days.</p>
                </div>
                
                {/* Chart Toggle Inflow / Outflow */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                  <button
                    onClick={() => setChartView('inflow')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      chartView === 'inflow' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Inflow
                  </button>
                  <button
                    onClick={() => setChartView('outflow')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      chartView === 'outflow' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Outflow
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <AreaChart
                  data={chartView === 'inflow' ? inflowData : outflowData}
                  color="#dc2626"
                  height={300}
                  valueFormatter={(v) => 'Rp ' + (v * 10000).toLocaleString('id-ID')}
                />
              </div>
            </GlassCard>


            {/* 1. Payment Requests Awaiting Approval */}
            <GlassCard className="border border-slate-100 mb-6">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Payment Requests Awaiting Management Approval</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Review and authorize supplier payment requests.</p>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                  {pendingPayments.length} Pending
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/20">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Supplier Name</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3">Invoice Ref</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3">Date Requested</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3 text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-slate-700">
                    {pendingPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 font-semibold text-slate-400">
                          Tidak ada pengajuan pembayaran yang menunggu persetujuan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingPayments.map((p) => (
                        <TableRow key={p.id_permintaan} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="px-6 py-4 font-bold text-slate-800">
                            {p.tr_hutang?.supplier_name || 'Supplier'}
                          </TableCell>
                          <TableCell className="px-4 py-4 font-mono font-medium text-slate-500">
                            {p.tr_hutang?.no_invoice || '—'}
                          </TableCell>
                          <TableCell className="px-4 py-4 font-medium text-slate-600">
                            {new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right font-mono font-bold text-slate-800">
                            {formatCalibrated(p.jumlah_bayar)}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-right">
                            {userRole === 'MANAGEMENT' ? (
                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => handleApprove(p.id_permintaan)}
                                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectingPmt(p)}
                                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-400 italic">
                                🔒 Awaiting Management Approval
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>

            {/* Approved Payments Table Card */}
            <GlassCard className="border border-slate-100">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Approved Payments Ready for Execution</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Select invoices to include in the next payment batch.</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilterOptions(!showFilterOptions)}
                  className={`flex items-center gap-1.5 border-slate-200 text-slate-700 font-semibold rounded-xl text-xs px-3 py-1.5 h-auto cursor-pointer transition-colors ${
                    showFilterOptions ? 'bg-slate-100 border-slate-300' : ''
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" /> Filter
                </Button>
              </div>

              {showFilterOptions && (
                <div className="px-6 py-3 bg-slate-50/30 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-200">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Cari Supplier atau Ref Invoice..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-8 text-xs rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Prioritas:</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                      {(['ALL', 'HIGH', 'NORMAL'] as const).map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => setPriorityFilter(pr)}
                          className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                            priorityFilter === pr
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {pr === 'ALL' ? 'Semua' : pr}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(searchQuery || priorityFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setPriorityFilter('ALL')
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-600 transition-colors whitespace-nowrap cursor-pointer hover:underline"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/20">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="w-12 px-6 py-3">
                        {userRole === 'TREASURY' && (
                          <input
                            type="checkbox"
                            checked={approvedPayments.length > 0 && selectedIds.length === approvedPayments.length}
                            onChange={(e) => handleSelectAll(e.target.checked, approvedPayments)}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                          />
                        )}
                      </TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3">Supplier Name</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3">Invoice Ref</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3">Due Date</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3 text-center">Priority</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3 text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-4 py-3 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-slate-700">
                    {approvedPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 font-semibold text-slate-400">
                          Tidak ada pengajuan pembayaran disetujui untuk dieksekusi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedPayments.map((p) => {
                        const isChecked = selectedIds.includes(p.id_permintaan);
                        const priority = getPriority(p.jumlah_bayar);
                        return (
                          <TableRow key={p.id_permintaan} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                            <TableCell className="px-6 py-4">
                              {userRole === 'TREASURY' && (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleSelectRow(e.target.checked, p.id_permintaan)}
                                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                                />
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-4 font-bold text-slate-800">
                              {p.tr_hutang?.supplier_name || 'Supplier'}
                            </TableCell>
                            <TableCell className="px-4 py-4 font-mono font-medium text-slate-500">
                              {p.tr_hutang?.no_invoice || '—'}
                            </TableCell>
                            <TableCell className="px-4 py-4 font-medium text-slate-600">
                              {formatDueDate(p.created_at)}
                            </TableCell>
                            <TableCell className="px-4 py-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                                priority === 'HIGH' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {priority}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-4 text-right font-mono font-bold text-slate-800">
                              {formatCalibrated(p.jumlah_bayar)}
                            </TableCell>
                            <TableCell className="px-4 py-4 text-right">
                              {userRole === 'TREASURY' ? (
                                <button
                                  onClick={() => {
                                    setExecutingPmt(p)
                                    setSelectedRekeningBayar(0)
                                  }}
                                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                                >
                                  Pay Now
                                </button>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400 italic">
                                  🔒 Awaiting Treasury Execution
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Batch Processing Footer Summary */}
              {userRole === 'TREASURY' && selectedIds.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="text-xs font-semibold text-slate-600">
                    {selectedIds.length} {selectedIds.length === 1 ? 'invoice' : 'invoices'} selected for execution.
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-bold text-slate-800">
                      Batch Total: <span className="font-mono text-base font-extrabold text-red-700">{formatCalibrated(batchTotal)}</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsBatchExecuting(true)
                        setSelectedRekeningBayar(0)
                      }}
                      className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-md shadow-red-700/10 transition-all cursor-pointer"
                    >
                      Process Batch
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right Column: Recent Cash Entries */}
          <div id="recent-cash-entries-panel" className="space-y-6">
            <GlassCard className="border border-slate-100">
              <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Recent Cash Entries</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Direct bank inflows & outflows.</p>
                </div>
                <button className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {recentCashEntries.map((entry) => (
                  <div key={entry.id} className="p-3.5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {entry.isCredit ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-slate-800 truncate">{entry.type}</p>
                        <span className={`font-mono text-xs font-bold ${
                          entry.isCredit ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {entry.isCredit ? '+' : '-'} {formatRupiah(Math.abs(entry.amount))}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{entry.sender} • Ref: {entry.ref}</p>
                      
                      <div className="pt-1 flex items-center">
                        {entry.verified ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : userRole === 'TREASURY' ? (
                          <button
                            onClick={() => setReconcilingEntry(entry)}
                            className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5 hover:underline cursor-pointer"
                          >
                            Verify Entry <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 italic flex items-center gap-1">
                            🔒 Awaiting Treasury Verification
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY KAS (CASH BOOK) */}
      {activeTab === 'history' && (
        <GlassCard className="border border-slate-100">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Buku Kas (Inflow & Outflow Log)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Semua mutasi saldo kas dan bank yang teregistrasi di sistem.</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {historyKasList.length} Transaksi
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/20">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-36 text-center">No Transaksi</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-28">Tanggal</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-24">Tipe</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Keterangan Arus Kas</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-32">Ref Dokumen</TableHead>
                  <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-44">Jumlah Kas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs text-slate-700">
                {historyKasList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 font-semibold text-slate-400">
                      Belum ada transaksi kas tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyKasList.map((t) => (
                    <TableRow key={t.id_transaksi_kas} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                      <TableCell className="font-mono font-bold text-slate-800 px-6 py-4 text-center">{t.no_transaksi}</TableCell>
                      <TableCell className="text-center font-medium text-slate-500 px-6 py-4">
                        {new Date(t.tanggal || t.created_at || t.transaction_date || '').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-center px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${t.tipe === 'MASUK' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {t.tipe === 'MASUK' ? 'INFLOW' : 'OUTFLOW'}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 px-6 py-4">{t.keterangan}</TableCell>
                      <TableCell className="text-center font-mono font-semibold text-slate-400 px-6 py-4">{t.reference_id || '—'}</TableCell>
                      <TableCell className={`text-right font-mono font-bold text-sm px-6 py-4 ${t.tipe === 'MASUK' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.tipe === 'MASUK' ? '+' : '-'} {formatCalibrated(t.jumlah)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      )}

      {/* =====================================================================
          OVERLAY MODALS
          ===================================================================== */}

      {/* 1. REJECTION FORM DIALOG */}
      {rejectingPmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Tolak Pengajuan Pembayaran
              </h3>
              <button 
                onClick={() => setRejectingPmt(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-1 text-xs">
                <p className="font-bold text-slate-800">No Pengajuan: {rejectingPmt.no_permintaan}</p>
                <p className="font-semibold text-slate-700">Jumlah: {formatCalibrated(rejectingPmt.jumlah_bayar)}</p>
                <p className="text-slate-500">Supplier: {rejectingPmt.tr_hutang?.supplier_name}</p>
              </div>
              
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Alasan Penolakan</label>
                <textarea 
                  value={alasanTolak} 
                  onChange={(e) => setAlasanTolak(e.target.value)} 
                  className="w-full min-h-[80px] p-3 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 mt-1"
                  placeholder="Masukkan alasan menolak pengajuan pembayaran ini..."
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setRejectingPmt(null)} 
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                >
                  Tolak Pengajuan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SINGLE EXECUTION FORM DIALOG */}
      {executingPmt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-emerald-600 flex items-center gap-2">
                <Play className="w-5 h-5 fill-emerald-600 text-emerald-600" /> Eksekusi Pengeluaran Kas
              </h3>
              <button 
                onClick={() => setExecutingPmt(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteSubmit} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-1 text-xs">
                <p className="font-bold text-slate-800">No Pengajuan: {executingPmt.no_permintaan}</p>
                <p className="font-semibold text-slate-700">Jumlah: {formatCalibrated(executingPmt.jumlah_bayar)} ({formatRupiah(executingPmt.jumlah_bayar)})</p>
                <p className="text-slate-500">Supplier: {executingPmt.tr_hutang?.supplier_name}</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Rekening Kas/Bank Pembayar</label>
                <select
                  value={selectedRekeningBayar}
                  onChange={(e) => setSelectedRekeningBayar(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  <option value={0}>-- PILIH SUMBER REKENING --</option>
                  {rekeningList.map((r) => (
                    <option key={r.id_akun} value={r.id_akun}>
                      {r.kode_akun} - {r.nama_akun} (Saldo: {formatCalibrated(r.saldo_berjalan)} / {formatRupiah(r.saldo_berjalan)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setExecutingPmt(null)} 
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-md"
                >
                  Bayar Sekarang
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. BATCH EXECUTION FORM DIALOG */}
      {isBatchExecuting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-emerald-600 flex items-center gap-2">
                <Play className="w-5 h-5 fill-emerald-600 text-emerald-600" /> Eksekusi Batch Pengeluaran Kas
              </h3>
              <button 
                onClick={() => setIsBatchExecuting(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchExecuteSubmit} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-1 text-xs">
                <p className="font-bold text-slate-800">Jumlah Invoice Terpilih: {selectedIds.length}</p>
                <p className="font-semibold text-slate-700">Total Pembayaran: {formatCalibrated(batchTotal)} ({formatRupiah(batchTotal)})</p>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Rekening Kas/Bank Pembayar</label>
                <select
                  value={selectedRekeningBayar}
                  onChange={(e) => setSelectedRekeningBayar(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  <option value={0}>-- PILIH SUMBER REKENING --</option>
                  {rekeningList.map((r) => (
                    <option key={r.id_akun} value={r.id_akun}>
                      {r.kode_akun} - {r.nama_akun} (Saldo: {formatCalibrated(r.saldo_berjalan)} / {formatRupiah(r.saldo_berjalan)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setIsBatchExecuting(false)} 
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-md"
                >
                  Eksekusi Batch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. BANK RECONCILIATION DIALOG */}
      {reconcilingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out] border border-slate-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-600 animate-pulse" /> Rekonsiliasi & Verifikasi Aliran Kas
              </h3>
              <button 
                onClick={() => setReconcilingEntry(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Cash Entry Card */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detail Mutasi Koran (Bank Feed)</h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold">Tipe Arus Kas:</span>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${reconcilingEntry.isCredit ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {reconcilingEntry.type} ({reconcilingEntry.isCredit ? 'KAS MASUK' : 'KAS KELUAR'})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Jumlah Mutasi:</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {formatRupiah(Math.abs(reconcilingEntry.amount))}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Pengirim / Penerima:</span>
                    <p className="font-bold text-slate-800 mt-0.5">{reconcilingEntry.sender}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold">Referensi Bank:</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">{reconcilingEntry.ref}</p>
                  </div>
                </div>
              </div>

              {/* Bank/Cash Account Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Rekening Kas/Bank Pencatatan</label>
                <select
                  value={reconcileBankAccountId}
                  onChange={(e) => setReconcileBankAccountId(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-red-500 transition-colors"
                  required
                >
                  <option value={0}>-- PILIH REKENING KAS/BANK --</option>
                  {rekeningList.map((r) => (
                    <option key={r.id_akun} value={r.id_akun}>
                      {r.kode_akun} - {r.nama_akun} (Saldo: {formatCalibrated(r.saldo_berjalan)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Suggestions Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Daftar Invoice Outstanding ({reconcilingEntry.isCredit ? 'AR / Piutang' : 'AP / Hutang'})
                  </label>
                  <span className="text-[10px] text-red-600 bg-red-50/50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px]">Kecocokan Disorot</span>
                </div>
                
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[180px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-100">
                        <TableHead className="w-10 text-center py-2 px-3"></TableHead>
                        <TableHead className="font-semibold text-slate-400 text-[10px] py-2 px-3">No. Invoice</TableHead>
                        <TableHead className="font-semibold text-slate-400 text-[10px] py-2 px-3">Nama Mitra</TableHead>
                        <TableHead className="font-semibold text-slate-400 text-[10px] text-right py-2 px-3">Total Invoice</TableHead>
                        <TableHead className="font-semibold text-slate-400 text-[10px] text-right py-2 px-3">Sisa Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-slate-700">
                      {((reconcilingEntry.isCredit ? arList : apList) || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-400 font-semibold">
                            Tidak ada invoice outstanding yang belum lunas.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ((reconcilingEntry.isCredit ? arList : apList) || []).map((inv: ReconcileInvoice) => {
                          const invId = reconcilingEntry.isCredit ? inv.id_piutang : inv.ap_id;
                          const invNum = reconcilingEntry.isCredit ? inv.inv_number : inv.no_invoice;
                          const partnerName = reconcilingEntry.isCredit ? inv.customer_name : inv.supplier_name;
                          const amount = (reconcilingEntry.isCredit ? inv.jumlah : inv.ap_amount) || 0;
                          
                          // Check if exact match by amount
                          const isExactMatch = amount === Math.abs(reconcilingEntry.amount);
                          const isSelected = selectedReconcileInvoice && (reconcilingEntry.isCredit 
                            ? selectedReconcileInvoice.id_piutang === inv.id_piutang 
                            : selectedReconcileInvoice.ap_id === inv.ap_id);

                          return (
                            <TableRow 
                              key={invId} 
                              onClick={() => setSelectedReconcileInvoice(inv)}
                              className={`border-b border-slate-50 hover:bg-slate-50/30 transition-colors cursor-pointer ${
                                isSelected ? 'bg-red-50/20' : (isExactMatch ? 'bg-emerald-50/20' : '')
                              }`}
                            >
                              <TableCell className="text-center py-2.5 px-3">
                                <input
                                  type="radio"
                                  name="reconcile_invoice"
                                  checked={!!isSelected}
                                  onChange={() => setSelectedReconcileInvoice(inv)}
                                  className="text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                                />
                              </TableCell>
                              <TableCell className="font-mono font-bold text-slate-800 py-2.5 px-3">{invNum}</TableCell>
                              <TableCell className="font-semibold text-slate-600 py-2.5 px-3">{partnerName}</TableCell>
                              <TableCell className="font-mono text-right text-slate-700 py-2.5 px-3">{formatRupiah(amount)}</TableCell>
                              <TableCell className="font-mono font-bold text-right text-slate-800 py-2.5 px-3">
                                {formatRupiah(inv.sisa_pembayaran)}
                                {isExactMatch && (
                                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">MATCH</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button 
                  type="button" 
                  onClick={() => setReconcilingEntry(null)} 
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="button" 
                  disabled={!selectedReconcileInvoice || reconcileBankAccountId === 0 || loading}
                  onClick={() => {
                    if (!selectedReconcileInvoice || !reconcilingEntry) return;
                    const invId = (reconcilingEntry.isCredit ? selectedReconcileInvoice.id_piutang : selectedReconcileInvoice.ap_id) || '';
                    handleVerifyEntry(reconcilingEntry, invId, reconcileBankAccountId);
                  }}
                  className="flex-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                >
                  {loading ? 'Memproses Cocokan...' : 'Cocokkan & Verifikasi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
