"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ProdReqData {
  production_request_id: string | number;
  prd_code: string;
  product_id: string | number;
  qty_requested: number;
  request_date: string;
  status: string;
  ms_products: {
    product_code: string;
    product_name: string;
    units: string;
  } | null;
}

interface BOMData {
  bom_id: string | number;
  rm_product_id: string | number;
  qty_required: number;
  ms_products: {
    product_code: string;
    product_name: string;
    units: string;
  };
}

interface ProductStock {
  product_id: string | number;
  current_stock: number;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function BOMVerificationPage() {
  const [requests, setRequests] = useState<ProdReqData[]>([]);
  const [stockMap, setStockMap] = useState<Record<string | number, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedReq, setSelectedReq] = useState<ProdReqData | null>(null);
  const [bomData, setBomData] = useState<BOMData[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [updating, setUpdating] = useState(false);

  /* ── Fetch Data ────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, stockRes] = await Promise.all([
        fetch("/api/inventory/production-requests"),
        fetch("/api/inventory/stock"),
      ]);
      
      if (reqRes.ok) {
        const json = await reqRes.json();
        // Only show Pending requests
        setRequests((json.data || []).filter((r: { status: string }) => r.status === "Pending"));
      }
      
      if (stockRes.ok) {
        const json = await stockRes.json();
        const smap: Record<string | number, number> = {};
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

  /* ── Load BOM for Selected Request ─────────────────────────────── */
  const handleSelectReq = async (req: ProdReqData) => {
    setSelectedReq(req);
    setVerifying(true);
    try {
      const res = await fetch(`/api/inventory/bom?fg_product_id=${req.product_id}`);
      if (res.ok) {
        const json = await res.json();
        setBomData(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  /* ── Update Status to In Progress ────────────────────────────── */
  const handleApprove = async () => {
    if (!selectedReq) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/inventory/production-requests/${selectedReq.production_request_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "In Progress" }),
      });
      if (res.ok) {
        Swal.fire("Success", "BOM Verified. Notification sent to Production.", "success");
        setSelectedReq(null);
        fetchData();
      } else {
        Swal.fire("Error", "Failed to update status", "error");
      }
    } catch {
      Swal.fire("Error", "Network error", "error");
    } finally {
      setUpdating(false);
    }
  };

  const filtered = requests.filter((r) => 
    r.prd_code.toLowerCase().includes(search.toLowerCase()) ||
    r.ms_products?.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  let hasShortage = false;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">BOM Verification</h1>
          <p className="text-sm text-slate-500 mt-1">Verify material availability for Production Requests (UC-INV-003)</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} className="text-slate-500" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Pending Requests */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search PRD Code or Product..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10 text-slate-400">Loading requests...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending requests to verify.</p>
              </div>
            ) : (
              filtered.map((req) => (
                <div 
                  key={req.production_request_id}
                  onClick={() => handleSelectReq(req)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedReq?.production_request_id === req.production_request_id 
                      ? 'bg-red-50 border-red-300 ring-1 ring-red-300' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{req.prd_code}</span>
                    <span className="text-xs text-slate-500">{new Date(req.request_date).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-medium text-slate-900">{req.ms_products?.product_name}</h3>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm">
                      <span className="text-slate-500">Target Qty: </span>
                      <span className="font-semibold text-slate-900">{req.qty_requested.toLocaleString()} {req.ms_products?.units}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Verification Details */}
        <div className="lg:col-span-7">
          {selectedReq ? (
            <Card className="border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 border-b border-slate-100 p-6 rounded-t-xl">
                <h2 className="text-lg font-semibold text-slate-900">Verification Result</h2>
                <p className="text-sm text-slate-500">Checking BOM materials for {selectedReq.qty_requested.toLocaleString()} {selectedReq.ms_products?.units} of {selectedReq.ms_products?.product_name}</p>
              </div>
              
              <CardContent className="p-0">
                {verifying ? (
                  <div className="py-20 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 opacity-50" />
                    Calculating requirements...
                  </div>
                ) : bomData.length === 0 ? (
                  <div className="py-20 text-center text-red-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No BOM found for this product.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 font-medium">Material</th>
                          <th className="px-6 py-3 font-medium text-right">Required</th>
                          <th className="px-6 py-3 font-medium text-right">Available</th>
                          <th className="px-6 py-3 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bomData.map((item, idx) => {
                          const reqQty = item.qty_required * selectedReq.qty_requested;
                          const availQty = stockMap[item.rm_product_id] || 0;
                          const isShort = availQty < reqQty;
                          if (isShort) hasShortage = true;

                          return (
                            <tr key={`${item.bom_id}-${idx}`} className={isShort ? "bg-red-50/30" : ""}>
                              <td className="px-6 py-4">
                                <p className="font-medium text-slate-900">{item.ms_products.product_name}</p>
                                <p className="text-xs text-slate-500">{item.ms_products.product_code}</p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-semibold text-slate-900">{reqQty.toLocaleString()}</span>
                                <span className="text-xs text-slate-500 ml-1">{item.ms_products.units}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`font-semibold ${isShort ? 'text-red-600' : 'text-emerald-600'}`}>{availQty.toLocaleString()}</span>
                                <span className="text-xs text-slate-500 ml-1">{item.ms_products.units}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {isShort ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                    <AlertTriangle className="w-3 h-3" /> Shortage
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                                    <CheckCircle2 className="w-3 h-3" /> OK
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col items-end">
                      {hasShortage ? (
                        <div className="flex flex-col items-end w-full">
                          <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-lg flex items-start gap-3 w-full mb-4">
                            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">Insufficient Materials</p>
                              <p className="mt-1">You cannot start production because some raw materials are out of stock. Please create a Purchase Requisition first.</p>
                            </div>
                          </div>
                          <Button 
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => window.location.href = '/inventory/purchase-requisition'}
                          >
                            Go to Purchase Requisition <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end w-full">
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-lg flex items-center gap-3 w-full mb-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <p className="font-semibold">All materials are sufficient. Ready for production.</p>
                          </div>
                          <Button 
                            className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
                            onClick={handleApprove}
                            disabled={updating}
                          >
                            <Send className="w-4 h-4" />
                            {updating ? "Updating..." : "Approve & Send to Production"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium text-slate-600">Select a Request</p>
              <p className="text-sm mt-1 max-w-sm text-center">Click on a production request from the left panel to verify its material availability.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
