'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
        'FINANCE': '/finance',
        'PURCHASING': '/apps/purchasing',
        'PRODUCTION': '/production',
        'SNM': '/snm',
        'SALES': '/snm',
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
    <div className="flex min-h-screen w-full">

      {/* ── LEFT PANEL — Form ── */}
      <div className="relative flex w-full flex-col justify-center px-8 py-12 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24 bg-white">

        {/* Logo top-left */}
        <div className="mb-10">
          <Image
            src="/logo mayora.png"
            alt="Mayora Logo"
            width={160}
            height={56}
            className="object-contain"
            priority
          />
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Selamat datang kembali
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Masuk ke sistem ERP Mayora Indah
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
            <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@mayora.com"
              required
              disabled={loading}
              autoComplete="email"
              className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-red-400 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="h-12 rounded-xl border-slate-200 bg-slate-50 text-sm text-slate-800 focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-red-400 transition-all"
            />
          </div>

          {/* Submit */}
          <Button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-semibold shadow-md shadow-red-200 transition-all duration-200 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Signing in…
              </span>
            ) : 'Masuk'}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-slate-400 leading-relaxed">
          Dengan masuk, Anda menyetujui{' '}
          <a href="#" className="font-medium text-slate-500 underline hover:text-slate-700 transition-colors">
            Syarat & Ketentuan
          </a>{' '}
          dan{' '}
          <a href="#" className="font-medium text-slate-500 underline hover:text-slate-700 transition-colors">
            Kebijakan Privasi
          </a>
          .
        </p>

        {/* Copyright bottom-left */}
        <p className="absolute bottom-6 left-8 sm:left-12 lg:left-16 xl:left-24 text-[11px] text-slate-300">
          © {new Date().getFullYear()} PT Mayora Indah Tbk
        </p>
      </div>

      {/* ── RIGHT PANEL — Image ── */}
      <div className="relative hidden lg:block lg:w-1/2">
        <Image
          src="/mayora1.jpg"
          alt="Mayora"
          fill
          className="object-cover"
          priority
        />
        {/* Subtle dark overlay so image doesn't feel too raw */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-transparent to-black/20" />


      </div>

    </div>
  )
}
