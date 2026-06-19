"use client";
import { AnyObject } from '@/lib/any';

import React, { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import { 
  Bell, 
  CheckCircle, 
  Warning, 
  Info, 
  Archive,
  ArrowRight,
  Check,
  Calendar,
  Clock,
  Funnel
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TYPE_CONFIG = {
  APPROVAL:    { icon: CheckCircle, color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-200",   label: "Approval" },
  WARNING:     { icon: Warning,     color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200", label: "Warning" },
  INFORMATION: { icon: Info,        color: "text-slate-500",  bg: "bg-slate-50",  border: "border-slate-200",  label: "Information" },
} as const;

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH:     "bg-orange-400",
  MEDIUM:   "bg-blue-400",
  LOW:      "bg-slate-300",
};

export default function NotificationsPage() {
  const { user } = useProfile();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications(
    user?.user_id,
    user?.role
  );

  const [tab, setTab] = useState<"ALL" | "UNREAD" | "APPROVAL" | "WARNING" | "INFORMATION">("ALL");

  const filtered = notifications.filter((n) => {
    if (tab === "ALL") return true;
    if (tab === "UNREAD") return n.status === "UNREAD";
    return n.type === tab;
  });

  const parseUTCDate = (iso: string) => {
    const isUTC = iso.endsWith('Z') || iso.match(/[+-]\d{2}:\d{2}$/);
    return new Date(isUTC ? iso : `${iso}Z`);
  };

  const getFormatDate = (iso: string) => {
    const d = parseUTCDate(iso);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  };

  const getFormatTime = (iso: string) => {
    const d = parseUTCDate(iso);
    return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between pt-2 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="w-8 h-8 text-slate-700" weight="duotone" />
            Notifications Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Stay updated with all system alerts, approvals, and information.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-2"
            onClick={markAllAsRead}
          >
            <Check className="w-4 h-4" weight="bold" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar / Filters */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Funnel className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-700">Filters</h3>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {(
                [
                  { key: "ALL", label: "All Notifications" },
                  { key: "UNREAD", label: "Unread" },
                  { key: "APPROVAL", label: "Approvals" },
                  { key: "WARNING", label: "Warnings" },
                  { key: "INFORMATION", label: "Information" },
                ] as const
              ).map((item: AnyObject) => {
                const isActive = tab === item.key;
                const count = item.key === "ALL" 
                  ? notifications.length 
                  : item.key === "UNREAD" 
                    ? unreadCount 
                    : notifications.filter(n => n.type === item.key).length;
                
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-slate-900 text-white" 
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                    {count > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* List of Notifications */}
        <div className="flex-1">
          <Card className="border-slate-200 shadow-sm min-h-[500px]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                  <p className="mt-4 text-slate-500 text-sm font-medium">Loading notifications...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <Archive className="w-8 h-8 text-slate-300" weight="light" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">No notifications found</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    {tab === "UNREAD" 
                      ? "You're all caught up! There are no unread notifications right now."
                      : "You don't have any notifications in this category yet."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filtered.map((n) => {
                    const cfg = TYPE_CONFIG[n.type];
                    const Icon = cfg.icon;
                    const isUnread = n.status === "UNREAD";

                    return (
                      <div 
                        key={n.id} 
                        className={`group flex items-start gap-4 p-5 transition-colors ${
                          isUnread ? "bg-blue-50/30 hover:bg-blue-50/50" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        {/* Icon */}
                        <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.bg} ${cfg.border}`}>
                          <Icon weight={isUnread ? "fill" : "regular"} className={`w-5 h-5 ${cfg.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-base leading-tight ${
                                  isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                                }`}>
                                  {n.title}
                                </h4>
                                {isUnread && (
                                  <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[n.priority] || "bg-blue-500"}`} />
                                )}
                              </div>
                              {n.message && (
                                <p className={`text-sm mt-1 ${isUnread ? "text-slate-600 font-medium" : "text-slate-500"}`}>
                                  {n.message}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 flex-shrink-0 text-slate-400">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar className="w-3.5 h-3.5" />
                                {getFormatDate(n.created_at)}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Clock className="w-3.5 h-3.5" />
                                {getFormatTime(n.created_at)}
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center gap-3 mt-4">
                            {n.source_module && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                                {n.source_module}
                              </span>
                            )}
                            
                            <Link 
                              href={`/notifications/${n.id}`}
                              onClick={() => isUnread && markAsRead([n.id])}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              View Details
                              <ArrowRight className="w-3 h-3" weight="bold" />
                            </Link>

                            {isUnread && (
                              <button 
                                onClick={() => markAsRead([n.id])}
                                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
