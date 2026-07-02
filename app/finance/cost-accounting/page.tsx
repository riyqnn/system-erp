/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Calculator, 
  Plus, 
  Coins, 
  TrendingUp, 
  FileText, 
  ArrowUpRight, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  BarChart4,
  X,
  Sliders,
  Settings,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  SlidersHorizontal,
  Download
} from 'lucide-react'
import Swal from 'sweetalert2'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface BiayaProduksi {
  id_biaya_produksi: number;
  no_dokumen: string;
  nama_biaya: string;
  jumlah: number;
  tanggal: string;
  keterangan: string;
  status: 'SUBMITTED' | 'JOURNALED' | 'RETURNED' | 'RECEIVED' | string;
}

interface HppCalculation {
  id_hpp: number;
  periode: string;
  product_id: number;
  product_name: string;
  opening_qty: number;
  opening_value: number;
  incoming_qty: number;
  incoming_value: number;
  closing_qty: number;
  closing_value: number;
  hpp_per_unit: number;
  calculated_at: string;
}

interface LaporanPersediaan {
  id_laporan: number;
  no_laporan: string;
  periode: string;
  total_stok: number;
  total_nilai: number;
  status: 'DRAFT' | 'SENT' | 'VALIDATED' | string;
  product_id?: string;
  product_name?: string;
  system_qty?: number;
  actual_qty?: number;
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

export default function CostAccountingPage() {
  const [biayaList, setBiayaList] = useState<BiayaProduksi[]>([])
  const [hppList, setHppList] = useState<HppCalculation[]>([])
  const [laporanList, setLaporanList] = useState<LaporanPersediaan[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal open states
  const [isCostOpen, setIsCostOpen] = useState(false)
  const [isHppOpen, setIsHppOpen] = useState(false)
  const [isValuationOpen, setIsValuationOpen] = useState(false)
  const [isRequestAuditOpen, setIsRequestAuditOpen] = useState(false)

  // Audit Request Form States
  const [auditProductId, setAuditProductId] = useState('FG-001')
  const [auditSystemQty, setAuditSystemQty] = useState<number>(0)
  const [auditReason, setAuditReason] = useState('Audit fisik rutin dari Finance (Discrepancy)')

  // Mock Products list for calculator dropdown
  const productsMock = [
    { id: 1, code: 'FG-001', name: 'Roma Marie Susu 300g' },
    { id: 2, code: 'FG-002', name: 'Roma Kelapa 400g' },
    { id: 3, code: 'FG-003', name: 'Slai Olai Strawberry 126g' },
    { id: 4, code: 'FG-004', name: 'Choki-Choki Coklat 20g' },
    { id: 5, code: 'FG-005', name: 'Kopiko 78°C Can 240ml' }
  ]

  // Form Biaya Produksi States
  const [namaBiaya, setNamaBiaya] = useState('')
  const [jumlahBiaya, setJumlahBiaya] = useState<number>(0)
  const [tanggalBiaya, setTanggalBiaya] = useState(new Date().toISOString().substring(0, 10))
  const [keteranganBiaya, setKeteranganBiaya] = useState('')

  // Form HPP Calculator States
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [periodeHpp, setPeriodeHpp] = useState('2026-06')
  const [openingQty, setOpeningQty] = useState<number>(0)
  const [openingValue, setOpeningValue] = useState<number>(0)
  const [incomingQty, setIncomingQty] = useState<number>(0)
  const [incomingValue, setIncomingValue] = useState<number>(0)
  const [closingQty, setClosingQty] = useState<number>(0)
  
  // Auto calculated values
  const totalQty = Number(openingQty) + Number(incomingQty)
  const totalValue = Number(openingValue) + Number(incomingValue)
  const calculatedHpp = totalQty > 0 ? totalValue / totalQty : 0
  const calculatedClosingValue = closingQty * calculatedHpp

  // Form Laporan Persediaan States
  const [periodeLaporan, setPeriodeLaporan] = useState('2026-06')
  const [totalStokLaporan, setTotalStokLaporan] = useState<number>(0)
  const [totalNilaiLaporan, setTotalNilaiLaporan] = useState<number>(0)

  // Load Cost Accounting Data
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get Biaya Produksi list
      const bRes = await fetch('/api/finance/cost-accounting')
      const bJson = await bRes.json()
      if (bJson.data) setBiayaList(bJson.data)

      // Get HPP logs
      const hRes = await fetch('/api/finance/cost-accounting?mode=hpp_logs')
      const hJson = await hRes.json()
      if (hJson.data) setHppList(hJson.data)

      // Get Laporan Persediaan list
      const lRes = await fetch('/api/finance/cost-accounting?mode=valuation_reports')
      const lJson = await lRes.json()
      if (lJson.data) setLaporanList(lJson.data)

    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data API. Menggunakan mode mock local.')
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

  // Submit Biaya Produksi
  const handleBiayaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!namaBiaya.trim() || jumlahBiaya <= 0 || !tanggalBiaya) {
      showNotif('error', 'Harap isi nama biaya, jumlah (> 0), dan tanggal dengan benar.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/cost-accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_cost',
          nama_biaya: namaBiaya,
          jumlah: jumlahBiaya,
          tanggal: tanggalBiaya,
          keterangan: keteranganBiaya
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Dokumen biaya produksi '${namaBiaya}' senilai Rp ${jumlahBiaya.toLocaleString()} berhasil dikirim.`)
        setNamaBiaya('')
        setJumlahBiaya(0)
        setKeteranganBiaya('')
        setIsCostOpen(false)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal menyimpan dokumen biaya.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mengirim data biaya.')
    } finally {
      setLoading(false)
    }
  }

  // Submit HPP Calculation
  const handleHppSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || !periodeHpp) {
      showNotif('error', 'Pilih produk dan periode kalkulasi.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/cost-accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate_hpp',
          periode: periodeHpp,
          product_id: selectedProductId,
          opening_qty: openingQty,
          opening_value: openingValue,
          incoming_qty: incomingQty,
          incoming_value: incomingValue,
          closing_qty: closingQty,
          closing_value: calculatedClosingValue
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Kalkulasi HPP periode ${periodeHpp} sukses disimpan. HPP Per Unit: Rp ${calculatedHpp.toLocaleString('id-ID')}`)
        setSelectedProductId('')
        setOpeningQty(0)
        setOpeningValue(0)
        setIncomingQty(0)
        setIncomingValue(0)
        setClosingQty(0)
        setIsHppOpen(false)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal menyimpan kalkulasi HPP.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat menghitung HPP.')
    } finally {
      setLoading(false)
    }
  }

