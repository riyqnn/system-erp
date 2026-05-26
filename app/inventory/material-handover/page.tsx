"use client";

import React, { useState } from "react";
import { QrCode, PenTool, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MaterialHandoverPage() {
  const [scanned, setScanned] = useState(false);
  const [signed, setSigned] = useState(false);

  const materials = [
    { id: "RM-01", name: "Sugar", qty: "500 Kg", batch: "S-1092" },
    { id: "RM-03", name: "Packaging Foil", qty: "1000 Roll", batch: "P-441" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col mb-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Material Handover (to Production)</h1>
        <p className="text-slate-500 mt-1">Scan items and capture digital signature (UC-INV-007)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <Card className={`border-2 transition-all ${scanned ? 'border-green-500 bg-green-50/10' : 'border-[#EE4444] shadow-sm'}`}>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
            {!scanned ? (
              <>
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <QrCode className="w-10 h-10 text-[#EE4444]" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Awaiting Scan</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">Use barcode scanner on requested material bin.</p>
                <Button onClick={() => setScanned(true)} className="bg-slate-900 text-white">Simulate Scan</Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-green-700">Scan Complete</h3>
                
                <div className="w-full mt-6 text-left border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {materials.map((m, i) => (
                    <div key={i} className="p-3 border-b border-slate-100 flex justify-between items-center last:border-0 line-through text-slate-400">
                      <div>
                        <span className="font-medium text-slate-600">{m.id}</span> - {m.name}
                      </div>
                      <span>{m.qty}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        
        <Card className={`border-slate-200 shadow-sm transition-opacity ${!scanned ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardContent className="p-8 flex flex-col h-full">
            <div className="flex items-center mb-4">
              <PenTool className="w-5 h-5 text-slate-400 mr-2" />
              <h3 className="text-lg font-medium text-slate-900">Production Sign-off</h3>
            </div>
            
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl mb-4 relative cursor-crosshair flex flex-col items-center justify-center min-h-[200px]">
              {!signed ? (
                <span className="text-slate-400 text-sm">Sign here</span>
              ) : (
                <div className="text-5xl font-caveat text-slate-800 -rotate-6">Budi Prod</div>
              )}
            </div>

            {signed && (
              <p className="text-center font-caveat text-xl text-slate-600 mb-4">Signed by Budi - Production Manager</p>
            )}

            {!signed ? (
              <Button onClick={() => setSigned(true)} className="w-full h-12 bg-[#EE4444] hover:bg-[#D43B3B] text-white">
                Simulate Signature
              </Button>
            ) : (
              <Button className="w-full h-12 bg-slate-900 text-white" disabled>
                Handover Complete
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
