"use client";

import React, { useState } from "react";
import { FileText, ArrowRightLeft, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function InvoiceVerificationPage() {
  const [docRef, setDocRef] = useState("GR-2023-11A");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [variance, setVariance] = useState<number | null>(null);

  const poTotal = 15000000;
  const grTotal = 15000000;

  const handleVerify = () => {
    const inputTotal = Number(invoiceTotal.replace(/\D/g, ''));
    if (inputTotal) {
      setVariance(inputTotal - poTotal);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Invoice Verification (3-Way Match)</h1>
        <p className="text-slate-500 mt-1">Cross-check PO, GR, and Supplier Invoice (UC-INV-006)</p>
      </div>

      <div className="flex space-x-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            value={docRef}
            onChange={(e) => setDocRef(e.target.value)}
            className="pl-10 h-12 text-base bg-white"
            placeholder="Enter PO or GR Number"
          />
        </div>
        <Button variant="outline" className="h-12 bg-white">Load Documents</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        
        <div className="absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-slate-200 -z-10 -translate-y-1/2 hidden md:block"></div>

        
        <Card className="border-slate-200 shadow-sm bg-white relative z-10">
          <CardContent className="p-6 text-center">
            <div className="w-10 h-10 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Purchase Order</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">PO-2023-089</p>
            <h3 className="text-2xl font-semibold text-slate-900">{formatCurrency(poTotal)}</h3>
          </CardContent>
        </Card>

        
        <Card className="border-slate-200 shadow-sm bg-white relative z-10">
          <CardContent className="p-6 text-center">
            <div className="w-10 h-10 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Goods Receipt</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">GR-2023-11A</p>
            <h3 className="text-2xl font-semibold text-slate-900">{formatCurrency(grTotal)}</h3>
          </CardContent>
        </Card>

        
        <Card className={`border-2 shadow-sm relative z-10 transition-colors ${variance === 0 ? 'border-green-500 bg-green-50/10' : variance && variance > 0 ? 'border-[#EE4444] bg-red-50/10' : 'border-[#EE4444] bg-white'}`}>
          <CardContent className="p-6 text-center">
            <div className="w-10 h-10 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-[#EE4444]" />
            </div>
            <p className="text-sm font-medium text-[#EE4444] uppercase tracking-wider">Supplier Invoice</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">INV-SKM-991</p>
            <Input 
              placeholder="Rp 0" 
              className="text-center h-12 text-lg font-semibold bg-white"
              value={invoiceTotal}
              onChange={(e) => setInvoiceTotal(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-end items-center space-x-6">
        <Button variant="outline" className="h-12 border-slate-200" onClick={handleVerify}>
          <ArrowRightLeft className="w-4 h-4 mr-2" /> Run Variance Check
        </Button>
        
        {variance === 0 && (
          <Button className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white animate-in slide-in-from-right-4">
            <CheckCircle2 className="w-5 h-5 mr-2" /> Approve & Draft Payable
          </Button>
        )}
      </div>

      {variance !== null && variance !== 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-in slide-in-from-top-2">
          <p className="text-[#EE4444] font-medium text-sm">
            Variance detected: {formatCurrency(variance)}. Please provide a variance justification to proceed.
          </p>
          <textarea 
            className="w-full mt-3 p-3 text-sm border border-red-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-red-400" 
            placeholder="Reason for discrepancy..."
            rows={2}
          ></textarea>
        </div>
      )}
    </div>
  );
}
