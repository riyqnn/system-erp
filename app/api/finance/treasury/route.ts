/**
 * @fileoverview API Route untuk Treasury & Management Approvals PT. Mayora Indah Tbk.
 * Menangani persetujuan pengeluaran kas oleh Management dan eksekusi pembayaran kas oleh Treasury.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthForRoute } from '@/lib/auth/financeAuthHelper';
import { 
  getDaftarPermintaanPembayaran, 
  approvePermintaanPembayaran, 
  eksekusiPembayaranTreasury, 
  getTransaksiKasList,
  fallbackAkunList,
  Akun
} from '@/lib/database/financeService';

interface TransaksiRow {
  transaction_id: number;
  description: string;
  module_source: string;
  amount: number;
  status: string;
}

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
    const mode = searchParams.get('mode'); // 'history' atau 'unverified'
    
    if (mode === 'history') {
      const data = await getTransaksiKasList();
      return NextResponse.json({ data });
    }

    if (mode === 'unverified') {
      const { createRouteHandlerClient } = await import('@/lib/supabase/server');
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('transaksi')
        .select('*')
        .eq('status', 'PENDING')
        .order('transaction_id', { ascending: true });
      
      if (error) throw error;
      
      const formatted = (data || []).map((t: TransaksiRow) => {
        // Extract partner name from description
        const senderMatch = t.description.match(/Mutasi Koran: [^\(]+\(([^)]+)\)/);
        const refMatch = t.description.match(/Ref: ([^\s]+)/);
        return {
          id: t.transaction_id,
          transaction_id: t.transaction_id,
          type: t.module_source === 'AR' ? 'Wire Transfer In' : 'ACH Auto-Debit',
          amount: t.module_source === 'AR' ? Number(t.amount) : -Number(t.amount),
          sender: senderMatch ? senderMatch[1] : 'Mitra Mayora',
          ref: refMatch ? refMatch[1] : 'WT-' + t.transaction_id,
          isCredit: t.module_source === 'AR',
          verified: false
        };
      });

      return NextResponse.json({ data: formatted });
    }

    const page = searchParams.get('page') ? Number(searchParams.get('page')) : undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
    const statusVal = searchParams.get('status') || undefined;

    const result = await getDaftarPermintaanPembayaran(page, limit, statusVal as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXECUTED');
    return NextResponse.json({ data: result.data, total: result.total });
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
      const user = await verifyAuthForRoute(request, ['ADMIN', 'MANAGEMENT', 'FINANCE']);
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
        String(user.user_id)
      );

      return NextResponse.json({
        success: true,
        message: 'Status permintaan pembayaran berhasil diubah menjadi: ' + status,
        data: hasil
      });
    }

    // 2. Aksi: Eksekusi Pembayaran oleh Treasury
    if (action === 'execute') {
      const user = await verifyAuthForRoute(request, ['ADMIN', 'TREASURY', 'FINANCE']);
      const { permintaan_id, akun_kas_id } = await request.json();

      if (!permintaan_id || !akun_kas_id) {
        return NextResponse.json(
          { error: 'Input tidak valid. Diperlukan permintaan_id and akun_kas_id.' },
          { status: 400 }
        );
      }

      const hasil = await eksekusiPembayaranTreasury(
        Number(permintaan_id),
        Number(akun_kas_id),
        String(user.user_id)
      );

      return NextResponse.json({
        success: true,
        message: 'Pembayaran kas berhasil dieksekusi dan jurnal otomatis telah dicatat.',
        data: hasil
      });
    }

    // 3. Aksi: Rekonsiliasi Kas (Inflow/Outflow) dengan AR/AP
    if (action === 'reconcile') {
      const user = await verifyAuthForRoute(request, ['ADMIN', 'TREASURY', 'FINANCE']);
      const { type, invoice_id, amount, akun_kas_id, transaction_id } = await request.json();

      if (!type || !invoice_id || !amount || !akun_kas_id) {
        return NextResponse.json(
          { error: 'Input tidak valid. Diperlukan type, invoice_id, amount, dan akun_kas_id.' },
          { status: 400 }
        );
      }

      const { createRouteHandlerClient } = await import('@/lib/supabase/server');
      const supabase = await createRouteHandlerClient();

      if (type === 'inflow') {
        // 1. Ambil detail piutang
        const { data: piutang, error: pError } = await supabase
          .from('piutang')
          .select('*, ms_customer(cust_name)')
          .eq('piutang_id', invoice_id)
          .single();

        if (pError || !piutang) {
          return NextResponse.json({ error: 'Piutang tidak ditemukan.' }, { status: 404 });
        }

        const sisaAR = piutang.status === 'PAID' ? 0 : Number(piutang.amount);
        const sisaBaru = sisaAR - Number(amount);
        const statusBaru = sisaBaru <= 0 ? 'PAID' : piutang.status;

        // Update status piutang
        await supabase.from('piutang').update({ status: statusBaru }).eq('piutang_id', invoice_id);

        // Jika lunas, update tr_sales_invoice terkait
        if (statusBaru === 'PAID') {
          await supabase.from('tr_sales_invoice').update({ payment_status: 'PAID' }).eq('inv_id', piutang.inv_id);
        }

        // Ambil info kas bank pembayar/penerima
        let codeKas = '1001';
        let newBalance = 0;
        try {
          const { data: akunKas } = await supabase.from('ms_akun').select('*').eq('id_akun', akun_kas_id).single();
          if (akunKas) {
            codeKas = akunKas.kode_akun;
            newBalance = Number(akunKas.saldo_berjalan) + Number(amount);
          } else {
            const fallback = fallbackAkunList.find((a: Akun) => a.id_akun === Number(akun_kas_id));
            if (fallback) {
              codeKas = fallback.kode_akun;
              newBalance = Number(fallback.saldo_berjalan) + Number(amount);
            }
          }
        } catch {
          const fallback = fallbackAkunList.find((a: Akun) => a.id_akun === Number(akun_kas_id));
          if (fallback) {
            codeKas = fallback.kode_akun;
            newBalance = Number(fallback.saldo_berjalan) + Number(amount);
          }
        }

        // 2. Catat catatan_kas
        const { data: kasData } = await supabase.from('catatan_kas').insert([{
          order_id: null,
          transaction_date: new Date().toISOString().substring(0, 10),
          type: 'INFLOW',
          amount: Number(amount),
          description: 'Penerimaan Rekonsiliasi Pelunasan AR Faktur ' + piutang.inv_id,
          balance: newBalance,
          recorded_by: Number(user.user_id)
        }]).select().single();

        // Update saldo kas berjalan di ms_akun
        try {
          await supabase.from('ms_akun').update({ saldo_berjalan: newBalance }).eq('id_akun', akun_kas_id);
        } catch {}

        // 3. Update existing pending transaksi atau buat baru
        let targetTxId = transaction_id;
        if (targetTxId) {
          await supabase.from('transaksi').update({
            kas_id: kasData?.kas_id || null,
            status: 'VERIFIED',
            verified_by: Number(user.user_id),
            description: 'Pelunasan AR Faktur ' + piutang.inv_id + ' (Terverifikasi)'
          }).eq('transaction_id', targetTxId);
        } else {
          const { data: txData } = await supabase.from('transaksi').insert([{
            kas_id: kasData?.kas_id || null,
            transaction_date: new Date().toISOString().substring(0, 10),
            module_source: 'AR',
            amount: Number(amount),
            description: 'Pelunasan AR Faktur ' + piutang.inv_id,
            status: 'VERIFIED',
            verified_by: Number(user.user_id)
          }]).select().single();
          targetTxId = txData?.transaction_id;
        }

        // 4. Catat jurnal
        await supabase.from('jurnal').insert([{
          transaction_id: targetTxId || null,
          jurnal_date: new Date().toISOString().substring(0, 10),
          account_debet: codeKas,
          account_kredit: '1101', // Piutang Usaha
          amount: Number(amount),
          description: 'Penerimaan Rekonsiliasi AR Jurnal Faktur ' + piutang.inv_id,
          created_by: Number(user.user_id)
        }]);

        return NextResponse.json({ 
          success: true, 
          message: 'Arus kas masuk berhasil direkonsiliasi dengan invoice piutang (AR).' 
        });
      } else {
        // Ambil data AP
        const { data: ap } = await supabase.from('tr_account_payable').select('*').eq('ap_id', invoice_id).single();
        if (!ap) {
          return NextResponse.json({ error: 'Hutang AP tidak ditemukan.' }, { status: 404 });
        }

        // Cek saldo kas berjalan
        let codeKas = '1002';
        let newBalance = 0;
        try {
          const { data: akunKas } = await supabase.from('ms_akun').select('*').eq('id_akun', akun_kas_id).single();
          if (akunKas) {
            codeKas = akunKas.kode_akun;
            newBalance = Number(akunKas.saldo_berjalan) - Number(amount);
          } else {
            const fallback = fallbackAkunList.find((a: Akun) => a.id_akun === Number(akun_kas_id));
            if (fallback) {
              codeKas = fallback.kode_akun;
              newBalance = Number(fallback.saldo_berjalan) - Number(amount);
            }
          }
        } catch {
          const fallback = fallbackAkunList.find((a: Akun) => a.id_akun === Number(akun_kas_id));
          if (fallback) {
            codeKas = fallback.kode_akun;
            newBalance = Number(fallback.saldo_berjalan) - Number(amount);
          }
        }

        // 1. Update status AP
        await supabase.from('tr_account_payable').update({ ap_status: 'PAID' }).eq('ap_id', invoice_id);

        // 2. Catat catatan_kas
        const { data: kasData } = await supabase.from('catatan_kas').insert([{
          order_id: null,
          transaction_date: new Date().toISOString().substring(0, 10),
          type: 'OUTFLOW',
          amount: Number(amount),
          description: 'Pembayaran Rekonsiliasi Hutang Faktur ' + ap.inv_supp_no,
          balance: newBalance,
          recorded_by: Number(user.user_id)
        }]).select().single();

        // 3. Update saldo kas berjalan di ms_akun
        try {
          await supabase.from('ms_akun').update({ saldo_berjalan: newBalance }).eq('id_akun', akun_kas_id);
        } catch {}

        // 4. Catat ke transaksi (atau update existing pending)
        let targetTxId = transaction_id;
        if (targetTxId) {
          await supabase.from('transaksi').update({
            kas_id: kasData?.kas_id || null,
            status: 'VERIFIED',
            verified_by: Number(user.user_id),
            description: 'Pengeluaran Kas Rekonsiliasi Pelunasan Vendor ' + ap.inv_supp_no + ' (Terverifikasi)'
          }).eq('transaction_id', targetTxId);
        } else {
          const { data: txData } = await supabase.from('transaksi').insert([{
            kas_id: kasData?.kas_id || null,
            transaction_date: new Date().toISOString().substring(0, 10),
            module_source: 'AP',
            amount: Number(amount),
            description: 'Pengeluaran Kas Rekonsiliasi Pelunasan Vendor ' + ap.inv_supp_no,
            status: 'VERIFIED',
            verified_by: Number(user.user_id)
          }]).select().single();
          targetTxId = txData?.transaction_id;
        }

        // 5. Catat ke jurnal
        await supabase.from('jurnal').insert([{
          transaction_id: targetTxId || null,
          jurnal_date: new Date().toISOString().substring(0, 10),
          account_debet: '2001', // Hutang Usaha
          account_kredit: codeKas,
          amount: Number(amount),
          description: 'Eksekusi Jurnal Kas Keluar (Rekonsiliasi) Faktur ' + ap.inv_supp_no,
          created_by: Number(user.user_id)
        }]);

        return NextResponse.json({ 
          success: true, 
          message: 'Arus kas keluar berhasil direkonsiliasi dengan invoice hutang (AP).' 
        });
      }
    }

    return NextResponse.json({ error: 'Aksi (action) tidak dikenali.' }, { status: 400 });

  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[API Treasury POST Error]', err);
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
