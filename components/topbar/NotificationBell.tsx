'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCircle,
  Warning,
  Info,
  ArrowRight,
  Archive,
} from '@phosphor-icons/react'
import { type Notification, useNotifications } from '@/hooks/useNotifications'

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const isUTC = iso.endsWith('Z') || iso.match(/[+-]\d{2}:\d{2}$/);
  const parsedIso = isUTC ? iso : `${iso}Z`;
  const diff = Date.now() - new Date(parsedIso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m} mins ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hours ago`
  return `${Math.floor(h / 24)} days ago`
}

const TYPE_CONFIG = {
  APPROVAL:    { icon: CheckCircle, color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Approval' },
  WARNING:     { icon: Warning,     color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Warning' },
  INFORMATION: { icon: Info,        color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200',  label: 'Information' },
} as const

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-400',
  MEDIUM:   'bg-blue-400',
  LOW:      'bg-slate-300',
}

type TabType = 'ALL' | 'APPROVAL' | 'WARNING' | 'INFORMATION'

// ─── NotificationItem ────────────────────────────────────────────────────────

function NotificationItem({
  n,
  onRead,
}: {
  n: Notification
  onRead: (id: string) => void
}) {
  const cfg  = TYPE_CONFIG[n.type]
  const Icon = cfg.icon
  const isUnread = n.status === 'UNREAD'

  const inner = (
    <div
      className={`px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${isUnread ? 'bg-blue-50/40' : ''}`}
      onClick={() => { if (isUnread) onRead(n.id) }}
    >
      {/* Type icon */}
      <div className={`mt-0.5 w-8 h-8 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center flex-shrink-0`}>
        <Icon weight="fill" className={`w-4 h-4 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug truncate ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
            {n.title}
          </p>
          <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isUnread ? PRIORITY_DOT[n.priority] ?? 'bg-blue-400' : 'bg-transparent'}`} />
        </div>
        {n.message && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
          {n.source_module && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
              {n.source_module}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return n.action_url ? (
    <Link href={n.action_url} className="block">{inner}</Link>
  ) : (
    <div>{inner}</div>
  )
}

// ─── NotificationDropdown ────────────────────────────────────────────────────

function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  onClose: () => void
  onMarkAsRead: (ids: string[]) => void
  onMarkAllAsRead: () => void
}) {
  const [tab, setTab] = useState<TabType>('ALL')

  const filtered = tab === 'ALL'
    ? notifications
    : notifications.filter((n) => n.type === tab)

  const tabs: { key: TabType; label: string }[] = [
    { key: 'ALL',         label: 'All' },
    { key: 'APPROVAL',    label: 'Approval' },
    { key: 'WARNING',     label: 'Warning' },
    { key: 'INFORMATION', label: 'Info' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-[22rem] bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
              >
                <Archive weight="regular" className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {tabs.map((t) => {
              const count = t.key === 'ALL'
                ? notifications.filter((n) => n.status === 'UNREAD').length
                : notifications.filter((n) => n.type === t.key && n.status === 'UNREAD').length
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 text-[11px] font-medium py-1.5 rounded-lg transition-colors ${
                    tab === t.key
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                      tab === t.key ? 'bg-white text-slate-900' : 'bg-red-500 text-white'
                    }`}>
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[22rem] divide-y divide-slate-50">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Bell weight="light" className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No notifications</p>
            </div>
          ) : (
            filtered.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                onRead={(id) => { onMarkAsRead([id]); onClose() }}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2.5">
          <Link
            href="/notifications"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            View all notifications
            <ArrowRight weight="bold" className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </>
  )
}

// ─── NotificationBell (main export) ─────────────────────────────────────────

interface NotificationBellProps {
  userId?: number
  userRole?: string
}

export function NotificationBell({ userId, userRole }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(userId, userRole)

  // Mark visible unread notifications as read when dropdown opens
  const handleOpen = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={`relative p-2 rounded-lg transition-colors ${open ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
        aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
      >
        <Bell weight={open ? 'fill' : 'bold'} className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onClose={() => setOpen(false)}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </div>
  )
}
