/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ShippingPage() {
  const [progress, setProgress] = useState(0);
  const [shipped, setShipped] = useState(false);

  let interval: any;
  const startHold = () => {
    if (shipped) return;
    // eslint-disable-next-line react-hooks/immutability
    interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setShipped(true);
          return 100;
        }
        return p + 5;
      });
    }, 50);
  };

  const stopHold = () => {
    clearInterval(interval);
    if (!shipped) setProgress(0);
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Outbound Verification</h1>
        <p className="text-slate-500 mt-2 text-lg">Final check before truck departure (UC-INV-010)</p>
      </div>

      <Card className="w-full max-w-md border-slate-200 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
          <div className="h-full bg-[#EE4444] transition-all duration-75" style={{ width: `${progress}%` }}></div>
        </div>
        
        <CardContent className="p-10 flex flex-col items-center text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">DO-2023-1192</h2>
            <p className="text-slate-500">Destination: PT Retail Super</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 w-full rounded-xl p-4 mb-8 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Items:</span>
              <span className="font-medium text-slate-900">2,500 Cartons</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Vehicle Plat:</span>
              <span className="font-medium text-slate-900">B 9901 XX</span>
            </div>
          </div>

          {!shipped ? (
            <button 
              onMouseDown={startHold}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={startHold}
              onTouchEnd={stopHold}
              className="w-full h-16 rounded-xl bg-slate-900 text-white font-medium text-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] relative overflow-hidden group select-none"
            >
              <div className="absolute inset-0 bg-[#EE4444] origin-left transition-transform duration-75" style={{ transform: `scaleX(${progress / 100})` }}></div>
              <span className="relative z-10 flex items-center justify-center pointer-events-none">
                <Truck className="w-5 h-5 mr-2" />
                Hold to Confirm Shipment
              </span>
            </button>
          ) : (
            <div className="w-full h-16 rounded-xl bg-green-500 text-white font-medium text-lg flex items-center justify-center animate-in zoom-in duration-300 shadow-[0_8px_30px_rgba(34,197,94,0.3)]">
              Shipped / Terkirim
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
