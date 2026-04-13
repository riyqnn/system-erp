'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Check,
  X,
  Plus,
  XCircle,
  MagnifyingGlass,
  Download,
  ArrowCounterClockwise,
  Users,
  CheckCircle,
  Clock,
  ShieldCheck,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AddUserModal } from '@/components/admin/AddUserModal'
import { ModuleLayout } from '@/components/layout/ModuleLayout'
import { cn } from '@/lib/utils'

interface PendingUser {
  id: string
  email: string
  full_name: string | null
  role_id: string
  is_pending: boolean
  created_at: string
  role: {
    id: string
    name: string
    description: string | null
  }
}

interface Role {
  id: string
  name: string
  description: string | null
}

export function UserManagementPageClient() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active'>('all')

  const fetchPendingUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users/pending')

      if (response.status === 401 || response.status === 403) {
        router.push('/dashboard')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to fetch pending users')
        return
      }

      setPendingUsers(data.pendingUsers || [])
    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles')
      const data = await response.json()
      setRoles(data.roles || [])
    } catch (err) {
      console.error('Failed to fetch roles:', err)
    }
  }

  useEffect(() => {
    fetchPendingUsers()
    fetchRoles()
  }, [])

  const handleApprove = async (userId: string) => {
    setActionLoading(userId)
    setError('')

    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to approve user')
        return
      }

      setPendingUsers(prev => prev.filter(u => u.id !== userId))
      setSuccessMessage('User approved successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? This action cannot be undone.')) {
      return
    }

    setActionLoading(userId)
    setError('')

    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to reject user')
        return
      }

      setPendingUsers(prev => prev.filter(u => u.id !== userId))
      setSuccessMessage('User rejected successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUserCreated = () => {
    setSuccessMessage('User created successfully')
    setTimeout(() => setSuccessMessage(''), 3000)
    fetchPendingUsers()
  }

  // Filter users
  const filteredUsers = pendingUsers.filter(user => {
    const matchesSearch =
      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && user.is_pending) ||
      (statusFilter === 'active' && !user.is_pending)

    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <ModuleLayout
      activeModule="admin"
      moduleTitle="Admin"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Admin', href: '/admin' },
        { label: 'Users' },
      ]}
    >
      <div>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
            <p className="text-slate-500 mt-1">Manage user accounts, permissions, and approvals</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow"
          >
            <Plus weight="bold" className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle weight="bold" className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Filters Bar */}
        <Card className="border-slate-200 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlass weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-red-500 focus:ring-red-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    statusFilter === 'all'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    statusFilter === 'pending'
                      ? 'bg-yellow-500 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    statusFilter === 'active'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Active
                </button>
              </div>

              {/* Export Button */}
              <Button
                variant="outline"
                className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Download weight="bold" className="h-4 w-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          /* Empty State */
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <Users weight="bold" className="h-8 w-8 text-red-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No users found</h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first user account'}
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="gap-2 bg-red-600 hover:bg-red-700"
              >
                <Plus weight="bold" className="h-4 w-4" />
                Add User
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Users Table */
          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Registration Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-red-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-11 w-11 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center text-red-700 text-sm font-semibold border-2 border-white shadow-sm">
                            {(user.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900">
                              {user.full_name || 'No Name'}
                            </div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {user.role.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_pending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                            <Clock weight="bold" className="h-3 w-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                            <ShieldCheck weight="bold" className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.is_pending && (
                            <>
                              <Button
                                onClick={() => handleApprove(user.id)}
                                disabled={actionLoading === user.id}
                                size="sm"
                                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              >
                                <Check weight="bold" className="h-3.5 w-3.5" />
                                {actionLoading === user.id ? '...' : 'Approve'}
                              </Button>
                              <Button
                                onClick={() => handleReject(user.id)}
                                disabled={actionLoading === user.id}
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                              >
                                <X weight="bold" className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Add User Modal */}
      <AddUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleUserCreated}
        roles={roles}
      />
    </ModuleLayout>
  )
}
