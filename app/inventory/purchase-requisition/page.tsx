"use client";

import React, { useState } from "react";
import { Plus, Search, Building2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PurchaseRequisitionPage() {
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const vendors = [
    { id: "V-001", name: "PT Sumber Kopi Makmur" },
    { id: "V-002", name: "PT Packaging Indah" },
    { id: "V-003", name: "CV Gula Nusantara" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Create Purchase Requisition</h1>
        <p className="text-slate-500 mt-1">Request materials for shortage (UC-INV-004)</p>
      </div>

      {!isSubmitted ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center">
              <div className="w-6 h-6 rounded-full bg-[#EE4444] text-white flex items-center justify-center text-xs font-bold mr-3">1</div>
              <h2 className="text-lg font-medium text-slate-900">Select Vendor</h2>
            </div>
            <CardContent className="p-6">
              <div className="relative mb-4">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Search vendor by name or ID (Cmd/Ctrl + K)" 
                  className="pl-10 h-12 text-base border-slate-200 focus:border-slate-300"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {vendors.map((v) => (
                  <div 
                    key={v.id}
                    onClick={() => setSelectedVendor(v.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center space-x-3
                      ${selectedVendor === v.id 
                        ? 'border-[#EE4444] bg-red-50/50 ring-1 ring-[#EE4444]' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <Building2 className={`w-5 h-5 ${selectedVendor === v.id ? 'text-[#EE4444]' : 'text-slate-400'}`} />
                    <div>
                      <p className={`text-sm font-medium ${selectedVendor === v.id ? 'text-[#EE4444]' : 'text-slate-900'}`}>{v.name}</p>
                      <p className="text-xs text-slate-500">{v.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          
          <Card className="border-slate-200 shadow-sm overflow-hidden transition-all duration-300" style={{ opacity: selectedVendor ? 1 : 0.5, pointerEvents: selectedVendor ? 'auto' : 'none' }}>
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${selectedVendor ? 'bg-[#EE4444] text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                <h2 className="text-lg font-medium text-slate-900">Requested Items</h2>
              </div>
              <Button size="sm" variant="outline" className="h-8 border-slate-200">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Item Code</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 w-32">Qty</th>
                    <th className="px-6 py-4 w-32">UOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-6 py-4"><Input defaultValue="RM-102" className="h-9 border-transparent hover:border-slate-200 focus:border-slate-300" /></td>
                    <td className="px-6 py-4"><Input defaultValue="Cocoa Powder" className="h-9 border-transparent hover:border-slate-200 focus:border-slate-300" /></td>
                    <td className="px-6 py-4"><Input type="number" defaultValue={500} className="h-9" /></td>
                    <td className="px-6 py-4"><Input defaultValue="Kg" className="h-9" /></td>
                  </tr>
                </tbody>
              </table>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <Button 
                  className="h-12 px-8 bg-[#EE4444] hover:bg-[#D43B3B] text-white shadow-md"
                  onClick={() => setIsSubmitted(true)}
                >
                  <Send className="w-4 h-4 mr-2" /> Generate PR Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-slate-200 shadow-sm animate-in zoom-in-95 duration-500">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">PR-2023-089 Generated!</h2>
            <p className="text-slate-500 mt-2 max-w-md">The Purchase Requisition has been successfully submitted to the Purchasing Department.</p>
            <Button variant="outline" className="mt-8 border-slate-200" onClick={() => setIsSubmitted(false)}>
              Create Another PR
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
