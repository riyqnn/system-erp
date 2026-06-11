/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'

import React, { useState, useEffect } from 'react'
import { 
  Book, 
  List, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Printer, 
  FileSpreadsheet,
  ArrowRightLeft,
  DollarSign,
  X,
  PlusCircle,
  FileText
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const BRAND_RED = '#dc2626'

interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
  kategori: 'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
  saldo_normal: 'DEBET' | 'KREDIT';
  saldo_berjalan: number;
}

interface JurnalDetail {
  akun_id: number;
  kode_akun?: string;
  nama_akun?: string;
  debet: number;
  kredit: number;
}

interface Jurnal {
  id_jurnal: number;
  no_jurnal: string;
  tanggal: string;
  keterangan: string;
  status: 'DRAFT' | 'POSTED';
  tr_jurnal_detail: JurnalDetail[];
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

export default function GeneralLedgerPage() {
  const [activeTab, setActiveTab] = useState<'jurnal' | 'coa' | 'laporan'>('jurnal')
  const [reportSubTab, setReportSubTab] = useState<'neraca' | 'labarugi'>('neraca')
  const [akunList, setAkunList] = useState<Akun[]>([])
  const [jurnalList, setJurnalList] = useState<Jurnal[]>([])
  
  // State Form Jurnal Baru
  const [tanggalJurnal, setTanggalJurnal] = useState(new Date().toISOString().substring(0, 10))
  const [keteranganJurnal, setKeteranganJurnal] = useState('')
  const [formDetails, setFormDetails] = useState<JurnalDetail[]>([
    { akun_id: 0, debet: 0, kredit: 0 },
    { akun_id: 0, debet: 0, kredit: 0 }
  ])

  // Filter & Search
  const [searchCoa, setSearchCoa] = useState('')
  const [filterKategori, setFilterKategori] = useState<string>('ALL')

  // Notification States
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch Data
  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch COA
      const coaRes = await fetch('/api/finance/coa')
      const coaJson = await coaRes.json()
      if (coaJson.data) setAkunList(coaJson.data)

      // Fetch Jurnal
      const jrRes = await fetch('/api/finance/journal')
      const jrJson = await jrRes.json()
      if (jrJson.data) setJurnalList(jrJson.data)
    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data dari API. Menjalankan mode mock.')
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

  // Handle Form Change
  const handleDetailChange = (index: number, field: 'akun_id' | 'debet' | 'kredit', value: string | number) => {
    const updated = [...formDetails]
    if (field === 'akun_id') {
      updated[index].akun_id = Number(value)
    } else {
      updated[index][field] = Number(value)
      // Jurnal detail rule: jika debet diisi, kredit harus 0, dan sebaliknya
      if (field === 'debet' && Number(value) > 0) {
        updated[index].kredit = 0
      } else if (field === 'kredit' && Number(value) > 0) {
        updated[index].debet = 0
      }
    }
    setFormDetails(updated)
  }

  const addFormRow = () => {
    setFormDetails([...formDetails, { akun_id: 0, debet: 0, kredit: 0 }])
  }

  const removeFormRow = (index: number) => {
    if (formDetails.length <= 2) {
      showNotif('error', 'Entri jurnal minimal membutuhkan 2 baris detail.')
      return
    }
    setFormDetails(formDetails.filter((_, i) => i !== index))
  }

  // Calculate totals for verification
  const totalDebet = formDetails.reduce((sum, d) => sum + d.debet, 0)
  const totalKredit = formDetails.reduce((sum, d) => sum + d.kredit, 0)
  const isBalance = Math.abs(totalDebet - totalKredit) < 0.01 && totalDebet > 0

  // Post Jurnal
  const handlePostJurnal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isBalance) {
      showNotif('error', 'Jurnal tidak balance! Total Debet dan Kredit harus sama dan lebih besar dari 0.')
      return
    }
    if (formDetails.some(d => d.akun_id === 0)) {
      showNotif('error', 'Harap pilih akun untuk setiap baris jurnal.')
      return
    }
    if (!keteranganJurnal.trim()) {
      showNotif('error', 'Keterangan jurnal wajib diisi.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: tanggalJurnal,
          keterangan: keteranganJurnal,
          details: formDetails
        })
      })
      const json = await res.json()
      if (res.ok) {
        showNotif('success', 'Entri jurnal berhasil diposting.')
        setKeteranganJurnal('')
        setFormDetails([
          { akun_id: 0, debet: 0, kredit: 0 },
          { akun_id: 0, debet: 0, kredit: 0 }
        ])
        loadData()
      } else {
        showNotif('error', json.error || 'Gagal memposting jurnal.')
      }
    } catch (e) {
      showNotif('error', 'Koneksi error saat menyimpan jurnal.')
    } finally {
      setLoading(false)
    }
  }

  // Filter COA list
  const filteredAkun = akunList.filter(akun => {
    const matchesSearch = akun.kode_akun.includes(searchCoa) || akun.nama_akun.toLowerCase().includes(searchCoa.toLowerCase())
    const matchesKategori = filterKategori === 'ALL' || akun.kategori === filterKategori
    return matchesSearch && matchesKategori
  })

  // Format currency
  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID')
  }

  // =====================================================================
  // CALCULATE FINANCIAL REPORTS
  // =====================================================================
  // 1. NERACA
  const asetList = akunList.filter(a => a.kategori === 'ASET')
  const kewajibanList = akunList.filter(a => a.kategori === 'KEWAJIBAN')
  const ekuitasList = akunList.filter(a => a.kategori === 'EKUITAS')

  const totalAset = asetList.reduce((sum, a) => sum + (a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const totalKewajiban = kewajibanList.reduce((sum, a) => sum + (a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const totalEkuitas = ekuitasList.reduce((sum, a) => sum + (a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan), 0)

  // 2. LABA RUGI
  const pendapatanList = akunList.filter(a => a.kategori === 'PENDAPATAN')
  const bebanList = akunList.filter(a => a.kategori === 'BEBAN')

  const totalPendapatan = pendapatanList.reduce((sum, a) => sum + (a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const totalBeban = bebanList.reduce((sum, a) => sum + (a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan), 0)
  const labaRugiBersih = totalPendapatan - totalBeban

  // Adjust ekuitas in neraca with net profit
  const totalPasiva = totalKewajiban + totalEkuitas + labaRugiBersih

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
                General Ledger
              </h1>
            </div>
          </div>
          <p className="text-sm ml-4 text-slate-500">
            Accounting, journal posting, and financial statements.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 hover:bg-slate-100 text-xs font-semibold text-slate-600 rounded-2xl cursor-pointer border border-slate-200"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Cetak
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 hover:bg-slate-100 text-xs font-semibold text-slate-600 rounded-2xl cursor-pointer border border-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          {notif.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Main Tab Container */}
      <GlassCard>
        
        {/* Navigation Tabs Header */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/50 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('jurnal')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'jurnal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Jurnal & Posting
            </button>
            <button 
              onClick={() => setActiveTab('coa')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'coa' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daftar Akun (COA)
            </button>
            <button 
              onClick={() => setActiveTab('laporan')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'laporan' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Laporan Keuangan
            </button>
          </div>
        </div>

        {/* ==========================================================
            TAB 1: JURNAL & POSTING
            ========================================================== */}
        {activeTab === 'jurnal' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
            
            {/* Left: Posting Jurnal Manual Form (1/3 width) */}
            <div className="xl:col-span-1 border border-slate-100 bg-slate-50/20 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-red-600" /> Posting Jurnal Manual
              </h3>
              
              <form onSubmit={handlePostJurnal} className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tanggal Transaksi</label>
                  <Input 
                    type="date" 
                    value={tanggalJurnal} 
                    onChange={(e) => setTanggalJurnal(e.target.value)}
                    className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl mt-1 h-9" 
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Keterangan Jurnal</label>
                  <textarea 
                    value={keteranganJurnal}
                    onChange={(e) => setKeteranganJurnal(e.target.value)}
                    className="w-full min-h-[60px] p-2.5 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 mt-1" 
                    placeholder="Deskripsi transaksi..."
                    required
                  />
                </div>

                {/* Dynamic Entry Rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Baris Detail Jurnal</label>
                    <button 
                      type="button" 
                      onClick={addFormRow} 
                      className="px-2 py-1 text-[10px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Tambah Baris
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {formDetails.map((detail, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex-1 space-y-1.5">
                          <select 
                            value={detail.akun_id}
                            onChange={(e) => handleDetailChange(index, 'akun_id', e.target.value)}
                            className="w-full text-xs font-bold p-1.5 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-700"
                            required
                          >
                            <option value={0}>-- PILIH AKUN --</option>
                            {akunList.map((a) => (
                              <option key={a.id_akun} value={a.id_akun}>{a.kode_akun} - {a.nama_akun}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <Input 
                              type="number" 
                              placeholder="Debet" 
                              value={detail.debet || ''} 
                              onChange={(e) => handleDetailChange(index, 'debet', e.target.value)}
                              className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-xs font-semibold h-8"
                            />
                            <Input 
                              type="number" 
                              placeholder="Kredit" 
                              value={detail.kredit || ''} 
                              onChange={(e) => handleDetailChange(index, 'kredit', e.target.value)}
                              className="border border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg text-xs font-semibold h-8"
                            />
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeFormRow(index)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Verification indicator */}
                <div className={`p-3.5 rounded-xl border space-y-1.5 ${isBalance ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-red-50/50 border-red-100 text-red-900'}`}>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span>Total Debet:</span>
                    <span className="font-mono">{formatRupiah(totalDebet)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span>Total Kredit:</span>
                    <span className="font-mono">{formatRupiah(totalKredit)}</span>
                  </div>
                  <div className="border-t border-slate-200/50 my-1.5" />
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span>Status Balance:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold text-white ${isBalance ? 'bg-emerald-600' : 'bg-red-600'}`}>
                      {isBalance ? 'SEIMBANG' : 'TIDAK BALANCE'}
                    </span>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={!isBalance || loading} 
                  className="w-full text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer py-2.5"
                >
                  {loading ? 'Memproses...' : 'Posting Jurnal'}
                </Button>
              </form>
            </div>

            {/* Right: Histori Entri Jurnal (2/3 width) */}
            <div className="xl:col-span-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Book className="w-5 h-5 text-red-600" /> Histori Jurnal Buku Besar
              </h3>
              
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-28 text-center">No Jurnal</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-24 text-center">Tanggal</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Keterangan / Rincian Akun</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-36">Debet</TableHead>
                      <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-36">Kredit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs text-slate-700">
                    {jurnalList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 font-semibold text-slate-400">
                          Belum ada histori jurnal tercatat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      jurnalList.map((j) => (
                        <React.Fragment key={j.id_jurnal}>
                          {/* Jurnal Header Row */}
                          <TableRow className="bg-slate-50/50 border-t border-slate-100">
                            <TableCell className="font-mono font-bold text-slate-800 px-6 py-3 text-center">{j.no_jurnal}</TableCell>
                            <TableCell className="font-semibold text-slate-500 px-6 py-3 text-center">
                              {new Date(j.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="font-bold text-slate-800 px-6 py-3 uppercase" colSpan={3}>
                              {j.keterangan}
                            </TableCell>
                          </TableRow>
                          {/* Detail Rows */}
                          {j.tr_jurnal_detail.map((jd, idx) => (
                            <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/10 transition-colors">
                              <TableCell />
                              <TableCell />
                              <TableCell className="px-6 py-2.5">
                                <span className={jd.kredit > 0 ? "ml-8 text-slate-500 font-medium" : "text-slate-800 font-semibold"}>
                                  {jd.kode_akun} - {jd.nama_akun}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-slate-700 px-6 py-2.5">
                                {jd.debet > 0 ? formatRupiah(jd.debet) : '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-slate-700 px-6 py-2.5">
                                {jd.kredit > 0 ? formatRupiah(jd.kredit) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================
            TAB 2: DAFTAR AKUN (COA)
            ========================================================== */}
        {activeTab === 'coa' && (
          <div className="p-6 space-y-6">
            
            {/* Filter COA row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari kode atau nama akun..." 
                  value={searchCoa}
                  onChange={(e) => setSearchCoa(e.target.value)}
                  className="pl-9 pr-4 h-9 border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl min-w-[240px]"
                />
              </div>

              {/* Kategori Filters buttons */}
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
                {['ALL', 'ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN'].map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setFilterKategori(kat)}
                    className={`px-3.5 py-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      filterKategori === kat ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 w-36 text-center">Kode Akun</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3">Nama Rekening Akun</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-40">Kategori</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-center w-32">Saldo Normal</TableHead>
                    <TableHead className="font-semibold text-slate-400 text-xs px-6 py-3 text-right w-52">Saldo Berjalan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs text-slate-700">
                  {filteredAkun.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 font-semibold text-slate-400">
                        Akun tidak ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAkun.map((a) => {
                      const badgeMap = {
                        ASET: "bg-blue-50 text-blue-700 border-blue-100",
                        KEWAJIBAN: "bg-orange-50 text-orange-700 border-orange-100",
                        EKUITAS: "bg-purple-50 text-purple-700 border-purple-100",
                        PENDAPATAN: "bg-emerald-50 text-emerald-700 border-emerald-100",
                        BEBAN: "bg-red-50 text-red-700 border-red-100"
                      }
                      return (
                        <TableRow key={a.id_akun} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                          <TableCell className="font-mono font-bold text-slate-800 px-6 py-4 text-center">{a.kode_akun}</TableCell>
                          <TableCell className="font-bold text-slate-800 px-6 py-4">{a.nama_akun}</TableCell>
                          <TableCell className="text-center px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${badgeMap[a.kategori]}`}>
                              {a.kategori}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-400 px-6 py-4">{a.saldo_normal}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-800 px-6 py-4">{formatRupiah(a.saldo_berjalan)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ==========================================================
            TAB 3: LAPORAN KEUANGAN
            ========================================================== */}
        {activeTab === 'laporan' && (
          <div className="p-6 space-y-6">
            
            {/* Sub Tabs Neraca / Laba Rugi */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/50 w-full sm:w-auto">
                <button 
                  onClick={() => setReportSubTab('neraca')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    reportSubTab === 'neraca' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Neraca (Balance Sheet)
                </button>
                <button 
                  onClick={() => setReportSubTab('labarugi')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    reportSubTab === 'labarugi' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Laba Rugi (Income Statement)
                </button>
              </div>
              <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                Periode Laporan: <span className="font-mono text-slate-700">Juni 2026</span>
              </div>
            </div>

            {reportSubTab === 'neraca' ? (
              // Balance Sheet
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left side: Assets */}
                <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/10 flex flex-col justify-between min-h-[400px]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 uppercase text-center tracking-wider">AKTIVA (ASET)</h3>
                    <div className="space-y-2 mt-3 max-h-[350px] overflow-y-auto pr-1">
                      {asetList.map((a) => (
                        <div key={a.id_akun} className="flex justify-between items-center py-2.5 border-b border-slate-100/50 text-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400">{a.kode_akun}</p>
                            <p className="font-semibold text-slate-700">{a.nama_akun}</p>
                          </div>
                          <p className="font-mono font-bold text-slate-800">
                            {formatRupiah(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 border-t-2 border-slate-300 pt-4 flex justify-between items-center font-bold text-slate-800 text-xs">
                    <span>TOTAL AKTIVA / ASET</span>
                    <span className="font-mono text-sm">{formatRupiah(totalAset)}</span>
                  </div>
                </div>

                {/* Right side: Pasiva */}
                <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/10 flex flex-col justify-between min-h-[400px]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 uppercase text-center tracking-wider">PASIVA (KEWAJIBAN & EKUITAS)</h3>
                    
                    {/* Liabilities */}
                    <div className="mt-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">1. KEWAJIBAN (HUTANG)</h4>
                      <div className="space-y-1 pl-2 border-l border-slate-100">
                        {kewajibanList.map((a) => (
                          <div key={a.id_akun} className="flex justify-between items-center py-2 border-b border-slate-100/50 text-xs">
                            <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="mt-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">2. EKUITAS (MODAL)</h4>
                      <div className="space-y-1 pl-2 border-l border-slate-100">
                        {ekuitasList.map((a) => (
                          <div key={a.id_akun} className="flex justify-between items-center py-2 border-b border-slate-100/50 text-xs">
                            <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                            </span>
                          </div>
                        ))}
                        
                        {/* Current Profit adjustment row */}
                        <div className="flex justify-between items-center py-2 border-b border-slate-100/50 text-xs bg-slate-50/50 px-2 rounded-lg mt-1.5 border border-slate-200/50">
                          <span className="font-bold text-slate-700">Laba Bersih Tahun Berjalan</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatRupiah(labaRugiBersih)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t-2 border-slate-300 pt-4 flex justify-between items-center font-bold text-slate-800 text-xs">
                    <span>TOTAL PASIVA</span>
                    <span className="font-mono text-sm">{formatRupiah(totalPasiva)}</span>
                  </div>
                </div>

              </div>
            ) : (
              // Income statement
              <div className="max-w-3xl mx-auto border border-slate-100 rounded-2xl p-6 bg-slate-50/10 space-y-6">
                <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 uppercase text-center tracking-wider">LAPORAN LABA RUGI</h3>
                
                <div className="space-y-6 text-xs">
                  {/* Revenue */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">I. PENDAPATAN OPERASIONAL</h4>
                    <div className="space-y-2 pl-4">
                      {pendapatanList.map((a) => (
                        <div key={a.id_akun} className="flex justify-between items-center py-1">
                          <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold text-slate-800 border-t border-slate-200 pt-2.5 mt-2">
                        <span>TOTAL PENDAPATAN</span>
                        <span className="font-mono">{formatRupiah(totalPendapatan)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">II. BEBAN OPERASIONAL & BIAYA</h4>
                    <div className="space-y-2 pl-4">
                      {bebanList.map((a) => (
                        <div key={a.id_akun} className="flex justify-between items-center py-1">
                          <span className="font-semibold text-slate-700">{a.nama_akun}</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatRupiah(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center font-bold text-slate-800 border-t border-slate-200 pt-2.5 mt-2">
                        <span>TOTAL BEBAN OPERASIONAL</span>
                        <span className="font-mono">{formatRupiah(totalBeban)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Result box */}
                  <div className={`p-4 rounded-2xl flex justify-between items-center font-bold text-xs border ${
                    labaRugiBersih >= 0 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-950' 
                      : 'bg-red-50 border-red-100 text-red-950'
                  }`}>
                    <span className="tracking-wide">LABA BERSIH TAHUN BERJALAN</span>
                    <span className="font-mono text-sm">{formatRupiah(labaRugiBersih)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </GlassCard>

    </div>
  )
}
