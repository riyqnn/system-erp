"use client";

import React from "react";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LedgerPage() {

  const records = [
    { date: "2023-11-01 10:05", code: "FG-001", type: "IN (GR)", qty: "+1000", bal: "2200", hash: "0x8a1...9b2" },
    { date: "2023-11-01 11:30", code: "RM-102", type: "OUT (PROD)", qty: "-500", bal: "300", hash: "0x11c...4f0" },
    { date: "2023-11-01 14:15", code: "FG-001", type: "OUT (DO)", qty: "-200", bal: "2000", hash: "0x9f2...e1a" },
    { date: "2023-11-02 08:00", code: "FG-005", type: "IN (PROD)", qty: "+250", bal: "1100", hash: "0xb7c...331" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">Inventory Ledger</h1>
        <p className="text-slate-500 mt-1">Immutable record of all stock movements (UC-INV-011)</p>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="bg-slate-50/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-slate-400 mr-2" />
            <h2 className="text-sm font-medium text-slate-900 uppercase tracking-wider">Automated Log Stream</h2>
          </div>
          <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded">Live Validation</span>
        </div>
        
        <CardContent className="p-0 flex-1 overflow-auto bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/90 backdrop-blur-sm text-slate-400 font-medium border-b border-slate-100 sticky top-0 z-20">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Item Code</th>
                <th className="px-6 py-3 font-medium">Transaction Type</th>
                <th className="px-6 py-3 font-medium text-right">Qty</th>
                <th className="px-6 py-3 font-medium text-right">Ending Balance</th>
                <th className="px-6 py-3 font-medium text-right">Tx Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[13px]">
              {records.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-slate-500">{r.date}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{r.code}</td>
                  <td className="px-6 py-4 text-slate-600">{r.type}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${r.qty.startsWith('+') ? 'text-green-600' : 'text-slate-600'}`}>
                    {r.qty}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">{r.bal}</td>
                  <td className="px-6 py-4 text-right text-slate-400">
                    <button className="opacity-0 group-hover:opacity-100 hover:text-[#EE4444] transition-all">
                      {r.hash}
                    </button>
                  </td>
                </tr>
              ))}
              
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  <span className="inline-flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
