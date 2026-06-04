-- =====================================================================
-- SEED DATA MODUL FINANCE — PT MAYORA INDAH TBK
-- Seed data: Chart of Accounts (COA), Purchase Orders, and Invoices
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Seed Chart of Accounts (ms_akun)
-- ---------------------------------------------------------------------
INSERT INTO public.ms_akun (kode_akun, nama_akun, kategori, saldo_normal, saldo_awal, saldo_berjalan) VALUES
-- ASET (1xxx)
('1001', 'Kas Utama (IDR)', 'ASET', 'DEBET', 500000000.00, 500000000.00),
('1002', 'Bank Mandiri Rekening Utama', 'ASET', 'DEBET', 8500000000.00, 8500000000.00),
('1003', 'Bank BCA Rekening Operasional', 'ASET', 'DEBET', 3450000000.00, 3450000000.00),
('1101', 'Piutang Usaha (AR)', 'ASET', 'DEBET', 4850000000.00, 4850000000.00),
('1201', 'Persediaan Bahan Baku (RM)', 'ASET', 'DEBET', 1500000000.00, 1500000000.00),
('1202', 'Persediaan Barang Jadi (FG)', 'ASET', 'DEBET', 2500000000.00, 2500000000.00),

-- KEWAJIBAN (2xxx)
('2001', 'Hutang Usaha (AP)', 'KEWAJIBAN', 'KREDIT', 2900000000.00, 2900000000.00),
('2101', 'Hutang Pajak PPN', 'KEWAJIBAN', 'KREDIT', 150000000.00, 150000000.00),

-- EKUITAS (3xxx)
('3001', 'Modal Saham', 'EKUITAS', 'KREDIT', 10000000000.00, 10000000000.00),
('3002', 'Laba Ditahan', 'EKUITAS', 'KREDIT', 3200000000.00, 3200000000.00),

-- PENDAPATAN (4xxx)
('4001', 'Pendapatan Penjualan Biskuit', 'PENDAPATAN', 'KREDIT', 0.00, 0.00),
('4002', 'Pendapatan Penjualan Kopi/Permen', 'PENDAPATAN', 'KREDIT', 0.00, 0.00),

-- BEBAN (5xxx)
('5001', 'Harga Pokok Penjualan (HPP)', 'BEBAN', 'DEBET', 0.00, 0.00),
('5002', 'Biaya Produksi - Bahan Baku', 'BEBAN', 'DEBET', 0.00, 0.00),
('5003', 'Biaya Produksi - Tenaga Kerja', 'BEBAN', 'DEBET', 0.00, 0.00),
('5004', 'Biaya Produksi - Overhead', 'BEBAN', 'DEBET', 0.00, 0.00),
('5005', 'Biaya Pemasaran & Penjualan', 'BEBAN', 'DEBET', 0.00, 0.00),
('5006', 'Biaya Gaji & Karyawan HO', 'BEBAN', 'DEBET', 0.00, 0.00),
('5007', 'Biaya Operasional & Admin', 'BEBAN', 'DEBET', 0.00, 0.00)
ON CONFLICT (kode_akun) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Seed Mock Purchase Orders (tr_purchase_order)
--    Menghubungkan dengan ms_suppliers dan ms_products dari modul inventory
-- ---------------------------------------------------------------------
INSERT INTO public.tr_purchase_order (no_po, supplier_id, product_id, qty, harga_satuan, status) VALUES
('PO-202606-00001', 1, 11, 20000.00, 12000.00, 'OPEN'), -- Supplier 1 (PT Bogasari), Tepung Terigu (product_id 11)
('PO-202606-00002', 2, 12, 15000.00, 15000.00, 'OPEN'), -- Supplier 2 (PT Gulaku), Gula (product_id 12)
('PO-202606-00003', 5, 15,  3000.00, 45000.00, 'OPEN'), -- Supplier 5 (PT Cargill), Cocoa (product_id 15)
('PO-202606-00004', 7, 24, 30000.00,  3000.00, 'OPEN')  -- Supplier 7 (PT Berlina), Kaleng (product_id 24)
ON CONFLICT (no_po) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Seed Purchase Invoices (tr_purchase_invoice) yang Lolos 3-Way Matching
--    no_po harus ada di tr_purchase_order, gr_code harus ada di tr_goods_receipt
-- ---------------------------------------------------------------------
INSERT INTO public.tr_purchase_invoice (no_invoice, no_po, gr_code, supplier_id, tanggal_invoice, due_date, jumlah, status) VALUES
('PINV-202606-00001', 'PO-202606-00001', 'GR-202601-001', 1, '2026-06-01', '2026-06-15', 240000000.00, 'UNPAID'), -- 20,000 kg * Rp 12,000
('PINV-202606-00002', 'PO-202606-00002', 'GR-202601-002', 2, '2026-06-02', '2026-06-17', 225000000.00, 'UNPAID')  -- 15,000 kg * Rp 15,000
ON CONFLICT (no_invoice) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Seed Hutang (tr_hutang) terbuat otomatis dari Invoice yang disetujui
-- ---------------------------------------------------------------------
INSERT INTO public.tr_hutang (no_invoice, supplier_id, jumlah, sisa_pembayaran, due_date, status) VALUES
('PINV-202606-00001', 1, 240000000.00, 240000000.00, '2026-06-15', 'BELUM_LUNAS'),
('PINV-202606-00002', 2, 225000000.00, 225000000.00, '2026-06-17', 'BELUM_LUNAS')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Seed Permintaan Pembayaran Hutang (tr_permintaan_pembayaran)
-- ---------------------------------------------------------------------
INSERT INTO public.tr_permintaan_pembayaran (hutang_id, jumlah_bayar, metode_pembayaran, keterangan, status) VALUES
(1, 100000000.00, 'TRANSFER', 'Pembayaran Tahap 1 Tepung Terigu Bogasari', 'MENUNGGU_PERSETUJUAN'),
(2, 225000000.00, 'TRANSFER', 'Pelunasan Pembelian Gula Gulaku', 'MENUNGGU_PERSETUJUAN')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Seed Piutang (tr_piutang) dari Sales Invoices yang sudah ada
--    Gunakan query dinamis untuk mengaitkan sales_invoices yang ada di DB
-- ---------------------------------------------------------------------
INSERT INTO public.tr_piutang (sales_invoice_id, customer_id, jumlah, sisa_pembayaran, due_date, status)
SELECT 
  id, 
  customer_id, 
  grand_total, 
  grand_total, 
  due_date, 
  CASE WHEN due_date < CURRENT_DATE THEN 'OVERDUE'::varchar ELSE 'BELUM_LUNAS'::varchar END
FROM public.sales_invoices
LIMIT 5
ON CONFLICT DO NOTHING;

-- =====================================================================
-- SELESAI
-- =====================================================================
