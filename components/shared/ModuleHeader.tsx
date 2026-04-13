'use client'

export interface ModuleHeaderProps {
  title: string
  description?: string
}

export function ModuleHeader({ title, description }: ModuleHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-black mb-6">{title}</h1>
      {description && (
        <p className="text-slate-500 mt-1">{description}</p>
      )}
    </div>
  )
}
