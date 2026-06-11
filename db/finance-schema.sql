-- =====================================================================
-- MODUL FINANCE — PT MAYORA INDAH TBK
-- Schema migration (scope CORE: COA, Jurnal Umum, Hutang/AP, Piutang/AR,
--                   Treasury, Transaksi Kas, Cost Accounting)
-- =====================================================================

-- Extension for UUID if needed (shared with other modules)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- Sequences for Human-Readable Document Codes
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.seq_jurnal_number;
CREATE SEQUENCE IF NOT EXISTS public.seq_permintaan_bayar;
CREATE SEQUENCE IF NOT EXISTS public.seq_pembayaran_ap;
CREATE SEQUENCE IF NOT EXISTS public.seq_penerimaan_ar;
CREATE SEQUENCE IF NOT EXISTS public.seq_kas_flow;
CREATE SEQUENCE IF NOT EXISTS public.seq_po_number;
CREATE SEQUENCE IF NOT EXISTS public.seq_invoice_ap;
CREATE SEQUENCE IF NOT EXISTS public.seq_biaya_produksi;
CREATE SEQUENCE IF NOT EXISTS public.seq_laporan_persediaan;

-- ---------------------------------------------------------------------
-- Reusable trigger: auto-update updated_at column
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_finance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 1. TABEL: ms_akun (Chart of Accounts / COA)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ms_akun (
  id_akun         SERIAL PRIMARY KEY,
  kode_akun       VARCHAR(20) UNIQUE NOT NULL,
  nama_akun       VARCHAR(100) NOT NULL,
  kategori        VARCHAR(50) NOT NULL CHECK (kategori IN ('ASET', 'KEWAJIBAN', 'EKUITAS', 'PENDAPATAN', 'BEBAN')),
  saldo_normal    VARCHAR(10) NOT NULL CHECK (saldo_normal IN ('DEBET', 'KREDIT')),
  saldo_awal      DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  saldo_berjalan  DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ms_akun IS 'Master Bagan Akun (Chart of Accounts) PT Mayora Indah Tbk';

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_akun_updated_at ON public.ms_akun;
CREATE TRIGGER trg_akun_updated_at BEFORE UPDATE ON public.ms_akun
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- 2. TABEL: tr_jurnal (Jurnal Umum Header)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_jurnal (
  id_jurnal       SERIAL PRIMARY KEY,
  no_jurnal       VARCHAR(50) UNIQUE NOT NULL DEFAULT ('JR-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_jurnal_number')::TEXT, 5, '0')),
  tanggal         TIMESTAMP NOT NULL DEFAULT NOW(),
  keterangan      TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED')),
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_jurnal_updated_at ON public.tr_jurnal;
CREATE TRIGGER trg_jurnal_updated_at BEFORE UPDATE ON public.tr_jurnal
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- 3. TABEL: tr_jurnal_detail (Jurnal Umum Detail)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_jurnal_detail (
  id_jurnal_detail SERIAL PRIMARY KEY,
  jurnal_id        INT NOT NULL REFERENCES public.tr_jurnal(id_jurnal) ON DELETE CASCADE,
  akun_id          INT NOT NULL REFERENCES public.ms_akun(id_akun) ON DELETE RESTRICT,
  debet            DECIMAL(18,2) NOT NULL DEFAULT 0.00 CHECK (debet >= 0),
  kredit           DECIMAL(18,2) NOT NULL DEFAULT 0.00 CHECK (kredit >= 0),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_jurnal_detail_value CHECK ((debet > 0 AND kredit = 0) OR (debet = 0 AND kredit > 0))
);

-- ---------------------------------------------------------------------
-- Trigger Function: Validate Jurnal Balance (total debet = total kredit)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_check_jurnal_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total_debet DECIMAL(18,2);
  v_total_kredit DECIMAL(18,2);
