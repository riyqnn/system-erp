/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlass,
  Bell,
  ChatCircle,
  User,
  SignOut,
  Gear,
  GridFour,
  CaretDown,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

interface TopBarProps {
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
  onMenuClick?: () => void
  moduleName?: string
}

interface Notif {
  id: string
  title: string
  message: string | null
  type: string
  link: string | null
  is_read: boolean
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hr lalu`
}

/**
 * Top Bar Component with Navigation, Search, Notifications, Messages, and Profile Dropdown
 */
export function TopBar({ onMenuClick, moduleName }: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const unreadCount = notifs.filter((n) => !n.is_read).length

  useEffect(() => {
    let active = true
    let role: string | undefined
    let userId: string | undefined

    const loadNotifs = async () => {
      if (!userId && !role) return
      try {
        const filters: string[] = []
        if (role) filters.push(`recipient_role.eq.${role}`)
        if (userId) filters.push(`recipient_id.eq.${userId}`)
        const { data } = await supabase
          .from('notifications')
          .select('id, title, message, type, link, is_read, created_at')
          .or(filters.join(','))
          .order('created_at', { ascending: false })
          .limit(20)
        if (active) setNotifs((data as Notif[]) ?? [])
      } catch {
        /* tabel notifications belum ada / modul lain — abaikan */
      }
    }

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then(({ user: userData }) => {
        if (!active) return
        setUser(userData)
        role = userData?.role?.name?.toUpperCase()
        userId = userData?.id
        loadNotifs()
      })
      .catch(() => setUser(null))

    // Polling ringan untuk notifikasi real-time
    const interval = setInterval(loadNotifs, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [supabase])

  const handleOpenNotif = async () => {
    const next = !notifMenuOpen
    setNotifMenuOpen(next)
    if (next && unreadCount > 0) {
      const ids = notifs.filter((n) => !n.is_read).map((n) => n.id)
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
      try {
        await supabase.from('notifications').update({ is_read: true }).in('id', ids)
      } catch { /* ignore */ }
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sticky top-0 z-20">
      {/* Left: Menu toggle + Module Name + Dropdown */}
      <div className="flex items-center gap-4">
        {/* Menu Toggle Button (Mobile) */}
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <GridFour weight="bold" className="w-5 h-5 text-slate-700" />
        </button>

        {/* Module Name */}
        <div className="px-3">
          <h1 className="text-lg font-semibold text-slate-900">
            {moduleName || 'Dashboard'}
          </h1>
        </div>
      </div>

      {/* Center: Compact Search */}
      <div className="hidden md:block flex-1 max-w-xs mx-8">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/20 transition-all"
          />
        </div>
      </div>

      {/* Right: Notifications, Messages, Profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={handleOpenNotif}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors relative"
            aria-label="Notifications"
          >
            <Bell weight="bold" className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Notifikasi</h3>
                  <span className="text-xs text-slate-400">{notifs.length} item</span>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                  {notifs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">Belum ada notifikasi</p>
                  ) : (
                    notifs.map((n) => {
                      const body = (
                        <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-2">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-red-500'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">{n.title}</p>
                              {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                              <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      )
                      return n.link ? (
                        <Link key={n.id} href={n.link} onClick={() => setNotifMenuOpen(false)}>{body}</Link>
                      ) : (
                        <div key={n.id}>{body}</div>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <button
          className="p-2 hover:bg-slate-100 rounded-md transition-colors relative"
          aria-label="Messages"
        >
          <ChatCircle weight="bold" className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <User weight="bold" className="w-4 h-4 text-slate-600" />
            </div>
            <CaretDown weight="bold" className="w-3 h-3 text-slate-500 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-sm border border-slate-200 z-20">
                <div className="p-4 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user?.role?.name || 'Role'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email || 'email@example.com'}
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <Gear weight="regular" className="w-5 h-5 text-slate-500" />
                    Settings
                  </Link>
                </div>

                <hr className="my-1 border-slate-100" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"
                >
                  <SignOut weight="regular" className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
