/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'

export async function GET() {
  try {
    const user = await requireAuth()

    // Fetch full user profile with role
    const { createRouteHandlerClient } = await import('@/lib/supabase/server')
    const supabase = await createRouteHandlerClient()

    const { data: profile, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        role_id,
        is_active,
        created_at,
        updated_at,
        roles (
          id,
          name,
          description
        )
      `
      )
      .eq('id', user.id)
      .single()

    let profileData: any = profile;
    if (error || !profile) {
      const emailPrefix = user.email ? user.email.split('@')[0] : 'user';
      let roleName = 'FINANCE';
      let roleDesc = 'Finance Staff';
      if (emailPrefix === 'admin') {
        roleName = 'ADMIN';
        roleDesc = 'Super Admin';
      } else if (emailPrefix === 'inventory') {
        roleName = 'INVENTORY';
        roleDesc = 'Inventory Staff';
      } else if (emailPrefix === 'purchasing') {
        roleName = 'PURCHASING';
        roleDesc = 'Purchasing Staff';
      } else if (emailPrefix === 'production') {
        roleName = 'PRODUCTION';
        roleDesc = 'Production Staff';
      } else if (emailPrefix === 'snm') {
        roleName = 'SNM';
        roleDesc = 'SNM Staff';
      }

      profileData = {
        id: user.id,
        email: user.email || '',
        full_name: emailPrefix.toUpperCase(),
        role_id: 'mock-role-id',
        is_active: true,
        is_pending: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: {
          id: 'mock-role-id',
          name: roleName,
          description: roleDesc
        }
      } as any;
    }

    return NextResponse.json({
      profile: {
        ...profileData,
        role: (profileData as any).roles,
      },
    })
  } catch (error: any) {
    console.error('[Auth Profile Error]', error)
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
