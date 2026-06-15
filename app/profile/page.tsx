import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getUserFromRequest } from '@/lib/auth/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { User, EnvelopeSimple, IdentificationBadge, Buildings, Shield, Phone } from '@phosphor-icons/react/dist/ssr'

export default async function ProfilePage() {
  const user = await getUserFromRequest()
  if (!user) {
    redirect('/login')
  }

  const supabase = await createAdminClient()
  const { data: profile } = await supabase
    .from('ms_user_profile')
    .select('*')
    .eq('user_id', user.user_id)
    .maybeSingle()

  const avatarUrl = profile?.avatar_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(user.username)}`

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and profile data.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        
        {/* Profile Info */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12 mb-8">
            <div className="relative">
              <Image unoptimized
                src={avatarUrl}
                alt={user.full_name ?? user.username}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-white"
              />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-slate-900">{user.full_name || user.username}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-700">
                {user.role}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Account Information</h3>
              
              <div className="flex items-start gap-3 text-sm">
                <IdentificationBadge weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Username</p>
                  <p className="text-slate-900 mt-0.5">{user.username}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <EnvelopeSimple weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Email Address</p>
                  <p className="text-slate-900 mt-0.5">{user.email ?? '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <Shield weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">System Role</p>
                  <p className="text-slate-900 mt-0.5">{user.role}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Company Information</h3>
              
              <div className="flex items-start gap-3 text-sm">
                <Buildings weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Department</p>
                  <p className="text-slate-900 mt-0.5">{profile?.department ?? '-'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <User weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Position / Title</p>
                  <p className="text-slate-900 mt-0.5">{profile?.position ?? '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <Phone weight="fill" className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Phone Number</p>
                  <p className="text-slate-900 mt-0.5">{profile?.phone ?? '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
