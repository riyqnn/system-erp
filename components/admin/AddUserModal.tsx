'use client'

import { useState, useEffect } from 'react'
import { Shield, User as UserIcon, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AdminFormCard, AdminFormSection, AdminFormField, AdminToggle, AdminButton } from './AdminFormCard'

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  roles: string[]
}

export function AddUserModal({ open, onClose, onSuccess, roles }: AddUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: '',
    is_active: false,
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        role: '',
        is_active: false,
      })
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.username || !formData.email || !formData.password || !formData.role) {
      setError('Username, email, password, and role are required')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: formData.is_active ? 'ACTIVE' : 'INACTIVE',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create user')
        setLoading(false)
        return
      }

      // Success!
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-200">
        <AdminFormCard
          title="New User"
          description="Create a new user account and set permissions"
          onClose={onClose}
        >
          <form onSubmit={handleSubmit}>
            {/* User Information Section */}
            <AdminFormSection title="User Information" icon={<UserIcon className="h-4 w-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AdminFormField
                  label="Full Name"
                  hint="Enter the user's complete name"
                >
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. John Smith"
                    disabled={loading}
                    className="border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </AdminFormField>

                <AdminFormField
                  label="Username"
                  required
                  hint="Unique username for the system"
                >
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. john.smith"
                    required
                    disabled={loading}
                    className="border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </AdminFormField>

                <AdminFormField
                  label="Email Address"
                  required
                  hint="Will be used for login"
                >
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                    disabled={loading}
                    className="border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </AdminFormField>

                <AdminFormField
                  label="Password"
                  required
                  hint="Minimum 6 characters"
                >
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                    className="border-slate-200 focus:border-red-500 focus:ring-red-500"
                  />
                </AdminFormField>

                <AdminFormField
                  label="Role"
                  required
                  hint="Assign user role and permissions"
                >
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a role</option>
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </AdminFormField>
              </div>
            </AdminFormSection>

            {/* Permissions Section */}
            <AdminFormSection title="Permissions & Status" icon={<Shield className="h-4 w-4" />}>
              <div className="space-y-4">
                <AdminToggle
                  checked={formData.is_active}
                  onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  label="Activate Account Immediately"
                  description="If enabled, the user can login immediately. If disabled, the account will require approval."
                  disabled={loading}
                />

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">Role-based Permissions</p>
                      <p className="text-xs text-slate-500 mt-1">
                        User will inherit all permissions from their assigned role ({formData.role || 'Not selected'})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AdminFormSection>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <AdminButton
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="submit"
                variant="primary"
                loading={loading}
              >
                {loading ? 'Creating User...' : 'Create User'}
              </AdminButton>
            </div>
          </form>
        </AdminFormCard>
      </div>
    </div>
  )
}