  // Submit Laporan Persediaan
  const handleLaporanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!periodeLaporan || totalStokLaporan <= 0 || totalNilaiLaporan <= 0) {
      showNotif('error', 'Harap lengkapi seluruh field laporan persediaan.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/cost-accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'valuation_report',
          periode: periodeLaporan,
          total_stok: totalStokLaporan,
          total_nilai: totalNilaiLaporan
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Laporan penilaian persediaan periode ${periodeLaporan} senilai Rp ${totalNilaiLaporan.toLocaleString()} berhasil dikirim ke finance.`)
        setTotalStokLaporan(0)
        setTotalNilaiLaporan(0)
        setIsValuationOpen(false)
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal mengirim laporan persediaan.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat mengirim laporan.')
    } finally {
      setLoading(false)
    }
  }

  // Submit Request Stock Opname
  const handleRequestAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auditProductId || auditSystemQty <= 0) {
      showNotif('error', 'Pilih produk dan masukkan kuantitas sistem.')
      return
    }

    Swal.fire({
      title: 'Memproses...',
      text: 'Mengirim request audit fisik ke Gudang',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading() }
    });

    try {
      setLoading(true)
      const res = await fetch('/api/finance/stock-opname-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: auditProductId,
          system_qty: auditSystemQty,
          reason: auditReason
        })
      });
      const json = await res.json();
      if(res.ok) {
        Swal.fire('Berhasil!', 'Request audit fisik telah terkirim ke modul Inventory!', 'success');
        setAuditSystemQty(0);
        setIsRequestAuditOpen(false);
        loadData();
      } else {
        Swal.fire('Gagal', json.error || 'Terjadi kesalahan pada sistem.', 'error');
      }
    } catch (e) {
      Swal.fire('Gagal', 'Koneksi bermasalah', 'error');
    } finally {
      setLoading(false)
    }
  }

  // Format currency
  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }

  // Summaries
  const totalBiayaProduksiBulanIni = biayaList.reduce((sum, b) => sum + b.jumlah, 0)
  const averageHppBiskuit = hppList.reduce((sum, h) => sum + h.hpp_per_unit, 0) / (hppList.length || 1)

  // Export to CSV Function
  const handleExportCSV = () => {
    if (hppList.length === 0 && biayaList.length === 0) {
      showNotif('error', 'Tidak ada data untuk diexport.')
      return
    }

    let csvContent = ''

    if (hppList.length > 0) {
      csvContent += 'LAPORAN KALKULASI HPP JADI\n'
      const hppHeaders = ['ID HPP', 'Periode', 'Product ID', 'Product Name', 'Opening Qty', 'Opening Value', 'Incoming Qty', 'Incoming Value', 'Closing Qty', 'Closing Value', 'HPP Per Unit', 'Tanggal Perhitungan']
      csvContent += hppHeaders.join(',') + '\n'
      hppList.forEach(h => {
        const row = [
          h.id_hpp,
          h.periode,
          h.product_id,
          h.product_name,
          h.opening_qty,
          h.opening_value,
          h.incoming_qty,
          h.incoming_value,
          h.closing_qty,
          h.closing_value,
          h.hpp_per_unit,
          h.calculated_at
        ]
        csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n'
      })
      csvContent += '\n'
    }

    if (biayaList.length > 0) {
      csvContent += 'LAPORAN DOKUMEN BIAYA PRODUKSI (OVERHEAD)\n'
      const biayaHeaders = ['ID Biaya', 'No Dokumen', 'Nama Biaya', 'Jumlah', 'Tanggal', 'Keterangan', 'Status']
      csvContent += biayaHeaders.join(',') + '\n'
      biayaList.forEach(b => {
        const row = [
          b.id_biaya_produksi,
          b.no_dokumen,
          b.nama_biaya,
          b.jumlah,
          b.tanggal,
          b.keterangan,
          b.status
        ]
        csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n'
      })
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Cost_Accounting_Report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showNotif('success', 'Laporan Cost Accounting berhasil diexport ke CSV.')
  }

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
                Cost Accounting & Valuation
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Period: Q3 2026 Ending
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            onClick={handleExportCSV}
            variant="ghost"
            className="h-9 gap-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Coins className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Inventory Value</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                Rp 4,250,890
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <ArrowUpRight className="w-3 h-3" />
              +2.4%
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <Calculator className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cost of Goods Sold (HPP)</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                {formatRupiah(averageHppBiskuit)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
              <ArrowUpRight className="w-3 h-3" />
              +5.1%
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Overhead Variance</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                -{formatRupiah(totalBiayaProduksiBulanIni)}
              </p>
            </div>
            <div className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-500">
              Under-absorbed
            </div>
          </CardContent>
        </GlassCard>

        <GlassCard className="relative">
          {/* Sparkline gradient line background for Turnover Ratio card */}
          <div className="absolute left-0 bottom-0 right-0 h-10 opacity-30">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,15 Q20,2 40,16 T80,10 T100,5" fill="none" stroke="#EE4444" strokeWidth="2" />
            </svg>
          </div>
          <CardContent className="p-6 flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <RefreshCw className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Inventory Turnover Ratio</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                4.8x
              </p>
            </div>
            <div className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700">
              Optimal
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Columns (2/3 width) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Card 1: HPP & Overhead Allocation */}
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">HPP & Overhead Allocation</h3>
              <button 
                onClick={() => setIsCostOpen(true)}
                className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                + Submit Cost <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Cost Allocation Segment Progress Bar */}
              <div className="space-y-4">
                <div className="h-6 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-[#800000] flex items-center justify-center text-[10px] font-bold text-white" style={{ width: '55%' }}>55%</div>
                  <div className="h-full bg-[#E57373] flex items-center justify-center text-[10px] font-bold text-white" style={{ width: '25%' }}>25%</div>
                  <div className="h-full bg-[#FFCDD2] flex items-center justify-center text-[10px] font-bold text-slate-700" style={{ width: '20%' }}>20%</div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#800000]" />
                    <span className="text-slate-500 font-medium">Direct Materials (55%):</span>
                    <span className="font-bold text-slate-800">Rp 1,012,110</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E57373]" />
                    <span className="text-slate-500 font-medium">Direct Labor (25%):</span>
                    <span className="font-bold text-slate-800">Rp 460,050</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFCDD2]" />
                    <span className="text-slate-500 font-medium">Mfg Overhead (20%):</span>
                    <span className="font-bold text-slate-800">Rp 368,040</span>
                  </div>
                </div>
              </div>

              {/* Cost Pools / Biaya Produksi Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">No. Dokumen</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Nama Biaya</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right">Total Applied</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-slate-700">
                    {biayaList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400 italic">Belum ada dokumen biaya produksi</TableCell>
                      </TableRow>
                    ) : (
                      biayaList.slice(0, 5).map((biaya) => (
                        <TableRow key={biaya.id_biaya_produksi} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-bold text-slate-800 px-6 py-4">{biaya.no_dokumen}</TableCell>
                          <TableCell className="font-medium text-slate-500 px-6 py-4">
                            {biaya.nama_biaya}
                            {biaya.status === 'RETURNED' && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">RETURNED</span>}
                            {(biaya.status === 'RECEIVED' || biaya.status === 'SUBMITTED') && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{biaya.status}</span>}
                            {biaya.status?.toLowerCase() === 'settled' && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">SETTLED</span>}
                            {biaya.status === 'JOURNALED' && <span className="ml-2 text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">JOURNALED</span>}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-800 px-6 py-4">Rp {biaya.jumlah.toLocaleString()}</TableCell>
                          <TableCell className="text-center px-6 py-4">
                            {biaya.status !== 'RETURNED' ? (
                              <button
                                onClick={async () => {
                                  const result = await Swal.fire({
                                    title: 'Return to Production?',
                                    text: `Tandai dokumen ${biaya.no_dokumen} tidak lengkap dan minta Production merevisi?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Ya, Kembalikan',
                                    cancelButtonText: 'Batal'
                                  });
                                  if (result.isConfirmed) {
                                    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                                    try {
                                      const res = await fetch('/api/finance/return-cost-document', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ settlement_id: biaya.id_biaya_produksi })
                                      });
                                      if (res.ok) {
                                        Swal.fire('Berhasil!', 'Dokumen dikembalikan ke antrean Production.', 'success');
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
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors cursor-pointer text-[10px]"
                              >
                                Return
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md">Returned</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

            </div>
          </GlassCard>

          {/* Card 2: Inventory Valuation Report */}
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-slate-800">Inventory Valuation Report</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Method: FIFO</span>
                <button 
                  onClick={() => setIsHppOpen(true)}
                  className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Calculate HPP <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Category</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right">Units on Hand</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right">Avg Unit Cost</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs text-slate-700">
                  <TableRow className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="font-bold text-slate-800 px-6 py-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#800000]" />
                      Raw Materials
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-500 px-6 py-4">145,000</TableCell>
                    <TableCell className="text-right font-medium text-slate-500 px-6 py-4">Rp 12,400</TableCell>
                    <TableCell className="text-right font-bold text-slate-800 px-6 py-4">Rp 1,798,000</TableCell>
                  </TableRow>
                  <TableRow className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="font-bold text-slate-800 px-6 py-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E57373]" />
                      Work in Progress
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-500 px-6 py-4">22,500</TableCell>
                    <TableCell className="text-right font-medium text-slate-500 px-6 py-4">Rp 35,800</TableCell>
                    <TableCell className="text-right font-bold text-slate-800 px-6 py-4">Rp 805,500</TableCell>
                  </TableRow>
                  <TableRow className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="font-bold text-slate-800 px-6 py-4 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFCDD2]" />
                      Finished Goods
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-500 px-6 py-4">18,200</TableCell>
                    <TableCell className="text-right font-medium text-slate-500 px-6 py-4">Rp 90,510</TableCell>
                    <TableCell className="text-right font-bold text-slate-800 px-6 py-4">Rp 1,647,390</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </GlassCard>

        </div>

        {/* Right Column (1/3 width) */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Card 1: Inventory Reconciliation */}
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">Inventory Reconciliation</h3>
              <p className="text-xs text-slate-400 mt-1">Compare ledger vs physical count</p>
            </div>
            
            <div className="p-6 space-y-5">
              
              {/* Discrepancy Detected Box */}
              {(() => {
                const latestValidated = (laporanList || []).find(l => l.status === 'VALIDATED');
                if (latestValidated) {
                  const hasDiscrepancy = latestValidated.actual_qty !== latestValidated.system_qty;
                  return (
                    <div className={`border rounded-2xl p-4 space-y-3 ${
                      hasDiscrepancy ? 'border-red-200 bg-red-50/20' : 'border-emerald-200 bg-emerald-50/20'
                    }`}>
                      <div className={`flex items-center gap-2 font-bold text-xs ${
                        hasDiscrepancy ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        <AlertCircle className="w-4.5 h-4.5" />
                        {hasDiscrepancy ? 'Audit Selesai: Selisih Ditemukan' : 'Audit Selesai: Cocok'}
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        <span className="text-slate-400 font-semibold">Produk:</span>
                        <span className="text-slate-800 font-bold text-right">{latestValidated.product_name || latestValidated.product_id}</span>

                        <span className="text-slate-400 font-semibold">System Qty:</span>
                        <span className="text-slate-800 font-bold text-right">{latestValidated.system_qty} units</span>
                        
                        <span className="text-slate-400 font-semibold">Physical Count:</span>
                        <span className="text-slate-800 font-bold text-right">{latestValidated.actual_qty} units</span>
                        
                        <span className="text-slate-400 font-semibold">Selisih:</span>
                        <span className={`font-bold text-right ${
                          (latestValidated.actual_qty || 0) - (latestValidated.system_qty || 0) < 0 ? 'text-red-600' : ((latestValidated.actual_qty || 0) === (latestValidated.system_qty || 0) ? 'text-slate-800' : 'text-emerald-600')
                        }`}>
                          {(latestValidated.actual_qty || 0) - (latestValidated.system_qty || 0) > 0 ? '+' : ''}
                          {((latestValidated.actual_qty || 0) - (latestValidated.system_qty || 0)).toLocaleString()} units
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4 text-center text-xs text-slate-400 italic">
                    Belum ada data audit fisik terverifikasi.
                  </div>
                );
              })()}

              <button
                onClick={() => setIsValuationOpen(true)}
                className="w-full bg-[#800000] hover:bg-[#800000]/90 text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Initiate Reconciliation
              </button>

              <button
                onClick={() => setIsRequestAuditOpen(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-3"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Request Audit Fisik (Ke Gudang)
              </button>

              {/* Opname reconciliation history list */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto mt-4 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histori Hasil Opname</p>
                {laporanList.filter(l => l.status === 'VALIDATED').length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Belum ada histori audit selesai.</p>
                ) : (
                  laporanList.filter(l => l.status === 'VALIDATED').map((log) => (
                    <div key={log.id_laporan} className="text-[11px] p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-700">VAL-{log.id_laporan} ({log.product_id})</span>
                        <p className="text-slate-400 font-mono text-[9px]">{log.periode}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-700">{log.actual_qty} / {log.system_qty} units</span>
                        <p className={`font-bold ${((log.actual_qty || 0) - (log.system_qty || 0)) < 0 ? 'text-red-500' : (((log.actual_qty || 0) === (log.system_qty || 0)) ? 'text-slate-500' : 'text-emerald-500')}`}>
                          Var: {(log.actual_qty || 0) - (log.system_qty || 0)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </GlassCard>

          {/* Card 2: Analyst Tools */}
          <GlassCard>
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800 uppercase tracking-wider text-xs text-slate-400">Analyst Tools</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              <div 
                onClick={() => setIsHppOpen(true)}
                className="flex items-center justify-between py-4 px-6 hover:bg-slate-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors">Standard Cost Update Simulator</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-all group-hover:translate-x-0.5" />
              </div>

              <div 
                onClick={() => setIsCostOpen(true)}
                className="flex items-center justify-between py-4 px-6 hover:bg-slate-50/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-red-600 transition-colors">Overhead Rate Configuration</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-all group-hover:translate-x-0.5" />
              </div>
            </div>
          </GlassCard>

        </div>

      </div>

      {/* =====================================================================
          OVERLAY MODALS
          ===================================================================== */}

      {/* 1. SUBMIT COST MODAL */}
      {isCostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-600" /> Kirim Dokumen Biaya Produksi
              </h3>
              <button 
                onClick={() => setIsCostOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBiayaSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Nama Biaya Produksi</label>
                <Input 
                  placeholder="Overhead Pabrik Cikande, Upah Tenaga Kerja"
                  value={namaBiaya} 
                  onChange={(e) => setNamaBiaya(e.target.value)}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Jumlah Biaya (IDR)</label>
                <Input 
                  type="number"
                  value={jumlahBiaya || ''} 
                  onChange={(e) => setJumlahBiaya(Number(e.target.value))}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 font-bold" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tanggal Biaya</label>
                <Input 
                  type="date"
                  value={tanggalBiaya} 
                  onChange={(e) => setTanggalBiaya(e.target.value)}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl text-xs mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Keterangan / Rincian</label>
                <textarea 
                  value={keteranganBiaya}
                  onChange={(e) => setKeteranganBiaya(e.target.value)}
                  className="w-full min-h-[80px] p-3 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 mt-1" 
                  placeholder="Deskripsi penyerahan biaya produksi..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  onClick={() => setIsCostOpen(false)}
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                >
                  {loading ? 'Mengirim...' : 'Kirim Biaya'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. HPP CALCULATOR MODAL */}
      {isHppOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-red-600" /> Kalkulator Nilai HPP
              </h3>
              <button 
                onClick={() => setIsHppOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleHppSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Produk</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  <option value="">-- PILIH PRODUK JADI --</option>
                  {productsMock.map((p) => (
                    <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Periode Perhitungan</label>
                <Input 
                  placeholder="YYYY-MM (e.g. 2026-06)"
                  value={periodeHpp}
                  onChange={(e) => setPeriodeHpp(e.target.value)}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl text-xs mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Persediaan Awal</div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">Qty Awal</label>
                  <Input type="number" value={openingQty || ''} onChange={(e) => setOpeningQty(Number(e.target.value))} className="h-9 border border-slate-200 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">Nilai Awal (IDR)</label>
                  <Input type="number" value={openingValue || ''} onChange={(e) => setOpeningValue(Number(e.target.value))} className="h-9 border border-slate-200 rounded-lg text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Barang Masuk Produksi</div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">Qty Masuk</label>
                  <Input type="number" value={incomingQty || ''} onChange={(e) => setIncomingQty(Number(e.target.value))} className="h-9 border border-slate-200 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">Nilai Masuk (IDR)</label>
                  <Input type="number" value={incomingValue || ''} onChange={(e) => setIncomingValue(Number(e.target.value))} className="h-9 border border-slate-200 rounded-lg text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Persediaan Akhir</div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">Qty Akhir</label>
                  <Input type="number" value={closingQty || ''} onChange={(e) => setClosingQty(Number(e.target.value))} className="h-9 border border-slate-200 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400">Nilai Akhir (Valuasi)</label>
                  <div className="h-9 flex items-center px-3 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 font-mono">
                    Rp {calculatedClosingValue ? Math.round(calculatedClosingValue).toLocaleString() : 0}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-red-50 text-red-700 rounded-2xl flex justify-between items-center text-xs font-bold border border-red-100">
                <span>ESTIMASI HPP PER UNIT:</span>
                <span className="font-mono">{formatRupiah(calculatedHpp)}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setIsHppOpen(false)}
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={calculatedHpp <= 0} 
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                >
                  Simpan HPP
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. INVENTORY VALUATION REPORT MODAL */}
      {isValuationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" /> Laporan Valuasi Stok
              </h3>
              <button 
                onClick={() => setIsValuationOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLaporanSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Periode Laporan</label>
                <Input 
                  placeholder="YYYY-MM (e.g. 2026-06)"
                  value={periodeLaporan} 
                  onChange={(e) => setPeriodeLaporan(e.target.value)}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Kuantitas Stok (Unit)</label>
                <Input 
                  type="number"
                  value={totalStokLaporan || ''} 
                  onChange={(e) => setTotalStokLaporan(Number(e.target.value))}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 font-bold" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Nilai Valuasi Persediaan (IDR)</label>
                <Input 
                  type="number"
                  value={totalNilaiLaporan || ''} 
                  onChange={(e) => setTotalNilaiLaporan(Number(e.target.value))}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 font-bold" 
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  onClick={() => setIsValuationOpen(false)}
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                >
                  {loading ? 'Mengirim...' : 'Kirim Laporan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REQUEST AUDIT FISIK MODAL */}
      {isRequestAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-red-600" /> Request Audit Fisik (Stock Opname)
              </h3>
              <button 
                onClick={() => setIsRequestAuditOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestAuditSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pilih Produk Yang Diaudit</label>
                <select
                  value={auditProductId}
                  onChange={(e) => setAuditProductId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border border-slate-200 rounded-xl mt-1 focus:outline-none focus:border-slate-300 bg-white"
                  required
                >
                  {productsMock.map((p) => (
                    <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kuantitas di Sistem (System Qty)</label>
                <Input 
                  type="number"
                  value={auditSystemQty || ''} 
                  onChange={(e) => setAuditSystemQty(Number(e.target.value))}
                  className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 font-bold" 
                  placeholder="e.g. 1500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Alasan Audit Fisik / Catatan</label>
                <textarea 
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full min-h-[80px] p-3 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 mt-1" 
                  placeholder="Deskripsi kebutuhan audit fisik..."
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  onClick={() => setIsRequestAuditOpen(false)}
                  variant="ghost"
                  className="flex-1 text-xs font-semibold border border-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
                >
                  {loading ? 'Mengirim...' : 'Kirim Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
