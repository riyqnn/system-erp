/**
 * @fileoverview API Route untuk Cost Accounting & Valuasi Persediaan PT. Mayora Indah Tbk.
 * Menangani dokumen biaya produksi, log kalkulasi HPP, dan laporan penilaian persediaan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthForRoute } from '@/lib/auth/financeAuthHelper';
import { getBiayaProduksi, catatBiayaProduksi, hitungHppValuation, kirimLaporanPersediaan, mockDb } from '@/lib/database/financeService';

/**
 * Endpoint GET /api/finance/cost-accounting
 * Mengambil daftar biaya produksi, kalkulasi HPP, atau laporan penilaian persediaan.
 * Diakses oleh: ADMIN, FINANCE, COST_ACCOUNTING, PRODUCTION, INVENTORY_MANAGEMENT.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON berisi data cost accounting.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyAuthForRoute(request, [
      'ADMIN', 'FINANCE', 'COST_ACCOUNTING', 'PRODUCTION', 'INVENTORY_MANAGEMENT'
    ]);

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'hpp_logs' atau 'valuation_reports'

    if (mode === 'hpp_logs') {
      return NextResponse.json({ data: mockDb.hppList });
    }

    if (mode === 'valuation_reports') {
      return NextResponse.json({ data: mockDb.laporanPersediaanList });
    }

    const data = await getBiayaProduksi();
    return NextResponse.json({ data });

  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Cost Accounting GET Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}

/**
 * Endpoint POST /api/finance/cost-accounting
 * Menangani pencatatan biaya produksi baru, kalkulasi HPP, dan penerimaan laporan persediaan.
 * 
 * @param {NextRequest} request - Objek request.
 * @returns {Promise<NextResponse>} Response JSON status keberhasilan.
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.clone().json();

    // 1. Aksi: Production mengirimkan dokumen biaya produksi
    if (action === 'submit_cost') {
      const user = await verifyAuthForRoute(request, ['ADMIN', 'PRODUCTION', 'FINANCE']);
      const { nama_biaya, jumlah, tanggal, keterangan, production_request_id } = await request.json();

      if (!nama_biaya || !jumlah || !tanggal) {
        return NextResponse.json(
          { error: 'Input tidak lengkap. Diperlukan nama_biaya, jumlah, dan tanggal.' },
          { status: 400 }
        );
      }

      const biayaBaru = await catatBiayaProduksi({
        nama_biaya,
        jumlah: Number(jumlah),
        tanggal,
        keterangan: keterangan || '',
        production_request_id: production_request_id ? Number(production_request_id) : undefined
      }, user.id);

      return NextResponse.json({
        success: true,
        message: 'Dokumen biaya produksi berhasil disimpan.',
        data: biayaBaru
      }, { status: 201 });
    }

    // 2. Aksi: Cost Accounting menghitung HPP & Valuasi Persediaan
    if (action === 'calculate_hpp') {
      const user = await verifyAuthForRoute(request, ['ADMIN', 'COST_ACCOUNTING', 'FINANCE']);
      const { periode, product_id, opening_qty, opening_value, incoming_qty, incoming_value, closing_qty, closing_value } = await request.json();

      if (!periode || !product_id) {
        return NextResponse.json(
          { error: 'Input tidak lengkap. Diperlukan periode dan product_id.' },
          { status: 400 }
        );
      }

      const hppBaru = await hitungHppValuation(
        periode,
        Number(product_id),
        Number(opening_qty || 0),
        Number(opening_value || 0),
        Number(incoming_qty || 0),
        Number(incoming_value || 0),
        Number(closing_qty || 0),
        Number(closing_value || 0),
        user.id
      );

      return NextResponse.json({
        success: true,
        message: 'Kalkulasi HPP & valuasi rata-rata persediaan berhasil dihitung.',
        data: hppBaru
      }, { status: 201 });
    }

    // 3. Aksi: Inventory Management mengirimkan laporan penilaian persediaan
    if (action === 'valuation_report') {
      const user = await verifyAuthForRoute(request, ['ADMIN', 'INVENTORY_MANAGEMENT', 'FINANCE']);
      const { periode, total_stok, total_nilai } = await request.json();

      if (!periode || !total_stok || !total_nilai) {
        return NextResponse.json(
          { error: 'Input tidak lengkap. Diperlukan periode, total_stok, dan total_nilai.' },
          { status: 400 }
        );
      }

      const laporanBaru = await kirimLaporanPersediaan(
        periode,
        Number(total_stok),
        Number(total_nilai),
        user.id
      );

      return NextResponse.json({
        success: true,
        message: 'Laporan penilaian persediaan berhasil dikirim ke modul finance.',
        data: laporanBaru
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Aksi (action) tidak dikenali.' }, { status: 400 });

  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Cost Accounting POST Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
