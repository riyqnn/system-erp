'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CaretDown,
  MagnifyingGlass,
  Bell,
  ChatCircle,
  User,
  SignOut,
  Gear,
  SquaresFour,
} from '@phosphor-icons/react'

interface TopBarProps {
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
  onMenuClick?: () => void
  moduleName?: string
}

/**
 * Top Bar Component with Navigation, Search, Notifications, Messages, and Profile Dropdown
 */
export function TopBar({ title, breadcrumbs = [], onMenuClick, moduleName }: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(({ user: userData }) => setUser(userData))
      .catch(() => setUser(null))
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (err) {
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
          <SquaresFour weight="bold" className="w-5 h-5 text-slate-700" />
        </button>

        {/* Module Name with Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-md transition-colors">
            <h1 className="text-lg font-semibold text-slate-900">
              {moduleName || 'Dashboard'}
            </h1>
            <CaretDown weight="bold" className="w-4 h-4 text-slate-500" />
          </button>

          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
              >
                <SquaresFour weight="regular" className="w-5 h-5 text-slate-500" />
                App Switcher
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
              >
                <Gear weight="regular" className="w-5 h-5 text-slate-500" />
                Settings
              </Link>
            </div>
          </div>
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
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors relative"
            aria-label="Notifications"
          >
            <Bell weight="bold" className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Notification Dropdown */}
          {notifMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotifMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-sm border border-slate-200 z-20">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-500 text-center">No new notifications</p>
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
                    {user?.role || 'Role'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email || 'email@example.com'}
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <SquaresFour weight="regular" className="w-5 h-5 text-slate-500" />
                    App Switcher
                  </Link>
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
