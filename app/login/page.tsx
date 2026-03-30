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
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        const user = data.user

        // Role-based redirect
        const role = user?.role?.toUpperCase()
        const roleRedirects: Record<string, string> = {
          'INVENTORY': '/apps/inventory',
          'FINANCE': '/apps/finance',
          'PURCHASING': '/apps/purchasing',
          'PRODUCTION': '/apps/production',
          'SNM': '/apps/snm',
          'SALES': '/apps/snm',
          'ADMIN': '/dashboard',
        }

        const redirectPath = roleRedirects[role || ''] || '/dashboard'
        router.push(redirectPath)
        router.refresh()
      }
    } catch (err) {
      console.error(err)
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
          Don't have an account?{' '}
          <a href="#" className="underline font-medium text-slate-700 hover:text-slate-900">
            Sign up
          </a>
        </p>

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

        {/* 10. Divider with "Or" */}
        <div className="relative my-4 sm:my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-300" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white/10 px-3 text-slate-500 font-medium">Or</span>
          </div>
        </div>

        {/* 11. OAuth Buttons - 2 COLUMN GRID */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-11 rounded-2xl border-slate-300 bg-white/90 hover:bg-white hover:border-slate-400 shadow-sm text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span className="font-medium">Apple</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-11 rounded-2xl border-slate-300 bg-white/90 hover:bg-white hover:border-slate-400 shadow-sm text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">Google</span>
          </Button>
        </div>

        {/* 12. Footer Text */}
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
