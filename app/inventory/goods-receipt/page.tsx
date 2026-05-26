/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { 
  PackageCheck, 
  Calendar as CalendarIcon, 
  Check, 
  AlertCircle,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function GoodsReceiptPage() {
  const [poNumber, setPoNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [poData, setPoData] = useState<any>(null);

  const handleSearch = () => {
    if (!poNumber) return;
    setIsSearching(true);

    setTimeout(() => {
      setIsSearching(false);
      setPoData({
        id: poNumber,
        vendor: "PT Sumber Kopi Makmur",
        date: "2023-10-15",
        items: [
          { id: "RM-102", name: "Cocoa Powder", expected: 500, received: 500, batch: "B-8821", expiry: "2024-12-01", status: "pending" },
          { id: "RM-01", name: "Sugar", expected: 2000, received: 2000, batch: "S-1092", expiry: "2025-06-15", status: "pending" },
        ]
      });
    }, 600);
  };

  const handleConfirmRow = (idx: number) => {
    if (!poData) return;
    const newItems = [...poData.items];
    newItems[idx].status = "confirmed";
    setPoData({ ...poData, items: newItems });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Goods Receipt (GR)</h1>
        <p className="text-slate-500 mt-1">Process incoming materials from supplier (UC-INV-005)</p>
      </div>

      
      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-8">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Scan or Enter PO Number</label>
              <div className="relative">
                <QrCode className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. PO-2023-089" 
                  className="pl-12 h-14 text-lg border-slate-200 bg-slate-50 focus:bg-white transition-colors" 
                />
              </div>
            </div>
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !poNumber}
              className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all"
            >
              {isSearching ? "Searching..." : "Retrieve PO"}
            </Button>
          </div>
        </CardContent>
      </Card>

      
      {poData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="flex items-center justify-between bg-slate-100/50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm text-slate-500 font-medium">Vendor</p>
              <p className="text-base font-semibold text-slate-900">{poData.vendor}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-medium">PO Date</p>
              <p className="text-base font-semibold text-slate-900">{poData.date}</p>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
              <CardTitle className="text-base font-medium text-slate-900">Expected Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4 w-32">Expected Qty</th>
                    <th className="px-6 py-4 w-32">Received Qty</th>
                    <th className="px-6 py-4 w-40">Batch No.</th>
                    <th className="px-6 py-4 w-40">Expiry Date</th>
                    <th className="px-6 py-4 w-32 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poData.items.map((item: any, idx: number) => (
                    <tr key={idx} className={`transition-colors ${item.status === 'confirmed' ? 'bg-green-50/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.id}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{item.name}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">{item.expected}</td>
                      <td className="px-6 py-4">
                        {item.status === 'confirmed' ? (
                          <span className="font-medium text-slate-900">{item.received}</span>
                        ) : (
                          <Input defaultValue={item.received} className="h-8 w-20 text-center" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'confirmed' ? (
                          <span className="text-slate-600">{item.batch}</span>
                        ) : (
                          <Input defaultValue={item.batch} className="h-8 text-xs" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'confirmed' ? (
                          <span className="text-slate-600">{item.expiry}</span>
                        ) : (
                          <div className="relative">
                            <Input defaultValue={item.expiry} className="h-8 text-xs pl-8" />
                            <CalendarIcon className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.status === 'confirmed' ? (
                          <div className="inline-flex items-center text-green-600 text-xs font-medium">
                            <Check className="w-4 h-4 mr-1" /> Confirmed
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-2">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-slate-400 hover:text-[#EE4444] border-slate-200">
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleConfirmRow(idx)} className="h-8 bg-slate-900 text-white hover:bg-slate-800">
                              Confirm
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              
              {poData.items.every((i: any) => i.status === 'confirmed') && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end animate-in fade-in slide-in-from-bottom-2">
                  <Button className="h-12 px-8 bg-[#EE4444] hover:bg-[#D43B3B] text-white shadow-[0_4px_14px_rgba(238,68,68,0.39)]">
                    <PackageCheck className="w-5 h-5 mr-2" />
                    Complete Goods Receipt
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
