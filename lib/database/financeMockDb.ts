/**
 * @fileoverview Mock Database Manager untuk Modul Finance PT. Mayora Indah Tbk.
 * Menyediakan penyimpanan in-memory untuk COA, Jurnal, Piutang, Hutang, Kas, dan Cost Accounting.
 * Digunakan sebagai fallback jika koneksi database Supabase tidak tersedia.
 */

export interface Akun {
  id_akun: number;
  kode_akun: string;
  nama_akun: string;
  kategori: 'ASET' | 'KEWAJIBAN' | 'EKUITAS' | 'PENDAPATAN' | 'BEBAN';
  saldo_normal: 'DEBET' | 'KREDIT';
  saldo_awal: number;
  saldo_berjalan: number;
}

export interface Jurnal {
  id_jurnal: number;
  no_jurnal: string;
  tanggal: string;
  keterangan: string;
  status: 'DRAFT' | 'POSTED';
  created_by?: string;
}

export interface JurnalDetail {
  id_jurnal_detail: number;
  jurnal_id: number;
  akun_id: number;
  debet: number;
  kredit: number;
}

export interface PurchaseOrder {
  id_po: number;
  no_po: string;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  qty: number;
  harga_satuan: number;
  total_harga: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
}

export interface GoodsReceipt {
  receipt_id: number;
  gr_code: string;
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
  status: 'Accepted' | 'Rejected' | 'Partial';
}

export interface PurchaseInvoice {
  id_invoice: number;
  no_invoice: string;
  no_po: string;
  gr_code: string;
  supplier_id: number;
  tanggal_invoice: string;
  due_date: string;
  jumlah: number;
  status: 'UNPAID' | 'PAID' | 'OVERDUE';
}

export interface Hutang {
  id_hutang: number;
  no_invoice: string;
  supplier_id: number;
  supplier_name: string;
  jumlah: number;
  sisa_pembayaran: number;
  due_date: string;
  status: 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE';
  created_at: string;
}

export interface PermintaanPembayaran {
  id_permintaan: number;
  no_permintaan: string;
  hutang_id: number;
  jumlah_bayar: number;
  metode_pembayaran: 'TRANSFER' | 'KAS_KECIL' | 'GIRO';
  keterangan: string;
  status: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK' | 'TEREKSEKUSI';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface Piutang {
  id_piutang: number;
  sales_invoice_id: string;
  inv_number: string;
  customer_id: string;
  customer_name: string;
  jumlah: number;
  sisa_pembayaran: number;
  due_date: string;
  status: 'BELUM_LUNAS' | 'LUNAS' | 'OVERDUE';
  created_at: string;
}

export interface PenerimaanPiutang {
  id_penerimaan: number;
  no_penerimaan: string;
  piutang_id: number;
  akun_kas_id: number;
  tanggal_terima: string;
  jumlah_terima: number;
  received_by: string;
}


export interface TransaksiKas {
  id_transaksi_kas: number;
  no_transaksi: string;
  tipe: 'MASUK' | 'KELUAR';
  tanggal: string;
  jumlah: number;
  keterangan: string;
  akun_kas_id: number;
  akun_lawan_id: number;
  reference_id?: string;
  created_by?: string;
}

export interface BiayaProduksi {
  id_biaya_produksi: number;
  no_dokumen: string;
  nama_biaya: string;
  jumlah: number;
  tanggal: string;
  keterangan: string;
  status: 'SUBMITTED' | 'JOURNALED';
}

export interface HppCalculation {
  id_hpp: number;
  periode: string;
  product_id: number;
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

export interface LaporanPersediaan {
  id_laporan: number;
  no_laporan: string;
  periode: string;
  total_stok: number;
  total_nilai: number;
  status: 'SUBMITTED' | 'APPROVED';
}

// In-Memory Storage Singleton
class FinanceMockDb {
  public akunList: Akun[] = [];
  public jurnalList: Jurnal[] = [];
  public jurnalDetailList: JurnalDetail[] = [];
  public poList: PurchaseOrder[] = [];
  public grList: GoodsReceipt[] = [];
  public invoiceList: PurchaseInvoice[] = [];
  public hutangList: Hutang[] = [];
  public permintaanPembayaranList: PermintaanPembayaran[] = [];
  public piutangList: Piutang[] = [];
  public penerimaanPiutangList: PenerimaanPiutang[] = [];
  public transaksiKasList: TransaksiKas[] = [];
  public biayaProduksiList: BiayaProduksi[] = [];
  public hppList: HppCalculation[] = [];
  public laporanPersediaanList: LaporanPersediaan[] = [];

