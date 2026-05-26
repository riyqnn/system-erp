"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SalesOrderValidationPage() {
  const [soItems, setSoItems] = useState([
    { id: "FG-001", name: "Kopiko Blister", requested: 200, available: 1200, status: "pending" },
    { id: "FG-005", name: "Beng-Beng ShareIt", requested: 5000, available: 850, status: "pending" },
  ]);

  const validateStock = () => {
    setSoItems(soItems.map(item => ({
      ...item,
      status: item.available >= item.requested ? "committed" : "shortage"
    })));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Sales Order Stock Validation</h1>
        <p className="text-slate-500 mt-1">Real-time check for SO fulfillability (UC-INV-009)</p>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-medium text-slate-900">SO-2023-1025</h2>
          <Button onClick={validateStock} variant="outline" className="h-8 border-slate-200">
            Check Availability
          </Button>
        </div>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4 text-right">Requested</th>
                <th className="px-6 py-4 text-right">Available (Live)</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soItems.map((item, i) => (
                <React.Fragment key={i}>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.id}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{item.requested}</td>
                    <td className="px-6 py-4 text-right">
                      
                      <span className="inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        {item.available}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'pending' && <span className="text-slate-400">Checking...</span>}
                      {item.status === 'committed' && (
                        <span className="inline-flex items-center text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Committed
                        </span>
                      )}
                      {item.status === 'shortage' && (
                        <span className="inline-flex items-center text-[#EE4444] font-medium bg-red-50 px-2.5 py-1 rounded-md">
                          <AlertCircle className="w-4 h-4 mr-1.5" /> Shortage
                        </span>
                      )}
                    </td>
                  </tr>
                  
                  
                  {item.status === 'shortage' && (
                    <tr className="bg-red-50/30">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-4">
                          <span className="text-sm font-medium text-slate-700">Fulfillment Options:</span>
                          <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
                            <input type="radio" name={`opt-${i}`} className="accent-[#EE4444]" />
                            <span>Backorder ({item.requested - item.available} units)</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
                            <input type="radio" name={`opt-${i}`} className="accent-[#EE4444]" />
                            <span>Partial Fulfillment ({item.available} units)</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
