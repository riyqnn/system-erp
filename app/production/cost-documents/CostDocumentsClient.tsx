'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Loader2, AlertCircle, FileSearch, CheckCircle2, Factory } from 'lucide-react'
import Swal from 'sweetalert2'
import { AnyObject } from '@/lib/any'
import { ModuleLayout } from '@/components/layout/ModuleLayout'

export default function CostDocumentsClient() {
  const [docs, setDocs] = useState<AnyObject[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState<{ [key: string]: { notes: string, material_cost: number, labor_cost: number, other_cost: number } }>({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchDocs()
  }, [])

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/production/cost-documents')
      const json = await res.json()
      if (res.ok) {
        setDocs(json.data || [])
        // Init form data
        const initialForm: Record<string, {notes: string, material_cost: number, labor_cost: number, other_cost: number}> = {}
        ;(json.data || []).forEach((d: AnyObject) => {
          initialForm[d.settlement_id] = {
            notes: '',
            material_cost: d.material_cost || 0,
            labor_cost: d.labor_cost || 0,
            other_cost: d.other_cost || 0
          }
        })
        setFormData(initialForm)
      } else {
        Swal.fire('Gagal', json.error || 'Gagal memuat antrean dokumen biaya', 'error')
      }
    } catch {
      Swal.fire('Gagal', 'Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateField = (id: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  const handleResubmit = async (settlement_id: string) => {
    const data = formData[settlement_id];
    
    if (data.material_cost <= 0 && data.labor_cost <= 0 && data.other_cost <= 0) {
      Swal.fire('Peringatan', 'Harap isi minimal salah satu biaya dengan nilai valid.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Resubmit Dokumen?',
      text: `Kirim ulang ${settlement_id} ke Cost Accounting?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kirim Ulang',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return;

    setProcessingId(settlement_id)
    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
    try {
      const res = await fetch('/api/production/cost-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlement_id,
          ...data,
          notes: data.notes || 'Telah direvisi oleh Production'
        })
      })

      const json = await res.json()
      if (res.ok) {
        Swal.fire('Sukses!', `Dokumen ${settlement_id} berhasil dikirim ulang.`, 'success')
        // Update local state
        setDocs(prev => prev.map(doc => doc.settlement_id === settlement_id ? { ...doc, settlement_status: 'RECEIVED' } : doc))
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
    <ModuleLayout
      activeModule="production"
      moduleTitle="Production"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Production', href: '/production' },
        { label: 'Cost Documents' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Cost Document Returns
          </h2>
          <p className="text-muted-foreground mt-1">
            Lengkapi data dokumen biaya produksi yang dikembalikan oleh Cost Accounting.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nomor dokumen..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background/50 backdrop-blur-sm" 
          />
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : docs.filter(doc => 
            doc.settlement_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (doc.prod_order_id || '').toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSearch className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-lg font-medium">Tidak Ada Dokumen yang Dikembalikan</p>
              <p className="text-sm text-muted-foreground">Semua dokumen biaya produksi berjalan lancar.</p>
            </CardContent>
          </Card>
        ) : (
          docs
            .filter(doc => 
              doc.settlement_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (doc.prod_order_id || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((doc) => (
            <Card key={doc.settlement_id} className={`overflow-hidden border-l-4 ${doc.settlement_status === 'RECEIVED' ? 'border-l-blue-500 opacity-70' : 'border-l-amber-500 shadow-md'}`}>
              <div className="flex flex-col md:flex-row">
                {/* Left Side: Info */}
                <div className="p-6 flex-1 bg-gradient-to-br from-background to-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{doc.settlement_id}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${doc.settlement_status === 'RECEIVED' ? 'bg-blue-500 text-white' : 'text-amber-600 border-amber-600'}`}>
                        {doc.settlement_status === 'RECEIVED' ? 'RECEIVED' : 'RETURNED'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">
                      PO Ref: {doc.prod_order_id}
                    </span>
                  </div>

                  <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/30 flex items-start gap-2 text-sm mb-4">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-amber-800 dark:text-amber-400">Cost Accounting Note: </span>
                      <span className="text-amber-700 dark:text-amber-500">Rincian biaya (material, TK, overhead) tidak lengkap atau tidak valid. Harap perbarui data biaya produksi.</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Area */}
                <div className="p-6 md:w-[500px] border-t md:border-t-0 md:border-l bg-muted/10 flex flex-col justify-center">
                  {doc.settlement_status === 'RECEIVED' ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
                      <CheckCircle2 className="h-10 w-10 text-blue-500 mb-2" />
                      <p className="font-medium text-blue-700 dark:text-blue-400">Telah Dikirim Ulang</p>
                      <p className="text-sm text-muted-foreground">
                        Dokumen sedang diproses kalkulasi HPP oleh Finance.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm border-b pb-2 flex items-center gap-1.5">
                        <Factory className="w-4 h-4 text-slate-500" /> Update Biaya Produksi
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Material Cost</Label>
                          <Input 
                            type="number"
                            className="h-8 text-xs font-mono"
                            value={formData[doc.settlement_id]?.material_cost || ''}
                            onChange={(e) => handleUpdateField(doc.settlement_id, 'material_cost', Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Labor Cost</Label>
                          <Input 
                            type="number"
                            className="h-8 text-xs font-mono"
                            value={formData[doc.settlement_id]?.labor_cost || ''}
                            onChange={(e) => handleUpdateField(doc.settlement_id, 'labor_cost', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Other/Overhead Cost</Label>
                          <Input 
                            type="number"
                            className="h-8 text-xs font-mono"
                            value={formData[doc.settlement_id]?.other_cost || ''}
                            onChange={(e) => handleUpdateField(doc.settlement_id, 'other_cost', Number(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Catatan Revisi</Label>
                          <Input 
                            className="h-8 text-xs"
                            placeholder="Data biaya telah dikoreksi..."
                            value={formData[doc.settlement_id]?.notes || ''}
                            onChange={(e) => handleUpdateField(doc.settlement_id, 'notes', e.target.value)}
                          />
                        </div>
                      </div>

                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700 mt-2" 
                        onClick={() => handleResubmit(doc.settlement_id)}
                        disabled={processingId === doc.settlement_id}
                      >
                        {processingId === doc.settlement_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Kirim Ulang Dokumen
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
    </ModuleLayout>
  )
}
