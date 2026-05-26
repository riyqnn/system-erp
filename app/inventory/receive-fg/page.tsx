"use client";

import React, { useState } from "react";
import { Box, MapPin, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ReceiveFGPage() {
  const [selectedBin, setSelectedBin] = useState<string | null>(null);

  const bins = [
    { id: "A-01", fill: 80, status: "near-full" },
    { id: "A-02", fill: 20, status: "available" },
    { id: "B-01", fill: 100, status: "full" },
    { id: "B-02", fill: 0, status: "empty" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Receive Finished Goods</h1>
        <p className="text-slate-500 mt-1">Accept FG from production and assign Bin Location (UC-INV-008)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <Card className="col-span-1 border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Code</label>
              <Input defaultValue="FG-001" className="bg-slate-50 border-slate-200 font-medium" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Received</label>
              <Input type="number" defaultValue={1000} className="border-slate-200" />
            </div>
            <div className="pt-4">
              <Button className="w-full h-12 bg-[#EE4444] hover:bg-[#D43B3B] text-white shadow-md">
                <PackagePlus className="w-4 h-4 mr-2" /> Register FG
              </Button>
            </div>
          </CardContent>
        </Card>

        
        <Card className="col-span-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center">
            <MapPin className="w-5 h-5 text-slate-400 mr-2" />
            <h2 className="text-lg font-medium text-slate-900">Warehouse Bin Map</h2>
          </div>
          <CardContent className="p-8 flex-1 bg-slate-50/30 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-6 w-full max-w-md">
              {bins.map((bin) => (
                <div 
                  key={bin.id}
                  onClick={() => bin.status !== 'full' ? setSelectedBin(bin.id) : null}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all cursor-pointer overflow-hidden h-24 flex flex-col justify-between
                    ${bin.status === 'full' ? 'border-red-200 bg-red-50/50 cursor-not-allowed opacity-60' : 
                      selectedBin === bin.id ? 'border-[#EE4444] bg-white ring-4 ring-red-50 scale-105 shadow-lg' : 
                      'border-slate-200 bg-white hover:border-slate-300'}
                  `}
                >
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-100 transition-all -z-10" style={{ height: `${bin.fill}%` }}></div>
                  
                  <div className="flex justify-between items-start">
                    <span className={`font-semibold ${selectedBin === bin.id ? 'text-[#EE4444]' : 'text-slate-700'}`}>{bin.id}</span>
                    <Box className={`w-4 h-4 ${bin.status === 'full' ? 'text-red-400' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{bin.fill}% Capacity</span>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-4 bg-white border-t border-slate-100 text-center">
            {selectedBin ? (
              <p className="text-sm font-medium text-slate-900">Selected Bin: <span className="text-[#EE4444]">{selectedBin}</span></p>
            ) : (
              <p className="text-sm text-slate-500">Select an available bin location from the map.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
