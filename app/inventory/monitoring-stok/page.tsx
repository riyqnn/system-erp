/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  X, 
  Send,
  Loader2,
  Box,
  Layers,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LOW_STOCK_ITEMS = [
  { id: "FG-001", name: "Kopiko Blister", actual: 1200, safety: 2000, max: 8000, status: "Critical" },
  { id: "FG-005", name: "Beng-Beng ShareIt", actual: 850, safety: 1500, max: 5000, status: "Low" },
  { id: "RM-102", name: "Cocoa Powder", actual: 300, safety: 500, max: 2000, status: "Low" },
];

const BOM_DATA = [
  { id: "RM-01", name: "Sugar", required: 500, available: 5000, status: "Ready" },
  { id: "RM-02", name: "Coffee Extract", required: 200, available: 150, status: "Shortage" },
  { id: "RM-03", name: "Packaging Foil", required: 1000, available: 12000, status: "Ready" },
];

export default function InventoryDashboard() {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [reqQty, setReqQty] = useState("");
  const [checkingBom, setCheckingBom] = useState(false);
  const [bomChecked, setBomChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const openItem = (item: any) => {
    setSelectedItem(item);
    setReqQty("");
    setBomChecked(false);
    setIsSuccess(false);
    setIsDrawerOpen(true);
  };

  const handleCheckBOM = () => {
    setCheckingBom(true);
    setTimeout(() => {
      setCheckingBom(false);
      setBomChecked(true);
    }, 1500);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsDrawerOpen(false);
      }, 2000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#EE4444]" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Items Below Safety Stock</p>
              <h3 className="text-2xl font-semibold text-slate-900 mt-1">12 Items</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Box className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Inventory Value</p>
              <h3 className="text-2xl font-semibold text-slate-900 mt-1">Rp 4.2B</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Movements</p>
              <h3 className="text-2xl font-semibold text-slate-900 mt-1">45 DO / 12 GR</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      
      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium text-slate-900">Safety Stock Monitoring</CardTitle>
              <CardDescription className="mt-1">Automated alert for items falling below minimum threshold (UC-INV-001).</CardDescription>
            </div>
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search items..." className="pl-9 w-64 bg-slate-50 border-slate-200 h-9" />
              </div>
              <Button variant="outline" size="sm" className="h-9 border-slate-200">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Item Code & Name</th>
                <th className="px-6 py-4 text-right">Actual Balance</th>
                <th className="px-6 py-4 text-right">Safety Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {LOW_STOCK_ITEMS.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{item.id}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[#EE4444] font-semibold">{item.actual.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {item.safety.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-[#EE4444]">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      size="sm" 
                      onClick={() => openItem(item)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm"
                      variant="outline"
                    >
                      Request <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      
      {isDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-lg font-medium text-slate-900">Production Request</h2>
                <p className="text-sm text-slate-500 mt-1">Issue a request to manufacturing</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{selectedItem?.id}</h3>
                    <p className="text-slate-500 text-sm">{selectedItem?.name}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-[#EE4444]">
                    Deficit: {selectedItem?.safety - selectedItem?.actual} units
                  </span>
                </div>
                
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Requested Quantity
                    </label>
                    <div className="relative">
                      <Input 
                        type="number"
                        placeholder="e.g. 5000"
                        className="h-12 text-lg font-medium pl-4"
                        value={reqQty}
                        onChange={(e) => setReqQty(e.target.value)}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                        Units
                      </div>
                    </div>
                    {Number(reqQty) + selectedItem?.actual > selectedItem?.max && (
                      <p className="text-xs text-[#EE4444] mt-2 animate-in fade-in slide-in-from-top-1">
                        Warning: Request exceeds remaining bin capacity (Max: {selectedItem?.max}).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              
              {reqQty && Number(reqQty) > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-900">BOM Verification</h4>
                    {!bomChecked && !checkingBom && (
                      <Button size="sm" variant="outline" onClick={handleCheckBOM} className="h-8 text-xs border-slate-200">
                        <Layers className="w-3 h-3 mr-2" /> Verify Materials
                      </Button>
                    )}
                  </div>

                  {checkingBom && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-slate-500 space-y-3">
                      <Loader2 className="w-6 h-6 animate-spin text-[#EE4444]" />
                      <span className="text-sm font-medium">Calculating BOM Requirements...</span>
                    </div>
                  )}

                  {bomChecked && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Material</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {BOM_DATA.map((mat) => (
                          <div key={mat.id} className="p-4 flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-slate-900">{mat.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">Req: {mat.required} / Avail: {mat.available}</div>
                            </div>
                            {mat.status === "Ready" ? (
                              <div className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-md">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                                Ready
                              </div>
                            ) : (
                              <div className="flex items-center text-[#EE4444] text-xs font-medium bg-red-50 px-2 py-1 rounded-md">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#EE4444] mr-2"></div>
                                Shortage
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="p-3 border-t border-slate-100 bg-red-50/50 flex justify-between items-center">
                        <span className="text-xs text-[#EE4444] font-medium">Material shortage detected.</span>
                        <Button size="sm" className="h-7 text-xs bg-white text-[#EE4444] hover:bg-white/80 border border-red-200 shadow-sm">
                          Create PR
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <Button 
                className={`w-full h-12 text-base transition-all duration-300 ${isSuccess ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-[#EE4444] hover:bg-[#D43B3B] text-white shadow-[0_4px_14px_rgba(238,68,68,0.39)] hover:shadow-[0_6px_20px_rgba(238,68,68,0.23)]'}`}
                disabled={!reqQty || checkingBom || isSubmitting || isSuccess || (Number(reqQty) + selectedItem?.actual > selectedItem?.max)}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                ) : isSuccess ? (
                  <><CheckCircle2 className="w-5 h-5 mr-2" /> Request Sent</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Production Request</>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
