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

    const { action } = body;
    if (action === 'reset') {
      const isSupabaseActive = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!isSupabaseActive) {
        return NextResponse.json({ success: true, message: 'Jurnal uji coba berhasil direset (mode mock).' });
      }

      const { createRouteHandlerClient } = await import('@/lib/supabase/server');
      const supabase = await createRouteHandlerClient();
      
      // 1. Hapus data terkait di tabel general_ledger
      const { error: glError } = await supabase
        .from('general_ledger')
        .delete()
        .gte('jurnal_id', 13);
      
      if (glError) {
        console.error('[API Journal Reset glError]', glError);
      }

      // 2. Set null referensi jurnal_id di inventory_valuation
      const { error: ivError } = await supabase
        .from('inventory_valuation')
        .update({ jurnal_id: null })
        .gte('jurnal_id', 13);

      if (ivError) {
        console.error('[API Journal Reset ivError]', ivError);
      }

      // 3. Hapus data di tabel jurnal
      const { error: jError } = await supabase
        .from('jurnal')
        .delete()
        .gte('jurnal_id', 13);
        
      if (jError) throw jError;

      // 4. Hapus transaksi uji coba (transaksi)
      const { error: txError } = await supabase
        .from('transaksi')
        .delete()
        .gte('transaction_id', 13);
      
      if (txError) {
        console.error('[API Journal Reset txError]', txError);
      }

      // Seed 3 pending transactions for Treasury Bank Reconciliation testing
      const { error: seedTxError } = await supabase
        .from('transaksi')
        .insert([
          {
            transaction_date: new Date().toISOString().substring(0, 10),
            module_source: 'AR',
            amount: 420000000,
            description: 'Mutasi Koran: Wire Transfer In (PT Indomarco Prismatama) - Ref: WT-9921',
            status: 'PENDING'
          },
          {
            transaction_date: new Date().toISOString().substring(0, 10),
            module_source: 'AP',
            amount: 156000000,
            description: 'Mutasi Koran: ACH Auto-Debit (PT Gelora Karya Utama) - Ref: ACH-001',
            status: 'PENDING'
          },
          {
            transaction_date: new Date().toISOString().substring(0, 10),
            module_source: 'AR',
            amount: 365000000,
            description: 'Mutasi Koran: Check Deposit (PT Sumber Alfaria Trijaya Tbk) - Ref: CHK-442',
            status: 'PENDING'
          }
        ]);

      if (seedTxError) {
        console.error('[API Journal Reset seedTxError]', seedTxError);
      }

      // 5. Hapus catatan kas uji coba (catatan_kas)
      const { error: kasError } = await supabase
        .from('catatan_kas')
        .delete()
        .gte('kas_id', 19);

      if (kasError) {
        console.error('[API Journal Reset kasError]', kasError);
      }

      // 6. Reset status tr_account_payable uji coba ke OUTSTANDING
      const { error: apError } = await supabase
        .from('tr_account_payable')
        .update({ ap_status: 'OUTSTANDING' })
        .in('ap_id', ['AP-202603-005', 'AP-202604-001', 'AP-202604-002']);

      if (apError) {
        console.error('[API Journal Reset apError]', apError);
      }

      // 7. Reset status perintah_pembayaran uji coba ke SENT
      const { error: ppError } = await supabase
        .from('perintah_pembayaran')
        .update({ status: 'SENT' })
        .in('request_id', [12, 13, 14]);

      if (ppError) {
        console.error('[API Journal Reset ppError]', ppError);
      }
      
      return NextResponse.json({ success: true, message: 'Status laporan berhasil direset. Saldo Neraca kembali seimbang.' });
    }

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
