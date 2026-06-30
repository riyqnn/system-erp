"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  
  CheckCircle2,
  Receipt,
  FileText,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface GoodsReceipt {
  receipt_id: number;
  gr_code: string;
  po_id: string | null;
  supplier_id: number;
  product_id: number;
  quantity: number;
  receipt_date: string;
  ms_product: {
    product_code: string;
    product_name: string;
    uom: string;
  } | null;
  ms_supplier: {
    supplier_name: string;
  } | null;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function InvoiceVerificationPage() {
  const [data, setData] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedGR, setSelectedGR] = useState<GoodsReceipt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  /* ── Fetch Data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/invoice-verification");
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch GRs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Process Invoice ───────────────────────────────────────────── */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGR) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/inventory/invoice-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt_id: selectedGR.receipt_id,
          po_id: selectedGR.po_id,
          supplier_id: selectedGR.supplier_id,
          invoice_amount: invoiceAmount,
          unit_price: unitPrice
        })
      });

      if (res.ok) {
        setSuccessMsg(`Invoice for ${selectedGR.gr_code} Verified! Accounts Payable Draft Created.`);
        fetchData();
      } else {
        const json = await res.json();
        alert(`Error: ${json.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to verify invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Variance Check ────────────────────────────────────────────── */
  const qty = selectedGR?.quantity || 0;
  const price = Number(unitPrice) || 0;
  const expectedTotal = qty * price;
  const actualTotal = Number(invoiceAmount) || 0;
  const variance = actualTotal - expectedTotal;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoice Verification</h1>
          <p className="text-sm text-slate-500 mt-1">Compare GR, PO, and Supplier Invoice (UC-INV-006)</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} className="text-slate-500" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Accepted GRs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search GR Code or Supplier..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-slate-400">Loading receipts...</div>
            ) : data.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending invoices to verify.</p>
              </div>
            ) : (
              data.filter(d => 
                (d.gr_code || "").toLowerCase().includes(search.toLowerCase()) || 
                (d.ms_supplier?.supplier_name || "").toLowerCase().includes(search.toLowerCase())
              ).map((gr) => (
                <div 
                  key={gr.receipt_id}
                  onClick={() => { setSelectedGR(gr); setSuccessMsg(null); setInvoiceAmount(""); setUnitPrice(""); }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedGR?.receipt_id === gr.receipt_id 
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{gr.gr_code}</span>
                    <span className="text-xs text-slate-500">{new Date(gr.receipt_date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-medium text-slate-900">{gr.ms_supplier?.supplier_name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{gr.quantity.toLocaleString()} {gr.ms_product?.uom} of {gr.ms_product?.product_name}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Verification Form */}
        <div className="lg:col-span-7">
          {selectedGR ? (
            <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 border-b border-slate-100 p-6 rounded-t-xl flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Verify Invoice</h2>
                  <p className="text-sm text-slate-500">GR Reference: <span className="font-mono">{selectedGR.gr_code}</span></p>
                </div>
                {selectedGR.po_id && (
                  <span className="bg-white border border-slate-200 px-3 py-1 rounded-md text-xs font-mono text-slate-600">PO Ref ID: {selectedGR.po_id}</span>
                )}
              </div>
              
              <CardContent className="p-0">
                {successMsg ? (
                  <div className="p-16 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Validation Complete</h3>
                    <p className="text-slate-500 max-w-sm">{successMsg}</p>
                    <Button variant="outline" className="mt-8" onClick={() => setSelectedGR(null)}>Close</Button>
                  </div>
                ) : (
                  <form onSubmit={handleVerify}>
                    <div className="p-6 space-y-6">
                      
                      {/* Match Data */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Product Received</p>
                          <p className="font-medium text-sm text-slate-900">{selectedGR.ms_product?.product_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Quantity (GR)</p>
                          <p className="font-bold text-blue-600 tabular-nums">{selectedGR.quantity.toLocaleString()} <span className="text-xs font-normal text-slate-500">{selectedGR.ms_product?.uom}</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Supplier</p>
                          <p className="font-medium text-sm text-slate-900">{selectedGR.ms_supplier?.supplier_name}</p>
                        </div>
                      </div>

                      {/* Invoice Inputs */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Price (from PO/Invoice)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
                            <Input required type="number" min="0" className="pl-9" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Invoice Amount</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
                            <Input required type="number" min="0" className="pl-9" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* Variance Check */}
                      {(unitPrice && invoiceAmount) && (
                        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                          Math.abs(variance) > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
                        }`}>
                          {Math.abs(variance) > 0 ? (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                          <div className="w-full">
                            <div className="flex justify-between items-center mb-1">
                              <p className={`font-semibold ${Math.abs(variance) > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                                {Math.abs(variance) > 0 ? "Variance Detected" : "Values Match Perfectly"}
                              </p>
                              <p className={`font-mono text-sm ${Math.abs(variance) > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                Diff: Rp {Math.abs(variance).toLocaleString()}
                              </p>
                            </div>
                            <p className={`text-sm ${Math.abs(variance) > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                              Expected total based on {selectedGR.quantity} units @ Rp {price.toLocaleString()} is <strong>Rp {expectedTotal.toLocaleString()}</strong>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setSelectedGR(null)}>Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2" disabled={isSubmitting || !unitPrice || !invoiceAmount}>
                        <DollarSign className="w-4 h-4" />
                        {isSubmitting ? "Verifying..." : "Verify & Create AP Draft"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Select a Receipt</p>
              <p className="text-sm mt-1 max-w-sm text-center">Click on a Goods Receipt from the list to begin invoice verification.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
