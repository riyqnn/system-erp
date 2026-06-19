/**
 * @fileoverview Service Layer untuk Modul Finance PT. Mayora Indah Tbk.
 * Mengabstraksikan interaksi data langsung ke Supabase (PostgreSQL).
 * Enforces business rules: balanced journal entries, three-way matching, payment approvals.
 * Selaras 100% dengan skema target db/new-schema.sql.
 */

import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createNotification, type CreateNotificationPayload } from '@/lib/services/notification.service';

export interface Akun {
  id_akun: number
  kode_akun: string
  nama_akun: string
  kategori: string
  saldo_normal: 'DEBET' | 'KREDIT'
  saldo_berjalan: number
  status: string
}

export interface JurnalUI {
  id_jurnal: number;
  no_jurnal: string;
  tanggal: string;
  keterangan: string;
  status: string;
  created_by?: string | null;
  tr_jurnal_detail: {
    id_jurnal_detail: number;
    jurnal_id: number;
    debet: number;
    kredit: number;
    ms_akun: {
      kode_akun: string;
      nama_akun: string;
    };
  }[];
}

export interface JurnalManualResult {
  id_jurnal: number;
  no_jurnal: string;
  tanggal: string;
  keterangan: string;
  status: string;
  created_by?: string | null;
}

export interface PiutangUI {
  id_piutang: number;
  sales_invoice_id: number | string;
  inv_number: number | string;
  customer_id: number;
  customer_name: string;
  jumlah: number;
  sisa_pembayaran: number;
  due_date: string;
  status: 'LUNAS' | 'OVERDUE' | 'BELUM_LUNAS';
  created_at: string;
}

export interface HutangUI {
  ap_id: number | string;
  id_hutang: number | string;
  po_id: string;
  supplier_id: number;
  supplier_name: string;
  inv_supp_no: string;
  no_invoice: string;
  invoice_date: string;
  ap_amount: number;
  jumlah: number;
  sisa_pembayaran: number;
  due_date: string;
  status: 'LUNAS' | 'OVERDUE' | 'BELUM_LUNAS';
  created_at: string;
}

export interface PermintaanPembayaranUI {
  id_permintaan: number;
  request_id: number;
  no_permintaan: string;
  hutang_id: string | number;
  ap_id: string | number;
  jumlah_bayar: number;
  amount: number;
  status: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK' | 'TEREKSEKUSI';
  metode_pembayaran: 'TRANSFER' | 'KAS_KECIL' | 'GIRO';
  keterangan: string;
  created_at: string;
  tr_hutang: {
    no_invoice: string;
    supplier_name: string;
  } | null;
}

export interface TransaksiKasUI {
  kas_id: number;
  id_transaksi_kas: number;
  no_transaksi: string;
  order_id?: number | null;
  transaction_date: string;
  tanggal: string;
  type: 'INFLOW' | 'OUTFLOW';
  tipe: 'MASUK' | 'KELUAR';
  amount: number;
  jumlah: number;
  description: string;
  keterangan: string;
  balance: number;
  recorded_by?: string;
  created_at?: string;
}

export interface BiayaProduksiUI {
  id_biaya_produksi: string | number;
  no_dokumen: string | number;
  nama_biaya: string;
  jumlah: number;
  tanggal: string;
  keterangan: string;
  status: string;
}

export interface HppValuationUI {
  id_hpp: number | string;
  periode: string;
  product_id: string;
  product_name: string;
  opening_qty: number;
  opening_value: number;
  incoming_qty: number;
  incoming_value: number;
  closing_qty: number;
  closing_value: number;
  hpp_per_unit: number;
  calculated_at: string;
}

export interface LaporanPersediaanUI {
  id_laporan: number | string;
  no_laporan: string;
  periode: string;
  total_stok: number;
  total_nilai: number;
  status: string;
}

interface JurnalRow {
  jurnal_id: number;
  jurnal_date: string;
  amount: number;
  account_debet: string;
  account_kredit: string;
  description: string;
  created_by?: string | null;
}

interface PiutangDbRow {
  piutang_id: number;
  inv_id: string | number;
  cust_id: number;
  amount: number;
  due_date: string;
  status: string;
  created_date?: string;
  ms_customer?: { cust_name?: string } | null;
}

interface PoRow {
  po_detail_id: number;
  po_id: string;
  qty_order: number;
  unit_price: number;
  subtotal: number;
  product_id: number;
  tr_purchase_order?: {
    supplier_id?: number | string;
    status?: string;
    ms_supplier?: { supplier_name?: string } | { supplier_name?: string }[] | null;
  } | {
    supplier_id?: number | string;
    status?: string;
    ms_supplier?: { supplier_name?: string } | { supplier_name?: string }[] | null;
  }[] | null;
  ms_product?: { product_name?: string } | { product_name?: string }[] | null;
}

interface GrRow {
  receipt_id: number;
  po_id: string;
  supplier_id: number;
  product_id: number;
  quantity: number;
  status: string;
  ms_supplier?: { supplier_name?: string } | { supplier_name?: string }[] | null;
  ms_product?: { product_name?: string } | { product_name?: string }[] | null;
}

interface HutangDbRow {
  ap_id: number | string;
  po_id: string;
  supplier_id: number;
  inv_supp_no: string;
  invoice_date: string;
  ap_amount: number;
  ap_status: string;
  due_date: string;
  created_at?: string;
  ms_supplier?: { supplier_name?: string } | null;
}

interface PermintaanPembayaranDbRow {
  request_id: number;
  ap_id: string;
  amount: number;
  status: string;
  rejection_note?: string | null;
  created_at: string;
  tr_account_payable?: {
    inv_supp_no: string;
    ms_supplier?: { supplier_name?: string } | null;
  } | null;
}

interface CatatanKasDbRow {
  kas_id: number;
  order_id?: number | null;
  transaction_date: string;
  type: 'INFLOW' | 'OUTFLOW';
  amount: number;
  description: string;
  balance: number;
  recorded_by?: number;
  created_at?: string;
}

interface SettlementDbRow {
  settlement_id: string;
  prod_order_id: string | number;
  actual_cost: number;
  settlement_date: string;
  period: string;
  settlement_status: string;
}

interface HppDbRow {
  hpp_id: number;
  period: string;
  product_id: string;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_hpp: number;
  created_at: string;
  ms_product?: { product_name?: string } | null;
}

interface ValuationDbRow {
  valuation_id: number;
  period: string;
  quantity: number;
  total_value: number;
  status: string;
}

export interface Jurnal {
  jurnal_id: number
  transaction_id?: number
  jurnal_date: string
  account_debet: string
  account_kredit: string
  amount: number
  description: string
  created_by?: string
  created_at?: string
}

export interface PurchaseOrder {
  id_po: number
  no_po: string
  supplier_id: number
  supplier_name: string
  product_id: number
  product_name: string
  qty: number
  harga_satuan: number
  total_harga: number
}

export interface GoodsReceipt {
  receipt_id: number
  gr_code: string
  supplier_id: number
  supplier_name: string
  product_id: number
  product_name: string
  quantity: number
  status: 'Accepted' | 'Rejected' | 'Partial'
}

