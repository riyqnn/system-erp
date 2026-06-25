import { redirect } from 'next/navigation'
import { getUserFromRequest } from '@/lib/auth/rbac'

export default async function AccountSettingsPage() {
  const user = await getUserFromRequest()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-1">Manage your preferences and account settings.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">General Preferences</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Language</p>
              <p className="text-xs text-slate-500 mt-0.5">Select the primary language for the application interface.</p>
            </div>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30">
              <option>English</option>
              <option>Bahasa Indonesia</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Time Zone</p>
              <p className="text-xs text-slate-500 mt-0.5">Set the time zone for data synchronization.</p>
            </div>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30">
              <option>Asia/Jakarta (WIB)</option>
              <option>Asia/Makassar (WITA)</option>
              <option>Asia/Jayapura (WIT)</option>
            </select>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mt-10 mb-6 border-b border-slate-100 pb-4">Account Security</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Change Password</p>
              <p className="text-xs text-slate-500 mt-0.5">Update your password regularly for security.</p>
            </div>
            <button className="text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors">
              Change Password
            </button>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Two-Factor Authentication (2FA)</p>
              <p className="text-xs text-slate-500 mt-0.5">Add an extra layer of security to your account.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
              Inactive
            </span>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
          <button className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-6 py-2.5 rounded-xl shadow-sm transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
