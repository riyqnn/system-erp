'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  User,
  Gear,
  SignOut,
  CaretDown,
  Buildings,
} from '@phosphor-icons/react'
import { type CurrentUser, type UserProfile } from '@/hooks/useProfile'

// ─── DiceBear Avatar ────────────────────────────────────────────────────────

const AVATAR_STYLES = ['adventurer', 'lorelei', 'micah', 'bottts'] as const

function getDiceBearUrl(username: string, style: string): string {
  const safeStyle = AVATAR_STYLES.includes(style as typeof AVATAR_STYLES[number])
    ? style : 'adventurer'
  return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${encodeURIComponent(username)}&size=40`
}

interface AvatarImageProps {
  user: CurrentUser | null
  profile: UserProfile | null
  avatarUrl: string
  size?: number
  className?: string
}

export function AvatarImage({ user, profile, avatarUrl, size = 32, className = '' }: AvatarImageProps) {
  const fallbackUrl = getDiceBearUrl(user?.username ?? 'user', profile?.avatar_style ?? 'adventurer')

  // SVG from DiceBear can be loaded via <Image unoptimized> directly
  return (
    <Image unoptimized
      src={avatarUrl || fallbackUrl}
      alt={user?.full_name ?? 'Avatar'}
      width={size}
      height={size}
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      onError={(e) => { (e.target as HTMLImageElement).src = fallbackUrl }}
    />
  )
}

// ─── Role Badge ──────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  ADMIN:      'bg-red-100 text-red-700',
  INVENTORY:  'bg-teal-100 text-teal-700',
  FINANCE:    'bg-amber-100 text-amber-700',
  PURCHASING: 'bg-purple-100 text-purple-700',
  PRODUCTION: 'bg-blue-100 text-blue-700',
  SALES:      'bg-green-100 text-green-700',
  SNM:        'bg-green-100 text-green-700',
}

function RoleBadge({ role }: { role: string }) {
  const colorClass = ROLE_COLOR[role.toUpperCase()] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${colorClass}`}>
      {role}
    </span>
  )
}

// ─── ProfileDropdown ─────────────────────────────────────────────────────────

interface ProfileDropdownProps {
  user: CurrentUser
  profile: UserProfile | null
  avatarUrl: string
  onClose: () => void
  onLogout: () => void
}

const MENU_ITEMS = [
  { label: 'My Profile',            href: '/profile',                  icon: User },
  { label: 'Account Settings',      href: '/settings/account',         icon: Gear },
] as const

function ProfileDropdown({ user, profile, avatarUrl, onClose, onLogout }: ProfileDropdownProps) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden">

        {/* User Header */}
        <div className="px-4 py-3.5 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <AvatarImage user={user} profile={profile} avatarUrl={avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-slate-500 truncate mb-1.5">
                {user.email ?? ''}
              </p>
              <RoleBadge role={user.role} />
            </div>
          </div>
          {profile?.department && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Buildings weight="regular" className="w-3.5 h-3.5" />
              <span>{profile.department}</span>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="p-1.5">
          {MENU_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <Icon weight="regular" className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-1.5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <SignOut weight="regular" className="w-4 h-4 flex-shrink-0" />
            Logout
          </button>
        </div>
      </div>
    </>
  )
}

// ─── ProfileMenu (main export) ───────────────────────────────────────────────

interface ProfileMenuProps {
  user: CurrentUser | null
  profile: UserProfile | null
  avatarUrl: string
  isLoading?: boolean
}

export function ProfileMenu({ user, profile, avatarUrl, isLoading }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 p-1 rounded-lg transition-colors ${open ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
        aria-label="Menu profil"
        aria-expanded={open}
      >
        {user ? (
          <AvatarImage user={user} profile={profile} avatarUrl={avatarUrl} size={32} />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
            <User weight="bold" className="w-4 h-4 text-slate-500" />
          </div>
        )}
        <CaretDown
          weight="bold"
          className={`w-3 h-3 text-slate-400 hidden sm:block transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && user && (
        <ProfileDropdown
          user={user}
          profile={profile}
          avatarUrl={avatarUrl}
          onClose={() => setOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}