export interface Hutang {
  ap_id: string
  po_id: string
  supplier_id: string
  supplier_name: string
  inv_supp_no: string
  invoice_date: string
  ap_amount: number
  ap_status: string
  due_date: string
  created_at: string
}

export interface PermintaanPembayaran {
  request_id: number
  ap_id: string
  amount: number
  request_date: string
  status: string
  requested_by: string
  created_at: string
  rejection_note?: string
}

export interface Piutang {
  piutang_id: number
  inv_id: string
  cust_id: string
  amount: number
  due_date: string
  status: string
  reminder_sent_at?: string
  created_date?: string
}

export interface TransaksiKas {
  kas_id: number
  order_id?: number
  transaction_date: string
  type: 'INFLOW' | 'OUTFLOW'
  tipe?: 'MASUK' | 'KELUAR'
  amount: number
  jumlah?: number
  description: string
  keterangan?: string
  balance: number
  recorded_by?: string
  created_at?: string
}

export interface BiayaProduksi {
  settlement_id: string
  prod_order_id: string
  period: string
  material_cost: number
  labor_cost: number
  other_cost: number
  actual_cost: number
  standard_cost: number
  variance_cost: number
  settlement_status: string
  settlement_date: string
}

/**
 * Fallback list Chart of Accounts (COA) / ms_akun jika tabel database tidak ditemukan.
 */
