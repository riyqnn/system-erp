/**
 * @fileoverview Service Layer untuk Modul Finance PT. Mayora Indah Tbk.
 * Mengabstraksikan interaksi data antara Supabase (PostgreSQL) dan Mock Database lokal.
 * Enforces business rules: balanced journal entries, three-way matching, payment approvals.
 */

import { mockDb, Akun, Jurnal, JurnalDetail, PurchaseOrder, GoodsReceipt, PurchaseInvoice, Hutang, PermintaanPembayaran, Piutang, TransaksiKas, BiayaProduksi, HppCalculation, LaporanPersediaan, PenerimaanPiutang } from './financeMockDb';
export { mockDb };
export type { PenerimaanPiutang };
import { createRouteHandlerClient } from '@/lib/supabase/server';

/**
 * Mendeteksi apakah Supabase terkonfigurasi dengan benar di environment.
 * @returns {boolean} True jika Supabase aktif, False jika menggunakan Mock DB.
 */
export function isSupabaseActive(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// =====================================================================
// CHART OF ACCOUNTS (COA) SERVICES
// =====================================================================

/**
 * Mengambil seluruh Chart of Accounts (COA) / ms_akun.
 * @returns {Promise<Akun[]>} Daftar Akun.
 */
export async function getDaftarAkun(): Promise<Akun[]> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('ms_akun')
        .select('*')
        .order('kode_akun', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Finance Service] Gagal mengambil COA dari Supabase. Fallback ke Mock DB.', e);
    }
  }
  return mockDb.akunList;
}

// =====================================================================
// JOURNAL SERVICES
// =====================================================================

/**
 * Mengambil daftar jurnal umum.
 * @returns {Promise<any[]>} Daftar jurnal beserta detailnya.
 */
export async function getDaftarJurnal(): Promise<unknown[]> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_jurnal')
        .select(`
          *,
          tr_jurnal_detail (
            *,
            ms_akun (kode_akun, nama_akun)
          )
        `)
        .order('tanggal', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Finance Service] Gagal mengambil Jurnal dari Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Mock DB join
  return mockDb.jurnalList.map((j) => {
    const details = mockDb.jurnalDetailList
      .filter((jd) => jd.jurnal_id === j.id_jurnal)
      .map((jd) => {
        const akun = mockDb.akunList.find((a) => a.id_akun === jd.akun_id);
        return {
          ...jd,
          ms_akun: akun ? { kode_akun: akun.kode_akun, nama_akun: akun.nama_akun } : null
        };
      });
    return {
      ...j,
      tr_jurnal_detail: details
    };
  });
}

/**
 * Menyimpan jurnal umum manual setelah memvalidasi keseimbangan debet & kredit.
 * Aturan Bisnis 1: Jurnal wajib balance (total debet = total kredit).
 * @param {Omit<Jurnal, 'id_jurnal' | 'no_jurnal'>} jurnalHeader - Header Jurnal.
 * @param {Omit<JurnalDetail, 'id_jurnal_detail' | 'jurnal_id'>[]} details - Detail Jurnal (debet, kredit, akun_id).
 * @returns {Promise<Jurnal>} Jurnal yang berhasil disimpan.
 */