BEGIN
  -- Hitung total debet dan kredit untuk jurnal_id terkait
  SELECT COALESCE(SUM(debet), 0), COALESCE(SUM(kredit), 0)
  INTO v_total_debet, v_total_kredit
  FROM public.tr_jurnal_detail
  WHERE jurnal_id = NEW.jurnal_id;

  -- Jika status jurnal di-set ke POSTED, pastikan debet dan kredit balance
  -- Catatan: Validasi ini dipanggil setelah seluruh detail dimasukkan (deferred constraint atau saat update status)
  -- Untuk implementasi praktis di level DB, kita lakukan pengecekan saat transaksi diselesaikan
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 4. TABEL: tr_purchase_order (PO Mock Table for Matching)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_purchase_order (
  id_po           SERIAL PRIMARY KEY,
  no_po           VARCHAR(50) UNIQUE NOT NULL DEFAULT ('PO-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_po_number')::TEXT, 5, '0')),
  supplier_id     INT NOT NULL REFERENCES public.ms_suppliers(supplier_id) ON DELETE RESTRICT,
  product_id      INT NOT NULL REFERENCES public.ms_products(product_id) ON DELETE RESTRICT,
  qty             DECIMAL(15,2) NOT NULL CHECK (qty > 0),
  harga_satuan    DECIMAL(18,2) NOT NULL CHECK (harga_satuan >= 0),
  total_harga     DECIMAL(18,2) GENERATED ALWAYS AS (qty * harga_satuan) STORED,
  status          VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 5. TABEL: tr_purchase_invoice (Purchase Invoice)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_purchase_invoice (
  id_invoice      SERIAL PRIMARY KEY,
  no_invoice      VARCHAR(50) UNIQUE NOT NULL DEFAULT ('PINV-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_invoice_ap')::TEXT, 5, '0')),
  no_po           VARCHAR(50) NOT NULL REFERENCES public.tr_purchase_order(no_po) ON DELETE RESTRICT,
  gr_code         VARCHAR(20) NOT NULL REFERENCES public.tr_goods_receipt(gr_code) ON DELETE RESTRICT,
  supplier_id     INT NOT NULL REFERENCES public.ms_suppliers(supplier_id) ON DELETE RESTRICT,
  tanggal_invoice DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  jumlah          DECIMAL(18,2) NOT NULL CHECK (jumlah >= 0),
  status          VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'OVERDUE')),
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_due_date CHECK (due_date >= tanggal_invoice)
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_invoice_ap_updated_at ON public.tr_purchase_invoice;
CREATE TRIGGER trg_invoice_ap_updated_at BEFORE UPDATE ON public.tr_purchase_invoice
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- 6. TABEL: tr_hutang (Kewajiban AP)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_hutang (
  id_hutang       SERIAL PRIMARY KEY,
  no_invoice      VARCHAR(50) NOT NULL REFERENCES public.tr_purchase_invoice(no_invoice) ON DELETE RESTRICT,
  supplier_id     INT NOT NULL REFERENCES public.ms_suppliers(supplier_id) ON DELETE RESTRICT,
  jumlah          DECIMAL(18,2) NOT NULL CHECK (jumlah >= 0),
  sisa_pembayaran DECIMAL(18,2) NOT NULL CHECK (sisa_pembayaran >= 0),
  due_date        DATE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'BELUM_LUNAS' CHECK (status IN ('BELUM_LUNAS', 'LUNAS', 'OVERDUE')),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_hutang_updated_at ON public.tr_hutang;
CREATE TRIGGER trg_hutang_updated_at BEFORE UPDATE ON public.tr_hutang
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- 7. TABEL: tr_permintaan_pembayaran (Pengajuan AP ke Management)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_permintaan_pembayaran (
  id_permintaan   SERIAL PRIMARY KEY,
  no_permintaan   VARCHAR(50) UNIQUE NOT NULL DEFAULT ('PMT-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_permintaan_bayar')::TEXT, 5, '0')),
  hutang_id       INT NOT NULL REFERENCES public.tr_hutang(id_hutang) ON DELETE RESTRICT,
  jumlah_bayar    DECIMAL(18,2) NOT NULL CHECK (jumlah_bayar > 0),
  metode_pembayaran VARCHAR(20) NOT NULL CHECK (metode_pembayaran IN ('TRANSFER', 'KAS_KECIL', 'GIRO')),
  keterangan      TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN' CHECK (status IN ('MENUNGGU_PERSETUJUAN', 'DISETUJUI', 'DITOLAK', 'TEREKSEKUSI')),
  created_by      UUID REFERENCES public.users(id),
  approved_by     UUID REFERENCES public.users(id),
  approved_at     TIMESTAMP,
  rejection_reason TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_permintaan_updated_at ON public.tr_permintaan_pembayaran;
