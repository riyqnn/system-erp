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
  BarChart4
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
  status: 'SUBMITTED' | 'JOURNALED';
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
  status: 'SUBMITTED' | 'APPROVED';
}

export default function CostAccountingPage() {
  const [activeTab, setActiveTab] = useState<'biaya' | 'hpp' | 'laporan'>('biaya')
  const [biayaList, setBiayaList] = useState<BiayaProduksi[]>([])
  const [hppList, setHppList] = useState<HppCalculation[]>([])
  const [laporanList, setLaporanList] = useState<LaporanPersediaan[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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
  const [selectedProductId, setSelectedProductId] = useState<number>(0)
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
  const closingValue = closingQty * calculatedHpp

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
    if (selectedProductId === 0 || !periodeHpp) {
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
          closing_value: closingValue
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', `Kalkulasi HPP periode ${periodeHpp} sukses disimpan. HPP Per Unit: Rp ${calculatedHpp.toLocaleString('id-ID')}`)
        setSelectedProductId(0)
        setOpeningQty(0)
        setOpeningValue(0)
        setIncomingQty(0)
        setIncomingValue(0)
        setClosingQty(0)
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

  // Format currency
  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }

  // Summaries
  const totalBiayaProduksiBulanIni = biayaList.reduce((sum, b) => sum + b.jumlah, 0)
  const averageHppBiskuit = hppList.reduce((sum, h) => sum + h.hpp_per_unit, 0) / (hppList.length || 1)

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 pb-12 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Calculator className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Cost Accounting</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">PT. Mayora Indah Tbk · Penentuan Harga Pokok Penjualan (HPP) & Valuasi Persediaan</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 transition-all ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-500' : 'bg-red-50 text-red-900 border-red-500'}`}>
          {notif.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Biaya Produksi Diajukan</p>
            <p className="text-2xl font-black text-black font-mono">{formatRupiah(totalBiayaProduksiBulanIni)}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-100"><TrendingUp className="w-5 h-5 text-red-600" /></div>
        </div>

        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rata-Rata HPP Produk Jadi</p>
            <p className="text-2xl font-black text-blue-700 font-mono">{formatRupiah(averageHppBiskuit)}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100"><Calculator className="w-5 h-5 text-blue-600" /></div>
        </div>

        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Laporan Valuasi Masuk</p>
            <p className="text-2xl font-black text-emerald-700 font-mono">{laporanList.length} Laporan</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"><FileText className="w-5 h-5 text-emerald-600" /></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-black bg-slate-100 p-1.5 rounded-xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-2">
        <button 
          onClick={() => setActiveTab('biaya')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'biaya' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <TrendingUp className="w-4 h-4" /> Dokumen Biaya Produksi
        </button>
        <button 
          onClick={() => setActiveTab('hpp')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'hpp' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Calculator className="w-4 h-4" /> Kalkulator HPP
        </button>
        <button 
          onClick={() => setActiveTab('laporan')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'laporan' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <FileText className="w-4 h-4" /> Laporan Penilaian Persediaan
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'biaya' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Submit Cost Form (Production) */}
          <div className="xl:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" /> Kirim Dokumen Biaya Produksi
            </h2>
            
            <form onSubmit={handleBiayaSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Biaya Produksi</label>
                <Input 
                  placeholder="Contoh: Overhead Pabrik Cikande, Upah Tenaga Kerja"
                  value={namaBiaya} 
                  onChange={(e) => setNamaBiaya(e.target.value)}
                  className="border-2 border-black font-semibold mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Jumlah Biaya (IDR)</label>
                <Input 
                  type="number"
                  value={jumlahBiaya || ''} 
                  onChange={(e) => setJumlahBiaya(Number(e.target.value))}
                  className="border-2 border-black font-bold mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Biaya</label>
                <Input 
                  type="date"
                  value={tanggalBiaya} 
                  onChange={(e) => setTanggalBiaya(e.target.value)}
                  className="border-2 border-black font-semibold mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan / Rincian</label>
                <textarea 
                  value={keteranganBiaya}
                  onChange={(e) => setKeteranganBiaya(e.target.value)}
                  className="w-full min-h-[80px] p-3 text-sm font-medium border-2 border-black rounded-lg focus:outline-none focus:ring-0 mt-1" 
                  placeholder="Deskripsi penyerahan biaya produksi..."
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full border-2 border-black bg-red-600 hover:bg-red-700 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-3 uppercase tracking-wider text-xs">
                {loading ? 'Mengirim...' : 'Kirim Dokumen Biaya'}
              </Button>
            </form>
          </div>

          {/* Biaya Produksi list table */}
          <div className="xl:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h2 className="text-lg font-bold border-b pb-3 border-slate-200 uppercase tracking-tight">
              Histori Dokumen Biaya Produksi Masuk
            </h2>

            <div className="overflow-x-auto">
              <Table className="border-2 border-black">
                <TableHeader className="bg-slate-100 border-b-2 border-black">
                  <TableRow>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-36">No Dokumen</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">Tanggal</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black">Nama / Rincian Biaya</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-40">Jumlah Biaya</TableHead>
                    <TableHead className="font-bold text-black text-center w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {biayaList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 font-bold text-slate-400">
                        Belum ada dokumen biaya masuk.
                      </TableCell>
                    </TableRow>
                  ) : (
                    biayaList.map((b) => (
                      <TableRow key={b.id_biaya_produksi} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold border-r-2 border-black text-center text-xs">{b.no_dokumen}</TableCell>
                        <TableCell className="border-r-2 border-black text-center text-xs font-semibold">
                          {new Date(b.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="border-r-2 border-black text-xs font-bold text-slate-800">
                          <p>{b.nama_biaya}</p>
                          {b.keterangan && <p className="text-[11px] text-slate-400 font-medium italic mt-0.5">{b.keterangan}</p>}
                        </TableCell>
                        <TableCell className="border-r-2 border-black text-right font-mono text-xs font-bold">{formatRupiah(b.jumlah)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border uppercase ${b.status === 'JOURNALED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {b.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hpp' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* HPP Calculator form */}
          <div className="xl:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-red-600" /> Kalkulator Nilai Rata-rata HPP
            </h2>

            <form onSubmit={handleHppSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pilih Produk</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg mt-1 focus:outline-none"
                  required
                >
                  <option value={0}>-- PILIH PRODUK JADI --</option>
                  {productsMock.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Periode Perhitungan</label>
                <Input 
                  placeholder="YYYY-MM (e.g. 2026-06)"
                  value={periodeHpp}
                  onChange={(e) => setPeriodeHpp(e.target.value)}
                  className="border-2 border-black font-semibold text-xs mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 border border-slate-100 p-2.5 rounded bg-slate-50">
                <div className="col-span-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">A. Saldo Persediaan Awal</div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Qty Awal</label>
                  <Input type="number" value={openingQty || ''} onChange={(e) => setOpeningQty(Number(e.target.value))} className="h-8 border border-black font-bold text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Nilai Awal (IDR)</label>
                  <Input type="number" value={openingValue || ''} onChange={(e) => setOpeningValue(Number(e.target.value))} className="h-8 border border-black font-bold text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border border-slate-100 p-2.5 rounded bg-slate-50">
                <div className="col-span-2 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">B. Barang Masuk Produksi</div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Qty Masuk</label>
                  <Input type="number" value={incomingQty || ''} onChange={(e) => setIncomingQty(Number(e.target.value))} className="h-8 border border-black font-bold text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Nilai Masuk (IDR)</label>
                  <Input type="number" value={incomingValue || ''} onChange={(e) => setIncomingValue(Number(e.target.value))} className="h-8 border border-black font-bold text-xs" />
                </div>
              </div>

              <div className="border border-slate-100 p-2.5 rounded bg-slate-50">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">C. Saldo Persediaan Akhir</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Qty Akhir</label>
                    <Input type="number" value={closingQty || ''} onChange={(e) => setClosingQty(Number(e.target.value))} className="h-8 border border-black font-bold text-xs" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Nilai Akhir (Valuasi)</label>
                    <div className="h-8 flex items-center px-3 border border-black rounded text-xs font-bold bg-slate-100 font-mono">
                      Rp {closingValue ? Math.round(closingValue).toLocaleString() : 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-2 border-black p-3 bg-red-50 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between text-xs font-bold text-red-900">
                  <span>HPP PER UNIT (AVERAGE):</span>
                  <span className="font-mono">{formatRupiah(calculatedHpp)}</span>
                </div>
              </div>

              <Button type="submit" disabled={calculatedHpp <= 0} className="w-full border-2 border-black bg-red-600 hover:bg-red-700 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-2.5 uppercase tracking-wider text-xs">
                Simpan Kalkulasi HPP
              </Button>
            </form>
          </div>

          {/* HPP calculation log table */}
          <div className="xl:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h2 className="text-lg font-bold border-b pb-3 border-slate-200 uppercase tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-red-600" /> Log Histori Penetapan HPP Rata-rata
            </h2>

            <div className="overflow-x-auto">
              <Table className="border-2 border-black">
                <TableHeader className="bg-slate-100 border-b-2 border-black">
                  <TableRow>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-24">Periode</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black">Nama Produk</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">Stok Awal / Masuk</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Total Nilai Persediaan</TableHead>
                    <TableHead className="font-bold text-black text-right w-36">HPP Per Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hppList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 font-bold text-slate-400">
                        Belum ada kalkulasi HPP tersimpan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hppList.map((h) => (
                      <TableRow key={h.id_hpp} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <TableCell className="font-bold border-r-2 border-black text-center text-xs font-mono">{h.periode}</TableCell>
                        <TableCell className="border-r-2 border-black text-xs font-bold text-slate-800">{h.product_name || 'Roma Marie Susu'}</TableCell>
                        <TableCell className="border-r-2 border-black text-center text-[10px] font-semibold text-slate-600">
                          Awal: {h.opening_qty} · Masuk: {h.incoming_qty}
                        </TableCell>
                        <TableCell className="border-r-2 border-black text-right font-mono text-xs font-semibold">{formatRupiah(h.opening_value + h.incoming_value)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-red-600 bg-red-50/10">{formatRupiah(h.hpp_per_unit)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'laporan' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Submit Laporan Persediaan (Inventory management) */}
          <div className="xl:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" /> Penyerahan Laporan Valuasi Stok
            </h2>
            
            <form onSubmit={handleLaporanSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Periode Laporan</label>
                <Input 
                  placeholder="YYYY-MM (e.g. 2026-06)"
                  value={periodeLaporan} 
                  onChange={(e) => setPeriodeLaporan(e.target.value)}
                  className="border-2 border-black font-semibold mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Kuantitas Stok (Unit/Carton/Kg)</label>
                <Input 
                  type="number"
                  value={totalStokLaporan || ''} 
                  onChange={(e) => setTotalStokLaporan(Number(e.target.value))}
                  className="border-2 border-black font-semibold mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Nilai Valuasi Persediaan (IDR)</label>
                <Input 
                  type="number"
                  value={totalNilaiLaporan || ''} 
                  onChange={(e) => setTotalNilaiLaporan(Number(e.target.value))}
                  className="border-2 border-black font-bold mt-1" 
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full border-2 border-black bg-red-600 hover:bg-red-700 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-3 uppercase tracking-wider text-xs">
                {loading ? 'Mengirim...' : 'Kirim Laporan Persediaan'}
              </Button>
            </form>
          </div>

          {/* Laporan Penilaian Persediaan List table */}
          <div className="xl:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h2 className="text-lg font-bold border-b pb-3 border-slate-200 uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-600" /> Histori Laporan Penilaian Persediaan Masuk
            </h2>

            <div className="overflow-x-auto">
              <Table className="border-2 border-black">
                <TableHeader className="bg-slate-100 border-b-2 border-black">
                  <TableRow>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-36">No Laporan</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">Periode</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Total Stok Persediaan</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-44">Total Nilai Valuasi</TableHead>
                    <TableHead className="font-bold text-black text-center w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laporanList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 font-bold text-slate-400">
                        Belum ada laporan penilaian persediaan masuk.
                      </TableCell>
                    </TableRow>
                  ) : (
                    laporanList.map((l) => (
                      <TableRow key={l.id_laporan} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold border-r-2 border-black text-center text-xs">{l.no_laporan}</TableCell>
                        <TableCell className="border-r-2 border-black text-center text-xs font-bold font-mono">{l.periode}</TableCell>
                        <TableCell className="border-r-2 border-black text-right font-mono text-xs font-semibold">{l.total_stok.toLocaleString()} unit</TableCell>
                        <TableCell className="border-r-2 border-black text-right font-mono text-xs font-bold text-slate-700">{formatRupiah(l.total_nilai)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded font-extrabold border uppercase ${l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {l.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
