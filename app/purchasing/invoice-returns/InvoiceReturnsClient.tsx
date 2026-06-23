'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Loader2, AlertCircle, FileSearch, CheckCircle2, RotateCcw } from 'lucide-react'
import Swal from 'sweetalert2'
import { AnyObject } from '@/lib/any'

export default function InvoiceReturnsClient() {
  const [invoices, setInvoices] = useState<AnyObject[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Form State
  const [notes, setNotes] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/purchasing/invoice-returns')
      const json = await res.json()
      if (res.ok) {
        setInvoices(json.data || [])
      } else {
        Swal.fire('Gagal', json.error || 'Gagal memuat antrean invoice return', 'error')
      }
    } catch {
      Swal.fire('Gagal', 'Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResubmit = async (ap_id: string, no_invoice: string) => {
    const result = await Swal.fire({
      title: 'Resubmit Invoice?',
      text: `Kirim ulang ${no_invoice} ke Finance (Account Payable) setelah perbaikan data?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kirim Ulang',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return;

    setProcessingId(ap_id)
    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
    try {
      const res = await fetch('/api/purchasing/invoice-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ap_id,
          no_invoice,
          notes: notes[ap_id] || 'Telah direvisi oleh Purchasing'
        })
      })

      const json = await res.json()
      if (res.ok) {
        Swal.fire('Sukses!', `Invoice ${no_invoice} berhasil dikirim ulang ke AP.`, 'success')
        // Update local state
        setInvoices(prev => prev.map(inv => inv.ap_id === ap_id ? { ...inv, ap_status: 'PENDING_VERIFICATION' } : inv))
      } else {
        Swal.fire('Gagal', json.error || 'Gagal mengirim ulang ke Finance', 'error')
      }
    } catch {
      Swal.fire('Gagal', 'Network error', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Invoice Discrepancy Returns
          </h2>
          <p className="text-muted-foreground mt-1">
            Revisi dan konfirmasi ulang purchase invoice yang dikembalikan oleh Finance (Account Payable).
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nomor invoice..." className="pl-8 bg-background/50 backdrop-blur-sm" />
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : invoices.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-lg font-medium">Tidak Ada Invoice Terkendala</p>
              <p className="text-sm text-muted-foreground">Semua invoice berjalan lancar di tim Finance.</p>
            </CardContent>
          </Card>
        ) : (
          invoices.map((inv) => (
            <Card key={inv.ap_id} className={`overflow-hidden border-l-4 ${inv.ap_status === 'PENDING_VERIFICATION' ? 'border-l-blue-500 opacity-70' : 'border-l-rose-500 shadow-md'}`}>
              <div className="flex flex-col md:flex-row">
                {/* Left Side: Info */}
                <div className="p-6 flex-1 bg-gradient-to-br from-background to-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{inv.inv_supp_no}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${inv.ap_status === 'PENDING_VERIFICATION' ? 'bg-blue-500 text-white' : 'text-rose-600 border-rose-600'}`}>
                        {inv.ap_status === 'PENDING_VERIFICATION' ? 'RESUBMITTED' : 'RETURNED'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Diterbitkan: {new Date(inv.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Supplier</p>
                      <p className="font-medium">{inv.ms_supplier?.supplier_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Amount</p>
                      <p className="font-medium text-rose-600 font-mono">Rp {Number(inv.ap_amount).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-md border border-rose-100 dark:border-rose-900/30 flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-rose-800 dark:text-rose-400">Finance Note: </span>
                      <span className="text-rose-700 dark:text-rose-500">Harga atau kuantitas tidak sesuai dengan Purchase Order / Goods Receipt (Discrepancy). Mohon verifikasi ulang ke Supplier.</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Area */}
                <div className="p-6 md:w-[400px] border-t md:border-t-0 md:border-l bg-muted/10 flex flex-col justify-center">
                  {inv.ap_status === 'PENDING_VERIFICATION' ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
                      <CheckCircle2 className="h-10 w-10 text-blue-500 mb-2" />
                      <p className="font-medium text-blue-700 dark:text-blue-400">Telah Dikirim Ulang</p>
                      <p className="text-sm text-muted-foreground">
                        Invoice sedang diperiksa kembali oleh tim Account Payable.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm border-b pb-2 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-slate-500" /> Resubmit Invoice
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`notes-${inv.ap_id}`} className="text-xs">Catatan Resolusi (Wajib)</Label>
                          <Input 
                            id={`notes-${inv.ap_id}`}
                            placeholder="e.g. Harga sudah disesuaikan dengan faktur asli"
                            value={notes[inv.ap_id] || ''}
                            onChange={(e) => setNotes({...notes, [inv.ap_id]: e.target.value})}
                          />
                        </div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700" 
                          onClick={() => handleResubmit(inv.ap_id, inv.inv_supp_no)}
                          disabled={processingId === inv.ap_id || !notes[inv.ap_id]}
                        >
                          {processingId === inv.ap_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Kirim Ulang ke AP
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