  constructor() {
    this.seed();
  }

  /**
   * Mengisi data awal ke basis data in-memory mock.
   */
  private seed() {
    // COA Seed
    this.akunList = [
      { id_akun: 1, kode_akun: '1001', nama_akun: 'Kas Utama (IDR)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_awal: 500000000, saldo_berjalan: 500000000 },
      { id_akun: 2, kode_akun: '1002', nama_akun: 'Bank Mandiri Rekening Utama', kategori: 'ASET', saldo_normal: 'DEBET', saldo_awal: 8500000000, saldo_berjalan: 8500000000 },
      { id_akun: 3, kode_akun: '1003', nama_akun: 'Bank BCA Rekening Operasional', kategori: 'ASET', saldo_normal: 'DEBET', saldo_awal: 3450000000, saldo_berjalan: 3450000000 },
      { id_akun: 4, kode_akun: '1101', nama_akun: 'Piutang Usaha (AR)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_awal: 4850000000, saldo_berjalan: 4850000000 },
      { id_akun: 5, kode_akun: '1201', nama_akun: 'Persediaan Bahan Baku (RM)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_awal: 1500000000, saldo_berjalan: 1500000000 },
      { id_akun: 6, kode_akun: '1202', nama_akun: 'Persediaan Barang Jadi (FG)', kategori: 'ASET', saldo_normal: 'DEBET', saldo_awal: 2500000000, saldo_berjalan: 2500000000 },
      { id_akun: 7, kode_akun: '2001', nama_akun: 'Hutang Usaha (AP)', kategori: 'KEWAJIBAN', saldo_normal: 'KREDIT', saldo_awal: 2900000000, saldo_berjalan: 2900000000 },
      { id_akun: 8, kode_akun: '2101', nama_akun: 'Hutang Pajak PPN', kategori: 'KEWAJIBAN', saldo_normal: 'KREDIT', saldo_awal: 150000000, saldo_berjalan: 150000000 },
      { id_akun: 9, kode_akun: '3001', nama_akun: 'Modal Saham', kategori: 'EKUITAS', saldo_normal: 'KREDIT', saldo_awal: 10000000000, saldo_berjalan: 10000000000 },
      { id_akun: 10, kode_akun: '3002', nama_akun: 'Laba Ditahan', kategori: 'EKUITAS', saldo_normal: 'KREDIT', saldo_awal: 3200000000, saldo_berjalan: 3200000000 },
      { id_akun: 11, kode_akun: '4001', nama_akun: 'Pendapatan Penjualan Biskuit', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 12, kode_akun: '4002', nama_akun: 'Pendapatan Penjualan Kopi/Permen', kategori: 'PENDAPATAN', saldo_normal: 'KREDIT', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 13, kode_akun: '5001', nama_akun: 'Harga Pokok Penjualan (HPP)', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 14, kode_akun: '5002', nama_akun: 'Biaya Produksi - Bahan Baku', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 15, kode_akun: '5003', nama_akun: 'Biaya Produksi - Tenaga Kerja', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 16, kode_akun: '5004', nama_akun: 'Biaya Produksi - Overhead', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 17, kode_akun: '5005', nama_akun: 'Biaya Pemasaran & Penjualan', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 18, kode_akun: '5006', nama_akun: 'Biaya Gaji & Karyawan HO', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_awal: 0, saldo_berjalan: 0 },
      { id_akun: 19, kode_akun: '5007', nama_akun: 'Biaya Operasional & Admin', kategori: 'BEBAN', saldo_normal: 'DEBET', saldo_awal: 0, saldo_berjalan: 0 },
    ];

    // PO & GR Seed (Untuk Three-Way Matching)
    this.poList = [
      { id_po: 1, no_po: 'PO-202606-00001', supplier_id: 1, supplier_name: 'PT Bogasari Flour Mills', product_id: 11, product_name: 'Tepung Terigu Protein Sedang', qty: 20000, harga_satuan: 12000, total_harga: 240000000, status: 'OPEN' },
      { id_po: 2, no_po: 'PO-202606-00002', supplier_id: 2, supplier_name: 'PT Gulaku / PT Sugar Group', product_id: 12, product_name: 'Gula Kristal Putih', qty: 15000, harga_satuan: 15000, total_harga: 225000000, status: 'OPEN' },
      { id_po: 3, no_po: 'PO-202606-00003', supplier_id: 5, supplier_name: 'PT Cargill Indonesia (Cocoa)', product_id: 15, product_name: 'Coklat Bubuk (Cocoa Powder)', qty: 3000, harga_satuan: 45000, total_harga: 135000000, status: 'OPEN' },
      { id_po: 4, no_po: 'PO-202606-00004', supplier_id: 7, supplier_name: 'PT Berlina Tbk (Kaleng & Botol)', product_id: 24, product_name: 'Kaleng Can 240ml (Kopiko)', qty: 30000, harga_satuan: 3000, total_harga: 90000000, status: 'OPEN' },
    ];

    this.grList = [
      { receipt_id: 1, gr_code: 'GR-202601-001', supplier_id: 1, supplier_name: 'PT Bogasari Flour Mills', product_id: 11, product_name: 'Tepung Terigu Protein Sedang', quantity: 20000, status: 'Accepted' },
      { receipt_id: 2, gr_code: 'GR-202601-002', supplier_id: 2, supplier_name: 'PT Gulaku / PT Sugar Group', product_id: 12, product_name: 'Gula Kristal Putih', quantity: 15000, status: 'Accepted' },
      { receipt_id: 3, gr_code: 'GR-202601-005', supplier_id: 5, supplier_name: 'PT Cargill Indonesia (Cocoa)', product_id: 15, product_name: 'Coklat Bubuk (Cocoa Powder)', quantity: 3000, status: 'Accepted' },
      { receipt_id: 4, gr_code: 'GR-202602-004', supplier_id: 7, supplier_name: 'PT Berlina Tbk (Kaleng & Botol)', product_id: 24, product_name: 'Kaleng Can 240ml (Kopiko)', quantity: 30000, status: 'Accepted' },
    ];

    // Seed Purchase Invoices
    this.invoiceList = [
      { id_invoice: 1, no_invoice: 'PINV-202606-00001', no_po: 'PO-202606-00001', gr_code: 'GR-202601-001', supplier_id: 1, tanggal_invoice: '2026-06-01', due_date: '2026-06-15', jumlah: 240000000, status: 'UNPAID' },
      { id_invoice: 2, no_invoice: 'PINV-202606-00002', no_po: 'PO-202606-00002', gr_code: 'GR-202601-002', supplier_id: 2, tanggal_invoice: '2026-06-02', due_date: '2026-06-17', jumlah: 225000000, status: 'UNPAID' },
    ];

    // Seed Hutang
    this.hutangList = [
      { id_hutang: 1, no_invoice: 'PINV-202606-00001', supplier_id: 1, supplier_name: 'PT Bogasari Flour Mills', jumlah: 240000000, sisa_pembayaran: 240000000, due_date: '2026-06-15', status: 'BELUM_LUNAS', created_at: '2026-06-01T08:00:00Z' },
      { id_hutang: 2, no_invoice: 'PINV-202606-00002', supplier_id: 2, supplier_name: 'PT Gulaku / PT Sugar Group', jumlah: 225000000, sisa_pembayaran: 225000000, due_date: '2026-06-17', status: 'BELUM_LUNAS', created_at: '2026-06-02T08:00:00Z' },
    ];

    // Seed Permintaan Pembayaran
    this.permintaanPembayaranList = [
      { id_permintaan: 1, no_permintaan: 'PMT-202606-00001', hutang_id: 1, jumlah_bayar: 100000000, metode_pembayaran: 'TRANSFER', keterangan: 'Pembayaran Tahap 1 Tepung Terigu Bogasari', status: 'MENUNGGU_PERSETUJUAN', created_at: '2026-06-03T10:00:00Z' },
      { id_permintaan: 2, no_permintaan: 'PMT-202606-00002', hutang_id: 2, jumlah_bayar: 225000000, metode_pembayaran: 'TRANSFER', keterangan: 'Pelunasan Pembelian Gula Gulaku', status: 'MENUNGGU_PERSETUJUAN', created_at: '2026-06-04T08:30:00Z' },
    ];

    // Seed Piutang (AR)
    this.piutangList = [
      { id_piutang: 1, sales_invoice_id: 'inv-uuid-1', inv_number: 'INV-2026-001', customer_id: 'cust-uuid-1', customer_name: 'PT Indomarco Prismatama', jumlah: 1250000000, sisa_pembayaran: 1250000000, due_date: '2026-06-10', status: 'BELUM_LUNAS', created_at: '2026-05-10T09:00:00Z' },
      { id_piutang: 2, sales_invoice_id: 'inv-uuid-2', inv_number: 'INV-2026-008', customer_id: 'cust-uuid-2', customer_name: 'PT Sumber Alfaria Trijaya', jumlah: 980000000, sisa_pembayaran: 980000000, due_date: '2026-05-28', status: 'OVERDUE', created_at: '2026-04-28T09:00:00Z' },
      { id_piutang: 3, sales_invoice_id: 'inv-uuid-3', inv_number: 'INV-2026-012', customer_id: 'cust-uuid-3', customer_name: 'Hero Supermarket Group', jumlah: 450000000, sisa_pembayaran: 450000000, due_date: '2026-06-05', status: 'BELUM_LUNAS', created_at: '2026-05-05T09:00:00Z' },
    ];

    // Seed Transaksi Kas & Jurnal default
    this.transaksiKasList = [
      { id_transaksi_kas: 1, no_transaksi: 'KAS-IN-202605-00001', tipe: 'MASUK', tanggal: '2026-05-20T15:30:00Z', jumlah: 850000000, keterangan: 'Penerimaan Invoice INV-2026-004', akun_kas_id: 2, akun_lawan_id: 4, reference_id: 'TX-90218' },
      { id_transaksi_kas: 2, no_transaksi: 'KAS-OUT-202605-00001', tipe: 'KELUAR', tanggal: '2026-05-21T14:15:00Z', jumlah: 420000000, keterangan: 'Pembayaran Vendor BILL-2026-019', akun_kas_id: 2, akun_lawan_id: 7, reference_id: 'TX-90217' },
    ];

    // Generate Journal Entries dari Transaksi Kas diatas
    this.transaksiKasList.forEach((tk) => {
      const jId = this.jurnalList.length + 1;
      this.jurnalList.push({
        id_jurnal: jId,
        no_jurnal: `JR-202605-${String(jId).padStart(5, '0')}`,
        tanggal: tk.tanggal,
        keterangan: tk.keterangan,
        status: 'POSTED',
      });

      if (tk.tipe === 'MASUK') {
        this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_kas_id, debet: tk.jumlah, kredit: 0 });
        this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_lawan_id, debet: 0, kredit: tk.jumlah });
      } else {
        this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_lawan_id, debet: tk.jumlah, kredit: 0 });
        this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_kas_id, debet: 0, kredit: tk.jumlah });
      }
    });

    // Seed Biaya Produksi
    this.biayaProduksiList = [
      { id_biaya_produksi: 1, no_dokumen: 'PRDCOST-202605-00001', nama_biaya: 'Overhead Pabrik Cikande - Listrik & Air', jumlah: 45000000, tanggal: '2026-05-28', keterangan: 'Biaya overhead listrik produksi line 1', status: 'SUBMITTED' },
      { id_biaya_produksi: 2, no_dokumen: 'PRDCOST-202605-00002', nama_biaya: 'Upah Harian Buruh Borongan', jumlah: 85000000, tanggal: '2026-05-29', keterangan: 'Upah buruh produksi Roma Marie', status: 'SUBMITTED' },
    ];
  }

  // Helper Methods
  public getAkun(id: number): Akun | undefined {
    return this.akunList.find((a) => a.id_akun === id);
  }

  public getAkunByKode(kode: string): Akun | undefined {
    return this.akunList.find((a) => a.kode_akun === kode);
  }

  /**
   * Menambahkan entri jurnal umum dengan validasi balance debet = kredit.
   */
  public addJurnalManual(jurnalHeader: Omit<Jurnal, 'id_jurnal' | 'no_jurnal'>, details: { akun_id: number; debet: number; kredit: number }[]): Jurnal {
    const totalDebet = details.reduce((sum, d) => sum + d.debet, 0);
    const totalKredit = details.reduce((sum, d) => sum + d.kredit, 0);

    if (Math.abs(totalDebet - totalKredit) > 0.01) {
      throw new Error('Total debet dan total kredit tidak seimbang (tidak balance)');
    }

    const nextId = this.jurnalList.length + 1;
    const noJurnal = `JR-${jurnalHeader.tanggal.substring(0, 7).replace('-', '')}-${String(nextId).padStart(5, '0')}`;

    const newJurnal: Jurnal = {
      id_jurnal: nextId,
      no_jurnal: noJurnal,
      ...jurnalHeader,
    };

    this.jurnalList.push(newJurnal);

    details.forEach((d) => {
      this.jurnalDetailList.push({
        id_jurnal_detail: this.jurnalDetailList.length + 1,
        jurnal_id: nextId,
        akun_id: d.akun_id,
        debet: d.debet,
        kredit: d.kredit,
      });

      // Update Saldo Berjalan Akun
      const akun = this.getAkun(d.akun_id);
      if (akun) {
        const delta = d.debet - d.kredit;
        if (akun.saldo_normal === 'DEBET') {
          akun.saldo_berjalan += delta;
        } else {
          akun.saldo_berjalan -= delta;
        }
      }
    });

    return newJurnal;
  }

  /**
   * Melakukan eksekusi pencatatan kas flow dan otomatis memicu entri jurnal
   */
  public addTransaksiKas(tk: Omit<TransaksiKas, 'id_transaksi_kas' | 'no_transaksi'>): TransaksiKas {
    const nextId = this.transaksiKasList.length + 1;
    const prefix = tk.tipe === 'MASUK' ? 'KAS-IN' : 'KAS-OUT';
    const noTransaksi = `${prefix}-${tk.tanggal.substring(0, 7).replace('-', '')}-${String(nextId).padStart(5, '0')}`;

    const newTk: TransaksiKas = {
      id_transaksi_kas: nextId,
      no_transaksi: noTransaksi,
      ...tk,
    };

    this.transaksiKasList.push(newTk);

    // Auto Journal Entry
    const jId = this.jurnalList.length + 1;
    const noJurnal = `JR-${tk.tanggal.substring(0, 7).replace('-', '')}-${String(jId).padStart(5, '0')}`;
    this.jurnalList.push({
      id_jurnal: jId,
      no_jurnal: noJurnal,
      tanggal: tk.tanggal,
      keterangan: tk.keterangan,
      status: 'POSTED',
    });

    if (tk.tipe === 'MASUK') {
      this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_kas_id, debet: tk.jumlah, kredit: 0 });
      this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_lawan_id, debet: 0, kredit: tk.jumlah });
    } else {
      this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_lawan_id, debet: tk.jumlah, kredit: 0 });
      this.jurnalDetailList.push({ id_jurnal_detail: this.jurnalDetailList.length + 1, jurnal_id: jId, akun_id: tk.akun_kas_id, debet: 0, kredit: tk.jumlah });
    }

    // Update Saldo Berjalan Akun Kas
    const akunKas = this.getAkun(tk.akun_kas_id);
    if (akunKas) {
      if (tk.tipe === 'MASUK') {
        akunKas.saldo_berjalan += tk.jumlah;
      } else {
        akunKas.saldo_berjalan -= tk.jumlah;
      }
    }

    // Update Saldo Berjalan Akun Lawan
    const akunLawan = this.getAkun(tk.akun_lawan_id);
    if (akunLawan) {
      if (tk.tipe === 'MASUK') {
        if (akunLawan.saldo_normal === 'DEBET') {
          akunLawan.saldo_berjalan -= tk.jumlah; // misal Piutang (Debet) lunas -> Piutang berkurang (kredit)
        } else {
          akunLawan.saldo_berjalan += tk.jumlah;
        }
      } else {
        if (akunLawan.saldo_normal === 'DEBET') {
          akunLawan.saldo_berjalan += tk.jumlah; // misal Beban (Debet) bertambah
        } else {
          akunLawan.saldo_berjalan -= tk.jumlah; // misal Hutang (Kredit) berkurang
        }
      }
    }

    return newTk;
  }
}

export const mockDb = new FinanceMockDb();
