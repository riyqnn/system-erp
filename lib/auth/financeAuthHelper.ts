/**
 * @fileoverview Helper Autentikasi untuk Modul Keuangan PT. Mayora Indah Tbk.
 * Menyediakan verifikasi otorisasi yang aman dan bypass mock jika Supabase tidak terkonfigurasi.
 */

import { NextRequest } from 'next/server';
import { requireAuth, requireAnyRole } from '@/lib/auth/rbac';
import { isSupabaseActive } from '@/lib/database/financeService';

/**
 * Memvalidasi token autentikasi dan izin role untuk API Route modul keuangan.
 * Jika variabel lingkungan Supabase tidak ada, fungsi akan mengembalikan mock user
 * berdasarkan parameter `mock_role` atau role `ADMIN` agar pengujian lokal berjalan lancar.
 * 
 * @param {NextRequest} request - Objek request Next.js.
 * @param {string[]} allowedRoles - Daftar nama role yang diizinkan (e.g. ['ADMIN', 'FINANCE']).
 * @returns {Promise<any>} Objek data user yang terautentikasi.
 */
export async function verifyAuthForRoute(request: NextRequest, allowedRoles: string[]) {
  if (!isSupabaseActive()) {
    // Fallback Mock User untuk pengujian lokal tanpa database Supabase
    const { searchParams } = new URL(request.url);
    const mockRole = searchParams.get('mock_role')?.toUpperCase() || 'ADMIN';
    
    return {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'staff.finance@mayora.co.id',
      full_name: 'Senior Finance Officer (Mock)',
      role_id: 'mock-role-id',
      is_active: true,
      is_pending: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      role: {
        id: 'mock-role-id',
        name: mockRole,
        description: 'Mock role for local development'
      }
    };
  }

  // Validasi real menggunakan RBAC & Supabase Auth
  const user = await requireAuth();
  if (allowedRoles.length > 0) {
    requireAnyRole(user, allowedRoles);
  }
  return user;
}
