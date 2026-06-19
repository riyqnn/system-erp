"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  PackageSearch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface DeliveryOrder {
  do_id: number;
  do_code: string;
  customer_name: string;
  product_id: number;
  quantity: number;
  order_date: string;
  status: "Pending" | "Shipped" | "Delivered" | "Void";
  ms_products: {
    product_code: string;
    product_name: string;
    units: string;
  } | null;
}

interface ProductStock {
  product_id: number;
  current_stock: number;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function SalesOrderValidationPage() {
  const [data, setData] = useState<DeliveryOrder[]>([]);
  const [stockMap, setStockMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedDO, setSelectedDO] = useState<DeliveryOrder | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── Fetch Data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [doRes, stockRes] = await Promise.all([
        fetch("/api/inventory/shipping"), // Reuse the shipping API that fetches DOs
        fetch("/api/inventory/stock"),
      ]);

      if (doRes.ok) {
        const json = await doRes.json();
        // Only show Pending DOs for validation
        setData((json.data || []).filter((d: DeliveryOrder) => d.status === "Pending"));
      }

      if (stockRes.ok) {
        const json = await stockRes.json();
        const smap: Record<number, number> = {};
        json.data?.forEach((s: ProductStock) => { smap[s.product_id] = s.current_stock; });
        setStockMap(smap);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Validate & Ship ───────────────────────────────────────────── */
  const handleApprove = async () => {
    if (!selectedDO) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          do_id: selectedDO.do_id,
          do_code: selectedDO.do_code,
          product_id: selectedDO.product_id,
          quantity: selectedDO.quantity,
          status: "Shipped", // Move to Shipped so it appears in Shipment Confirmation
          warehouse_id: 1 // Default warehouse for physical deduction simulation
        }),
      });

      if (res.ok) {
        setSuccessMsg(`DO ${selectedDO.do_code} Validated. Sent to Shipping Department.`);
        setSelectedDO(null);
        fetchData();
      } else {
        Swal.fire("Error", "Failed to validate DO", "error");
      }
    } catch {
      Swal.fire("Error", "Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Render Logic ──────────────────────────────────────────────── */
  const filtered = data.filter((d) => 
    d.do_code.toLowerCase().includes(search.toLowerCase()) || 
    d.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const reqQty = selectedDO?.quantity || 0;
  const availQty = selectedDO ? (stockMap[selectedDO.product_id] || 0) : 0;
  const isShortage = availQty < reqQty;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Order Validation</h1>
          <p className="text-sm text-slate-500 mt-1">Verify FG stock availability for pending Delivery Orders</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} className="text-slate-500" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Pending DOs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search DO Code or Customer..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-slate-400">Loading pending orders...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending orders to validate.</p>
              </div>
            ) : (
              filtered.map((d, idx) => (
                <div 
                  key={`${d.do_id}-${idx}`}
                  onClick={() => { setSelectedDO(d); setSuccessMsg(null); setIsVerifying(true); setTimeout(() => setIsVerifying(false), 500); }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedDO?.do_id === d.do_id 
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{d.do_code}</span>
                    <span className="text-xs text-slate-500">{new Date(d.order_date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-medium text-slate-900">{d.customer_name}</h3>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-xs text-slate-500">{d.ms_products?.product_name}</p>
                    <span className="font-semibold text-slate-900 tabular-nums">{d.quantity.toLocaleString()} {d.ms_products?.units}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Validation Area */}
        <div className="lg:col-span-7">
          {successMsg ? (
            <Card className="border-slate-200 shadow-sm h-full flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Validation Successful</h3>
              <p className="text-slate-500 max-w-sm">{successMsg}</p>
            </Card>
          ) : selectedDO ? (
            <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 border-b border-slate-100 p-6 rounded-t-xl">
                <h2 className="text-lg font-semibold text-slate-900">Stock Availability Check</h2>
                <p className="text-sm text-slate-500">Checking inventory for Delivery Order: <span className="font-mono">{selectedDO.do_code}</span></p>
              </div>
              
              <CardContent className="p-0">
                {isVerifying ? (
                  <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                    <PackageSearch className="w-10 h-10 animate-bounce mx-auto mb-4 text-blue-500 opacity-80" />
                    Checking warehouse bins...
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="p-8 space-y-8 flex-1">
                      
                      <div className="grid grid-cols-2 gap-6 text-center">
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                          <p className="text-sm text-slate-500 font-medium mb-2">Order Requirement</p>
                          <p className="text-4xl font-bold text-slate-900 tracking-tight">{reqQty.toLocaleString()}</p>
                          <p className="text-sm text-slate-400 mt-1">{selectedDO.ms_products?.units} of {selectedDO.ms_products?.product_name}</p>
                        </div>
                        
                        <div className={`rounded-2xl p-6 border ${isShortage ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                          <p className={`text-sm font-medium mb-2 ${isShortage ? 'text-red-600' : 'text-emerald-700'}`}>Available Stock</p>
                          <p className={`text-4xl font-bold tracking-tight ${isShortage ? 'text-red-700' : 'text-emerald-700'}`}>{availQty.toLocaleString()}</p>
                          <p className={`text-sm mt-1 ${isShortage ? 'text-red-500' : 'text-emerald-600'}`}>Ready to ship</p>
                        </div>
                      </div>

                      {isShortage ? (
                        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3 w-full">
                          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-900">Insufficient Finished Goods</p>
                            <p className="mt-1">You are short by <strong>{(reqQty - availQty).toLocaleString()} {selectedDO.ms_products?.units}</strong>. Please create a Production Request to fulfill this order.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-4 rounded-lg flex items-center gap-3 w-full">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                          <p>We have enough stock to fulfill this order. You can proceed to validate.</p>
                        </div>
                      )}

                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                      {isShortage ? (
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                          onClick={() => window.location.href = '/inventory/permintaan-produksi'}
                        >
                          Create Production Request <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full sm:w-auto"
                          onClick={handleApprove}
                          disabled={isSubmitting}
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          {isSubmitting ? "Validating..." : "Validate & Push to Shipping"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <PackageSearch className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Select an Order</p>
              <p className="text-sm mt-1 max-w-sm text-center">Click on a pending Delivery Order from the list to check stock availability.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
