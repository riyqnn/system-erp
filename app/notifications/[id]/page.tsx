"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  BellRinging, 
  CheckCircle, 
  Warning, 
  Info, 
  Calendar, 
  Clock, 
  ArrowRight,
  Hash
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TYPE_CONFIG = {
  APPROVAL:    { icon: CheckCircle, color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-200",   label: "Approval Required" },
  WARNING:     { icon: Warning,     color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", label: "Warning Alert" },
  INFORMATION: { icon: Info,        color: "text-slate-500",  bg: "bg-slate-50",  border: "border-slate-200",  label: "System Information" },
} as const;

const PRIORITY_BADGE = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH:     "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM:   "bg-blue-100 text-blue-700 border-blue-200",
  LOW:      "bg-slate-100 text-slate-700 border-slate-200",
} as Record<string, string>;

export default function NotificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notification, setNotification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotification = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", id)
        .single();
      
      if (!error && data) {
        setNotification(data);
        // Mark as read if it is unread
        if (data.status === 'UNREAD') {
          await supabase.from("notifications").update({ status: 'READ' }).eq("id", id);
        }
      }
      setLoading(false);
    };

    if (id) {
      fetchNotification();
    }
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <BellRinging className="w-16 h-16 text-slate-300 mb-4" weight="light" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Notification Not Found</h2>
        <p className="text-slate-500 mb-6">The notification you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => router.push('/notifications')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Notifications
        </Button>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[notification.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.INFORMATION;
  const Icon = cfg.icon;
  
  const isUTC = notification.created_at.endsWith('Z') || notification.created_at.match(/[+-]\d{2}:\d{2}$/);
  const dateObj = new Date(isUTC ? notification.created_at : `${notification.created_at}Z`);
  const dateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateObj);
  const timeStr = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(dateObj);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back
      </button>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white ring-1 ring-slate-100">
        <div className={`h-2 w-full ${notification.priority === 'CRITICAL' ? 'bg-red-500' : cfg.color.replace('text-', 'bg-')}`} />
        
        <CardHeader className="px-8 pt-8 pb-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-start justify-between gap-6">
            <div className="flex gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border ${cfg.bg} ${cfg.border} shadow-sm`}>
                <Icon weight="fill" className={`w-7 h-7 ${cfg.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_BADGE[notification.priority] || PRIORITY_BADGE.MEDIUM}`}>
                    {notification.priority} PRIORITY
                  </span>
                  {notification.source_module && (
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                      {notification.source_module} MODULE
                    </span>
                  )}
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  {notification.title}
                </CardTitle>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-8 py-8 space-y-8">
          {/* Message Content */}
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
              {notification.message || "No additional details provided for this notification."}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Date Received</p>
                <p className="text-sm font-semibold text-slate-900">{dateStr}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Time</p>
                <p className="text-sm font-semibold text-slate-900">{timeStr}</p>
              </div>
            </div>

            {notification.source_ref_id && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
                  <Hash className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                    Reference: {notification.source_ref_type?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                    {notification.source_ref_id}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {notification.action_url && notification.type !== 'INFORMATION' && (
          <CardFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2"
              onClick={() => router.push(notification.action_url)}
            >
              Take Action / View Document
              <ArrowRight className="w-4 h-4" weight="bold" />
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
