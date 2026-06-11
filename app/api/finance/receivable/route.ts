/**
 * @fileoverview API Route untuk Account Receivable (Piutang Usaha) PT. Mayora Indah Tbk.
 * Menangani pengambilan data piutang, pelunasan piutang, dan reminder log.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthForRoute } from '@/lib/auth/financeAuthHelper';
import { getDaftarPiutang, terimaPelunasanPiutang } from '@/lib/database/financeService';

/**
 * Endpoint GET /api/finance/receivable
 * Mengambil daftar piutang usaha beserta status pelunasan.
 * Diakses oleh: ADMIN, FINANCE, ACCOUNT_RECEIVABLE, TREASURY.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON berisi daftar piutang.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAuthForRoute(request, ['ADMIN', 'FINANCE', 'ACCOUNT_RECEIVABLE', 'TREASURY']);
    const data = await getDaftarPiutang();
    return NextResponse.json({ data });
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Receivable GET Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}

/**
 * Endpoint POST /api/finance/receivable
 * Mencatat pelunasan piutang (kas masuk) dari pelanggan.
 * Aturan Bisnis 5: Setiap transaksi kas otomatis menjurnal ke general ledger.
 * Diakses oleh: ADMIN, FINANCE, ACCOUNT_RECEIVABLE, TREASURY.
 * 
 * @param {NextRequest} request - Objek request dengan body pelunasan.
 * @returns {Promise<NextResponse>} Response JSON status pelunasan.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthForRoute(request, ['ADMIN', 'FINANCE', 'ACCOUNT_RECEIVABLE', 'TREASURY']);
    const body = await request.json();

    const { piutang_id, akun_kas_id, jumlah_terima } = body;

    if (!piutang_id || !akun_kas_id || !jumlah_terima || jumlah_terima <= 0) {
      return NextResponse.json(
        { error: 'Input tidak valid. Diperlukan piutang_id, akun_kas_id, dan jumlah_terima (> 0).' },
        { status: 400 }
      );
    }

    const hasil = await terimaPelunasanPiutang(
      Number(piutang_id),
      Number(akun_kas_id),
      Number(jumlah_terima),
      user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Penerimaan kas pelunasan piutang berhasil dicatat.',
      data: hasil
    });

  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Receivable POST Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