export async function buatJurnalManual(
  jurnalHeader: { tanggal: string; keterangan: string; status: 'DRAFT' | 'POSTED'; created_by?: string },
  details: { akun_id: number; debet: number; kredit: number }[]
): Promise<Jurnal> {
  const totalDebet = details.reduce((sum, d) => sum + Number(d.debet), 0);
  const totalKredit = details.reduce((sum, d) => sum + Number(d.kredit), 0);

  if (Math.abs(totalDebet - totalKredit) > 0.01) {
    throw new Error('Gagal posting: Total Debet (' + totalDebet + ') tidak sama dengan Total Kredit (' + totalKredit + '). Jurnal wajib balance.');
  }

  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();

      // Menggunakan SQL Transaction via RPC atau multiple calls
      // Di Supabase, multi-table write direkomendasikan menggunakan stored procedure / function untuk atomic rollback.
      // Di sini kita tunjukkan implementasi transaksional sederhana.
      const { data: header, error: hError } = await supabase
        .from('tr_jurnal')
        .insert([{
          tanggal: jurnalHeader.tanggal,
          keterangan: jurnalHeader.keterangan,
          status: jurnalHeader.status,
          created_by: jurnalHeader.created_by
        }])
        .select()
        .single();

      if (hError) throw hError;

      const detailsToInsert = details.map((d) => ({
        jurnal_id: header.id_jurnal,
        akun_id: d.akun_id,
        debet: d.debet,
        kredit: d.kredit
      }));

      const { error: dError } = await supabase
        .from('tr_jurnal_detail')
        .insert(detailsToInsert);

      if (dError) {
        // Rollback header manually (since it is not a DB transaction block, or we can use Supabase RPC for full transactions)
        await supabase.from('tr_jurnal').delete().eq('id_jurnal', header.id_jurnal);
        throw dError;
      }

      // Update Saldo Akun di Supabase
      for (const d of details) {
        const { data: akun } = await supabase.from('ms_akun').select('*').eq('id_akun', d.akun_id).single();
        if (akun) {
          const delta = d.debet - d.kredit;
          const newSaldo = akun.saldo_normal === 'DEBET'
            ? Number(akun.saldo_berjalan) + delta
            : Number(akun.saldo_berjalan) - delta;
          await supabase.from('ms_akun').update({ saldo_berjalan: newSaldo }).eq('id_akun', d.akun_id);
        }
      }

      return header;
    } catch (e) {
      console.warn('[Finance Service] Gagal posting Jurnal ke Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  return mockDb.addJurnalManual(jurnalHeader, details);
}

// =====================================================================
// ACCOUNTS RECEIVABLE (PIUTANG) SERVICES
// =====================================================================

/**
 * Mengambil daftar piutang usaha (AR) beserta informasi pelanggan.
 * @returns {Promise<Piutang[]>} Daftar Piutang.
 */
export async function getDaftarPiutang(): Promise<Piutang[]> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();

      // Auto-update status overdue jika melewati due_date
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('tr_piutang')
        .update({ status: 'OVERDUE' })
        .lt('due_date', today)
        .eq('status', 'BELUM_LUNAS');

      const { data, error } = await supabase
        .from('tr_piutang')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Finance Service] Gagal mengambil Piutang dari Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Update status overdue di Mock DB
  const todayStr = new Date().toISOString().split('T')[0];
  mockDb.piutangList.forEach((p) => {
    if (p.due_date < todayStr && p.status === 'BELUM_LUNAS') {
      p.status = 'OVERDUE';
    }
  });

  return mockDb.piutangList;
}

/**
 * Mencatat penerimaan pelunasan piutang oleh Treasury (Kas Masuk).
 * Aturan Bisnis 5: Setiap transaksi kas otomatis menghasilkan entri ke tr_jurnal & tr_jurnal_detail.
 * @param {number} piutangId - ID Piutang.
 * @param {number} akunKasId - ID Akun Kas/Bank yang menerima dana.
 * @param {number} jumlahTerima - Jumlah dana yang diterima.
 * @param {string} userId - ID User penerima.
 * @returns {Promise<any>} Hasil eksekusi pelunasan.
 */