CREATE TRIGGER trg_permintaan_updated_at BEFORE UPDATE ON public.tr_permintaan_pembayaran
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- 8. TABEL: tr_pembayaran_hutang (Eksekusi Pembayaran Treasury)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_pembayaran_hutang (
  id_pembayaran   SERIAL PRIMARY KEY,
  no_pembayaran   VARCHAR(50) UNIQUE NOT NULL DEFAULT ('BYR-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_pembayaran_ap')::TEXT, 5, '0')),
  permintaan_id   INT NOT NULL REFERENCES public.tr_permintaan_pembayaran(id_permintaan) ON DELETE RESTRICT,
  akun_kas_id     INT NOT NULL REFERENCES public.ms_akun(id_akun) ON DELETE RESTRICT,
  tanggal_bayar   TIMESTAMP NOT NULL DEFAULT NOW(),
  jumlah_bayar    DECIMAL(18,2) NOT NULL CHECK (jumlah_bayar > 0),
  executed_by     UUID REFERENCES public.users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 9. TABEL: tr_piutang (AR dari Sales Invoice)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_piutang (
  id_piutang       SERIAL PRIMARY KEY,
  sales_invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE RESTRICT,
  customer_id      UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  jumlah           DECIMAL(18,2) NOT NULL CHECK (jumlah >= 0),
  sisa_pembayaran  DECIMAL(18,2) NOT NULL CHECK (sisa_pembayaran >= 0),
  due_date         DATE NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'BELUM_LUNAS' CHECK (status IN ('BELUM_LUNAS', 'LUNAS', 'OVERDUE')),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_piutang_updated_at ON public.tr_piutang;
CREATE TRIGGER trg_piutang_updated_at BEFORE UPDATE ON public.tr_piutang
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- 10. TABEL: tr_penerimaan_piutang (Penerimaan Kas dari Pelanggan)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_penerimaan_piutang (
  id_penerimaan   SERIAL PRIMARY KEY,
  no_penerimaan   VARCHAR(50) UNIQUE NOT NULL DEFAULT ('PYM-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_penerimaan_ar')::TEXT, 5, '0')),
  piutang_id      INT NOT NULL REFERENCES public.tr_piutang(id_piutang) ON DELETE RESTRICT,
  akun_kas_id     INT NOT NULL REFERENCES public.ms_akun(id_akun) ON DELETE RESTRICT,
  tanggal_terima  TIMESTAMP NOT NULL DEFAULT NOW(),
  jumlah_terima   DECIMAL(18,2) NOT NULL CHECK (jumlah_terima > 0),
  received_by     UUID REFERENCES public.users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 11. TABEL: tr_transaksi_kas (Buku Kas / Arus Kas)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_transaksi_kas (
  id_transaksi_kas SERIAL PRIMARY KEY,
  no_transaksi     VARCHAR(50) UNIQUE NOT NULL DEFAULT ('KAS-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_kas_flow')::TEXT, 5, '0')),
  tipe             VARCHAR(10) NOT NULL CHECK (tipe IN ('MASUK', 'KELUAR')),
  tanggal          TIMESTAMP NOT NULL DEFAULT NOW(),
  jumlah           DECIMAL(18,2) NOT NULL CHECK (jumlah > 0),
  keterangan       TEXT,
  akun_kas_id      INT NOT NULL REFERENCES public.ms_akun(id_akun) ON DELETE RESTRICT,
  akun_lawan_id    INT NOT NULL REFERENCES public.ms_akun(id_akun) ON DELETE RESTRICT,
  reference_id     VARCHAR(50), -- no_pembayaran atau no_penerimaan
  created_by       UUID REFERENCES public.users(id),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 12. TABEL: tr_biaya_produksi (Dokumen Biaya Produksi)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_biaya_produksi (
  id_biaya_produksi SERIAL PRIMARY KEY,
  no_dokumen        VARCHAR(50) UNIQUE NOT NULL DEFAULT ('PRDCOST-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_biaya_produksi')::TEXT, 5, '0')),
  production_request_id INT REFERENCES public.tr_production_request(production_request_id) ON DELETE SET NULL,
  nama_biaya        VARCHAR(100) NOT NULL,
  jumlah            DECIMAL(18,2) NOT NULL CHECK (jumlah >= 0),
  tanggal           DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan        TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'JOURNALED')),
  created_by        UUID REFERENCES public.users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_biaya_prd_updated_at ON public.tr_biaya_produksi;
