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
  DollarSign
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 pb-12 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Book className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">General Ledger (Buku Besar)</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">PT. Mayora Indah Tbk · Accounting & Financial Reporting Module</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold gap-2">
            <Printer className="w-4 h-4" /> Cetak
          </Button>
          <Button variant="outline" className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notif && (
        <div className={`p-4 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
          {notif.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span className="text-sm font-semibold">{notif.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-black bg-slate-100 p-1.5 rounded-xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-2">
        <button 
          onClick={() => setActiveTab('jurnal')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'jurnal' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Jurnal & Posting
        </button>
        <button 
          onClick={() => setActiveTab('coa')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'coa' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <List className="w-4 h-4" /> Chart of Accounts (COA)
        </button>
        <button 
          onClick={() => setActiveTab('laporan')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'laporan' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <DollarSign className="w-4 h-4" /> Laporan Keuangan
        </button>
      </div>

      {/* Contents */}
      {activeTab === 'jurnal' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form Jurnal Baru (Neobrutalist) */}
          <div className="xl:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-red-600" /> Posting Jurnal Manual
            </h2>
            <form onSubmit={handlePostJurnal} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Transaksi</label>
                <Input 
                  type="date" 
                  value={tanggalJurnal} 
                  onChange={(e) => setTanggalJurnal(e.target.value)}
                  className="border-2 border-black font-semibold mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan Jurnal</label>
                <textarea 
                  value={keteranganJurnal}
                  onChange={(e) => setKeteranganJurnal(e.target.value)}
                  className="w-full min-h-[80px] p-3 text-sm font-medium border-2 border-black rounded-lg focus:outline-none focus:ring-0 mt-1" 
                  placeholder="Deskripsi transaksi (e.g. Koreksi Saldo Kas, Pembayaran Operasional)"
                  required
                />
              </div>

              {/* Rows Detail */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Baris Detail Jurnal</label>
                  <Button type="button" onClick={addFormRow} size="sm" className="h-8 border-2 border-black bg-slate-100 hover:bg-slate-200 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                  </Button>
                </div>

                {formDetails.map((detail, index) => (
                  <div key={index} className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex-1 space-y-2">
                      <select 
                        value={detail.akun_id}
                        onChange={(e) => handleDetailChange(index, 'akun_id', e.target.value)}
                        className="w-full text-xs font-bold p-2 border-2 border-black rounded-md focus:outline-none"
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
                          className="border-2 border-black text-xs font-bold h-9"
                        />
                        <Input 
                          type="number" 
                          placeholder="Kredit" 
                          value={detail.kredit || ''} 
                          onChange={(e) => handleDetailChange(index, 'kredit', e.target.value)}
                          className="border-2 border-black text-xs font-bold h-9"
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFormRow(index)}
                      className="p-2 border-2 border-black hover:bg-red-50 hover:text-red-600 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white transition-all self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Status Verification indicator */}
              <div className={`p-4 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${isBalance ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>TOTAL DEBET:</span>
                  <span className="font-mono">{formatRupiah(totalDebet)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold mt-1">
                  <span>TOTAL KREDIT:</span>
                  <span className="font-mono">{formatRupiah(totalKredit)}</span>
                </div>
                <div className="border-t border-black/20 my-2" />
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>STATUS BALANCE:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold ${isBalance ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {isBalance ? 'SEIMBANG' : 'TIDAK BALANCE'}
                  </span>
                </div>
              </div>

              <Button type="submit" disabled={!isBalance || loading} className="w-full border-2 border-black bg-red-600 hover:bg-red-700 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-3 uppercase tracking-wider text-xs">
                {loading ? 'Memproses...' : 'Posting Jurnal'}
              </Button>
            </form>
          </div>

          {/* Histori Jurnal Buku Besar */}
          <div className="xl:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <Book className="w-5 h-5 text-red-600" /> Histori Entri Jurnal Buku Besar
            </h2>
            
            <div className="overflow-x-auto">
              <Table className="border-2 border-black">
                <TableHeader className="bg-slate-100 border-b-2 border-black">
                  <TableRow>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">No Jurnal</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-24">Tanggal</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black">Keterangan / Rincian Akun</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Debet</TableHead>
                    <TableHead className="font-bold text-black text-right w-36">Kredit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jurnalList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 font-bold text-slate-400">
                        Belum ada histori jurnal tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    jurnalList.map((j) => (
                      <React.Fragment key={j.id_jurnal}>
                        {/* Jurnal Header Row */}
                        <TableRow className="bg-slate-50 border-t-2 border-black">
                          <TableCell className="font-mono font-bold border-r-2 border-black text-center text-xs">{j.no_jurnal}</TableCell>
                          <TableCell className="font-semibold border-r-2 border-black text-center text-xs">
                            {new Date(j.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="font-bold border-r-2 border-black text-black text-xs uppercase" colSpan={3}>
                            {j.keterangan}
                          </TableCell>
                        </TableRow>
                        {/* Detail Rows */}
                        {j.tr_jurnal_detail.map((jd, idx) => (
                          <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="border-r-2 border-black" />
                            <TableCell className="border-r-2 border-black" />
                            <TableCell className="border-r-2 border-black text-xs font-semibold">
                              <span className={jd.kredit > 0 ? "ml-8 text-slate-600 font-medium" : "text-slate-800"}>
                                {jd.kode_akun || 'Akun'} - {jd.nama_akun || 'Detail Akun'}
                              </span>
                            </TableCell>
                            <TableCell className="border-r-2 border-black text-right font-mono font-semibold text-xs text-slate-700">
                              {jd.debet > 0 ? formatRupiah(jd.debet) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-xs text-slate-700">
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

      {activeTab === 'coa' && (
        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
          {/* Header COA & Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
            <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
              <List className="w-5 h-5 text-red-600" /> Chart of Accounts (Daftar Akun)
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cari kode atau nama akun..." 
                  value={searchCoa}
                  onChange={(e) => setSearchCoa(e.target.value)}
                  className="pl-9 pr-4 h-9 border-2 border-black font-semibold min-w-[240px]"
                />
              </div>
              {/* Kategori Filter */}
              <div className="flex gap-1 border-2 border-black rounded-lg p-1 bg-slate-100">
                {['ALL', 'ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN'].map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setFilterKategori(kat)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterKategori === kat ? 'bg-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-black' : 'text-slate-500 hover:text-black'}`}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="border-2 border-black">
              <TableHeader className="bg-slate-100 border-b-2 border-black">
                <TableRow>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-36">Kode Akun</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black">Nama Rekening Akun</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-40">Kategori</TableHead>
                  <TableHead className="font-bold text-black border-r-2 border-black text-center w-32">Saldo Normal</TableHead>
                  <TableHead className="font-bold text-black text-right w-52">Saldo Berjalan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAkun.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 font-bold text-slate-400">
                      Akun tidak ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAkun.map((a) => (
                    <TableRow key={a.id_akun} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold border-r-2 border-black text-center text-sm">{a.kode_akun}</TableCell>
                      <TableCell className="font-bold text-black text-sm">{a.nama_akun}</TableCell>
                      <TableCell className="border-r-2 border-l-2 border-black text-center">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border border-black/10 font-extrabold uppercase ${a.kategori === 'ASET' ? 'bg-blue-50 text-blue-700' : a.kategori === 'KEWAJIBAN' ? 'bg-orange-50 text-orange-700' : a.kategori === 'EKUITAS' ? 'bg-purple-50 text-purple-700' : a.kategori === 'PENDAPATAN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {a.kategori}
                        </span>
                      </TableCell>
                      <TableCell className="border-r-2 border-black text-center text-xs font-bold text-slate-500">{a.saldo_normal}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-slate-900">{formatRupiah(a.saldo_berjalan)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'laporan' && (
        <div className="border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
          {/* Toggle Neraca / Laba Rugi */}
          <div className="flex border-b-2 border-black pb-4 justify-between items-center flex-wrap gap-4">
            <div className="flex gap-2 border-2 border-black rounded-lg p-1 bg-slate-100">
              <button 
                onClick={() => setReportSubTab('neraca')}
                className={`px-4 py-2 text-sm font-bold uppercase rounded-md transition-all ${reportSubTab === 'neraca' ? 'bg-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-black' : 'text-slate-500 hover:text-black'}`}
              >
                Neraca (Balance Sheet)
              </button>
              <button 
                onClick={() => setReportSubTab('labarugi')}
                className={`px-4 py-2 text-sm font-bold uppercase rounded-md transition-all ${reportSubTab === 'labarugi' ? 'bg-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-black' : 'text-slate-500 hover:text-black'}`}
              >
                Laba Rugi (Income Statement)
              </button>
            </div>
            <div className="text-sm font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Periode Laporan: <span className="font-mono">Juni 2026</span>
            </div>
          </div>

          {reportSubTab === 'neraca' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aktiva (Aset) */}
              <div className="border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-5">
                <h3 className="text-base font-bold bg-slate-100 border-2 border-black p-3 uppercase mb-4 text-center">AKTIVA (ASET)</h3>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {asetList.map((a) => (
                    <div key={a.id_akun} className="flex justify-between items-center py-2 border-b border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-500">{a.kode_akun}</p>
                        <p className="text-sm font-semibold text-slate-800">{a.nama_akun}</p>
                      </div>
                      <p className="font-mono font-bold text-sm text-slate-900">
                        {formatRupiah(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t-4 border-black pt-4 flex justify-between items-center font-extrabold text-black uppercase">
                  <span>TOTAL AKTIVA / ASET:</span>
                  <span className="font-mono text-lg">{formatRupiah(totalAset)}</span>
                </div>
              </div>

              {/* Pasiva (Kewajiban & Ekuitas) */}
              <div className="border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold bg-slate-100 border-2 border-black p-3 uppercase mb-4 text-center">PASIVA (KEWAJIBAN & EKUITAS)</h3>
                  
                  {/* Kewajiban */}
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">1. KEWAJIBAN (HUTANG)</h4>
                  <div className="space-y-2 border-b-2 border-dashed border-slate-200 pb-3 mb-4">
                    {kewajibanList.map((a) => (
                      <div key={a.id_akun} className="flex justify-between items-center py-2 border-b border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-500">{a.kode_akun}</p>
                          <p className="text-sm font-semibold text-slate-800">{a.nama_akun}</p>
                        </div>
                        <p className="font-mono font-bold text-sm text-slate-900">
                          {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                        </p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 mt-2">
                      <span>TOTAL KEWAJIBAN:</span>
                      <span className="font-mono">{formatRupiah(totalKewajiban)}</span>
                    </div>
                  </div>

                  {/* Ekuitas */}
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">2. EKUITAS (MODAL)</h4>
                  <div className="space-y-2">
                    {ekuitasList.map((a) => (
                      <div key={a.id_akun} className="flex justify-between items-center py-2 border-b border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-500">{a.kode_akun}</p>
                          <p className="text-sm font-semibold text-slate-800">{a.nama_akun}</p>
                        </div>
                        <p className="font-mono font-bold text-sm text-slate-900">
                          {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                        </p>
                      </div>
                    ))}
                    {/* Retained earning adjustment based on net profit from income statement */}
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-red-50/30 p-2 rounded border border-red-100">
                      <div>
                        <p className="text-xs font-bold text-slate-500">3099</p>
                        <p className="text-sm font-semibold text-slate-800">Laba Bersih Tahun Berjalan</p>
                      </div>
                      <p className="font-mono font-bold text-sm text-slate-900">
                        {formatRupiah(labaRugiBersih)}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 mt-2">
                      <span>TOTAL EKUITAS:</span>
                      <span className="font-mono">{formatRupiah(totalEkuitas + labaRugiBersih)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t-4 border-black pt-4 flex justify-between items-center font-extrabold text-black uppercase">
                  <span>TOTAL PASIVA:</span>
                  <span className="font-mono text-lg">{formatRupiah(totalPasiva)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-black bg-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-6 max-w-4xl mx-auto">
              <h3 className="text-base font-bold bg-slate-100 border-2 border-black p-3 uppercase mb-6 text-center">LAPORAN LABA RUGI</h3>
              
              <div className="space-y-6">
                {/* Pendapatan */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 border-b pb-1">I. PENDAPATAN OPERASIONAL</h4>
                  <div className="space-y-2 pl-4">
                    {pendapatanList.map((a) => (
                      <div key={a.id_akun} className="flex justify-between items-center py-1">
                        <span className="text-sm font-semibold text-slate-700">{a.nama_akun}</span>
                        <span className="font-mono font-semibold text-sm text-slate-900">
                          {formatRupiah(a.saldo_normal === 'KREDIT' ? a.saldo_berjalan : -a.saldo_berjalan)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center font-bold text-black border-t-2 border-dashed border-black/20 pt-2 mt-2">
                      <span>TOTAL PENDAPATAN:</span>
                      <span className="font-mono">{formatRupiah(totalPendapatan)}</span>
                    </div>
                  </div>
                </div>

                {/* Beban */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 border-b pb-1">II. BEBAN OPERASIONAL & BIAYA</h4>
                  <div className="space-y-2 pl-4">
                    {bebanList.map((a) => (
                      <div key={a.id_akun} className="flex justify-between items-center py-1">
                        <span className="text-sm font-semibold text-slate-700">{a.nama_akun}</span>
                        <span className="font-mono font-semibold text-sm text-slate-900">
                          {formatRupiah(a.saldo_normal === 'DEBET' ? a.saldo_berjalan : -a.saldo_berjalan)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center font-bold text-black border-t-2 border-dashed border-black/20 pt-2 mt-2">
                      <span>TOTAL BEBAN OPERASIONAL:</span>
                      <span className="font-mono">{formatRupiah(totalBeban)}</span>
                    </div>
                  </div>
                </div>

                {/* Laba Bersih */}
                <div className={`border-2 border-black p-4 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center font-extrabold uppercase ${labaRugiBersih >= 0 ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-red-50 border-red-500 text-red-900'}`}>
                  <span>LABA BERSIH TAHUN BERJALAN:</span>
                  <span className="font-mono text-lg">{formatRupiah(labaRugiBersih)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
