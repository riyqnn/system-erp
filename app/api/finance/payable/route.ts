/**
 * @fileoverview API Route untuk Account Payable (Hutang Usaha) PT. Mayora Indah Tbk.
 * Menangani pengambilan data hutang, verifikasi Three-way matching, dan pembuatan pengajuan pembayaran.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthForRoute } from '@/lib/auth/financeAuthHelper';
import { getDaftarHutang, verifikasiDanBuatHutang, buatPermintaanPembayaran, getPoAndGrList } from '@/lib/database/financeService';

/**
 * Endpoint GET /api/finance/payable
 * Mengambil daftar hutang usaha beserta status pembayaran atau data PO/GR pembanding.
 * Diakses oleh: ADMIN, FINANCE, ACCOUNT_PAYABLE, PURCHASING.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON berisi daftar hutang atau PO/GR list.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAuthForRoute(request, ['ADMIN', 'FINANCE', 'ACCOUNT_PAYABLE', 'PURCHASING']);
    
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'matching_data' untuk mengambil PO & GR
    
    if (mode === 'matching_data') {
      const data = await getPoAndGrList();
      return NextResponse.json({ data });
    }

    const data = await getDaftarHutang();
    return NextResponse.json({ data });
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Payable GET Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}

/**
 * Endpoint POST /api/finance/payable
 * Menangani aksi pencatatan invoice (matching) dan pengajuan pembayaran (payment request).
 * Aturan Bisnis 2: Purchase Invoice harus cocok dengan PO number dan Goods Receipt sebelum dicatat sebagai hutang.
 * Diakses oleh: ADMIN, FINANCE, ACCOUNT_PAYABLE, PURCHASING.
 * 
 * @param {NextRequest} request - Objek request dengan body aksi.
 * @returns {Promise<NextResponse>} Response JSON berisi hasil transaksi.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthForRoute(request, ['ADMIN', 'FINANCE', 'ACCOUNT_PAYABLE', 'PURCHASING']);
    const body = await request.json();

    const { action } = body;

    // 1. Aksi: Verifikasi Three-way matching & Catat Hutang
    if (action === 'match') {
      const { no_invoice, no_po, gr_code, supplier_id, jumlah, tanggal_invoice, due_date } = body;

      if (!no_invoice || !no_po || !gr_code || !supplier_id || !jumlah || !tanggal_invoice || !due_date) {
        return NextResponse.json(
          { error: 'Input matching tidak lengkap. Diperlukan no_invoice, no_po, gr_code, supplier_id, jumlah, tanggal_invoice, dan due_date.' },
          { status: 400 }
        );
      }

      const hasil = await verifikasiDanBuatHutang(
        no_invoice,
        no_po,
        gr_code,
        Number(supplier_id),
        Number(jumlah),
        tanggal_invoice,
        due_date,
        String(user.user_id)
      );

      if (!hasil.success) {
        return NextResponse.json({ error: hasil.message }, { status: 422 }); // Unprocessable Entity
      }

      return NextResponse.json({
        success: true,
        message: hasil.message,
        data: hasil.data
      }, { status: 201 });
    }

    // 2. Aksi: Buat Permintaan Pembayaran AP
    if (action === 'request_payment') {
      const { hutang_id, jumlah_bayar, metode_pembayaran, keterangan } = body;

      if (!hutang_id || !jumlah_bayar || !metode_pembayaran || !keterangan) {
        return NextResponse.json(
          { error: 'Input tidak lengkap. Diperlukan hutang_id, jumlah_bayar, metode_pembayaran, dan keterangan.' },
          { status: 400 }
        );
      }

      const pmt = await buatPermintaanPembayaran(
        Number(hutang_id),
        Number(jumlah_bayar),
        metode_pembayaran,
        keterangan,
        String(user.user_id)
      );

      return NextResponse.json({
        success: true,
        message: 'Pengajuan permintaan pembayaran AP berhasil dibuat.',
        data: pmt
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Aksi (action) tidak dikenali.' }, { status: 400 });

  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Payable POST Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