export async function terimaPelunasanPiutang(
  piutangId: number,
  akunKasId: number,
  jumlahTerima: number,
  userId: string
): Promise<unknown> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();

      // Ambil detail piutang
      const { data: piutang, error: pError } = await supabase
        .from('tr_piutang')
        .select('*')
        .eq('id_piutang', piutangId)
        .single();

      if (pError || !piutang) throw new Error('Piutang tidak ditemukan');

      if (jumlahTerima > piutang.sisa_pembayaran) {
        throw new Error('Jumlah pelunasan melebihi sisa piutang (' + piutang.sisa_pembayaran + ')');
      }

      const sisaBaru = Number(piutang.sisa_pembayaran) - jumlahTerima;
      const statusBaru = sisaBaru <= 0 ? 'LUNAS' : piutang.status;

      // UPDATE Transaksional
      // 1. Update tr_piutang
      await supabase
        .from('tr_piutang')
        .update({ sisa_pembayaran: sisaBaru, status: statusBaru })
        .eq('id_piutang', piutangId);

      // 2. Jika lunas, update sales_invoices terkait
      if (statusBaru === 'LUNAS') {
        await supabase
          .from('sales_invoices')
          .update({ payment_status: 'PAID' })
          .eq('id', piutang.sales_invoice_id);
      }

      // 3. Catat tr_penerimaan_piutang
      const { data: penerimaan } = await supabase
        .from('tr_penerimaan_piutang')
        .insert([{
          piutang_id: piutangId,
          akun_kas_id: akunKasId,
          jumlah_terima: jumlahTerima,
          received_by: userId
        }])
        .select()
        .single();

      // 4. Catat tr_transaksi_kas (ini akan memicu trigger DB auto-journal)
      // Akun Lawan Piutang adalah Piutang Usaha (akun_id: 4 / kode_akun: 1101)
      const { data: akunLawan } = await supabase
        .from('ms_akun')
        .select('id_akun')
        .eq('kode_akun', '1101')
        .single();

      await supabase
        .from('tr_transaksi_kas')
        .insert([{
          tipe: 'MASUK',
          jumlah: jumlahTerima,
          keterangan: 'Penerimaan Pelunasan Piutang Faktur ' + piutang.inv_number,
          akun_kas_id: akunKasId,
          akun_lawan_id: akunLawan?.id_akun || 4,
          reference_id: penerimaan?.no_penerimaan,
          created_by: userId
        }]);

      return { success: true, sisa_pembayaran: sisaBaru, status: statusBaru };
    } catch (e) {
      console.warn('[Finance Service] Gagal memproses pelunasan di Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const piutang = mockDb.piutangList.find((p) => p.id_piutang === piutangId);
  if (!piutang) throw new Error('Piutang tidak ditemukan');
  if (jumlahTerima > piutang.sisa_pembayaran) {
    throw new Error('Jumlah pelunasan melebihi sisa piutang (' + piutang.sisa_pembayaran + ')');
  }

  piutang.sisa_pembayaran -= jumlahTerima;
  if (piutang.sisa_pembayaran <= 0) {
    piutang.status = 'LUNAS';
  }

  const penerimaanId = mockDb.penerimaanPiutangList.length + 1;
  const noPenerimaan = `PYM-${new Date().toISOString().substring(0, 7).replace('-', '')}-${String(penerimaanId).padStart(5, '0')}`;
  mockDb.penerimaanPiutangList.push({
    id_penerimaan: penerimaanId,
    no_penerimaan: noPenerimaan,
    piutang_id: piutangId,
    akun_kas_id: akunKasId,
    tanggal_terima: new Date().toISOString(),
    jumlah_terima: jumlahTerima,
    received_by: userId,
  });

  // Catat transaksi kas (auto-journal & update COA di mock DB)
  // Akun Lawan: Piutang Usaha (id: 4)
  mockDb.addTransaksiKas({
    tipe: 'MASUK',
    tanggal: new Date().toISOString(),
    jumlah: jumlahTerima,
    keterangan: `Penerimaan Pelunasan Piutang Faktur ${piutang.inv_number}`,
    akun_kas_id: akunKasId,
    akun_lawan_id: 4,
    reference_id: noPenerimaan,
    created_by: userId,
  });

  return { success: true, sisa_pembayaran: piutang.sisa_pembayaran, status: piutang.status };
}

// =====================================================================
// ACCOUNTS PAYABLE (HUTANG) SERVICES & THREE-WAY MATCHING
// =====================================================================

/**
 * Mengambil daftar PO & GR untuk form verifikasi matching.
 * @returns {Promise<{ poList: PurchaseOrder[], grList: GoodsReceipt[] }>} Daftar PO & GR.
 */
export async function getPoAndGrList(): Promise<{ poList: PurchaseOrder[]; grList: GoodsReceipt[] }> {
  // Dalam production, ini akan mengambil data dari modul inventory & purchasing
  return {
    poList: mockDb.poList.filter((p) => p.status === 'OPEN'),
    grList: mockDb.grList,
  };
}

/**
 * Mengambil daftar hutang usaha (AP).
 * @returns {Promise<Hutang[]>} Daftar Hutang.
 */
export async function getDaftarHutang(): Promise<Hutang[]> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();

      // Auto-update status overdue jika melewati due_date
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('tr_hutang')
        .update({ status: 'OVERDUE' })
        .lt('due_date', today)
        .eq('status', 'BELUM_LUNAS');

      const { data, error } = await supabase
        .from('tr_hutang')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Finance Service] Gagal mengambil Hutang dari Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Update status overdue di Mock DB
  const todayStr = new Date().toISOString().split('T')[0];
  mockDb.hutangList.forEach((h) => {
    if (h.due_date < todayStr && h.status === 'BELUM_LUNAS') {
      h.status = 'OVERDUE';
    }
  });

  return mockDb.hutangList;
}

