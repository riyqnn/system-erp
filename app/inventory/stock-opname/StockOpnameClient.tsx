'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Loader2, AlertCircle, FileSearch, CheckCircle2 } from 'lucide-react'
import Swal from 'sweetalert2'
import { AnyObject } from '@/lib/any'

export default function StockOpnameClient() {
  const [requests, setRequests] = useState<AnyObject[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Form State
  const [actualQty, setActualQty] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/inventory/stock-opname')
      const json = await res.json()
      if (res.ok) {
        setRequests(json.data || [])
      } else {
        Swal.fire('Gagal', json.error || 'Gagal memuat data dari database asli', 'error')
      }
    } catch {
      Swal.fire('Gagal', 'Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitOpname = async (valuation_id: string) => {
    const qty = actualQty[valuation_id]
    if (!qty) {
      Swal.fire('Peringatan', 'Masukkan actual physical quantity', 'warning')
      return
    }

    setProcessingId(valuation_id)
    try {
      const res = await fetch('/api/inventory/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valuation_id,
          actual_qty: Number(qty)
        })
      })

      const json = await res.json()
      if (res.ok) {
        Swal.fire('Sukses!', `Stock Opname selesai untuk VAL-${valuation_id}`, 'success')
        // Update local state
        setRequests(prev => prev.map(r => r.valuation_id === valuation_id ? { ...r, status: 'VALIDATED', quantity: Number(qty) } : r))
      } else {
        Swal.fire('Gagal', json.error || 'Gagal menyimpan ke database', 'error')
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
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Stock Opname & Audit
          </h2>
          <p className="text-muted-foreground mt-1">
            Proses rekonsiliasi nilai persediaan yang diminta oleh modul Finance.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari ID valuasi..." className="pl-8 bg-background/50 backdrop-blur-sm" />
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-lg font-medium">Tidak Ada Request Opname</p>
              <p className="text-sm text-muted-foreground">Antrean dari database kosong, pastikan Finance sudah menekan tombol request.</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.valuation_id} className={`overflow-hidden border-l-4 ${req.status === 'VALIDATED' ? 'border-l-emerald-500 opacity-70' : 'border-l-amber-500 shadow-md'}`}>
              <div className="flex flex-col md:flex-row">
                {/* Left Side: Request Info */}
                <div className="p-6 flex-1 bg-gradient-to-br from-background to-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">VAL-{req.valuation_id}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${req.status === 'VALIDATED' ? 'bg-emerald-500 text-white' : 'text-amber-600 border-amber-600'}`}>
                        {req.status}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted-foreground text-xs">Product ID</p>
                      <p className="font-medium">{req.product_id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">System Quantity</p>
                      <p className="font-medium text-blue-600">{req.quantity} units</p>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/30 flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-amber-800 dark:text-amber-400">Finance Period: </span>
                      <span className="text-amber-700 dark:text-amber-500">Valuation Discrepancy (Periode {req.period}). Harap audit kuantitas fisik.</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Area */}
                <div className="p-6 md:w-[400px] border-t md:border-t-0 md:border-l bg-muted/10 flex flex-col justify-center">
                  {req.status === 'VALIDATED' ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                      <p className="font-medium text-emerald-700 dark:text-emerald-400">Audit Selesai</p>
                      <p className="text-sm text-muted-foreground">
                        Kuantitas fisik aktual: <strong className="text-foreground">{req.quantity} units</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm border-b pb-2">Submit Hasil Opname (Real DB)</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`qty-${req.valuation_id}`} className="text-xs">Kuantitas Fisik Aktual</Label>
                          <Input 
                            id={`qty-${req.valuation_id}`}
                            type="number" 
                            placeholder="e.g. 1485"
                            value={actualQty[req.valuation_id] || ''}
                            onChange={(e) => setActualQty({...actualQty, [req.valuation_id]: e.target.value})}
                          />
                        </div>
                        <Button 
                          className="w-full bg-teal-600 hover:bg-teal-700" 
                          onClick={() => handleSubmitOpname(req.valuation_id)}
                          disabled={processingId === req.valuation_id || !actualQty[req.valuation_id]}
                        >
                          {processingId === req.valuation_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Submit ke Finance
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
