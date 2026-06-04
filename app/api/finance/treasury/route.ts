/**
 * @fileoverview API Route untuk Treasury & Management Approvals PT. Mayora Indah Tbk.
 * Menangani persetujuan pengeluaran kas oleh Management dan eksekusi pembayaran kas oleh Treasury.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthForRoute } from '@/lib/auth/financeAuthHelper';
import { getDaftarPermintaanPembayaran, approvePermintaanPembayaran, eksekusiPembayaranTreasury, getTransaksiKasList } from '@/lib/database/financeService';

/**
 * Endpoint GET /api/finance/treasury
 * Mengambil daftar pengajuan pembayaran AP, history kas, dan saldo kas.
 * Diakses oleh: ADMIN, FINANCE, TREASURY, MANAGEMENT.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON berisi data keuangan treasury.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAuthForRoute(request, ['ADMIN', 'FINANCE', 'TREASURY', 'MANAGEMENT']);

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'history' untuk mengambil history transaksi kas
    
    if (mode === 'history') {
      const data = await getTransaksiKasList();
      return NextResponse.json({ data });
    }

    const data = await getDaftarPermintaanPembayaran();
    return NextResponse.json({ data });
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Treasury GET Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}

/**
 * Endpoint POST /api/finance/treasury
 * Menangani persetujuan (approval) oleh Management dan eksekusi pembayaran oleh Treasury.
 * Aturan Bisnis 3: Permintaan pembayaran wajib disetujui Management sebelum Treasury bisa eksekusi.
 * Aturan Bisnis 5: Transaksi kas otomatis menghasilkan jurnal Buku Besar.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON berisi status eksekusi.
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.clone().json();

    // 1. Aksi: Persetujuan Pengajuan Pembayaran oleh Management
    if (action === 'approve') {
      const user = await verifyAuthForRoute(request, ['ADMIN', 'MANAGEMENT']);
      const { permintaan_id, status, alasan } = await request.json();

      if (!permintaan_id || !status || !['DISETUJUI', 'DITOLAK'].includes(status)) {
        return NextResponse.json(
          { error: 'Input tidak valid. Diperlukan permintaan_id, status (DISETUJUI/DITOLAK), dan alasan (jika ditolak).' },
          { status: 400 }
        );
      }

      const hasil = await approvePermintaanPembayaran(
        Number(permintaan_id),
        status,
        alasan || '',
        user.id
      );

      return NextResponse.json({
        success: true,
        message: 'Status permintaan pembayaran berhasil diubah menjadi: ' + status,
        data: hasil
      });
    }

    // 2. Aksi: Eksekusi Pembayaran oleh Treasury
    if (action === 'execute') {
      const user = await verifyAuthForRoute(request, ['ADMIN', 'TREASURY']);
      const { permintaan_id, akun_kas_id } = await request.json();

      if (!permintaan_id || !akun_kas_id) {
        return NextResponse.json(
          { error: 'Input tidak valid. Diperlukan permintaan_id dan akun_kas_id.' },
          { status: 400 }
        );
      }

      const hasil = await eksekusiPembayaranTreasury(
        Number(permintaan_id),
        Number(akun_kas_id),
        user.id
      );

      return NextResponse.json({
        success: true,
        message: 'Pembayaran kas berhasil dieksekusi dan jurnal otomatis telah dicatat.',
        data: hasil
      });
    }

    return NextResponse.json({ error: 'Aksi (action) tidak dikenali.' }, { status: 400 });

  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Treasury POST Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