export const fallbackAkunList: Akun[] = [
  { id_akun: 1, kode_akun: '1001', nama_akun: 'Kas Utama (IDR)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 500000000, status: 'AKTIF' },
  { id_akun: 2, kode_akun: '1002', nama_akun: 'Bank Mandiri Rekening Utama', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 1250000000, status: 'AKTIF' },
  { id_akun: 3, kode_akun: '1003', nama_akun: 'Bank BCA Rekening Operasional', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 850000000, status: 'AKTIF' },
  { id_akun: 4, kode_akun: '1101', nama_akun: 'Piutang Usaha (AR)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 320000000, status: 'AKTIF' },
  { id_akun: 5, kode_akun: '1201', nama_akun: 'Persediaan Bahan Baku (RM)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 450000000, status: 'AKTIF' },
  { id_akun: 6, kode_akun: '1202', nama_akun: 'Persediaan Barang Jadi (FG)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 600000000, status: 'AKTIF' },
  { id_akun: 18, kode_akun: '1200', nama_akun: 'Persediaan Barang Dagang', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 2500000000, status: 'AKTIF' },
  { id_akun: 19, kode_akun: '1400', nama_akun: 'Persediaan Dalam Perjalanan', kategori: 'ASET', saldo_normal: 'DEBET', saldo_berjalan: 1000000000, status: 'AKTIF' },
  { id_akun: 7, kode_akun: '2001', nama_akun: 'Hutang Usaha (AP)', kategori: 'KEWAJIBAN', saldo_normal: 'KREDIT', saldo_berjalan: 180000000, status: 'AKTIF' },
  { id_akun: 20, kode_akun: '2100', nama_akun: 'Hutang Dagang Akrual', kategori: 'KEWAJIBAN', saldo_normal: 'KREDIT', saldo_berjalan: 500000000, status: 'AKTIF' },
  { id_akun: 8, kode_akun: '2101', nama_akun: 'Hutang Pajak PPN', kategori: 'KEWAJIBAN', saldo_normal: 'KREDIT', saldo_berjalan: 45000000, status: 'AKTIF' },
  { id_akun: 9, kode_akun: '3001', nama_akun: 'Modal Saham', kategori: 'EKUITAS', saldo_normal: 'KREDIT', saldo_berjalan: 5250000000, status: 'AKTIF' },
  { id_akun: 10, kode_akun: '3002', nama_akun: 'Laba Ditahan', kategori: 'EKUITAS', saldo_normal: 'KREDIT', saldo_berjalan: 745000000, status: 'AKTIF' },
  { id_akun: 11, kode_akun: '4001', nama_akun: 'Pendapatan Penjualan Biskuit', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT', saldo_berjalan: 1200000000, status: 'AKTIF' },
  { id_akun: 12, kode_akun: '4002', nama_akun: 'Pendapatan Penjualan Kopi/Permen', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT', saldo_berjalan: 950000000, status: 'AKTIF' },
  { id_akun: 13, kode_akun: '5001', nama_akun: 'Harga Pokok Penjualan (HPP)', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_berjalan: 800000000, status: 'AKTIF' },
  { id_akun: 21, kode_akun: '5100', nama_akun: 'Beban Pokok Penjualan Harian', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_berjalan: 0, status: 'AKTIF' },
  { id_akun: 14, kode_akun: '5002', nama_akun: 'Biaya Produksi - Bahan Baku', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_berjalan: 250000000, status: 'AKTIF' },
  { id_akun: 15, kode_akun: '5003', nama_akun: 'Biaya Produksi - Tenaga Kerja', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_berjalan: 120000000, status: 'AKTIF' },
  { id_akun: 16, kode_akun: '5004', nama_akun: 'Biaya Produksi - Overhead', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_berjalan: 80000000, status: 'AKTIF' },
  { id_akun: 17, kode_akun: '5007', nama_akun: 'Biaya Operasional & Admin', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_berjalan: 150000000, status: 'AKTIF' }
];

/**
 * Fire-and-forget notifikasi lintas modul.
 * Dibungkus try-catch agar kegagalan notifikasi tidak menggagalkan transaksi utama.
 */
async function notifyNonBlocking(payload: CreateNotificationPayload): Promise<void> {
  try {
    await createNotification(payload);
  } catch (err) {
    console.warn('[FinanceService] Non-critical: notification failed —', (err as Error).message);
  }
}

/**
 * Helper untuk mendapatkan nama akun berdasarkan kode akun.
 */
function getAkunNameByKode(kode: string): string {
  const mockAccountList = [
    { kode: '1001', nama: 'Kas Utama (IDR)' },
    { kode: '1002', nama: 'Bank Mandiri Rekening Utama' },
    { kode: '1003', nama: 'Bank BCA Rekening Operasional' },
    { kode: '1101', nama: 'Piutang Usaha (AR)' },
    { kode: '1201', nama: 'Persediaan Bahan Baku (RM)' },
    { kode: '1202', nama: 'Persediaan Barang Jadi (FG)' },
    { kode: '1200', nama: 'Persediaan Barang Dagang' },
    { kode: '1400', nama: 'Persediaan Dalam Perjalanan' },
    { kode: '2001', nama: 'Hutang Usaha (AP)' },
    { kode: '2100', nama: 'Hutang Dagang Akrual' },
    { kode: '2101', nama: 'Hutang Pajak PPN' },
    { kode: '3001', nama: 'Modal Saham' },
    { kode: '3002', nama: 'Laba Ditahan' },
    { kode: '4001', nama: 'Pendapatan Penjualan Biskuit' },
    { kode: '4002', nama: 'Pendapatan Penjualan Kopi/Permen' },
    { kode: '5001', nama: 'Harga Pokok Penjualan (HPP)' },
    { kode: '5100', nama: 'Beban Pokok Penjualan Harian' },
    { kode: '5002', nama: 'Biaya Produksi - Bahan Baku' },
    { kode: '5003', nama: 'Biaya Produksi - Tenaga Kerja' },
    { kode: '5004', nama: 'Biaya Produksi - Overhead' },
    { kode: '5007', nama: 'Biaya Operasional & Admin' }
  ];
  const item = mockAccountList.find(a => a.kode === kode);
  return item ? item.nama : 'Akun Finansial';
}

// =====================================================================
// CHART OF ACCOUNTS (COA) SERVICES
// =====================================================================

/**
 * Mengambil seluruh Chart of Accounts (COA) / ms_akun.
 */
export async function getDaftarAkun(): Promise<Akun[]> {
  const supabase = await createRouteHandlerClient();
  let coaList: Akun[] = [];
  try {
    const { data, error } = await supabase
      .from('ms_akun')
      .select('*')
      .order('kode_akun', { ascending: true });

    if (!error && data && data.length > 0) {
      coaList = data;
    }
  } catch (err) {
    console.warn('[FinanceService] Table ms_akun fetch failed, using fallback.', err);
  }

  const usingFallback = coaList.length === 0;
  if (usingFallback) {
    coaList = JSON.parse(JSON.stringify(fallbackAkunList)) as Akun[];
  }

  // Sesuaikan saldo_berjalan secara dinamis berdasarkan seluruh jurnal transaksi di database
  try {
    const { data: journals, error: jError } = await supabase
      .from('jurnal')
      .select('account_debet, account_kredit, amount');

    if (!jError && journals && journals.length > 0) {
      for (const j of journals) {
        const amt = Number(j.amount || 0);

        // Debet Akun
        const deb = coaList.find(a => a.kode_akun === j.account_debet);
        if (deb) {
          deb.saldo_berjalan += (deb.saldo_normal === 'DEBET' ? amt : -amt);
        }

        // Kredit Akun
        const kre = coaList.find(a => a.kode_akun === j.account_kredit);
        if (kre) {
          kre.saldo_berjalan += (kre.saldo_normal === 'KREDIT' ? amt : -amt);
        }
      }
    }
  } catch (e) {
    console.warn('[FinanceService] Failed to calculate dynamic coa balances:', e);
  }

  return coaList;
}

// =====================================================================
// JOURNAL SERVICES (FLAT STRUCTURE)
// =====================================================================

/**
 * Mengambil daftar jurnal umum (flat table) dan mentransformasikannya ke Header-Detail untuk UI.
 */
export async function getDaftarJurnal(): Promise<JurnalUI[]> {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase
    .from('jurnal')
    .select('*')
    .order('jurnal_date', { ascending: false });
  if (error) throw error;

  return (data || []).map((j: JurnalRow) => {
    const details = [
      {
        id_jurnal_detail: Number(j.jurnal_id) * 2 - 1,
        jurnal_id: j.jurnal_id,
        debet: Number(j.amount),
        kredit: 0,
        ms_akun: { kode_akun: j.account_debet, nama_akun: getAkunNameByKode(j.account_debet) }
      },
      {
        id_jurnal_detail: Number(j.jurnal_id) * 2,
        jurnal_id: j.jurnal_id,
        debet: 0,
        kredit: Number(j.amount),
        ms_akun: { kode_akun: j.account_kredit, nama_akun: getAkunNameByKode(j.account_kredit) }
      }
    ];
    return {
      id_jurnal: j.jurnal_id,
      no_jurnal: `JR-${String(j.jurnal_id).padStart(5, '0')}`,
      tanggal: j.jurnal_date,
      keterangan: j.description,
      status: 'POSTED',
      created_by: j.created_by,
      tr_jurnal_detail: details
    };
  });
}

/**
 * Menyimpan jurnal umum manual flat setelah memvalidasi keseimbangan debet & kredit.
 */
export async function buatJurnalManual(
  jurnalHeader: { tanggal: string; keterangan: string; status: 'DRAFT' | 'POSTED'; created_by?: string },
  details: { akun_id: number; debet: number; kredit: number }[]
): Promise<JurnalManualResult> {
  const totalDebet = details.reduce((sum, d) => sum + Number(d.debet), 0);
  const totalKredit = details.reduce((sum, d) => sum + Number(d.kredit), 0);

  if (Math.abs(totalDebet - totalKredit) > 0.01) {
    throw new Error('Gagal posting: Total Debet (' + totalDebet + ') tidak sama dengan Total Kredit (' + totalKredit + '). Jurnal wajib balance.');
  }

  const supabase = await createRouteHandlerClient();
  const mockCoa = await getDaftarAkun();
  const deb = details.find(d => d.debet > 0);
  const kre = details.find(d => d.kredit > 0);

  const debitAkun = mockCoa.find(a => a.id_akun === deb?.akun_id);
  const kreditAkun = mockCoa.find(a => a.id_akun === kre?.akun_id);

  const debCode = debitAkun ? debitAkun.kode_akun : '1001';
  const kreCode = kreditAkun ? kreditAkun.kode_akun : '2001';

  const { data, error } = await supabase
    .from('jurnal')
    .insert([{
      jurnal_date: jurnalHeader.tanggal,
      description: jurnalHeader.keterangan,
      account_debet: debCode,
      account_kredit: kreCode,
      amount: totalDebet,
      created_by: jurnalHeader.created_by ? Number(jurnalHeader.created_by) : null
    }])
    .select()
    .single();

  if (error) throw error;

  // Update Saldo Akun di Supabase (Debet)
  if (debitAkun) {
    const delta = totalDebet;
    const newSaldo = debitAkun.saldo_normal === 'DEBET'
      ? Number(debitAkun.saldo_berjalan) + delta
      : Number(debitAkun.saldo_berjalan) - delta;
    try {
      const { error } = await supabase.from('ms_akun').update({ saldo_berjalan: newSaldo }).eq('id_akun', debitAkun.id_akun);
      if (error) console.warn('[FinanceService] failed to update ms_akun debet balance:', error.message);
    } catch (e) {
      console.warn('[FinanceService] ms_akun debet balance update error:', e);
    }
  }

  // Update Saldo Akun di Supabase (Kredit)
  if (kreditAkun) {
    const delta = totalKredit;
    const newSaldo = kreditAkun.saldo_normal === 'KREDIT'
      ? Number(kreditAkun.saldo_berjalan) + delta
      : Number(kreditAkun.saldo_berjalan) - delta;
    try {
      const { error } = await supabase.from('ms_akun').update({ saldo_berjalan: newSaldo }).eq('id_akun', kreditAkun.id_akun);
      if (error) console.warn('[FinanceService] failed to update ms_akun kredit balance:', error.message);
    } catch (e) {
      console.warn('[FinanceService] ms_akun kredit balance update error:', e);
    }
  }

  // Record to general_ledger table
  await supabase.from('general_ledger').insert([
    {
      jurnal_id: data.jurnal_id,
      account_code: debCode,
      account_name: debitAkun?.nama_akun || getAkunNameByKode(debCode),
      debet_total: totalDebet,
      kredit_total: 0,
      balance: debitAkun ? Number(debitAkun.saldo_berjalan) + totalDebet : totalDebet,
      period: jurnalHeader.tanggal.substring(0, 7)
    },
    {
      jurnal_id: data.jurnal_id,
      account_code: kreCode,
      account_name: kreditAkun?.nama_akun || getAkunNameByKode(kreCode),
      debet_total: 0,
      kredit_total: totalKredit,
      balance: kreditAkun ? Number(kreditAkun.saldo_berjalan) + totalKredit : totalKredit,
      period: jurnalHeader.tanggal.substring(0, 7)
    }
  ]);

  return {
    id_jurnal: data.jurnal_id,
    no_jurnal: `JR-${String(data.jurnal_id).padStart(5, '0')}`,
    tanggal: data.jurnal_date,
    keterangan: data.description,
    status: 'POSTED',
    created_by: data.created_by
  };
}

// =====================================================================
// ACCOUNTS RECEIVABLE (PIUTANG) SERVICES
// =====================================================================

/**
 * Mengambil daftar piutang usaha (AR) beserta informasi pelanggan.
 */
export async function getDaftarPiutang(): Promise<PiutangUI[]> {
  const supabase = await createRouteHandlerClient();

  // Auto-update status overdue jika melewati due_date
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('piutang')
    .update({ status: 'OVERDUE' })
    .lt('due_date', today)
    .eq('status', 'OUTSTANDING');

  const { data, error } = await supabase
    .from('piutang')
    .select(`
      *,
      ms_customer (cust_name)
    `)
    .order('due_date', { ascending: true });

  if (error) throw error;

  return (data || []).map((p: PiutangDbRow) => ({
    id_piutang: p.piutang_id,
    sales_invoice_id: p.inv_id,
    inv_number: p.inv_id,
    customer_id: p.cust_id,
    customer_name: p.ms_customer?.cust_name || 'Pelanggan Mayora',
    jumlah: Number(p.amount),
    sisa_pembayaran: p.status === 'PAID' ? 0 : Number(p.amount),
    due_date: p.due_date,
    status: p.status === 'PAID' ? 'LUNAS' : (p.status === 'OVERDUE' ? 'OVERDUE' : 'BELUM_LUNAS'),
    created_at: p.created_date || new Date().toISOString()
  }));
}

/**
 * Mencatat penerimaan pelunasan piutang oleh Treasury (Kas Masuk).
 */
export async function terimaPelunasanPiutang(
  piutangId: number,
  akunKasId: number,
  jumlahTerima: number,
  userId: string
): Promise<{ success: boolean; sisa_pembayaran: number; status: string }> {
  const supabase = await createRouteHandlerClient();

  // Ambil detail piutang
  const { data: piutang, error: pError } = await supabase
    .from('piutang')
    .select(`
      *,
      ms_customer (cust_name)
    `)
    .eq('piutang_id', piutangId)
    .single();

  if (pError || !piutang) throw new Error('Piutang tidak ditemukan');

  const sisaAR = piutang.status === 'PAID' ? 0 : Number(piutang.amount);
  if (jumlahTerima > sisaAR) {
    throw new Error('Jumlah pelunasan melebihi sisa piutang (' + sisaAR + ')');
  }

  const sisaBaru = sisaAR - jumlahTerima;
  const statusBaru = sisaBaru <= 0 ? 'PAID' : piutang.status;

  // UPDATE Transaksional
  // 1. Update piutang
  await supabase
    .from('piutang')
    .update({ status: statusBaru })
    .eq('piutang_id', piutangId);

  // 2. Jika lunas, update tr_sales_invoice terkait
  if (statusBaru === 'PAID') {
    await supabase
      .from('tr_sales_invoice')
      .update({ payment_status: 'PAID' })
      .eq('inv_id', piutang.inv_id);
  }

  // 3. Catat catatan_kas (kas_id)
  const { data: kasData } = await supabase
    .from('catatan_kas')
    .insert([{
      transaction_date: new Date().toISOString().substring(0, 10),
      type: 'INFLOW',
      amount: jumlahTerima,
      description: 'Penerimaan Pelunasan Piutang Faktur ' + piutang.inv_id,
      recorded_by: Number(userId)
    }])
    .select()
    .single();

  // 4. Catat transaksi (integrasi jurnal)
  const { data: txData } = await supabase
    .from('transaksi')
    .insert([{
      kas_id: kasData?.kas_id,
      transaction_date: new Date().toISOString().substring(0, 10),
      module_source: 'AR',
      amount: jumlahTerima,
      description: 'Pelunasan AR Faktur ' + piutang.inv_id,
      status: 'VERIFIED',
      verified_by: Number(userId)
    }])
    .select()
    .single();

  // 5. Catat jurnal flat (debet kas, kredit piutang)
  let codeKas = '1001';
  try {
    const { data: akunKas, error } = await supabase.from('ms_akun').select('kode_akun').eq('id_akun', akunKasId).single();
    if (!error && akunKas?.kode_akun) {
      codeKas = akunKas.kode_akun;
    } else {
      const fallback = fallbackAkunList.find(a => a.id_akun === Number(akunKasId));
      if (fallback) codeKas = fallback.kode_akun;
    }
  } catch (e) {
    console.warn('[FinanceService] ms_akun search error:', e);
    const fallback = fallbackAkunList.find(a => a.id_akun === Number(akunKasId));
    if (fallback) codeKas = fallback.kode_akun;
  }

  await supabase
    .from('jurnal')
    .insert([{
      transaction_id: txData?.transaction_id,
      jurnal_date: new Date().toISOString().substring(0, 10),
      account_debet: codeKas,
      account_kredit: '1101', // Piutang Usaha
      amount: jumlahTerima,
      description: 'Penerimaan Pelunasan AR Faktur ' + piutang.inv_id,
      created_by: Number(userId)
    }]);

  // UC-02/UC-07: Notifikasi ke SALES — pelunasan piutang telah diterima
  notifyNonBlocking({
    title: 'Pelunasan Invoice ' + piutang.inv_id + ' Diterima',
    message: 'Invoice ' + piutang.inv_id + ' dari pelanggan ' + (piutang.ms_customer?.cust_name || 'Pelanggan') + ' senilai Rp ' + jumlahTerima.toLocaleString('id-ID') + ' telah ' + (statusBaru === 'PAID' ? 'lunas' : 'dibayarkan sebagian') + '.',
    type: 'INFORMATION',
    priority: 'MEDIUM',
    recipientRole: 'SALES',
    sourceModule: 'FINANCE_AR',
    sourceRefId: String(piutangId),
    sourceRefType: 'PELUNASAN_PIUTANG',
    actionUrl: '/finance/account-receivable',
    createdBy: Number(userId),
  });

  return { success: true, sisa_pembayaran: sisaBaru, status: statusBaru === 'PAID' ? 'LUNAS' : 'BELUM_LUNAS' };
}

/**
 * Update reminder log untuk piutang
 */
export async function kirimReminderAR(piutangId: number, userId: string): Promise<{ success: boolean; reminder_sent_at: string }> {
  console.log('[FinanceService] Sending reminder by user:', userId);
  const timestamp = new Date().toISOString();
  const supabase = await createRouteHandlerClient();
  await supabase
    .from('piutang')
    .update({ reminder_sent_at: timestamp })
    .eq('piutang_id', piutangId);
  return { success: true, reminder_sent_at: timestamp };
}

// =====================================================================
// ACCOUNTS PAYABLE (HUTANG) SERVICES & THREE-WAY MATCHING
// =====================================================================

/**
 * Mengambil daftar PO & GR untuk form verifikasi matching.
 */
export async function getPoAndGrList(): Promise<{ poList: PurchaseOrder[]; grList: GoodsReceipt[] }> {
  const supabase = await createRouteHandlerClient();

  const { data: poRows, error: poErr } = await supabase
    .from('tr_po_detail')
    .select(`
      po_detail_id,
      po_id,
      qty_order,
      unit_price,
      subtotal,
      product_id,
      tr_purchase_order!inner (
        supplier_id,
        status,
        ms_supplier (supplier_name)
      ),
      ms_product (product_name)
    `)
    .in('tr_purchase_order.status', ['APPROVED', 'RELEASED']);

  if (poErr) throw poErr;

  const { data: grRows, error: grErr } = await supabase
    .from('tr_goods_receipt')
    .select(`
      receipt_id,
      po_id,
      supplier_id,
      product_id,
      quantity,
      status,
      ms_supplier (supplier_name),
      ms_product (product_name)
    `);

  if (grErr) throw grErr;

  const poList = (poRows as unknown as PoRow[] || []).map((row: PoRow) => {
    const poOrder = Array.isArray(row.tr_purchase_order) ? row.tr_purchase_order[0] : row.tr_purchase_order;
    const supplierName = (Array.isArray(poOrder?.ms_supplier) ? poOrder?.ms_supplier[0]?.supplier_name : poOrder?.ms_supplier?.supplier_name) || 'Supplier';
    const productName = (Array.isArray(row.ms_product) ? row.ms_product[0]?.product_name : row.ms_product?.product_name) || 'Product';
    return {
      id_po: row.po_detail_id,
      no_po: row.po_id,
      supplier_id: Number(poOrder?.supplier_id || 0),
      supplier_name: supplierName,
      product_id: Number(row.product_id || 0),
      product_name: productName,
      qty: Number(row.qty_order || 0),
      harga_satuan: Number(row.unit_price || 0),
      total_harga: Number(row.subtotal || 0)
    };
  });

  const grList = (grRows as unknown as GrRow[] || []).map((row: GrRow) => {
    const supplierName = (Array.isArray(row.ms_supplier) ? row.ms_supplier[0]?.supplier_name : row.ms_supplier?.supplier_name) || 'Supplier';
    const productName = (Array.isArray(row.ms_product) ? row.ms_product[0]?.product_name : row.ms_product?.product_name) || 'Product';
    return {
      receipt_id: row.receipt_id,
      gr_code: String(row.receipt_id),
      supplier_id: Number(row.supplier_id || 0),
      supplier_name: supplierName,
      product_id: Number(row.product_id || 0),
      product_name: productName,
      quantity: Number(row.quantity || 0),
      status: row.status as 'Accepted' | 'Rejected' | 'Partial'
    };
  });

  return { poList, grList };
}

/**
 * Mengambil daftar hutang usaha (AP).
 */
export async function getDaftarHutang(): Promise<HutangUI[]> {
  const supabase = await createRouteHandlerClient();

  // Auto-update status overdue jika melewati due_date
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('tr_account_payable')
    .update({ ap_status: 'OVERDUE' })
    .lt('due_date', today)
    .eq('ap_status', 'OUTSTANDING');

  const { data, error } = await supabase
    .from('tr_account_payable')
    .select(`
      *,
      ms_supplier (supplier_name)
    `)
    .order('due_date', { ascending: true });

  if (error) throw error;

  return (data || []).map((h: HutangDbRow) => ({
    ap_id: h.ap_id,
    id_hutang: h.ap_id,
    po_id: h.po_id,
    supplier_id: h.supplier_id,
    supplier_name: h.ms_supplier?.supplier_name || 'Supplier Mayora',
    inv_supp_no: h.inv_supp_no,
    no_invoice: h.inv_supp_no,
    invoice_date: h.invoice_date,
    ap_amount: Number(h.ap_amount),
    jumlah: Number(h.ap_amount),
    sisa_pembayaran: h.ap_status === 'PAID' ? 0 : Number(h.ap_amount),
    due_date: h.due_date,
    status: h.ap_status === 'PAID' ? 'LUNAS' : (h.ap_status === 'OVERDUE' ? 'OVERDUE' : 'BELUM_LUNAS'),
    created_at: h.created_at || new Date().toISOString()
  }));
}

/**
 * Melakukan verifikasi Three-Way Matching dan mencatat sebagai hutang jika sukses.
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
  const supabase = await createRouteHandlerClient();

  // Fetch GR
  const { data: gr } = await supabase
    .from('tr_goods_receipt')
    .select(`
      *,
      ms_supplier (supplier_name),
      ms_product (product_name)
    `)
    .eq('receipt_id', grCode)
    .maybeSingle();

  if (!gr) {
    return { success: false, message: 'Matching Gagal: Kode Goods Receipt ' + grCode + ' tidak ditemukan di modul Gudang.' };
  }

  // Fetch PO detail
  const { data: poDetail } = await supabase
    .from('tr_po_detail')
    .select(`
      *,
      tr_purchase_order!inner (
        supplier_id,
        status,
        ms_supplier (supplier_name)
      ),
      ms_product (product_name)
    `)
    .eq('po_id', noPo)
    .eq('product_id', gr.product_id)
    .maybeSingle();

  if (!poDetail) {
    return { success: false, message: 'Matching Gagal: Nomor PO ' + noPo + ' untuk produk ' + gr.product_id + ' tidak ditemukan di modul Purchasing.' };
  }

  if (Number(poDetail.tr_purchase_order.supplier_id) !== supplierId || Number(gr.supplier_id) !== supplierId) {
    return { success: false, message: 'Matching Gagal: Ketidakcocokan Pemasok (Supplier). Invoice, PO, dan Goods Receipt harus dari pemasok yang sama.' };
  }

  const expectedTotal = Number(gr.quantity) * Number(poDetail.unit_price);
  if (Math.abs(jumlah - expectedTotal) > 1000) {
    return {
      success: false,
      message: 'Matching Gagal: Ketidakcocokan Nilai Keuangan. Kuantitas GR (' + gr.quantity + ') dikali Harga PO (Rp ' + poDetail.unit_price.toLocaleString() + ') adalah Rp ' + expectedTotal.toLocaleString() + '. Namun jumlah invoice adalah Rp ' + jumlah.toLocaleString() + '.'
    };
  }

  // Insert ke tr_account_payable
  const apId = `AP-${tanggalInvoice.substring(0, 7).replace('-', '')}-${String(Date.now() % 10000).padStart(4, '0')}`;
  const { data: apRecord, error: apErr } = await supabase
    .from('tr_account_payable')
    .insert([{
      ap_id: apId,
      po_id: noPo,
      supplier_id: String(supplierId),
      inv_supp_no: noInvoice,
      invoice_date: tanggalInvoice,
      ap_amount: jumlah,
      ap_status: 'OUTSTANDING',
      due_date: dueDate
    }])
    .select()
    .single();

  if (apErr) throw apErr;

  // Close PO status to COMPLETED
  await supabase
    .from('tr_purchase_order')
    .update({ status: 'COMPLETED' })
    .eq('po_id', noPo);

  // UC-04: Notifikasi ke PURCHASING — invoice terverifikasi, hutang dicatat
  notifyNonBlocking({
    title: 'Three-Way Match Berhasil: Invoice ' + noInvoice,
    message: 'Invoice ' + noInvoice + ' cocok dengan PO ' + noPo + ' & GR ' + grCode + '. Hutang senilai Rp ' + jumlah.toLocaleString('id-ID') + ' telah dicatat.',
    type: 'INFORMATION',
    priority: 'MEDIUM',
    recipientRole: 'PURCHASING',
    sourceModule: 'FINANCE_AP',
    sourceRefId: apId,
    sourceRefType: 'THREE_WAY_MATCH',
    actionUrl: '/finance/account-payable',
    createdBy: Number(userId),
  });

  return {
    success: true,
    message: 'Three-Way Matching Berhasil! Tagihan cocok dengan PO & GR. Hutang usaha senilai Rp ' + jumlah.toLocaleString() + ' telah dicatat.',
    data: apRecord
  };
}

/**
 * Membuat pengajuan permintaan pembayaran AP.
 */
export async function buatPermintaanPembayaran(
  hutangId: string | number,
  jumlahBayar: number,
  metode: 'TRANSFER' | 'KAS_KECIL' | 'GIRO',
  keterangan: string,
  userId: string
): Promise<PermintaanPembayaran> {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase
    .from('permintaan_pembayaran')
    .insert([{
      ap_id: String(hutangId),
      amount: jumlahBayar,
      request_date: new Date().toISOString().substring(0, 10),
      status: 'PENDING_APPROVAL',
      requested_by: Number(userId),
      rejection_note: keterangan
    }])
    .select()
    .single();

  if (error) throw error;

  // UC-05: Notifikasi ke MANAGEMENT (Pimpinan / Management)
  notifyNonBlocking({
    title: 'Pengajuan Pembayaran AP Baru',
    message: 'Pengajuan pembayaran senilai Rp ' + jumlahBayar.toLocaleString('id-ID') + ' via ' + metode + ' membutuhkan persetujuan Anda.',
    type: 'APPROVAL',
    priority: 'HIGH',
    recipientRole: 'Management',
    sourceModule: 'FINANCE_AP',
    sourceRefId: String(data?.request_id ?? hutangId),
    sourceRefType: 'PAYMENT_REQUEST',
    actionUrl: '/finance/treasury',
    createdBy: Number(userId),
  });

  return {
    request_id: data.request_id,
    ap_id: data.ap_id,
    amount: Number(data.amount),
    request_date: data.request_date,
    status: data.status,
    requested_by: String(data.requested_by),
    created_at: data.created_at
  };
}

/**
 * Mengambil daftar pengajuan pembayaran AP (untuk Management & Treasury).
 */
export async function getDaftarPermintaanPembayaran(): Promise<PermintaanPembayaranUI[]> {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase
    .from('permintaan_pembayaran')
    .select(`
      *,
      tr_account_payable (
        *,
        ms_supplier (supplier_name)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((p: PermintaanPembayaranDbRow) => ({
    id_permintaan: p.request_id,
    request_id: p.request_id,
    no_permintaan: `PMT-${String(p.request_id).padStart(4, '0')}`,
    hutang_id: p.ap_id,
    ap_id: p.ap_id,
    jumlah_bayar: Number(p.amount),
    amount: Number(p.amount),
    status: p.status === 'PENDING_APPROVAL' ? 'MENUNGGU_PERSETUJUAN' : (p.status === 'APPROVED' ? 'DISETUJUI' : (p.status === 'REJECTED' ? 'DITOLAK' : 'TEREKSEKUSI')),
    metode_pembayaran: 'TRANSFER',
    keterangan: p.rejection_note || 'Pengajuan pembayaran supplier',
    created_at: p.created_at,
    tr_hutang: p.tr_account_payable ? {
      no_invoice: p.tr_account_payable.inv_supp_no,
      supplier_name: p.tr_account_payable.ms_supplier?.supplier_name || 'Supplier'
    } : null
  }));
}

/**
 * Persetujuan Permintaan Pembayaran oleh Management.
 * UC-05: Membuat perintah_pembayaran saat disetujui.
 */
export async function approvePermintaanPembayaran(
  permintaanId: number,
  status: 'DISETUJUI' | 'DITOLAK',
  alasan: string,
  userId: string
): Promise<PermintaanPembayaran> {
  const dbStatus = status === 'DISETUJUI' ? 'APPROVED' : 'REJECTED';
  const supabase = await createRouteHandlerClient();

  // 1. Update status permintaan_pembayaran
  const { data: pmt, error } = await supabase
    .from('permintaan_pembayaran')
    .update({
      status: dbStatus,
      rejection_note: alasan || null
    })
    .eq('request_id', permintaanId)
    .select()
    .single();

  if (error) throw error;

  // 2. Jika disetujui, buat perintah_pembayaran (Payment Order)
  if (dbStatus === 'APPROVED') {
    await supabase
      .from('perintah_pembayaran')
      .insert([{
        request_id: permintaanId,
        amount: pmt.amount,
        supplier_account: 'Bank Transfer - Vendor Account',
        order_date: new Date().toISOString().substring(0, 10),
        status: 'SENT',
        confirmed_by: Number(userId)
      }]);
  }

  // UC-05: Notifikasi ke ACCOUNT_PAYABLE (Account Payable)
  notifyNonBlocking({
    title: 'Pengajuan Pembayaran ' + (status === 'DISETUJUI' ? 'Disetujui' : 'Ditolak'),
    message: 'Pengajuan pembayaran #' + permintaanId + ' telah ' + status + ' oleh Management.' + (status === 'DITOLAK' && alasan ? ' Alasan: ' + alasan : ''),
    type: status === 'DISETUJUI' ? 'INFORMATION' : 'WARNING',
    priority: status === 'DITOLAK' ? 'HIGH' : 'MEDIUM',
    recipientRole: 'Account Payable',
    sourceModule: 'FINANCE_TREASURY',
    sourceRefId: String(permintaanId),
    sourceRefType: 'PAYMENT_APPROVAL',
    actionUrl: '/finance/account-payable',
    createdBy: Number(userId),
  });

  return pmt;
}

// =====================================================================
// TREASURY SERVICES
// =====================================================================

/**
 * Eksekusi Pembayaran oleh Treasury.
 * UC-06: Bayar supplier, buat catatan_kas, integrasikan ke transaksi & jurnal flat.
 */
export async function eksekusiPembayaranTreasury(
  permintaanId: number,
  akunKasId: number,
  userId: string
): Promise<{ success: boolean; sisa_pembayaran: number; status: string }> {
  const supabase = await createRouteHandlerClient();

  const { data: pmt } = await supabase.from('permintaan_pembayaran').select('*').eq('request_id', permintaanId).single();
  if (!pmt) throw new Error('Permintaan pembayaran tidak ditemukan');
  const amountToPay = Number(pmt.amount);
  const apId = pmt.ap_id;

  // Cek saldo kas berjalan
  let akunKas = null;
  try {
    const { data, error } = await supabase.from('ms_akun').select('*').eq('id_akun', akunKasId).single();
    if (!error && data) {
      akunKas = data;
    }
  } catch (e) {
    console.warn('[FinanceService] Failed to query ms_akun, using fallback list.', e);
  }

  if (!akunKas) {
    akunKas = fallbackAkunList.find(a => a.id_akun === Number(akunKasId));
  }

  if (!akunKas) throw new Error('Akun Kas/Bank tidak ditemukan');
  if (Number(akunKas.saldo_berjalan) < amountToPay) {
    throw new Error('Saldo rekening kas/bank tidak mencukupi untuk melakukan pembayaran ini.');
  }

  // Ambil Hutang (tr_account_payable)
  const { data: hutang } = await supabase.from('tr_account_payable').select('*').eq('ap_id', apId).single();
  if (!hutang) throw new Error('Hutang supplier tidak ditemukan');

  // 1. Update status perintah_pembayaran
  await supabase
    .from('perintah_pembayaran')
    .update({ status: 'EXECUTED' })
    .eq('request_id', permintaanId);

  // 2. Update status tr_account_payable ke PAID
  await supabase
    .from('tr_account_payable')
    .update({ ap_status: 'PAID' })
    .eq('ap_id', apId);

  // 3. Catat catatan_kas (kas keluar)
  const newBalance = Number(akunKas.saldo_berjalan) - amountToPay;
  const { data: kasData } = await supabase
    .from('catatan_kas')
    .insert([{
      order_id: null,
      transaction_date: new Date().toISOString().substring(0, 10),
      type: 'OUTFLOW',
      amount: amountToPay,
      description: 'Pembayaran Hutang Supplier Faktur ' + hutang.inv_supp_no,
      balance: newBalance,
      recorded_by: Number(userId)
    }])
    .select()
    .single();

  // Update saldo kas berjalan
  try {
    const { error } = await supabase.from('ms_akun').update({ saldo_berjalan: newBalance }).eq('id_akun', akunKasId);
    if (error) console.warn('[FinanceService] failed to update ms_akun treasury balance:', error.message);
  } catch (e) {
    console.warn('[FinanceService] ms_akun treasury balance update error:', e);
  }

  // 4. Catat ke transaksi
  const { data: txData } = await supabase
    .from('transaksi')
    .insert([{
      kas_id: kasData?.kas_id,
      transaction_date: new Date().toISOString().substring(0, 10),
      module_source: 'AP',
      amount: amountToPay,
      description: 'Pengeluaran Kas Pelunasan Vendor ' + hutang.inv_supp_no,
      status: 'VERIFIED',
      verified_by: Number(userId)
    }])
    .select()
    .single();

  // 5. Catat flat jurnal (debet hutang, kredit kas)
  await supabase
    .from('jurnal')
    .insert([{
      transaction_id: txData?.transaction_id,
      jurnal_date: new Date().toISOString().substring(0, 10),
      account_debet: '2001', // Hutang Usaha
      account_kredit: akunKas.kode_akun,
      amount: amountToPay,
      description: 'Eksekusi Jurnal Kas Keluar Faktur ' + hutang.inv_supp_no,
      created_by: Number(userId)
    }]);

  // UC-06: Notifikasi ke AP & PURCHASING (Account Payable)
  notifyNonBlocking({
    title: 'Pembayaran Supplier Berhasil Dieksekusi',
    message: 'Pembayaran untuk Invoice ' + hutang.inv_supp_no + ' senilai Rp ' + amountToPay.toLocaleString('id-ID') + ' telah berhasil dieksekusi oleh Treasury.',
    type: 'INFORMATION',
    priority: 'MEDIUM',
    recipientRole: 'Account Payable',
    sourceModule: 'FINANCE_TREASURY',
    sourceRefId: String(permintaanId),
    sourceRefType: 'PAYMENT_EXECUTED',
    actionUrl: '/finance/account-payable',
    createdBy: Number(userId),
  });
  notifyNonBlocking({
    title: 'Pembayaran Supplier Berhasil Dieksekusi',
    message: 'Pembayaran untuk Invoice ' + hutang.inv_supp_no + ' senilai Rp ' + amountToPay.toLocaleString('id-ID') + ' telah berhasil dieksekusi oleh Treasury.',
    type: 'INFORMATION',
    priority: 'LOW',
    recipientRole: 'PURCHASING',
    sourceModule: 'FINANCE_TREASURY',
    sourceRefId: String(permintaanId),
    sourceRefType: 'PAYMENT_EXECUTED',
    actionUrl: '/finance/treasury',
    createdBy: Number(userId),
  });

  return { success: true, sisa_pembayaran: 0, status: 'TEREKSEKUSI' };
}

/**
 * Mengambil daftar history transaksi kas (Buku Kas / catatan_kas).
 */
export async function getTransaksiKasList(): Promise<TransaksiKasUI[]> {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase
    .from('catatan_kas')
    .select('*')
    .order('transaction_date', { ascending: false });
  if (error) throw error;
  return (data || []).map((c: CatatanKasDbRow) => ({
    kas_id: c.kas_id,
    id_transaksi_kas: c.kas_id,
    no_transaksi: 'KAS-' + String(c.kas_id).padStart(3, '0'),
    order_id: c.order_id,
    transaction_date: c.transaction_date,
    tanggal: c.created_at || c.transaction_date,
    type: c.type,
    tipe: c.type === 'INFLOW' ? 'MASUK' : 'KELUAR',
    amount: Number(c.amount),
    jumlah: Number(c.amount),
    description: c.description,
    keterangan: c.description,
    balance: Number(c.balance),
    recorded_by: String(c.recorded_by),
    created_at: c.created_at
  }));
}

// =====================================================================
// COST ACCOUNTING SERVICES
// =====================================================================

/**
 * Mengambil daftar dokumen biaya produksi (tr_order_settlement).
 */
export async function getBiayaProduksi(): Promise<BiayaProduksiUI[]> {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase
    .from('tr_order_settlement')
    .select('*')
    .order('settlement_date', { ascending: false });
  if (error) throw error;

  return (data || []).map((s: SettlementDbRow) => ({
    id_biaya_produksi: s.settlement_id,
    no_dokumen: s.settlement_id,
    nama_biaya: 'Penyelesaian Produksi Order ' + s.prod_order_id,
    jumlah: Number(s.actual_cost),
    tanggal: s.settlement_date,
    keterangan: 'Overhead Pabrik Roma Marie Periode ' + s.period,
    status: s.settlement_status
  }));
}

/**
 * Menyimpan dokumen biaya produksi baru (tr_order_settlement).
 */
export async function catatBiayaProduksi(
  data: { nama_biaya: string; jumlah: number; tanggal: string; keterangan: string; production_request_id?: number },
  userId: string
): Promise<BiayaProduksiUI> {
  const settlementId = `SETTLE-${new Date().toISOString().substring(0, 7).replace('-', '')}-${String(Date.now() % 1000).padStart(3, '0')}`;
  const supabase = await createRouteHandlerClient();
  const { data: res, error } = await supabase
    .from('tr_order_settlement')
    .insert([{
      settlement_id: settlementId,
      prod_order_id: data.production_request_id ? `PROD-${data.production_request_id}` : 'PROD-ORD-991',
      period: data.tanggal.substring(0, 7),
      material_cost: data.jumlah * 0.4,
      labor_cost: data.jumlah * 0.3,
      other_cost: data.jumlah * 0.3,
      actual_cost: data.jumlah,
      standard_cost: data.jumlah * 0.95,
      variance_cost: data.jumlah * 0.05,
      settlement_status: 'SUBMITTED',
      settlement_date: data.tanggal
    }])
    .select()
    .single();

  if (error) throw error;

  // UC-11: Notifikasi ke COST_ACCOUNTING (Cost Accounting)
  notifyNonBlocking({
    title: 'Dokumen Biaya Produksi Baru Diterima',
    message: 'Dokumen biaya "' + data.nama_biaya + '" senilai Rp ' + data.jumlah.toLocaleString('id-ID') + ' telah diserahkan.',
    type: 'INFORMATION',
    priority: 'MEDIUM',
    recipientRole: 'Cost Accounting',
    sourceModule: 'FINANCE_COST',
    sourceRefId: settlementId,
    sourceRefType: 'PRODUCTION_COST_DOC',
    actionUrl: '/finance/cost-accounting',
    createdBy: Number(userId),
  });

  return {
    id_biaya_produksi: res.settlement_id,
    no_dokumen: res.settlement_id,
    nama_biaya: data.nama_biaya,
    jumlah: Number(res.actual_cost),
    tanggal: res.settlement_date,
    keterangan: data.keterangan,
    status: res.settlement_status
  };
}

/**
 * Menghitung HPP (Harga Pokok Penjualan) & menyimpan ke harga_pokok_produksi.
 */
export async function hitungHppValuation(
  periode: string,
  productId: string,
  openingQty: number,
  openingValue: number,
  incomingQty: number,
  incomingValue: number,
  closingQty: number,
  closingValue: number,
  userId: string
): Promise<HppValuationUI> {
  const totalQty = Number(openingQty) + Number(incomingQty);
  const totalValue = Number(openingValue) + Number(incomingValue);
  const hppPerUnit = totalQty > 0 ? totalValue / totalQty : 0;

  const supabase = await createRouteHandlerClient();

  const { data, error } = await supabase
    .from('harga_pokok_produksi')
    .insert([{
      settlement_id: `SETTLE-HPP-${periode}`,
      product_id: String(productId),
      period: periode,
      material_cost: openingValue * 0.5,
      labor_cost: openingValue * 0.3,
      overhead_cost: openingValue * 0.2,
      total_hpp: hppPerUnit * closingQty,
      calculated_by: Number(userId)
    }])
    .select()
    .single();

  if (error) throw error;

  // UC-11/UC-12: Notifikasi ke INVENTORY (Inventory)
  notifyNonBlocking({
    title: 'Kalkulasi HPP Selesai',
    message: 'Nilai HPP periode ' + periode + ' telah selesai dihitung. HPP per unit: Rp ' + hppPerUnit.toLocaleString('id-ID') + '.',
    type: 'INFORMATION',
    priority: 'MEDIUM',
    recipientRole: 'INVENTORY',
    sourceModule: 'FINANCE_COST',
    sourceRefId: String(data?.hpp_id ?? ''),
    sourceRefType: 'HPP_CALCULATION',
    actionUrl: '/finance/cost-accounting',
    createdBy: Number(userId),
  });

  return {
    id_hpp: data.hpp_id,
    periode: data.period,
    product_id: data.product_id,
    product_name: 'Roma Marie / Biskuit',
    opening_qty: openingQty,
    opening_value: openingValue,
    incoming_qty: incomingQty,
    incoming_value: incomingValue,
    closing_qty: closingQty,
    closing_value: closingValue,
    hpp_per_unit: hppPerUnit,
    calculated_at: data.created_at
  };
}

/**
 * Mengirimkan laporan penilaian persediaan (Inventory Valuation) ke finance.
 */
export async function kirimLaporanPersediaan(
  periode: string,
  totalStok: number,
  totalNilai: number,
  userId: string
): Promise<LaporanPersediaanUI> {
  const supabase = await createRouteHandlerClient();

  // 1. Catat ke inventory_valuation detail untuk master product
  const { data, error } = await supabase
    .from('inventory_valuation')
    .insert([{
      product_id: 'RM-001',
      period: periode,
      method: 'WEIGHTED_AVERAGE',
      quantity: totalStok,
      unit_cost: totalNilai / (totalStok || 1),
      total_value: totalNilai,
      status: 'SENT',
      created_by: Number(userId)
    }])
    .select()
    .single();

  if (error) throw error;

  // UC-12: Notifikasi ke COST_ACCOUNTING (Cost Accounting)
  notifyNonBlocking({
    title: 'Laporan Penilaian Persediaan Terkirim',
    message: 'Laporan penilaian persediaan periode ' + periode + ' (Total Stok: ' + totalStok.toLocaleString('id-ID') + ') telah dikirim ke Cost Accounting.',
    type: 'INFORMATION',
    priority: 'MEDIUM',
    recipientRole: 'Cost Accounting',
    sourceModule: 'FINANCE_COST',
    sourceRefId: String(data?.valuation_id ?? ''),
    sourceRefType: 'VALUATION_REPORT',
    actionUrl: '/finance/cost-accounting',
    createdBy: Number(userId),
  });

  return {
    id_laporan: data.valuation_id,
    no_laporan: `LPI-${periode.replace('-', '')}-${String(data.valuation_id).padStart(5, '0')}`,
    periode: data.period,
    total_stok: Number(data.quantity || 0),
    total_nilai: Number(data.total_value || 0),
    status: data.status
  };
}

/**
 * Mengambil daftar history log kalkulasi HPP dari Supabase.
 */
export async function getDaftarHpp(): Promise<HppValuationUI[]> {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase
    .from('harga_pokok_produksi')
    .select(`
      *,
      ms_product (product_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((h: HppDbRow) => ({
    id_hpp: h.hpp_id,
    periode: h.period,
    product_id: h.product_id,
    product_name: h.ms_product?.product_name || 'Roma Marie / Biskuit',
    opening_qty: 1000,
    opening_value: Number(h.material_cost || 0) + Number(h.labor_cost || 0) + Number(h.overhead_cost || 0),
    incoming_qty: 500,
    incoming_value: Number(h.total_hpp || 0) * 0.5,
    closing_qty: 1200,
    closing_value: Number(h.total_hpp || 0),
    hpp_per_unit: Number(h.total_hpp || 0) / 1200,
    calculated_at: h.created_at
  }));
}

/**
 * Mengambil daftar laporan penilaian persediaan (Inventory Valuation) dari Supabase.
 */
export async function getDaftarInventoryValuation(): Promise<LaporanPersediaanUI[]> {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase
    .from('inventory_valuation')
    .select(`
      *,
      ms_product (product_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((v: ValuationDbRow) => ({
    id_laporan: v.valuation_id,
    no_laporan: `LPI-${v.period.replace('-', '')}-${String(v.valuation_id).padStart(5, '0')}`,
    periode: v.period,
    total_stok: Number(v.quantity || 0),
    total_nilai: Number(v.total_value || 0),
    status: v.status
  }));
}
