'use client'

import { Suspense } from 'react'
import { GridFour } from '@phosphor-icons/react'
import { useProfile } from '@/hooks/useProfile'
import { NotificationBell } from '@/components/topbar/NotificationBell'
import { MessagingButton }  from '@/components/topbar/MessagingButton'
import { ProfileMenu }       from '@/components/topbar/ProfileMenu'

// ─── Props ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  moduleName?: string
  onMenuClick?: () => void
}

// ─── Inner TopBar (needs hooks) ───────────────────────────────────────────────

function TopBarInner({ moduleName, onMenuClick }: TopBarProps) {
  const { user, profile, avatarUrl, isLoading } = useProfile()

  return (
    <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sticky top-0 z-20 flex-shrink-0">

      {/* ── Left: Mobile menu toggle + Module title ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <GridFour weight="bold" className="w-5 h-5 text-slate-700" />
        </button>

        {moduleName && (
          <h1 className="text-sm font-semibold text-slate-900 hidden sm:block">
            {moduleName}
          </h1>
        )}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1">

        {/* Notification Bell */}
        <NotificationBell
          userId={user?.user_id}
          userRole={user?.role}
        />

        {/* Messaging */}
        <MessagingButton currentUser={user ?? null} />

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Profile */}
        <ProfileMenu
          user={user ?? null}
          profile={profile ?? null}
          avatarUrl={avatarUrl}
          isLoading={isLoading}
        />
      </div>
    </header>
  )
}

// ─── TopBar (exported) ───────────────────────────────────────────────────────
// Wrapped in Suspense so hooks that depend on async data don't block SSR.

export function TopBar(props: TopBarProps) {
  return (
    <Suspense
      fallback={
        <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sticky top-0 z-20 flex-shrink-0">
          <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </header>
      }
    >
      <TopBarInner {...props} />
    </Suspense>
  )
}