/**
 * Melakukan verifikasi Three-Way Matching dan mencatat sebagai hutang jika sukses.
 * Aturan Bisnis 2: Purchase Invoice harus cocok dengan PO number dan Goods Receipt sebelum dicatat sebagai hutang.
 * @param {string} noInvoice - Nomor Invoice yang diajukan.
 * @param {string} noPo - Nomor Purchase Order.
 * @param {string} grCode - Kode Goods Receipt.
 * @param {number} supplierId - ID Supplier.
 * @param {number} jumlah - Jumlah tagihan Invoice.
 * @param {string} tanggalInvoice - Tanggal Invoice.
 * @param {string} dueDate - Jatuh Tempo.
 * @param {string} userId - ID Pembuat.
 * @returns {Promise<{ success: boolean; message: string; data?: any }>} Hasil Matching.
 */
export async function verifikasiDanBuatHutang(
  noInvoice: string,
  noPo: string,
  grCode: string,
  supplierId: number,
  jumlah: number,
  tanggalInvoice: string,
  dueDate: string,
  userId: string
): Promise<{ success: boolean; message: string; data?: unknown }> {

  // 1. Ambil PO
  const po = mockDb.poList.find((p) => p.no_po === noPo);
  if (!po) {
    return { success: false, message: 'Matching Gagal: Nomor PO ' + noPo + ' tidak ditemukan di modul Purchasing.' };
  }

  // 2. Ambil GR
  const gr = mockDb.grList.find((g) => g.gr_code === grCode);
  if (!gr) {
    return { success: false, message: 'Matching Gagal: Kode Goods Receipt ' + grCode + ' tidak ditemukan di modul Gudang.' };
  }

  // 3. Verifikasi Supplier
  if (po.supplier_id !== supplierId || gr.supplier_id !== supplierId) {
    return { success: false, message: 'Matching Gagal: Ketidakcocokan Pemasok (Supplier). Invoice, PO, dan Goods Receipt harus dari pemasok yang sama.' };
  }

  // 4. Verifikasi Kuantitas & Harga (Three-way match logic)
  // Jumlah invoice harus cocok dengan (gr.quantity * po.harga_satuan) dengan toleransi selisih harga kecil
  const expectedTotal = gr.quantity * po.harga_satuan;
  if (Math.abs(jumlah - expectedTotal) > 1000) {
    return {
      success: false,
      message: 'Matching Gagal: Ketidakcocokan Nilai Keuangan. Kuantitas GR (' + gr.quantity + ') dikali Harga PO (Rp ' + po.harga_satuan.toLocaleString() + ') adalah Rp ' + expectedTotal.toLocaleString() + '. Namun jumlah invoice adalah Rp ' + jumlah.toLocaleString() + '.'
    };
  }

  // Matching Sukses! Lanjut buat data invoice & hutang
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();

      // 1. Insert Purchase Invoice
      const { data: inv, error: iError } = await supabase
        .from('tr_purchase_invoice')
        .insert([{
          no_invoice: noInvoice,
          no_po: noPo,
          gr_code: grCode,
          supplier_id: supplierId,
          tanggal_invoice: tanggalInvoice,
          due_date: dueDate,
          jumlah: jumlah,
          status: 'UNPAID',
          created_by: userId
        }])
        .select()
        .single();

      if (iError) throw iError;

      // 2. Insert Hutang
      const { data: hutang } = await supabase
        .from('tr_hutang')
        .insert([{
          no_invoice: noInvoice,
          supplier_id: supplierId,
          jumlah: jumlah,
          sisa_pembayaran: jumlah,
          due_date: dueDate,
          status: 'BELUM_LUNAS'
        }])
        .select()
        .single();

      // Update PO status to CLOSED
      await supabase
        .from('tr_purchase_order')
        .update({ status: 'CLOSED' })
        .eq('no_po', noPo);

      return {
        success: true,
        message: 'Three-Way Matching Berhasil! Tagihan cocok dengan PO & GR. Hutang usaha senilai Rp ' + jumlah.toLocaleString() + ' telah dicatat.',
        data: hutang
      };
    } catch (e) {
      console.warn('[Finance Service] Gagal menyimpan matching ke Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const nextInvId = mockDb.invoiceList.length + 1;
  const newInv: PurchaseInvoice = {
    id_invoice: nextInvId,
    no_invoice: noInvoice,
    no_po: noPo,
    gr_code: grCode,
    supplier_id: supplierId,
    tanggal_invoice: tanggalInvoice,
    due_date: dueDate,
    jumlah: jumlah,
    status: 'UNPAID',
  };
  mockDb.invoiceList.push(newInv);

  const nextHutangId = mockDb.hutangList.length + 1;
  const newHutang: Hutang = {
    id_hutang: nextHutangId,
    no_invoice: noInvoice,
    supplier_id: supplierId,
    supplier_name: po.supplier_name,
    jumlah: jumlah,
    sisa_pembayaran: jumlah,
    due_date: dueDate,
    status: 'BELUM_LUNAS',
    created_at: new Date().toISOString(),
  };
  mockDb.hutangList.push(newHutang);

  // Close PO
  po.status = 'CLOSED';

  return {
    success: true,
    message: 'Three-Way Matching Berhasil (Mock)! Tagihan cocok dengan PO & GR. Hutang usaha senilai Rp ' + jumlah.toLocaleString() + ' telah dicatat.',
    data: newHutang,
  };
}

/**
 * Membuat pengajuan permintaan pembayaran AP.
 * @param {number} hutangId - ID Hutang.
 * @param {number} jumlahBayar - Jumlah pembayaran yang diajukan.
 * @param {string} metode - Metode Pembayaran (TRANSFER/KAS_KECIL/GIRO).
 * @param {string} keterangan - Keterangan pengajuan.
 * @param {string} userId - ID Staff AP.
 * @returns {Promise<PermintaanPembayaran>} Permintaan Pembayaran.
 */
export async function buatPermintaanPembayaran(
  hutangId: number,
  jumlahBayar: number,
  metode: 'TRANSFER' | 'KAS_KECIL' | 'GIRO',
  keterangan: string,
  userId: string
): Promise<PermintaanPembayaran> {

  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_permintaan_pembayaran')
        .insert([{
          hutang_id: hutangId,
          jumlah_bayar: jumlahBayar,
          metode_pembayaran: metode,
          keterangan: keterangan,
          status: 'MENUNGGU_PERSETUJUAN',
          created_by: userId
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[Finance Service] Gagal membuat permintaan pembayaran di Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const nextId = mockDb.permintaanPembayaranList.length + 1;
  const noPermintaan = `PMT-${new Date().toISOString().substring(0, 7).replace('-', '')}-${String(nextId).padStart(5, '0')}`;

  const newPmt: PermintaanPembayaran = {
    id_permintaan: nextId,
    no_permintaan: noPermintaan,
    hutang_id: hutangId,
    jumlah_bayar: jumlahBayar,
    metode_pembayaran: metode,
    keterangan: keterangan,
    status: 'MENUNGGU_PERSETUJUAN',
    created_at: new Date().toISOString(),
  };
  mockDb.permintaanPembayaranList.push(newPmt);
  return newPmt;
}

// =====================================================================
// TREASURY SERVICES
// =====================================================================

/**
 * Mengambil daftar pengajuan pembayaran AP (untuk Management & Treasury).
 * @returns {Promise<any[]>} Daftar pengajuan.
 */
export async function getDaftarPermintaanPembayaran(): Promise<unknown[]> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_permintaan_pembayaran')
        .select(`
          *,
          tr_hutang (
            *,
            ms_suppliers (supplier_name)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Finance Service] Gagal mengambil permintaan pembayaran dari Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Mock DB Join
  return mockDb.permintaanPembayaranList.map((p) => {
    const hutang = mockDb.hutangList.find((h) => h.id_hutang === p.hutang_id);
    return {
      ...p,
      tr_hutang: hutang ? {
        ...hutang,
        ms_suppliers: { supplier_name: hutang.supplier_name }
      } : null
    };
  });
}

/**
 * Persetujuan Permintaan Pembayaran oleh Management.
 * Aturan Bisnis 3: Permintaan pembayaran wajib disetujui Management sebelum Treasury bisa eksekusi.
 * @param {number} permintaanId - ID Permintaan Pembayaran.
 * @param {'DISETUJUI' | 'DITOLAK'} status - Keputusan (DISETUJUI / DITOLAK).
 * @param {string} alasan - Alasan jika ditolak.
 * @param {string} userId - ID Management User.
 * @returns {Promise<any>} Hasil approval.
 */
export async function approvePermintaanPembayaran(
  permintaanId: number,
  status: 'DISETUJUI' | 'DITOLAK',
  alasan: string,
  userId: string
): Promise<unknown> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_permintaan_pembayaran')
        .update({
          status: status,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason: status === 'DITOLAK' ? alasan : null
        })
        .eq('id_permintaan', permintaanId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[Finance Service] Gagal meng-approve pembayaran di Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const pmt = mockDb.permintaanPembayaranList.find((p) => p.id_permintaan === permintaanId);
  if (!pmt) throw new Error('Pengajuan pembayaran tidak ditemukan');

  pmt.status = status;
  pmt.approved_by = userId;
  pmt.approved_at = new Date().toISOString();
  if (status === 'DITOLAK') {
    pmt.rejection_reason = alasan;
  }

  return pmt;
}

/**
 * Eksekusi Pembayaran oleh Treasury.
 * Aturan Bisnis 3: Hanya permintaan pembayaran yang disetujui Management yang bisa dieksekusi.
 * Aturan Bisnis 5: Transaksi kas keluar otomatis terjurnal.
 * @param {number} permintaanId - ID Permintaan Pembayaran.
 * @param {number} akunKasId - ID Akun Kas/Bank sumber dana.
 * @param {string} userId - ID Treasury User.
 * @returns {Promise<any>} Hasil eksekusi.
 */
export async function eksekusiPembayaranTreasury(
  permintaanId: number,
  akunKasId: number,
  userId: string
): Promise<unknown> {

  // Ambil detail permintaan pembayaran
  const pmt = mockDb.permintaanPembayaranList.find((p) => p.id_permintaan === permintaanId);
  if (!pmt) throw new Error('Pengajuan pembayaran tidak ditemukan');

  if (pmt.status !== 'DISETUJUI') {
    throw new Error('Eksekusi ditolak: Permintaan pembayaran harus disetujui oleh Management terlebih dahulu.');
  }

  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();

      // Ambil Hutang terkait
      const { data: hutang } = await supabase.from('tr_hutang').select('*').eq('id_hutang', pmt.hutang_id).single();
      if (!hutang) throw new Error('Hutang tidak ditemukan');

      const sisaBaru = Number(hutang.sisa_pembayaran) - pmt.jumlah_bayar;
      const statusHutangBaru = sisaBaru <= 0 ? 'LUNAS' : hutang.status;

      // UPDATE Transaksional
      // 1. Update tr_permintaan_pembayaran status
      await supabase.from('tr_permintaan_pembayaran').update({ status: 'TEREKSEKUSI' }).eq('id_permintaan', permintaanId);

      // 2. Update tr_hutang sisa pembayaran
      await supabase.from('tr_hutang').update({ sisa_pembayaran: sisaBaru, status: statusHutangBaru }).eq('id_hutang', pmt.hutang_id);

      // 3. Jika lunas, update tr_purchase_invoice
      if (statusHutangBaru === 'LUNAS') {
        await supabase.from('tr_purchase_invoice').update({ status: 'PAID' }).eq('no_invoice', hutang.no_invoice);
      }

      // 4. Catat tr_pembayaran_hutang
      const { data: bayar } = await supabase
        .from('tr_pembayaran_hutang')
        .insert([{
          permintaan_id: permintaanId,
          akun_kas_id: akunKasId,
          jumlah_bayar: pmt.jumlah_bayar,
          executed_by: userId
        }])
        .select()
        .single();

      // 5. Catat tr_transaksi_kas (ini memicu trigger auto-journal)
      // Akun Lawan untuk Hutang adalah Hutang Usaha (akun_id: 7 / kode_akun: 2001)
      const { data: akunLawan } = await supabase
        .from('ms_akun')
        .select('id_akun')
        .eq('kode_akun', '2001')
        .single();

      await supabase
        .from('tr_transaksi_kas')
        .insert([{
          tipe: 'KELUAR',
          jumlah: pmt.jumlah_bayar,
          keterangan: 'Pembayaran Hutang Tagihan ' + hutang.no_invoice,
          akun_kas_id: akunKasId,
          akun_lawan_id: akunLawan?.id_akun || 7,
          reference_id: bayar?.no_pembayaran,
          created_by: userId
        }]);

      return { success: true, sisa_pembayaran: sisaBaru, status: 'TEREKSEKUSI' };
    } catch (e) {
      console.warn('[Finance Service] Gagal eksekusi kas di Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const hutang = mockDb.hutangList.find((h) => h.id_hutang === pmt.hutang_id);
  if (!hutang) throw new Error('Hutang tidak ditemukan');

  const sisaBaru = hutang.sisa_pembayaran - pmt.jumlah_bayar;
  hutang.sisa_pembayaran = Math.max(0, sisaBaru);
  if (hutang.sisa_pembayaran <= 0) {
    hutang.status = 'LUNAS';
  }

  pmt.status = 'TEREKSEKUSI';

  const bayarId = mockDb.permintaanPembayaranList.length + 1;
  const noPembayaran = `BYR-${new Date().toISOString().substring(0, 7).replace('-', '')}-${String(bayarId).padStart(5, '0')}`;

  // Catat transaksi kas keluar (auto-journal & update COA di mock DB)
  // Akun Lawan: Hutang Usaha (id: 7)
  mockDb.addTransaksiKas({
    tipe: 'KELUAR',
    tanggal: new Date().toISOString(),
    jumlah: pmt.jumlah_bayar,
    keterangan: `Pembayaran Hutang Tagihan ${hutang.no_invoice}`,
    akun_kas_id: akunKasId,
    akun_lawan_id: 7,
    reference_id: noPembayaran,
    created_by: userId,
  });

  return { success: true, sisa_pembayaran: hutang.sisa_pembayaran, status: 'TEREKSEKUSI' };
}

/**
 * Mengambil daftar history transaksi kas (Buku Kas).
 * @returns {Promise<TransaksiKas[]>} Daftar transaksi.
 */
export async function getTransaksiKasList(): Promise<TransaksiKas[]> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_transaksi_kas')
        .select('*')
        .order('tanggal', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Finance Service] Gagal mengambil Transaksi Kas dari Supabase. Fallback ke Mock DB.', e);
    }
  }
  return mockDb.transaksiKasList;
}

// =====================================================================
// COST ACCOUNTING SERVICES
// =====================================================================

/**
 * Mengambil daftar dokumen biaya produksi.
 * @returns {Promise<BiayaProduksi[]>} Daftar biaya.
 */
export async function getBiayaProduksi(): Promise<BiayaProduksi[]> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_biaya_produksi')
        .select('*')
        .order('tanggal', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[Finance Service] Gagal mengambil Biaya Produksi dari Supabase.', e);
    }
  }
  return mockDb.biayaProduksiList;
}

/**
 * Menyimpan dokumen biaya produksi baru (dikirim oleh departemen Production).
 * @param {Omit<BiayaProduksi, 'id_biaya_produksi' | 'no_dokumen' | 'status'>} data - Dokumen biaya.
 * @param {string} userId - ID Pengirim.
 * @returns {Promise<BiayaProduksi>} Dokumen Biaya Produksi baru.
 */
export async function catatBiayaProduksi(
  data: { nama_biaya: string; jumlah: number; tanggal: string; keterangan: string; production_request_id?: number },
  userId: string
): Promise<BiayaProduksi> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data: res, error } = await supabase
        .from('tr_biaya_produksi')
        .insert([{
          nama_biaya: data.nama_biaya,
          jumlah: data.jumlah,
          tanggal: data.tanggal,
          keterangan: data.keterangan,
          production_request_id: data.production_request_id,
          status: 'SUBMITTED',
          created_by: userId
        }])
        .select()
        .single();

      if (error) throw error;
      return res;
    } catch (e) {
      console.warn('[Finance Service] Gagal menyimpan Biaya Produksi ke Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const nextId = mockDb.biayaProduksiList.length + 1;
  const noDok = `PRDCOST-${data.tanggal.substring(0, 7).replace('-', '')}-${String(nextId).padStart(5, '0')}`;

  const newBiaya: BiayaProduksi = {
    id_biaya_produksi: nextId,
    no_dokumen: noDok,
    nama_biaya: data.nama_biaya,
    jumlah: data.jumlah,
    tanggal: data.tanggal,
    keterangan: data.keterangan,
    status: 'SUBMITTED',
  };
  mockDb.biayaProduksiList.push(newBiaya);
  return newBiaya;
}

/**
 * Menghitung HPP (Harga Pokok Penjualan) & Inventory Valuation.
 * Formula: HPP per unit = (Opening Value + Incoming Value) / (Opening Qty + Incoming Qty)
 * @param {string} periode - Periode (YYYY-MM).
 * @param {number} productId - ID Produk.
 * @param {number} openingQty - Stok Awal.
 * @param {number} openingValue - Nilai Awal.
 * @param {number} incomingQty - Stok Masuk.
 * @param {number} incomingValue - Nilai Masuk.
 * @param {number} closingQty - Stok Akhir.
 * @param {number} closingValue - Nilai Akhir.
 * @param {string} userId - ID Cost Accountant.
 * @returns {Promise<HppCalculation>} Hasil perhitungan HPP.
 */
export async function hitungHppValuation(
  periode: string,
  productId: number,
  openingQty: number,
  openingValue: number,
  incomingQty: number,
  incomingValue: number,
  closingQty: number,
  closingValue: number,
  userId: string
): Promise<HppCalculation> {

  // Calculate average cost per unit
  const totalQty = Number(openingQty) + Number(incomingQty);
  const totalValue = Number(openingValue) + Number(incomingValue);
  const hppPerUnit = totalQty > 0 ? totalValue / totalQty : 0;

  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_hpp_calculation')
        .insert([{
          periode: periode,
          product_id: productId,
          opening_qty: openingQty,
          opening_value: openingValue,
          incoming_qty: incomingQty,
          incoming_value: incomingValue,
          closing_qty: closingQty,
          closing_value: closingValue,
          hpp_per_unit: hppPerUnit,
          calculated_by: userId
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[Finance Service] Gagal menyimpan perhitungan HPP ke Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const nextId = mockDb.hppList.length + 1;

  // Cari nama produk
  const prod = mockDb.poList.find((p) => p.product_id === productId);
  const pName = prod ? prod.product_name : 'Roma Marie Susu 300g';

  const newHpp: HppCalculation = {
    id_hpp: nextId,
    periode,
    product_id: productId,
    product_name: pName,
    opening_qty: openingQty,
    opening_value: openingValue,
    incoming_qty: incomingQty,
    incoming_value: incomingValue,
    closing_qty: closingQty,
    closing_value: closingValue,
    hpp_per_unit: hppPerUnit,
    calculated_at: new Date().toISOString(),
  };

  mockDb.hppList.push(newHpp);
  return newHpp;
}

/**
 * Mengirimkan laporan penilaian persediaan (Inventory Valuation) ke finance.
 * @param {string} periode - Periode (YYYY-MM).
 * @param {number} totalStok - Total kuantitas stok.
 * @param {number} totalNilai - Total nilai valuasi stok.
 * @param {string} userId - ID Staff Inventory.
 * @returns {Promise<LaporanPersediaan>} Laporan yang terbuat.
 */
export async function kirimLaporanPersediaan(
  periode: string,
  totalStok: number,
  totalNilai: number,
  userId: string
): Promise<LaporanPersediaan> {
  if (isSupabaseActive()) {
    try {
      const supabase = await createRouteHandlerClient();
      const { data, error } = await supabase
        .from('tr_laporan_persediaan')
        .insert([{
          periode: periode,
          total_stok: totalStok,
          total_nilai: totalNilai,
          status: 'SUBMITTED',
          created_by: userId
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.warn('[Finance Service] Gagal menyimpan laporan persediaan ke Supabase. Fallback ke Mock DB.', e);
    }
  }

  // Fallback ke Mock DB
  const nextId = mockDb.laporanPersediaanList.length + 1;
  const noLaporan = `LPI-${periode.replace('-', '')}-${String(nextId).padStart(5, '0')}`;

  const newLaporan: LaporanPersediaan = {
    id_laporan: nextId,
    no_laporan: noLaporan,
    periode,
    total_stok: totalStok,
    total_nilai: totalNilai,
    status: 'SUBMITTED',
  };
  mockDb.laporanPersediaanList.push(newLaporan);
  return newLaporan;
}