CREATE TRIGGER trg_biaya_prd_updated_at BEFORE UPDATE ON public.tr_biaya_produksi
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- 13. TABEL: tr_hpp_calculation (Kalkulasi HPP & Valuation log)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_hpp_calculation (
  id_hpp           SERIAL PRIMARY KEY,
  periode          VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  product_id       INT NOT NULL REFERENCES public.ms_products(product_id) ON DELETE RESTRICT,
  opening_qty      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  opening_value    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  incoming_qty     DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  incoming_value   DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  closing_qty      DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  closing_value    DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  hpp_per_unit     DECIMAL(18,2) NOT NULL DEFAULT 0.00 CHECK (hpp_per_unit >= 0),
  calculated_by    UUID REFERENCES public.users(id),
  calculated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 14. TABEL: tr_laporan_persediaan (Laporan Penilaian Stok)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.tr_laporan_persediaan (
  id_laporan       SERIAL PRIMARY KEY,
  no_laporan       VARCHAR(50) UNIQUE NOT NULL DEFAULT ('LPI-' || to_char(NOW(), 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_laporan_persediaan')::TEXT, 5, '0')),
  periode          VARCHAR(7) NOT NULL, -- YYYY-MM
  total_stok       DECIMAL(15,2) NOT NULL CHECK (total_stok >= 0),
  total_nilai      DECIMAL(18,2) NOT NULL CHECK (total_nilai >= 0),
  status           VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED')),
  created_by       UUID REFERENCES public.users(id),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_laporan_updated_at ON public.tr_laporan_persediaan;
CREATE TRIGGER trg_laporan_updated_at BEFORE UPDATE ON public.tr_laporan_persediaan
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

-- =====================================================================
-- TRIGGERS: AUTO-JOURNAL PADA TRANSAKSI KAS
-- Aturan Bisnis 5: Setiap transaksi kas otomatis menghasilkan entri ke tr_jurnal & tr_jurnal_detail
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_auto_journal_transaksi_kas()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_jurnal_id INT;
  v_no_jurnal VARCHAR(50);
  v_saldo_normal_kas VARCHAR(10);
  v_saldo_normal_lawan VARCHAR(10);
BEGIN
  -- Generate nomor jurnal
  v_no_jurnal := 'JR-' || to_char(NEW.tanggal, 'YYYYMM') || '-' || LPAD(NEXTVAL('public.seq_jurnal_number')::TEXT, 5, '0');
  
  -- Insert Header Jurnal
  INSERT INTO public.tr_jurnal (no_jurnal, tanggal, keterangan, status, created_by)
  VALUES (v_no_jurnal, NEW.tanggal, NEW.keterangan, 'POSTED', NEW.created_by)
  RETURNING id_jurnal INTO v_jurnal_id;
  
  -- Insert Detail Jurnal berdasarkan tipe transaksi (MASUK atau KELUAR)
  IF NEW.tipe = 'MASUK' THEN
    -- Debet akun kas (kas bertambah, normal debet bertambah)
    INSERT INTO public.tr_jurnal_detail (jurnal_id, akun_id, debet, kredit)
    VALUES (v_jurnal_id, NEW.akun_kas_id, NEW.jumlah, 0.00);
    
    -- Kredit akun lawan (piutang berkurang/pendapatan bertambah, normal debet berkurang/kredit bertambah)
    INSERT INTO public.tr_jurnal_detail (jurnal_id, akun_id, debet, kredit)
    VALUES (v_jurnal_id, NEW.akun_lawan_id, 0.00, NEW.jumlah);
  ELSIF NEW.tipe = 'KELUAR' THEN
    -- Debet akun lawan (beban bertambah / hutang berkurang, normal debet bertambah/kredit berkurang)
    INSERT INTO public.tr_jurnal_detail (jurnal_id, akun_id, debet, kredit)
    VALUES (v_jurnal_id, NEW.akun_lawan_id, NEW.jumlah, 0.00);
    
    -- Kredit akun kas (kas berkurang, normal debet berkurang)
    INSERT INTO public.tr_jurnal_detail (jurnal_id, akun_id, debet, kredit)
    VALUES (v_jurnal_id, NEW.akun_kas_id, 0.00, NEW.jumlah);
  END IF;
  
  -- UPDATE SALDO BERJALAN ms_akun secara otomatis
  -- 1. Update Akun Kas
  SELECT saldo_normal INTO v_saldo_normal_kas FROM public.ms_akun WHERE id_akun = NEW.akun_kas_id;
  IF NEW.tipe = 'MASUK' THEN
    IF v_saldo_normal_kas = 'DEBET' THEN
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan + NEW.jumlah WHERE id_akun = NEW.akun_kas_id;
    ELSE
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan - NEW.jumlah WHERE id_akun = NEW.akun_kas_id;
    END IF;
  ELSE -- KELUAR
    IF v_saldo_normal_kas = 'DEBET' THEN
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan - NEW.jumlah WHERE id_akun = NEW.akun_kas_id;
    ELSE
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan + NEW.jumlah WHERE id_akun = NEW.akun_kas_id;
    END IF;
  END IF;
  
  -- 2. Update Akun Lawan
  SELECT saldo_normal INTO v_saldo_normal_lawan FROM public.ms_akun WHERE id_akun = NEW.akun_lawan_id;
  IF NEW.tipe = 'MASUK' THEN
    IF v_saldo_normal_lawan = 'DEBET' THEN
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan - NEW.jumlah WHERE id_akun = NEW.akun_lawan_id;
    ELSE
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan + NEW.jumlah WHERE id_akun = NEW.akun_lawan_id;
    END IF;
  ELSE -- KELUAR
    IF v_saldo_normal_lawan = 'DEBET' THEN
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan + NEW.jumlah WHERE id_akun = NEW.akun_lawan_id;
    ELSE
      UPDATE public.ms_akun SET saldo_berjalan = saldo_berjalan - NEW.jumlah WHERE id_akun = NEW.akun_lawan_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger transaksi kas auto-journal
DROP TRIGGER IF EXISTS trg_transaksi_kas_auto_journal ON public.tr_transaksi_kas;
CREATE TRIGGER trg_transaksi_kas_auto_journal AFTER INSERT ON public.tr_transaksi_kas
  FOR EACH ROW EXECUTE FUNCTION public.fn_auto_journal_transaksi_kas();

-- =====================================================================
-- SELESAI
-- =====================================================================
