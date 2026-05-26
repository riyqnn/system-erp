'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      const user = data.user

      // Debug: log user role
      console.log('User data:', user)
      console.log('User role:', user?.role)
      console.log('Role name:', user?.role?.name)

      // Role-based redirect
      // API returns role as object: {id, name, description}
      const roleName = user?.role?.name?.toUpperCase() || 'USER'
      const roleRedirects: Record<string, string> = {
        'INVENTORY': '/inventory',
        'FINANCE': '/apps/finance',
        'PURCHASING': '/apps/purchasing',
        'PRODUCTION': '/apps/production',
        'SNM': '/apps/snm',
        'SALES': '/apps/snm',
        'ADMIN': '/dashboard',
      }

      const redirectPath = roleRedirects[roleName || ''] || '/dashboard'
      router.push(redirectPath)
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden flex items-center justify-center px-4 sm:px-6">
      {/* GIANT DOME BACKGROUND - Positioned at bottom with massive curve */}
      <div className="absolute -bottom-[30vh] left-1/2 -translate-x-1/2 w-[200vw] sm:w-[150vw] h-[80vh] bg-slate-100 rounded-[100%] z-0"></div>

      {/* TRULY TRANSPARENT GLASS CARD */}
      <div className="z-10 relative bg-transparent rounded-3xl p-6 sm:p-8 w-full max-w-md">
        {/* 1. Icon */}
        <div className="flex justify-center mb-3 sm:mb-4">
         <Archive className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" />
        </div>

        {/* 2. Title */}
        <h1 className="text-2xl sm:text-3xl leading-tight text-slate-900 text-center mb-2 font-caveat" style={{ fontFamily: 'Caveat, cursive', fontWeight: 700 }}>
          Masuk dan{' '}
          <span className="relative inline-block px-1">
            <span className="relative z-10 font-bold">level up</span>
            <span className="absolute -inset-x-2 -inset-y-1 -rotate-6 bg-orange-400/75 rounded-3xl -skew-y-6 transform-gpu blur-[1px]"></span>
          </span>
          {' '}produktivitas Anda!
        </h1>

        {/* 3. Subtitle */}
        <p className="text-xs sm:text-sm text-slate-500 text-center mb-4 sm:mb-6">
          Sign in with your email
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* 5. Email Label + Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-slate-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="m@example.com"
              required
              disabled={loading}
              className="h-10 sm:h-11 rounded-2xl bg-white/90 border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/20 text-sm"
              autoComplete="email"
            />
          </div>

          {/* 7. Password Label + Input */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-slate-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-10 sm:h-11 rounded-2xl bg-white/90 border-slate-200 focus-visible:ring-2 focus-visible:ring-slate-900/20 text-sm"
              autoComplete="current-password"
            />
          </div>

          {/* 9. Login Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 sm:h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-lg shadow-slate-900/20 transition-all duration-200 hover:shadow-xl hover:shadow-slate-900/30 text-sm sm:text-base"
          >
            {loading ? 'Signing in...' : 'Login'}
          </Button>
        </form>

        {/* Footer Text */}
        <p className="text-[10px] sm:text-xs text-center text-slate-500 mt-4 sm:mt-6 leading-relaxed px-2">
          By clicking continue, you agree to our{' '}
          <a href="#" className="underline hover:text-slate-700 font-medium">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-slate-700 font-medium">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
