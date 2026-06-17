import { redirect } from 'next/navigation'
import { getUserFromRequest } from '@/lib/auth/rbac'
import { createAdminClient } from '@/lib/supabase/server'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const user = await getUserFromRequest()
  if (!user) {
    redirect('/login')
  }

  const supabase = await createAdminClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('avatar_url, avatar_style, department, phone, bio, theme, notif_email, notif_push')
    .eq('user_id', user.user_id)
    .maybeSingle()

  return (
    <ProfileClient
      user={{
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      }}
      initialProfile={{
        avatar_url:   profile?.avatar_url ?? null,
        avatar_style: profile?.avatar_style ?? 'adventurer',
        department:   profile?.department ?? null,
        phone:        profile?.phone ?? null,
        bio:          profile?.bio ?? null,
      }}
    />
  )
}
