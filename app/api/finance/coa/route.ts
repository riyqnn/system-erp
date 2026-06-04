/**
 * @fileoverview API Route untuk Chart of Accounts (COA) / ms_akun.
 * Mengembalikan seluruh daftar master akun beserta saldo berjalan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthForRoute } from '@/lib/auth/financeAuthHelper';
import { getDaftarAkun } from '@/lib/database/financeService';

/**
 * Endpoint GET /api/finance/coa
 * Mengambil daftar Chart of Accounts (COA) PT. Mayora Indah Tbk.
 * Diakses oleh: ADMIN, FINANCE, ACCOUNTING_GL, TREASURY, AR, AP, COST_ACCOUNTING.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON berisi daftar akun atau error.
 */
export async function GET(request: NextRequest) {
  try {
    // Validasi otorisasi
    await verifyAuthForRoute(request, [
      'ADMIN', 'FINANCE', 'ACCOUNTING_GL', 'TREASURY', 
      'ACCOUNT_RECEIVABLE', 'ACCOUNT_PAYABLE', 'COST_ACCOUNTING'
    ]);

    const data = await getDaftarAkun();
    return NextResponse.json({ data });
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API COA GET Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
