/**
 * @fileoverview API Route untuk Jurnal Umum (GL) PT. Mayora Indah Tbk.
 * Menangani pengambilan history jurnal dan posting entri jurnal manual baru.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthForRoute } from '@/lib/auth/financeAuthHelper';
import { getDaftarJurnal, buatJurnalManual } from '@/lib/database/financeService';

/**
 * Endpoint GET /api/finance/journal
 * Mengambil seluruh daftar entri jurnal beserta detailnya.
 * Diakses oleh: ADMIN, FINANCE, ACCOUNTING_GL.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON berisi daftar jurnal.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAuthForRoute(request, ['ADMIN', 'FINANCE', 'ACCOUNTING_GL']);
    const data = await getDaftarJurnal();
    return NextResponse.json({ data });
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Journal GET Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}

/**
 * Endpoint POST /api/finance/journal
 * Membuat entri jurnal umum manual baru.
 * Aturan Bisnis 1: Jurnal wajib balance (total debet = total kredit).
 * Diakses oleh: ADMIN, FINANCE, ACCOUNTING_GL.
 * 
 * @param {NextRequest} request - Objek request dengan body berisi header & details.
 * @returns {Promise<NextResponse>} Response JSON status keberhasilan.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthForRoute(request, ['ADMIN', 'FINANCE', 'ACCOUNTING_GL']);
    const body = await request.json();

    const { tanggal, keterangan, details } = body;

    // Validasi input minimal
    if (!tanggal || !keterangan || !details || !Array.isArray(details) || details.length < 2) {
      return NextResponse.json(
        { error: 'Input tidak valid. Diperlukan tanggal, keterangan, dan minimal 2 baris detail jurnal.' },
        { status: 400 }
      );
    }

    // Eksekusi buat jurnal (validasi balance didelegasikan ke level service)
    const jurnalBaru = await buatJurnalManual(
      {
        tanggal,
        keterangan,
        status: 'POSTED',
        created_by: String(user.user_id)
      },
      details.map((d: { akun_id: number | string; debet?: number; kredit?: number }) => ({
        akun_id: Number(d.akun_id),
        debet: Number(d.debet || 0),
        kredit: Number(d.kredit || 0)
      }))
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Posting jurnal berhasil.', 
      data: jurnalBaru 
    }, { status: 201 });

  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Journal POST Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
