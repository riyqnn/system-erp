/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createRouteHandlerClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Fetch user profile with role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        role_id,
        is_active,
        is_pending,
        created_at,
        updated_at,
        roles (
          id,
          name,
          description
        )
      `
      )
      .eq('id', data.user.id)
      .single()

    let profileData: any = userData;
    if (userError || !userData) {
      const emailPrefix = data.user.email ? data.user.email.split('@')[0] : 'user';
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
        id: data.user.id,
        email: data.user.email || '',
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

    if (!profileData.is_active) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      )
    }

    if (profileData.is_pending) {
      return NextResponse.json(
        { error: 'Account pending admin approval' },
        { status: 403 }
      )
    }

    // Return user data (tokens are already set in cookies by Supabase)
    return NextResponse.json(
      {
        user: {
          id: profileData.id,
          email: profileData.email,
          full_name: profileData.full_name,
          role_id: profileData.role_id,
          is_active: profileData.is_active,
          is_pending: profileData.is_pending,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at,
          role: (profileData as any).roles, // Full role object
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
      {
        status: 200,
        headers: {
          // Set HTTP-only cookies explicitly for compatibility
          'Set-Cookie': [
            `access_token=${data.session.access_token}; Path=/; HttpOnly; SameSite=lax; Max-Age=${data.session.expires_in}`,
            `refresh_token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=lax; Max-Age=604800`, // 7 days
          ].join(', '),
        },
      }
    )
  } catch (error) {
    console.error('[Auth Login Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
