'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface UserProfile {
  user_id: number
  avatar_url: string | null
  avatar_style: string
  department: string | null
  phone: string | null
  bio: string | null
  theme: string
  notif_email: boolean
  notif_push: boolean
}

export interface CurrentUser {
  user_id: number
  username: string
  full_name: string | null
  email: string | null
  role: string
  status: string
}

export interface UseProfileReturn {
  user: CurrentUser | null
  profile: UserProfile | null
  isLoading: boolean
  avatarUrl: string
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AVATAR_STYLES = ['adventurer', 'lorelei', 'micah', 'bottts'] as const

function getDiceBearUrl(username: string, style: string, size = 40): string {
  const safeStyle = AVATAR_STYLES.includes(style as typeof AVATAR_STYLES[number])
    ? style
    : 'adventurer'
  return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${encodeURIComponent(username)}&size=${size}`
}

export function useProfile(): UseProfileReturn {
  const [user, setUser]       = useState<CurrentUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const activeRef = useRef(true)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) return
      const json = await res.json() as { user: CurrentUser; profile: UserProfile }
      if (activeRef.current) {
        setUser(json.user)
        setProfile(json.profile)
      }
    } catch {
      // silently ignore
    } finally {
      if (activeRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    activeRef.current = true
    fetchProfile()
    return () => { activeRef.current = false }
  }, [fetchProfile])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    // Optimistic update
    setProfile((prev) => prev ? { ...prev, ...updates } : prev)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      // Revert on failure
      fetchProfile()
    }
  }, [fetchProfile])

  const avatarUrl = profile?.avatar_url
    ?? getDiceBearUrl(user?.username ?? 'user', profile?.avatar_style ?? 'adventurer')

  return { user, profile, isLoading, avatarUrl, updateProfile }
}
