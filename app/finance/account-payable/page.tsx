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
  FileSpreadsheet
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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

export default function AccountPayablePage() {
  const [activeTab, setActiveTab] = useState<'daftar' | 'matching' | 'pengajuan'>('daftar')
  const [hutangList, setHutangList] = useState<Hutang[]>()
  const [poList, setPoList] = useState<PurchaseOrder[]>([])
  const [grList, setGrList] = useState<GoodsReceipt[]>([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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
      const apRes = await fetch('/api/finance/payable')
      const apJson = await apRes.json()
      if (apJson.data) setHutangList(apJson.data)

      const matchRes = await fetch('/api/finance/payable?mode=matching_data')
      const matchJson = await matchRes.json()
      if (matchJson.data) {
        setPoList(matchJson.data.poList || [])
        setGrList(matchJson.data.grList || [])
      }
    } catch (e) {
      console.error(e)
      showNotif('error', 'Gagal memuat data dari API. Beralih ke data mock.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
        loadData()
        setActiveTab('daftar')
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

  // Summary stats
  const totalHutang = (hutangList || [])
    .filter(h => h.status !== 'LUNAS')
    .reduce((sum, h) => sum + h.sisa_pembayaran, 0)

  const pendingPO = poList.length

  const filteredHutang = (hutangList || []).filter(h => 
    h.supplier_name.toLowerCase().includes(searchSup.toLowerCase()) || h.no_invoice.includes(searchSup)
  )

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 pb-12 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CreditCard className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Account Payable (Hutang)</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">PT. Mayora Indah Tbk · Three-Way Matching & Pengajuan Pembayaran Pemasok</p>
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

      {/* Tabs */}
      <div className="flex border-b-2 border-black bg-slate-100 p-1.5 rounded-xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-2">
        <button 
          onClick={() => setActiveTab('daftar')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'daftar' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <CreditCard className="w-4 h-4" /> Daftar Hutang
        </button>
        <button 
          onClick={() => setActiveTab('matching')}
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg border-2 border-transparent transition-all flex items-center justify-center gap-2 ${activeTab === 'matching' ? 'bg-white border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <FileCheck2 className="w-4 h-4" /> Verifikasi Three-Way Matching
        </button>
      </div>

      {activeTab === 'daftar' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* List Table */}
          <div className="xl:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200">
              <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" /> Histori Tagihan Hutang Usaha (AP)
              </h2>
              <Input 
                placeholder="Cari Supplier / Invoice..." 
                value={searchSup}
                onChange={(e) => setSearchSup(e.target.value)}
                className="h-8 border-2 border-black font-semibold text-xs max-w-[200px]"
              />
            </div>

            <div className="overflow-x-auto">
              <Table className="border-2 border-black">
                <TableHeader className="bg-slate-100 border-b-2 border-black">
                  <TableRow>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-32">No Invoice</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black">Nama Supplier</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">Jatuh Tempo</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Total Tagihan</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-right w-36">Sisa Hutang</TableHead>
                    <TableHead className="font-bold text-black border-r-2 border-black text-center w-28">Status</TableHead>
                    <TableHead className="font-bold text-black text-center w-24">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredHutang || filteredHutang.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 font-bold text-slate-400">
                        Tidak ada kewajiban hutang terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHutang.map((h) => (
                      <TableRow key={h.id_hutang} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <TableCell className="font-mono font-bold border-r-2 border-black text-center text-xs">{h.no_invoice}</TableCell>
                        <TableCell className="font-bold text-black text-xs border-r-2 border-black">{h.supplier_name}</TableCell>
                        <TableCell className="border-r-2 border-black text-center text-xs font-semibold">
                          {new Date(h.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </TableCell>
                        <TableCell className="border-r-2 border-black text-right font-mono text-xs font-semibold">Rp {h.jumlah.toLocaleString()}</TableCell>
                        <TableCell className="border-r-2 border-black text-right font-mono text-xs font-bold text-slate-700">Rp {h.sisa_pembayaran.toLocaleString()}</TableCell>
                        <TableCell className="border-r-2 border-black text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border uppercase ${h.status === 'LUNAS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : h.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {h.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          {h.status !== 'LUNAS' && (
                            <Button 
                              type="button" 
                              onClick={() => {
                                setSelectedHutang(h)
                                setJumlahBayarPengajuan(h.sisa_pembayaran)
                              }}
                              className="h-7 px-3 border border-black bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                              Ajukan Bayar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Form Pengajuan Pembayaran (Permintaan Pembayaran) */}
          <div className="xl:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-orange-600" /> Form Pengajuan Pembayaran AP
            </h2>

            {selectedHutang ? (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div className="bg-orange-50 p-4 border border-orange-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-500">TAGIHAN INVOICE:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedHutang.no_invoice}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-500">SUPPLIER:</span>
                    <span className="font-bold text-slate-800">{selectedHutang.supplier_name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-500">SISA HUTANG:</span>
                    <span className="font-mono font-black text-slate-900">Rp {selectedHutang.sisa_pembayaran.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Metode Pembayaran</label>
                  <select
                    value={metodeBayar}
                    onChange={(e) => setMetodeBayar(e.target.value as 'TRANSFER' | 'KAS_KECIL' | 'GIRO')}
                    className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg mt-1 focus:outline-none"
                    required
                  >
                    <option value="TRANSFER">TRANSFER BANK (OPERASIONAL)</option>
                    <option value="KAS_KECIL">KAS KECIL (PETTY CASH)</option>
                    <option value="GIRO">GIRO / CEK</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Jumlah Pembayaran Diajukan (IDR)</label>
                  <Input 
                    type="number" 
                    value={jumlahBayarPengajuan || ''}
                    onChange={(e) => setJumlahBayarPengajuan(Number(e.target.value))}
                    max={selectedHutang.sisa_pembayaran}
                    className="border-2 border-black font-bold mt-1" 
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Alasan & Keterangan Pengajuan</label>
                  <textarea 
                    value={keteranganPengajuan}
                    onChange={(e) => setKeteranganPengajuan(e.target.value)}
                    className="w-full min-h-[70px] p-2.5 text-xs font-semibold border-2 border-black rounded-lg mt-1 focus:outline-none" 
                    placeholder="Contoh: Pelunasan tagihan bahan baku bogasari tahap 1"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" onClick={() => setSelectedHutang(null)} className="flex-1 border-2 border-black bg-white hover:bg-slate-50 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-2 text-xs">
                    Batal
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 border-2 border-black bg-orange-500 hover:bg-orange-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-2 text-xs">
                    {loading ? 'Memproses...' : 'Kirim Pengajuan'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg space-y-3">
                <HelpCircle className="w-12 h-12 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500 max-w-[200px]">
                  Pilih salah satu kewajiban hutang usaha untuk diajukan pembayarannya ke Management.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'matching' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matching Validator Form */}
          <div className="lg:col-span-1 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-orange-600" /> Matching Validator
            </h2>

            <form onSubmit={handleMatchingSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nomor Invoice Baru</label>
                <Input 
                  placeholder="Contoh: PINV-202606-9901" 
                  value={noInvoiceInput}
                  onChange={(e) => setNoInvoiceInput(e.target.value)}
                  className="border-2 border-black font-semibold mt-1" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Purchase Order (PO)</label>
                <select
                  value={selectedPoNo}
                  onChange={(e) => handlePoChange(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg mt-1 focus:outline-none"
                  required
                >
                  <option value="">-- PILIH NOMOR PO --</option>
                  {poList.map((po) => (
                    <option key={po.id_po} value={po.no_po}>{po.no_po} ({po.supplier_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Goods Receipt (GR)</label>
                <select
                  value={selectedGrCode}
                  onChange={(e) => setSelectedGrCode(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg mt-1 focus:outline-none"
                  required
                >
                  <option value="">-- PILIH KODE GR --</option>
                  {grList.map((gr) => (
                    <option key={gr.receipt_id} value={gr.gr_code}>{gr.gr_code} (Qty: {gr.quantity} - {gr.product_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">ID Supplier</label>
                <Input 
                  type="number"
                  value={supplierIdInput || ''}
                  onChange={(e) => setSupplierIdInput(Number(e.target.value))}
                  className="border-2 border-black font-semibold mt-1 bg-slate-50" 
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Jumlah Tagihan (IDR)</label>
                <Input 
                  type="number" 
                  value={jumlahInput || ''}
                  onChange={(e) => setJumlahInput(Number(e.target.value))}
                  className="border-2 border-black font-bold mt-1" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tgl Invoice</label>
                  <Input 
                    type="date" 
                    value={tanggalInvoiceInput}
                    onChange={(e) => setTanggalInvoiceInput(e.target.value)}
                    className="border-2 border-black text-xs font-semibold mt-1" 
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Jatuh Tempo</label>
                  <Input 
                    type="date" 
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="border-2 border-black text-xs font-semibold mt-1" 
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full border-2 border-black bg-orange-500 hover:bg-orange-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold py-3 uppercase tracking-wider text-xs">
                {loading ? 'Memverifikasi...' : 'Verifikasi & Simpan Hutang'}
              </Button>
            </form>
          </div>

          {/* PO/GR Matching Reference Logs */}
          <div className="lg:col-span-2 border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            <h2 className="text-lg font-bold border-b-2 border-black pb-3 uppercase tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-orange-600" /> Referensi Data PO & GR Aktif (Modul Purchasing & Gudang)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PO List */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b pb-2">Purchase Orders (PO) Aktif</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {poList.map((po) => (
                    <div key={po.id_po} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="font-mono text-slate-800">{po.no_po}</span>
                        <span className="text-orange-600 font-mono">Rp {po.total_harga.toLocaleString()}</span>
                      </div>
                      <p className="font-semibold text-slate-700">Supplier: {po.supplier_name} (ID: {po.supplier_id})</p>
                      <p className="text-slate-500">Item: {po.product_name} · Qty: {po.qty}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* GR List */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b pb-2">Goods Receipts (GR) Aktif</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {grList.map((gr) => (
                    <div key={gr.receipt_id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="font-mono text-slate-800">{gr.gr_code}</span>
                        <span className="text-emerald-600">Qty: {gr.quantity}</span>
                      </div>
                      <p className="font-semibold text-slate-700">Supplier: {gr.supplier_name} (ID: {gr.supplier_id})</p>
                      <p className="text-slate-500">Item: {gr.product_name} · Status: {gr.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
