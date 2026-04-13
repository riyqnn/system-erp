'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminFormCardProps {
  title: string
  description?: string
  children: ReactNode
  onClose?: () => void
  className?: string
}

export function AdminFormCard({
  title,
  description,
  children,
  onClose,
  className
}: AdminFormCardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-2xl border border-slate-200', className)}>
      <div className="px-8 pt-6 pb-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-black">{title}</h2>
            {description && (
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
            >
              <X className="h-5 w-5 text-slate-400 group-hover:text-red-600" />
            </button>
          )}
        </div>
      </div>

      <div className="p-8">
        {children}
      </div>
    </div>
  )
}

interface AdminFormSectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function AdminFormSection({
  title,
  icon,
  children,
  className
}: AdminFormSectionProps) {
  return (
    <div className={cn('mb-8 last:mb-0', className)}>
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-200">
        {icon && (
          <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            {icon}
          </div>
        )}
        <h3 className="text-base font-semibold text-black">{title}</h3>
      </div>

      <div className="space-y-5">
        {children}
      </div>
    </div>
  )
}

interface AdminFormFieldProps {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
  className?: string
}

export function AdminFormField({
  label,
  required,
  hint,
  children,
  className
}: AdminFormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
}

interface AdminToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function AdminToggle({
  checked,
  onChange,
  label,
  description,
  disabled
}: AdminToggleProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border transition-all',
      checked
        ? 'border-red-200 bg-red-50'
        : 'border-slate-200 bg-white hover:border-slate-300',
      disabled && 'opacity-50 cursor-not-allowed'
    )}>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
          checked ? 'bg-red-600' : 'bg-slate-300'
        )}
      >
        <span
          className={cn(
            'absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out shadow-sm',
            checked && 'translate-x-5'
          )}
        />
      </button>
      <div className="flex-1 min-w-0">
        <label className={cn(
          'block text-sm font-medium cursor-pointer',
          checked ? 'text-red-700' : 'text-slate-700'
        )}>
          {label}
        </label>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

interface AdminButtonProps {
  variant: 'primary' | 'secondary' | 'danger'
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function AdminButton({
  variant,
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className
}: AdminButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-white text-slate-700 border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 hover:border-red-300 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], className)}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  )
}
