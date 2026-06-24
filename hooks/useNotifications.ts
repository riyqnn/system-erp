'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  title: string
  message: string | null
  type: 'APPROVAL' | 'INFORMATION' | 'WARNING'
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: 'UNREAD' | 'READ' | 'ARCHIVED'
  action_url: string | null
  source_module: string | null
  created_at: string
  read_at: string | null
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (ids: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => void
}

export function useNotifications(userId?: number, userRole?: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [isLoading, setIsLoading]         = useState(true)
  const supabase = useRef(createClient())
  const activeRef = useRef(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=25')
      if (!res.ok) return
      const json = await res.json() as { data: Notification[]; unread: number }
      if (activeRef.current) {
        setNotifications(json.data ?? [])
        setUnreadCount(json.unread ?? 0)
      }
    } catch {
      // ignore fetch errors silently
    } finally {
      if (activeRef.current) setIsLoading(false)
    }
  }, [])

  
  useEffect(() => {
    activeRef.current = true
    fetchNotifications()
    return () => {
      activeRef.current = false
    }
  }, [fetchNotifications])

  useEffect(() => {
    if (!userId || !userRole) return

    const channelName = `notif-user-${userId}-${Math.random().toString(36).substring(2, 8)}`
    const currentSupabase = supabase.current
    const channel = currentSupabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const n = payload.new as Notification & { recipient_id?: number; recipient_role?: string }
          const isForMe   = n.recipient_id   === userId
          const cleanRole = (role?: string) => role?.toUpperCase().replace(/[-_ ]/g, '') || ''
          const isForRole = cleanRole(n.recipient_role) === cleanRole(userRole)
          if (isForMe || isForRole) {
            setNotifications((prev) => [n as Notification, ...prev])
            setUnreadCount((c) => c + 1)
          }
        }
      )
      .subscribe()

    return () => { currentSupabase.removeChannel(channel) }
  }, [userId, userRole])

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ids.includes(n.id) ? { ...n, status: 'READ' as const } : n)
    )
    setUnreadCount((c) => Math.max(0, c - ids.length))

    await fetch('/api/notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  }, [])

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' as const })))
    setUnreadCount(0)

    await fetch('/api/notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
