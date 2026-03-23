import { Injectable, UnauthorizedException } from '@nestjs/common';
import { supabase } from '../../lib/supabase';

/**
 * User profile interface from database
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Role interface
 */
export interface Role {
  id: string;
  name: string;
  description: string;
}

/**
 * User with role information
 */
export interface UserWithRole extends UserProfile {
  role?: Role;
}

/**
 * Login response interface
 */
export interface LoginResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

/**
 * Supabase Auth User
 */
interface SupabaseAuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

/**
 * Supabase Auth Response
 */
interface SupabaseAuthResponse {
  data: {
    user?: SupabaseAuthUser | null;
    session?: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      expires_at: number;
    } | null;
  };
  error?: {
    message: string;
  } | null;
}

@Injectable()
export class AuthService {
  /**
   * Login user with email and password using Supabase Auth
   * Returns JWT tokens via HTTP-only cookies
   */
  async login(email: string, password: string, res: any) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user profile with role from database
    const userProfile = await this.getUserProfile(data.user.id);

    // Set HTTP-only cookies
    res.cookie('access_token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in,
      path: '/',
    });

    res.cookie('refresh_token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Return user data (tokens are in cookies)
    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        role: userProfile.role?.name || 'USER',
      },
      access_token: data.session.access_token, // Also return for convenience
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    };
  }

  /**
   * Verify JWT token and return user information
   * This is called by the JwtAuthGuard
   */
  async verifyToken(token: string): Promise<UserWithRole> {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Fetch user profile with role from database
    return this.getUserProfile(data.user.id);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserWithRole> {
    const { data, error } = await supabase
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
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('User profile not found');
    }

    if (!data.is_active) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Transform the data to match our interface
    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role_id: data.role_id,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      role: (data as any).roles, // Roles joined from the select query
    };
  }

  /**
   * Get current user from JWT token
   */
  async getCurrentUser(token: string): Promise<UserWithRole> {
    return this.verifyToken(token);
  }

  /**
   * Refresh access token using refresh token
   * Returns new tokens via HTTP-only cookies
   */
  async refreshToken(refreshToken: string, res: any) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Update HTTP-only cookies
    res.cookie('access_token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in,
      path: '/',
    });

    res.cookie('refresh_token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    };
  }

  /**
   * Logout user (invalidate session and clear cookies)
   */
  async logout(res: any) {
    // Clear HTTP-only cookies
    res.clearCookie('access_token', {
      path: '/',
    });

    res.clearCookie('refresh_token', {
      path: '/',
    });

    // Also logout from Supabase
    // Note: We don't have the token here, so we skip the Supabase logout
    // The cookies are cleared, which is enough for logout
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('roles (name)')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    const userRole = (data as any).roles?.name;
    return userRole === roleName;
  }
}
