SET session_replication_role = replica;


-- =====================================================================
-- 1. ms_products
-- =====================================================================
INSERT INTO ms_products (product_code, product_name, category, units, minimum_stock, expiry_flag) VALUES
-- Finished Goods
('FG-001', 'Roma Marie Susu 300g',                  'FG', 'carton', 500,  TRUE),
('FG-002', 'Roma Kelapa 400g',                      'FG', 'carton', 400,  TRUE),
('FG-003', 'Slai Olai Strawberry 126g',            'FG', 'carton', 600,  TRUE),
('FG-004', 'Choki-Choki Coklat 20g x 10pcs',       'FG', 'carton', 800,  TRUE),
('FG-005', 'Kopiko 78°C Can 240ml',                 'FG', 'carton', 700,  TRUE),
('FG-006', 'Torabika Cappuccino 25g x 10 sachet',   'FG', 'carton', 600,  TRUE),
('FG-007', 'Better Peanut Butter Wafer 40g',        'FG', 'carton', 500,  TRUE),
('FG-008', 'Energen Vanilla 30g x 10 sachet',       'FG', 'carton', 450,  TRUE),
('FG-009', 'Kis Mint Candy 125g',                   'FG', 'carton', 900,  TRUE),
('FG-010', 'Danisa Butter Cookies 200g',            'FG', 'carton', 350,  TRUE),

-- Raw Materials
('RM-001', 'Tepung Terigu Protein Sedang',          'RM', 'kg',    10000, FALSE),
('RM-002', 'Gula Kristal Putih',                    'RM', 'kg',     8000, FALSE),
('RM-003', 'Minyak Nabati RBD Palm Olein',          'RM', 'L',      5000, FALSE),
('RM-004', 'Susu Skim Bubuk',                       'RM', 'kg',     3000, TRUE),
('RM-005', 'Coklat Bubuk (Cocoa Powder)',            'RM', 'kg',     2500, FALSE),
('RM-006', 'Biji Kopi Robusta',                     'RM', 'kg',     4000, FALSE),
('RM-007', 'Krim Non-Dairy (Non-Dairy Creamer)',    'RM', 'kg',     3500, TRUE),
('RM-008', 'Mentega (Butter)',                      'RM', 'kg',     2000, TRUE),
('RM-009', 'Selai Kacang (Peanut Butter)',          'RM', 'kg',     1500, TRUE),
('RM-010', 'Perisa Strawberry (Flavour)',           'RM', 'kg',      500, FALSE),
('RM-011', 'Garam Halus Konsumsi',                  'RM', 'kg',     1000, FALSE),
('RM-012', 'Sodium Bicarbonate (Baking Soda)',      'RM', 'kg',      800, FALSE),

-- Packaging Materials
('PM-001', 'Karton Box FG Biskuit (CTN)',           'PM', 'carton', 5000, FALSE),
('PM-002', 'Plastik BOPP Wrapping Roll 30µm',      'PM', 'roll',   2000, FALSE),
('PM-003', 'Aluminium Foil Sachet 12µm',            'PM', 'roll',   1500, FALSE),
('PM-004', 'Kaleng Can 240ml (Kopiko)',             'PM', 'pcs',   20000, FALSE),
('PM-005', 'Label Stiker Produk (Rol)',             'PM', 'roll',   3000, FALSE),
('PM-006', 'Inner Tray Karton Coklat',             'PM', 'pcs',   15000, FALSE),
('PM-007', 'Stretch Film Pallet Wrap',             'PM', 'roll',    800, FALSE),
('PM-008', 'Karton Box FG Candy/Mint (CTN)',       'PM', 'carton', 4000, FALSE);


-- =====================================================================
-- 2. ms_warehouses
-- =====================================================================
INSERT INTO ms_warehouses (warehouse_code, warehouse_name, location, capacity) VALUES
('WH-001', 'Gudang Bahan Baku Utama',    'Kawasan Industri Cikande, Serang, Banten',   50000),
('WH-002', 'Gudang Packaging Material',  'Kawasan Industri Cikande, Serang, Banten',   30000),
('WH-003', 'Gudang Produk Jadi A',       'Kawasan Industri Cikande, Serang, Banten',   80000),
('WH-004', 'Gudang Produk Jadi B',       'Jl. Tomang Raya No.21, Jakarta Barat',       60000),
('WH-005', 'Cold Storage / Chiller',     'Kawasan Industri Cikande, Serang, Banten',   10000);


-- =====================================================================
-- 3. ms_suppliers
-- =====================================================================
INSERT INTO ms_suppliers (supplier_code, supplier_name, contact, address) VALUES
('SUP-001', 'PT Bogasari Flour Mills',           'Budi Santoso / 021-6910408',       'Jl. Raya Pelabuhan No.1, Jakarta Utara'),
('SUP-002', 'PT Gulaku / PT Sugar Group',        'Dewi Rahayu / 0725-7323100',       'Jl. Industri Gula, Lampung Tengah'),
('SUP-003', 'PT SMART Tbk (Palm Olein)',         'Andi Wijaya / 021-2992-5500',      'Jl. MH Thamrin No.51, Jakarta Pusat'),
('SUP-004', 'PT Fonterra Brands Indonesia',      'Sarah Utami / 021-5793-6688',      'Sudirman Plaza, Jakarta Selatan'),
('SUP-005', 'PT Cargill Indonesia (Cocoa)',      'Hendra Kusuma / 021-5290-0400',    'Kawasan Industri MM2100, Bekasi'),
('SUP-006', 'PT Tunas Alfin Tbk (Kemasan)',      'Rini Astuti / 021-8779-3388',      'Jl. Industri Raya Blok G, Tangerang'),
('SUP-007', 'PT Berlina Tbk (Kaleng & Botol)',   'Anton Prasetyo / 021-5525-811',    'Jl. Raya Serang Km 11, Cikupa, Tangerang'),
('SUP-008', 'PT Indo-Pacific Beverages (Kopi)',  'Lisa Permata / 0401-312-000',      'Jl. Haluoleo, Kendari, Sulawesi Tenggara'),
('SUP-009', 'PT Salim Ivomas (Mentega)',         'Doni Setiawan / 021-5794-5555',    'Plaza BII Tower II, Jakarta Pusat'),
('SUP-010', 'PT Lautan Natural Krimerindo',      'Putri Handayani / 021-8911-7780',  'Kawasan Industri EJIP, Bekasi'),
('SUP-011', 'PT Garuda Food (Kacang)',           'Mas Agus / 021-5793-6000',         'Jl. Bintaro Raya, Tangerang Selatan'),
('SUP-012', 'PT Indesso Aroma (Flavour)',        'Yeni Lestari / 021-8909-5656',     'Jl. Industri Selatan, Bekasi'),
('SUP-013', 'PT Catur Wangsa Indah (Karton)',   'Bambang Irawan / 021-5573-0000',   'Jl. Raya Serpong, Tangerang'),
('SUP-014', 'PT Favorit Mitra Kimia (Aditif)',  'Nadia Putri / 021-4609-7777',      'Jl. Rungkut Industri, Surabaya'),
('SUP-015', 'PT Alam Daya Sakti (Garam)',       'Sigit Purnomo / 031-7896-1234',    'Jl. Raya Sidoarjo Km 5, Jawa Timur');


-- =====================================================================
-- 4. ms_bom (Bill of Materials)
-- =====================================================================
INSERT INTO ms_bom (fg_product_id, rm_product_id, qty_required) VALUES
-- FG-001 Roma Marie Susu → product_id 1
(1,  11, 0.6000),  -- Tepung Terigu 0.6 kg/carton
(1,  12, 0.2000),  -- Gula 0.2 kg/carton
(1,  13, 0.1000),  -- Palm Olein 0.1 L/carton
(1,  14, 0.0500),  -- Susu Skim 0.05 kg/carton
(1,  21, 0.0050),  -- Garam
(1,  23, 1.0000),  -- Karton Box
(1,  22, 0.5000),  -- BOPP Wrapping

-- FG-002 Roma Kelapa → product_id 2
(2,  11, 0.7000),
(2,  12, 0.2500),
(2,  13, 0.1200),
(2,  21, 0.0060),
(2,  23, 1.0000),
(2,  22, 0.5500),

-- FG-003 Slai O'lai Strawberry → product_id 3
(3,  11, 0.5000),
(3,  12, 0.3000),
(3,  13, 0.0800),
(3,  20, 0.0020),  -- Perisa Strawberry
(3,  26, 2.0000),  -- Inner Tray
(3,  23, 1.0000),

-- FG-004 Choki-Choki Coklat → product_id 4
(4,  15, 0.1500),  -- Cocoa Powder
(4,  12, 0.2000),
(4,  13, 0.0600),
(4,  24, 0.5000),  -- Aluminium Foil Sachet
(4,  23, 1.0000),

-- FG-005 Kopiko 78°C → product_id 5
(5,  16, 0.0200),  -- Biji Kopi
(5,  17, 0.0150),  -- Non-Dairy Creamer
(5,  12, 0.0300),
(5,  24, 1.0000),  -- Kaleng Can
(5,  25, 1.0000),  -- Label Stiker

-- FG-006 Torabika Cappuccino → product_id 6
(6,  16, 0.0180),
(6,  17, 0.0200),
(6,  15, 0.0100),
(6,  22, 0.3000),

-- FG-007 Better Wafer → product_id 7
(7,  11, 0.4000),
(7,  19, 0.0800),  -- Selai Kacang
(7,  13, 0.0700),
(7,  22, 0.4000),

-- FG-008 Energen Vanilla → product_id 8
(8,  14, 0.0600),
(8,  12, 0.1500),
(8,  17, 0.0400),
(8,  24, 0.5000),

-- FG-009 Kis Mint Candy → product_id 9
(9,  12, 0.4000),
(9,  13, 0.0500),
(9,  28, 1.0000),  -- Karton Box Candy

-- FG-010 Danisa Butter Cookies → product_id 10
(10, 11, 0.5500),
(10, 18, 0.1200),  -- Mentega
(10, 12, 0.2200),
(10, 23, 1.0000);


-- =====================================================================
-- 5. tr_purchase_requisition
-- =====================================================================
INSERT INTO tr_purchase_requisition (pr_code, product_id, qty_requested, request_date, requested_by, status, notes) VALUES
('PR-202601-001', 11, 20000, '2026-01-05 08:30:00', 'user_inv01', 'Processed', 'Stok tepung terigu mendekati safety stock'),
('PR-202601-002', 12, 15000, '2026-01-05 09:00:00', 'user_inv01', 'Processed', 'Stok gula hampir habis'),
('PR-202601-003', 13, 10000, '2026-01-06 10:15:00', 'user_inv02', 'Processed', NULL),
('PR-202601-004', 14,  5000, '2026-01-06 10:30:00', 'user_inv02', 'Processed', 'Susu skim expiry management'),
('PR-202601-005', 15,  3000, '2026-01-07 08:00:00', 'user_inv01', 'Processed', NULL),
('PR-202601-006', 16,  8000, '2026-01-07 09:45:00', 'user_inv03', 'Processed', 'Restock kopi robusta'),
('PR-202601-007', 23, 10000, '2026-01-08 08:00:00', 'user_inv02', 'Processed', 'Karton box hampir habis'),
('PR-202601-008', 22,  4000, '2026-01-08 10:00:00', 'user_inv03', 'Closed',    'BOPP roll habis'),
('PR-202601-009', 17,  5000, '2026-01-09 08:30:00', 'user_inv01', 'Processed', NULL),
('PR-202601-010', 18,  3000, '2026-01-09 09:00:00', 'user_inv01', 'Processed', 'Mentega stok kritis'),
('PR-202602-001', 11, 18000, '2026-02-03 08:00:00', 'user_inv01', 'Processed', NULL),
('PR-202602-002', 12, 12000, '2026-02-03 09:00:00', 'user_inv02', 'Processed', NULL),
('PR-202602-003', 13,  8000, '2026-02-04 08:30:00', 'user_inv02', 'Processed', NULL),
('PR-202602-004', 24,  30000,'2026-02-05 10:00:00', 'user_inv03', 'Processed', 'Kaleng can Kopiko'),
('PR-202602-005', 19,  2000, '2026-02-05 11:00:00', 'user_inv01', 'Processed', 'Selai kacang'),
('PR-202602-006', 15,  2000, '2026-02-06 08:00:00', 'user_inv02', 'Processed', NULL),
('PR-202602-007', 20,   800, '2026-02-07 09:00:00', 'user_inv03', 'Processed', 'Flavour strawberry'),
('PR-202602-008', 21,  2000, '2026-02-07 09:30:00', 'user_inv01', 'Closed',    'Garam habis'),
('PR-202602-009', 22,  3500, '2026-02-10 08:00:00', 'user_inv02', 'Processed', NULL),
('PR-202602-010', 23,  8000, '2026-02-10 10:00:00', 'user_inv01', 'Processed', NULL),
('PR-202603-001', 11, 22000, '2026-03-03 08:00:00', 'user_inv01', 'Processed', NULL),
('PR-202603-002', 14,  4500, '2026-03-04 09:00:00', 'user_inv02', 'Processed', 'Susu skim habis'),
('PR-202603-003', 16,  9000, '2026-03-04 10:00:00', 'user_inv03', 'Processed', NULL),
('PR-202603-004', 17,  4500, '2026-03-05 08:30:00', 'user_inv01', 'Processed', NULL),
('PR-202603-005', 18,  2500, '2026-03-05 09:00:00', 'user_inv02', 'Processed', NULL),
('PR-202603-006', 24, 25000, '2026-03-06 08:00:00', 'user_inv03', 'Pending',   'Kaleng Kopiko restock Q2'),
('PR-202603-007', 26, 30000, '2026-03-06 09:30:00', 'user_inv01', 'Pending',   'Inner tray coklat'),
('PR-202603-008', 23,  9000, '2026-03-07 08:00:00', 'user_inv02', 'Pending',   'Karton box biskuit'),
('PR-202604-001', 11, 20000, '2026-04-02 08:00:00', 'user_inv01', 'Processed', NULL),
('PR-202604-002', 12, 14000, '2026-04-02 09:00:00', 'user_inv01', 'Processed', NULL),
('PR-202604-003', 13,  9000, '2026-04-03 08:30:00', 'user_inv02', 'Processed', NULL),
('PR-202604-004', 15,  3500, '2026-04-03 09:00:00', 'user_inv03', 'Processed', NULL),
('PR-202604-005', 19,  1800, '2026-04-04 08:00:00', 'user_inv01', 'Pending',   NULL),
('PR-202604-006', 27,  1500, '2026-04-04 09:00:00', 'user_inv02', 'Pending',   'Stretch film habis'),
('PR-202605-001', 11, 19000, '2026-05-05 08:00:00', 'user_inv01', 'Processed', NULL),
('PR-202605-002', 16, 10000, '2026-05-05 09:30:00', 'user_inv03', 'Processed', NULL),
('PR-202605-003', 22,  4000, '2026-05-06 08:00:00', 'user_inv02', 'Pending',   NULL),
('PR-202605-004', 18,  3000, '2026-05-06 09:00:00', 'user_inv01', 'Pending',   NULL),
('PR-202605-005', 14,  5000, '2026-05-07 08:30:00', 'user_inv02', 'Pending',   'Susu skim restock bulk'),
('PR-202606-001', 11, 21000, '2026-06-02 08:00:00', 'user_inv01', 'Pending',   'Planning Juni');


-- =====================================================================
-- 6. tr_goods_receipt
-- =====================================================================
INSERT INTO tr_goods_receipt (gr_code, pr_id, supplier_id, product_id, warehouse_id, quantity, batch_number, expiry_date, receipt_date, received_by, status, reject_qty, reject_reason) VALUES
('GR-202601-001', 1,  1, 11, 1, 20000, 'BT-RM001-2601A', NULL,         '2026-01-10 09:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202601-002', 2,  2, 12, 1, 15000, 'BT-RM002-2601A', NULL,         '2026-01-10 10:30:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202601-003', 3,  3, 13, 1, 10000, 'BT-RM003-2601A', NULL,         '2026-01-11 09:00:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202601-004', 4,  4, 14, 5,  4800, 'BT-RM004-2601A', '2027-06-30', '2026-01-11 10:00:00', 'user_inv02', 'Partial',  200, 'Kemasan rusak saat pengiriman'),
('GR-202601-005', 5,  5, 15, 1,  3000, 'BT-RM005-2601A', NULL,         '2026-01-12 08:30:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202601-006', 6,  8, 16, 1,  8000, 'BT-RM006-2601A', NULL,         '2026-01-13 09:00:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202601-007', 7,  6, 23, 2,  9800, 'BT-PM001-2601A', NULL,         '2026-01-14 08:00:00', 'user_inv02', 'Partial',  200, 'Beberapa karton basah'),
('GR-202601-008', 8,  6, 22, 2,  4000, 'BT-PM002-2601A', NULL,         '2026-01-15 09:30:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202601-009', 9,  10, 17, 5, 5000, 'BT-RM007-2601A', '2027-01-31', '2026-01-15 10:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202601-010', 10,  9, 18, 5, 2900, 'BT-RM008-2601A', '2026-12-31', '2026-01-16 09:00:00', 'user_inv01', 'Partial',  100, 'Mentega meleleh sebagian'),
('GR-202602-001', 11,  1, 11, 1, 18000, 'BT-RM001-2602A', NULL,        '2026-02-07 09:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202602-002', 12,  2, 12, 1, 12000, 'BT-RM002-2602A', NULL,        '2026-02-07 10:30:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202602-003', 13,  3, 13, 1,  8000, 'BT-RM003-2602A', NULL,        '2026-02-08 09:00:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202602-004', 14,  7, 24, 2, 30000, 'BT-PM004-2602A', NULL,        '2026-02-10 08:00:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202602-005', 15, 11, 19, 1,  2000, 'BT-RM009-2602A', '2027-02-28','2026-02-10 09:30:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202602-006', 16,  5, 15, 1,  2000, 'BT-RM005-2602A', NULL,        '2026-02-11 08:30:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202602-007', 17, 12, 20, 1,   800, 'BT-RM010-2602A', NULL,        '2026-02-11 10:00:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202602-008', 18, 15, 21, 1,  2000, 'BT-RM011-2602A', NULL,        '2026-02-12 09:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202602-009', 19,  6, 22, 2,  3500, 'BT-PM002-2602A', NULL,        '2026-02-14 08:00:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202602-010', 20,  13, 23, 2, 8000, 'BT-PM001-2602A', NULL,        '2026-02-14 10:00:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202603-001', 21,  1, 11, 1, 22000, 'BT-RM001-2603A', NULL,        '2026-03-07 09:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202603-002', 22,  4, 14, 5,  4500, 'BT-RM004-2603A', '2027-09-30','2026-03-08 10:00:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202603-003', 23,  8, 16, 1,  9000, 'BT-RM006-2603A', NULL,        '2026-03-08 09:00:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202603-004', 24, 10, 17, 5,  4500, 'BT-RM007-2603A', '2027-03-31','2026-03-10 09:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202603-005', 25,  9, 18, 5,  2500, 'BT-RM008-2603A', '2027-06-30','2026-03-10 10:30:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202604-001', 29,  1, 11, 1, 20000, 'BT-RM001-2604A', NULL,        '2026-04-07 09:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202604-002', 30,  2, 12, 1, 14000, 'BT-RM002-2604A', NULL,        '2026-04-07 10:00:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202604-003', 31,  3, 13, 1,  9000, 'BT-RM003-2604A', NULL,        '2026-04-08 09:30:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202604-004', 32,  5, 15, 1,  3500, 'BT-RM005-2604A', NULL,        '2026-04-09 08:00:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202604-005', NULL, 14, 22, 2, 500, 'BT-PM002-2604A', NULL,        '2026-04-12 09:00:00', 'user_inv03', 'Accepted', 0,   'Emergency PO tanpa PR'),
('GR-202605-001', 35,  1, 11, 1, 19000, 'BT-RM001-2605A', NULL,        '2026-05-09 09:00:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202605-002', 36,  8, 16, 1, 10000, 'BT-RM006-2605A', NULL,        '2026-05-09 10:30:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202605-003', NULL, 4, 14, 5,  5000,'BT-RM004-2605A', '2028-01-31','2026-05-12 09:00:00', 'user_inv02', 'Accepted', 0,   'Top-up stok susu skim'),
('GR-202605-004', NULL, 9, 18, 5,  3000,'BT-RM008-2605A', '2027-09-30','2026-05-13 09:30:00', 'user_inv01', 'Accepted', 0,   NULL),
('GR-202605-005', NULL,13, 23, 2,  9000,'BT-PM001-2605A', NULL,        '2026-05-14 08:00:00', 'user_inv02', 'Accepted', 0,   'Restock karton box'),
('GR-202605-006', NULL, 6, 22, 2,  4000,'BT-PM002-2605A', NULL,        '2026-05-15 09:00:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202606-001', NULL, 1, 11, 1, 10000,'BT-RM001-2606A', NULL,        '2026-06-02 09:00:00', 'user_inv01', 'Accepted', 0,   'Partial delivery awal bulan'),
('GR-202606-002', NULL, 2, 12, 1,  6000,'BT-RM002-2606A', NULL,        '2026-06-02 10:00:00', 'user_inv02', 'Accepted', 0,   NULL),
('GR-202606-003', NULL, 5, 15, 1,  1500,'BT-RM005-2606A', NULL,        '2026-06-03 08:30:00', 'user_inv03', 'Accepted', 0,   NULL),
('GR-202606-004', NULL, 7, 24, 2, 15000,'BT-PM004-2606A', NULL,        '2026-06-03 09:00:00', 'user_inv02', 'Accepted', 0,   NULL);


-- =====================================================================
-- 7. tr_production_request
-- =====================================================================
INSERT INTO tr_production_request (prd_code, product_id, qty_requested, request_date, requested_by, status, notes) VALUES
('PRD-202601-001', 1,  2000, '2026-01-15 08:00:00', 'user_inv01', 'Completed',   'Produksi Roma Marie batch Januari W3'),
('PRD-202601-002', 2,  1500, '2026-01-16 08:00:00', 'user_inv02', 'Completed',   'Produksi Roma Kelapa'),
('PRD-202601-003', 5,  3000, '2026-01-17 09:00:00', 'user_inv03', 'Completed',   'Kopiko 78°C batch Q1'),
('PRD-202601-004', 9,  4000, '2026-01-20 08:00:00', 'user_inv01', 'Completed',   'Kis Mint Candy'),
('PRD-202602-001', 1,  2500, '2026-02-15 08:00:00', 'user_inv01', 'Completed',   'Roma Marie batch Februari'),
('PRD-202602-002', 3,  2000, '2026-02-16 09:00:00', 'user_inv02', 'Completed',   'Slai O lai batch Feb'),
('PRD-202602-003', 6,  2500, '2026-02-17 08:00:00', 'user_inv03', 'Completed',   'Torabika Cappuccino'),
('PRD-202602-004', 7,  1800, '2026-02-18 08:30:00', 'user_inv01', 'Completed',   'Better Wafer'),
('PRD-202603-001', 1,  3000, '2026-03-15 08:00:00', 'user_inv01', 'Completed',   'Roma Marie batch Maret'),
('PRD-202603-002', 4,  3500, '2026-03-16 09:00:00', 'user_inv02', 'Completed',   'Choki-Choki Maret'),
('PRD-202603-003', 8,  2000, '2026-03-17 08:30:00', 'user_inv03', 'Completed',   'Energen Vanilla'),
('PRD-202603-004', 10, 1500, '2026-03-18 09:00:00', 'user_inv01', 'Completed',   'Danisa Butter Cookies'),
('PRD-202604-001', 1,  2000, '2026-04-14 08:00:00', 'user_inv01', 'Completed',   'Roma Marie April W2'),
('PRD-202604-002', 2,  1800, '2026-04-15 09:00:00', 'user_inv02', 'Completed',   'Roma Kelapa April'),
('PRD-202604-003', 5,  3200, '2026-04-16 08:00:00', 'user_inv03', 'Completed',   'Kopiko Q2'),
('PRD-202604-004', 9,  5000, '2026-04-17 08:30:00', 'user_inv01', 'Completed',   'Kis Mint Q2 bulk'),
('PRD-202605-001', 3,  2500, '2026-05-13 08:00:00', 'user_inv02', 'In Progress', 'Slai O lai Mei'),
('PRD-202605-002', 6,  2800, '2026-05-14 09:00:00', 'user_inv03', 'In Progress', 'Torabika Mei'),
('PRD-202605-003', 1,  3500, '2026-05-15 08:00:00', 'user_inv01', 'In Progress', 'Roma Marie Mei batch besar'),
('PRD-202606-001', 4,  4000, '2026-06-02 08:00:00', 'user_inv02', 'Pending',     'Choki-Choki Juni — menunggu cocoa');


-- =====================================================================
-- 8. tr_goods_issue
-- =====================================================================
INSERT INTO tr_goods_issue (issue_code, product_id, warehouse_id, batch_number, quantity, purpose, ref_id, issue_date, issued_by) VALUES
-- Januari produksi
('ISS-202601-001', 11, 1, 'BT-RM001-2601A', 1200, 'Production', 'PRD-202601-001', '2026-01-16 07:30:00', 'user_inv01'),
('ISS-202601-002', 12, 1, 'BT-RM002-2601A',  400, 'Production', 'PRD-202601-001', '2026-01-16 07:35:00', 'user_inv01'),
('ISS-202601-003', 14, 5, 'BT-RM004-2601A',  100, 'Production', 'PRD-202601-001', '2026-01-16 07:40:00', 'user_inv01'),
('ISS-202601-004', 11, 1, 'BT-RM001-2601A', 1050, 'Production', 'PRD-202601-002', '2026-01-17 07:30:00', 'user_inv02'),
('ISS-202601-005', 12, 1, 'BT-RM002-2601A',  375, 'Production', 'PRD-202601-002', '2026-01-17 07:35:00', 'user_inv02'),
('ISS-202601-006', 16, 1, 'BT-RM006-2601A',   60, 'Production', 'PRD-202601-003', '2026-01-18 07:30:00', 'user_inv03'),
('ISS-202601-007', 17, 5, 'BT-RM007-2601A',   45, 'Production', 'PRD-202601-003', '2026-01-18 07:35:00', 'user_inv03'),
('ISS-202601-008', 12, 1, 'BT-RM002-2601A', 1600, 'Production', 'PRD-202601-004', '2026-01-21 07:30:00', 'user_inv01'),
('ISS-202601-009', 13, 1, 'BT-RM003-2601A',  200, 'Production', 'PRD-202601-004', '2026-01-21 07:35:00', 'user_inv01'),
('ISS-202601-010', 11, 1, 'BT-RM001-2601A',  100, 'Sampling',   NULL,             '2026-01-25 09:00:00', 'user_inv02'),
-- Februari produksi
('ISS-202602-001', 11, 1, 'BT-RM001-2602A', 1500, 'Production', 'PRD-202602-001', '2026-02-16 07:30:00', 'user_inv01'),
('ISS-202602-002', 12, 1, 'BT-RM002-2602A',  500, 'Production', 'PRD-202602-001', '2026-02-16 07:35:00', 'user_inv01'),
('ISS-202602-003', 11, 1, 'BT-RM001-2602A', 1000, 'Production', 'PRD-202602-002', '2026-02-17 07:30:00', 'user_inv02'),
('ISS-202602-004', 20, 1, 'BT-RM010-2602A',    4, 'Production', 'PRD-202602-002', '2026-02-17 07:35:00', 'user_inv02'),
('ISS-202602-005', 16, 1, 'BT-RM006-2601A',   45, 'Production', 'PRD-202602-003', '2026-02-18 07:30:00', 'user_inv03'),
('ISS-202602-006', 17, 5, 'BT-RM007-2601A',   50, 'Production', 'PRD-202602-003', '2026-02-18 07:35:00', 'user_inv03'),
('ISS-202602-007', 11, 1, 'BT-RM001-2602A',  720, 'Production', 'PRD-202602-004', '2026-02-19 07:30:00', 'user_inv01'),
('ISS-202602-008', 19, 1, 'BT-RM009-2602A',  144, 'Production', 'PRD-202602-004', '2026-02-19 07:35:00', 'user_inv01'),
('ISS-202602-009', 14, 5, 'BT-RM004-2601A',   50, 'Sampling',   NULL,             '2026-02-22 09:00:00', 'user_inv02'),
-- Maret produksi
('ISS-202603-001', 11, 1, 'BT-RM001-2603A', 1800, 'Production', 'PRD-202603-001', '2026-03-16 07:30:00', 'user_inv01'),
('ISS-202603-002', 12, 1, 'BT-RM002-2604A',  600, 'Production', 'PRD-202603-001', '2026-03-16 07:35:00', 'user_inv01'),
('ISS-202603-003', 15, 1, 'BT-RM005-2601A',  525, 'Production', 'PRD-202603-002', '2026-03-17 07:30:00', 'user_inv02'),
('ISS-202603-004', 12, 1, 'BT-RM002-2604A',  700, 'Production', 'PRD-202603-002', '2026-03-17 07:35:00', 'user_inv02'),
('ISS-202603-005', 14, 5, 'BT-RM004-2603A',  120, 'Production', 'PRD-202603-003', '2026-03-18 07:30:00', 'user_inv03'),
('ISS-202603-006', 17, 5, 'BT-RM007-2603A',   80, 'Production', 'PRD-202603-003', '2026-03-18 07:35:00', 'user_inv03'),
('ISS-202603-007', 11, 1, 'BT-RM001-2603A',  825, 'Production', 'PRD-202603-004', '2026-03-19 07:30:00', 'user_inv01'),
('ISS-202603-008', 18, 5, 'BT-RM008-2601A',  180, 'Production', 'PRD-202603-004', '2026-03-19 07:35:00', 'user_inv01'),
('ISS-202603-009', 12, 1, 'BT-RM002-2604A',  330, 'Production', 'PRD-202603-004', '2026-03-19 07:40:00', 'user_inv01'),
-- April produksi
('ISS-202604-001', 11, 1, 'BT-RM001-2604A', 1200, 'Production', 'PRD-202604-001', '2026-04-15 07:30:00', 'user_inv01'),
('ISS-202604-002', 12, 1, 'BT-RM002-2604A',  400, 'Production', 'PRD-202604-001', '2026-04-15 07:35:00', 'user_inv01'),
('ISS-202604-003', 11, 1, 'BT-RM001-2604A', 1260, 'Production', 'PRD-202604-002', '2026-04-16 07:30:00', 'user_inv02'),
('ISS-202604-004', 16, 1, 'BT-RM006-2603A',   64, 'Production', 'PRD-202604-003', '2026-04-17 07:30:00', 'user_inv03'),
('ISS-202604-005', 17, 5, 'BT-RM007-2603A',   48, 'Production', 'PRD-202604-003', '2026-04-17 07:35:00', 'user_inv03'),
('ISS-202604-006', 12, 1, 'BT-RM002-2604A', 2000, 'Production', 'PRD-202604-004', '2026-04-18 07:30:00', 'user_inv01'),
('ISS-202604-007', 13, 1, 'BT-RM003-2604A',  250, 'Production', 'PRD-202604-004', '2026-04-18 07:35:00', 'user_inv01'),
('ISS-202604-008', 11, 1, 'BT-RM001-2604A',  200, 'Return',     NULL,             '2026-04-22 10:00:00', 'user_inv02'),
-- Mei produksi (In Progress)
('ISS-202605-001', 11, 1, 'BT-RM001-2605A', 1250, 'Production', 'PRD-202605-001', '2026-05-14 07:30:00', 'user_inv02'),
('ISS-202605-002', 20, 1, 'BT-RM010-2602A',    5, 'Production', 'PRD-202605-001', '2026-05-14 07:35:00', 'user_inv02'),
('ISS-202605-003', 16, 1, 'BT-RM006-2605A',   50, 'Production', 'PRD-202605-002', '2026-05-15 07:30:00', 'user_inv03'),
('ISS-202605-004', 17, 5, 'BT-RM007-2603A',   56, 'Production', 'PRD-202605-002', '2026-05-15 07:35:00', 'user_inv03'),
('ISS-202605-005', 11, 1, 'BT-RM001-2605A', 1925, 'Production', 'PRD-202605-003', '2026-05-16 07:30:00', 'user_inv01');


-- =====================================================================
-- 9. tr_delivery_order
-- =====================================================================
INSERT INTO tr_delivery_order (do_code, customer_id, customer_name, product_id, quantity, order_date, shipping_date, delivery_address, status, shipped_by) VALUES
('DO-202601-001', 'CUST-001', 'PT Indomarco Adi Prima',       1, 1200, '2026-01-22 08:00:00', '2026-01-24 08:00:00', 'Jl. Ancol Barat, Jakarta Utara',          'Delivered', 'user_inv03'),
('DO-202601-002', 'CUST-002', 'PT Sumber Alfaria Trijaya',    2,  800, '2026-01-22 09:00:00', '2026-01-24 10:00:00', 'Jl. M. H. Thamrin, Tangerang',            'Delivered', 'user_inv03'),
('DO-202601-003', 'CUST-003', 'PT Matahari Putra Prima',      5, 1500, '2026-01-23 08:30:00', '2026-01-25 09:00:00', 'Jl. Boulevard Diponegoro, Lippo Karawaci', 'Delivered', 'user_inv01'),
('DO-202601-004', 'CUST-004', 'CV Maju Jaya Mandiri',         9, 2000, '2026-01-25 10:00:00', '2026-01-27 08:00:00', 'Jl. Pasar Baru, Bandung',                 'Delivered', 'user_inv02'),
('DO-202602-001', 'CUST-001', 'PT Indomarco Adi Prima',       1, 1500, '2026-02-20 08:00:00', '2026-02-22 09:00:00', 'Jl. Ancol Barat, Jakarta Utara',          'Delivered', 'user_inv01'),
('DO-202602-002', 'CUST-005', 'PT Lion Super Indo',           3,  900, '2026-02-20 09:30:00', '2026-02-23 08:00:00', 'Jl. Puri Kembangan, Jakarta Barat',       'Delivered', 'user_inv03'),
('DO-202602-003', 'CUST-006', 'UD Berkah Jaya',               6, 1200, '2026-02-21 08:00:00', '2026-02-24 09:00:00', 'Jl. Raya Bogor Km.45, Cibinong',          'Delivered', 'user_inv02'),
('DO-202602-004', 'CUST-007', 'PT Charoen Pokphand Retail',   7,  800, '2026-02-22 10:00:00', '2026-02-25 09:00:00', 'Jl. Daan Mogot, Tangerang',               'Delivered', 'user_inv01'),
('DO-202603-001', 'CUST-002', 'PT Sumber Alfaria Trijaya',    1, 1800, '2026-03-20 08:00:00', '2026-03-22 09:00:00', 'Jl. M.H. Thamrin, Tangerang',             'Delivered', 'user_inv03'),
('DO-202603-002', 'CUST-008', 'PT Trans Retail Indonesia',    4, 1500, '2026-03-20 09:00:00', '2026-03-23 08:00:00', 'Jl. Jend Sudirman, Jakarta',              'Delivered', 'user_inv01'),
('DO-202603-003', 'CUST-003', 'PT Matahari Putra Prima',      8,  900, '2026-03-21 08:30:00', '2026-03-24 09:00:00', 'Jl. Boulevard Diponegoro, Lippo Karawaci', 'Delivered', 'user_inv02'),
('DO-202603-004', 'CUST-009', 'CV Sinar Terang Abadi',       10,  700, '2026-03-22 10:00:00', '2026-03-25 08:00:00', 'Jl. Gatot Subroto, Semarang',             'Delivered', 'user_inv03'),
('DO-202603-005', 'CUST-010', 'PT Hero Supermarket',          5, 2000, '2026-03-23 08:00:00', '2026-03-26 09:00:00', 'Jl. Pajajaran, Bogor',                    'Delivered', 'user_inv01'),
('DO-202604-001', 'CUST-001', 'PT Indomarco Adi Prima',       1, 2000, '2026-04-20 08:00:00', '2026-04-22 09:00:00', 'Jl. Ancol Barat, Jakarta Utara',          'Delivered', 'user_inv01'),
('DO-202604-002', 'CUST-011', 'PT Midi Utama Indonesia',      2,  900, '2026-04-20 09:00:00', '2026-04-22 10:00:00', 'Jl. Raya Serpong, Tangerang',             'Delivered', 'user_inv02'),
('DO-202604-003', 'CUST-005', 'PT Lion Super Indo',           9, 3000, '2026-04-21 08:30:00', '2026-04-23 09:00:00', 'Jl. Puri Kembangan, Jakarta Barat',       'Delivered', 'user_inv03'),
('DO-202604-004', 'CUST-006', 'UD Berkah Jaya',               6,  600, '2026-04-22 10:00:00', '2026-04-24 09:00:00', 'Jl. Raya Bogor Km.45, Cibinong',          'Shipped',   'user_inv01'),
('DO-202604-005', 'CUST-012', 'PT Carrefour Indonesia',       5, 2500, '2026-04-23 08:00:00', '2026-04-25 09:00:00', 'Jl. Lebak Bulus, Jakarta Selatan',        'Delivered', 'user_inv02'),
('DO-202605-001', 'CUST-002', 'PT Sumber Alfaria Trijaya',    3, 1500, '2026-05-19 08:00:00', '2026-05-21 09:00:00', 'Jl. M. H. Thamrin, Tangerang',            'Shipped',   'user_inv03'),
('DO-202605-002', 'CUST-008', 'PT Trans Retail Indonesia',    6, 1400, '2026-05-20 09:00:00', '2026-05-22 09:00:00', 'Jl. Jend Sudirman, Jakarta',              'Shipped',   'user_inv01'),
('DO-202605-003', 'CUST-013', 'CV Makmur Sentosa',            7,  600, '2026-05-20 10:00:00', NULL,                  'Jl. Raya Bekasi Km.23, Bekasi',           'Pending',   NULL),
('DO-202605-004', 'CUST-001', 'PT Indomarco Adi Prima',       1, 2500, '2026-05-21 08:00:00', NULL,                  'Jl. Ancol Barat, Jakarta Utara',          'Pending',   NULL),
('DO-202605-005', 'CUST-009', 'CV Sinar Terang Abadi',        4, 1800, '2026-05-22 09:00:00', NULL,                  'Jl. Gatot Subroto, Semarang',             'Pending',   NULL),
('DO-202605-006', 'CUST-010', 'PT Hero Supermarket',         10,  400, '2026-05-22 10:00:00', NULL,                  'Jl. Pajajaran, Bogor',                    'Pending',   NULL),
('DO-202606-001', 'CUST-003', 'PT Matahari Putra Prima',      1, 2000, '2026-06-02 08:00:00', NULL,                  'Jl. Boulevard Diponegoro, Lippo Karawaci', 'Pending',  NULL),
('DO-202606-002', 'CUST-004', 'CV Maju Jaya Mandiri',         5, 1500, '2026-06-02 09:00:00', NULL,                  'Jl. Pasar Baru, Bandung',                 'Pending',   NULL),
('DO-202606-003', 'CUST-014', 'PT Ramayana Lestari Sentosa',  9, 2500, '2026-06-03 08:30:00', NULL,                  'Jl. Wahid Hasyim, Jakarta Pusat',         'Pending',   NULL),
('DO-202606-004', 'CUST-015', 'PT Borma Toserba',             2,  700, '2026-06-03 09:00:00', NULL,                  'Jl. Soekarno Hatta, Bandung',             'Pending',   NULL),
('DO-202605-007', 'CUST-011', 'PT Midi Utama Indonesia',      8,  500, '2026-05-23 08:00:00', '2026-05-25 09:00:00', 'Jl. Raya Serpong, Tangerang',             'Delivered', 'user_inv02'),
('DO-202602-005', 'CUST-014', 'PT Ramayana Lestari Sentosa',  2,  600, '2026-02-25 08:00:00', '2026-02-27 09:00:00', 'Jl. Wahid Hasyim, Jakarta Pusat',         'Delivered', 'user_inv03'),
('DO-202601-005', 'CUST-015', 'PT Borma Toserba',             7,  400, '2026-01-28 10:00:00', '2026-01-30 09:00:00', 'Jl. Soekarno Hatta, Bandung',             'Delivered', 'user_inv01'),
('DO-202604-006', 'CUST-012', 'PT Carrefour Indonesia',       4, 1200, '2026-04-24 08:00:00', '2026-04-26 09:00:00', 'Jl. Lebak Bulus, Jakarta Selatan',        'Delivered', 'user_inv03'),
('DO-202603-006', 'CUST-013', 'CV Makmur Sentosa',            7,  350, '2026-03-25 09:00:00', '2026-03-27 09:00:00', 'Jl. Raya Bekasi Km.23, Bekasi',           'Delivered', 'user_inv02'),
('DO-202603-007', 'CUST-007', 'PT Charoen Pokphand Retail',   3,  700, '2026-03-25 10:00:00', '2026-03-27 10:00:00', 'Jl. Daan Mogot, Tangerang',               'Void',      NULL),
('DO-202604-007', 'CUST-002', 'PT Sumber Alfaria Trijaya',    8,  800, '2026-04-25 08:00:00', '2026-04-27 09:00:00', 'Jl. M. H. Thamrin, Tangerang',            'Delivered', 'user_inv01');


-- =====================================================================
-- 10. tr_stock_balance
-- =====================================================================
INSERT INTO tr_stock_balance (product_id, warehouse_id, batch_number, quantity, expiry_date, status) VALUES
-- Tepung Terigu (RM-001) — WH-001
(11, 1, 'BT-RM001-2604A', 12500, NULL,         'Available'),
(11, 1, 'BT-RM001-2605A', 14800, NULL,         'Available'),
(11, 1, 'BT-RM001-2606A', 10000, NULL,         'Available'),
-- Gula (RM-002)
(12, 1, 'BT-RM002-2604A',  6200, NULL,         'Available'),
(12, 1, 'BT-RM002-2606A',  6000, NULL,         'Available'),
-- Palm Olein (RM-003)
(13, 1, 'BT-RM003-2604A',  7500, NULL,         'Available'),
-- Susu Skim (RM-004) — WH-005 (Cold Storage)
(14, 5, 'BT-RM004-2603A',  3200, '2027-09-30', 'Available'),
(14, 5, 'BT-RM004-2605A',  5000, '2028-01-31', 'Available'),
-- Cocoa Powder (RM-005)
(15, 1, 'BT-RM005-2604A',  2800, NULL,         'Available'),
(15, 1, 'BT-RM005-2606A',  1500, NULL,         'Available'),
-- Biji Kopi (RM-006)
(16, 1, 'BT-RM006-2603A',  6200, NULL,         'Available'),
(16, 1, 'BT-RM006-2605A',  9800, NULL,         'Available'),
-- Non-Dairy Creamer (RM-007) — Cold Storage
(17, 5, 'BT-RM007-2603A',  2900, '2027-03-31', 'Available'),
-- Mentega (RM-008) — Cold Storage
(18, 5, 'BT-RM008-2603A',  1800, '2027-06-30', 'Available'),
(18, 5, 'BT-RM008-2605A',  3000, '2027-09-30', 'Available'),
-- Selai Kacang (RM-009)
(19, 1, 'BT-RM009-2602A',  1700, '2027-02-28', 'Available'),
-- Perisa Strawberry (RM-010)
(20, 1, 'BT-RM010-2602A',   791, NULL,         'Available'),
-- Garam (RM-011)
(21, 1, 'BT-RM011-2602A',  2000, NULL,         'Available'),
-- Sodium Bicarb (RM-012) — belum ada GR, safety stock check
(22, 1, 'BT-RM012-2512A',   650, NULL,         'Available'),
-- Karton Box Biskuit (PM-001)
(23, 2, 'BT-PM001-2602A',  5200, NULL,         'Available'),
(23, 2, 'BT-PM001-2605A',  8500, NULL,         'Available'),
-- BOPP Wrapping (PM-002)
(22, 2, 'BT-PM002-2602A',  2200, NULL,         'Available'),
(22, 2, 'BT-PM002-2604A',   480, NULL,         'Available'),
(22, 2, 'BT-PM002-2605A',  3800, NULL,         'Available'),
-- Aluminium Foil (PM-003)
(23, 2, 'BT-PM003-2512A',   900, NULL,         'Quarantine'),
-- Kaleng Can Kopiko (PM-004)
(24, 2, 'BT-PM004-2602A', 22000, NULL,         'Available'),
(24, 2, 'BT-PM004-2606A', 15000, NULL,         'Available'),
-- Label Stiker (PM-005)
(25, 2, 'BT-PM005-2512A',  2100, NULL,         'Available'),
-- Inner Tray (PM-006)
(26, 2, 'BT-PM006-2512A', 10500, NULL,         'Available'),
-- Stretch Film (PM-007)
(27, 2, 'BT-PM007-2512A',   650, NULL,         'Available'),
-- Karton Box Candy (PM-008)
(28, 2, 'BT-PM008-2512A',  3200, NULL,         'Available'),
-- Finished Goods — WH-003
(1, 3,  'BT-FG001-2604A',  1800, '2027-04-30', 'Available'),
(1, 3,  'BT-FG001-2605A',  3200, '2027-05-31', 'Available'),
(2, 3,  'BT-FG002-2604A',   900, '2027-04-30', 'Available'),
(3, 3,  'BT-FG003-2605A',  2100, '2027-05-31', 'Available'),
(4, 3,  'BT-FG004-2603A',  3200, '2027-03-31', 'Available'),
(5, 3,  'BT-FG005-2604A',  2800, '2027-04-30', 'Available'),
(5, 3,  'BT-FG005-2604B',   500, '2027-04-30', 'Quarantine'),
(6, 3,  'BT-FG006-2602A',  1100, '2027-02-28', 'Available'),
(7, 3,  'BT-FG007-2602A',   650, '2026-12-31', 'Available'),
(8, 3,  'BT-FG008-2603A',  1200, '2027-09-30', 'Available'),
(9, 3,  'BT-FG009-2604A',  4800, '2027-04-30', 'Available'),
(10, 3, 'BT-FG010-2603A',  1100, '2027-03-31', 'Available'),
-- Finished Goods — WH-004 (Jakarta)
(1, 4,  'BT-FG001-2603A',   900, '2027-03-31', 'Available'),
(2, 4,  'BT-FG002-2603A',   700, '2027-03-31', 'Available'),
(5, 4,  'BT-FG005-2603A',  1500, '2027-03-31', 'Available'),
(9, 4,  'BT-FG009-2603A',  2500, '2027-03-31', 'Available'),
(4, 4,  'BT-FG004-2604A',  1800, '2027-04-30', 'Available'),
(6, 4,  'BT-FG006-2604A',   800, '2027-04-30', 'Available');


-- =====================================================================
-- 11. tr_stock_movements
-- =====================================================================
-- IN movements (Goods Receipts — sample 65 entries)
INSERT INTO tr_stock_movements (product_id, warehouse_id, type, quantity, balance_after, reference_id, reference_type, movement_date) VALUES
-- Jan GR
(11, 1, 'IN', 20000, 20000, 'GR-202601-001', 'GR', '2026-01-10 09:00:00'),
(12, 1, 'IN', 15000, 15000, 'GR-202601-002', 'GR', '2026-01-10 10:30:00'),
(13, 1, 'IN', 10000, 10000, 'GR-202601-003', 'GR', '2026-01-11 09:00:00'),
(14, 5, 'IN',  4800,  4800, 'GR-202601-004', 'GR', '2026-01-11 10:00:00'),
(15, 1, 'IN',  3000,  3000, 'GR-202601-005', 'GR', '2026-01-12 08:30:00'),
(16, 1, 'IN',  8000,  8000, 'GR-202601-006', 'GR', '2026-01-13 09:00:00'),
(23, 2, 'IN',  9800,  9800, 'GR-202601-007', 'GR', '2026-01-14 08:00:00'),
(22, 2, 'IN',  4000,  4000, 'GR-202601-008', 'GR', '2026-01-15 09:30:00'),
(17, 5, 'IN',  5000,  5000, 'GR-202601-009', 'GR', '2026-01-15 10:00:00'),
(18, 5, 'IN',  2900,  2900, 'GR-202601-010', 'GR', '2026-01-16 09:00:00'),
-- Feb GR
(11, 1, 'IN', 18000, 18000, 'GR-202602-001', 'GR', '2026-02-07 09:00:00'),
(12, 1, 'IN', 12000, 12000, 'GR-202602-002', 'GR', '2026-02-07 10:30:00'),
(13, 1, 'IN',  8000,  8000, 'GR-202602-003', 'GR', '2026-02-08 09:00:00'),
(24, 2, 'IN', 30000, 30000, 'GR-202602-004', 'GR', '2026-02-10 08:00:00'),
(19, 1, 'IN',  2000,  2000, 'GR-202602-005', 'GR', '2026-02-10 09:30:00'),
(15, 1, 'IN',  2000,  2000, 'GR-202602-006', 'GR', '2026-02-11 08:30:00'),
(20, 1, 'IN',   800,   800, 'GR-202602-007', 'GR', '2026-02-11 10:00:00'),
(21, 1, 'IN',  2000,  2000, 'GR-202602-008', 'GR', '2026-02-12 09:00:00'),
(22, 2, 'IN',  3500,  3500, 'GR-202602-009', 'GR', '2026-02-14 08:00:00'),
(23, 2, 'IN',  8000,  8000, 'GR-202602-010', 'GR', '2026-02-14 10:00:00'),
-- Mar GR
(11, 1, 'IN', 22000, 22000, 'GR-202603-001', 'GR', '2026-03-07 09:00:00'),
(14, 5, 'IN',  4500,  4500, 'GR-202603-002', 'GR', '2026-03-08 10:00:00'),
(16, 1, 'IN',  9000,  9000, 'GR-202603-003', 'GR', '2026-03-08 09:00:00'),
(17, 5, 'IN',  4500,  4500, 'GR-202603-004', 'GR', '2026-03-10 09:00:00'),
(18, 5, 'IN',  2500,  2500, 'GR-202603-005', 'GR', '2026-03-10 10:30:00'),
-- Apr GR
(11, 1, 'IN', 20000, 20000, 'GR-202604-001', 'GR', '2026-04-07 09:00:00'),
(12, 1, 'IN', 14000, 14000, 'GR-202604-002', 'GR', '2026-04-07 10:00:00'),
(13, 1, 'IN',  9000,  9000, 'GR-202604-003', 'GR', '2026-04-08 09:30:00'),
(15, 1, 'IN',  3500,  3500, 'GR-202604-004', 'GR', '2026-04-09 08:00:00'),
(22, 2, 'IN',   500,   500, 'GR-202604-005', 'GR', '2026-04-12 09:00:00'),
-- Mei GR
(11, 1, 'IN', 19000, 19000, 'GR-202605-001', 'GR', '2026-05-09 09:00:00'),
(16, 1, 'IN', 10000, 10000, 'GR-202605-002', 'GR', '2026-05-09 10:30:00'),
(14, 5, 'IN',  5000,  5000, 'GR-202605-003', 'GR', '2026-05-12 09:00:00'),
(18, 5, 'IN',  3000,  3000, 'GR-202605-004', 'GR', '2026-05-13 09:30:00'),
(23, 2, 'IN',  9000,  9000, 'GR-202605-005', 'GR', '2026-05-14 08:00:00'),
(22, 2, 'IN',  4000,  4000, 'GR-202605-006', 'GR', '2026-05-15 09:00:00'),
-- Jun GR
(11, 1, 'IN', 10000, 10000, 'GR-202606-001', 'GR', '2026-06-02 09:00:00'),
(12, 1, 'IN',  6000,  6000, 'GR-202606-002', 'GR', '2026-06-02 10:00:00'),
(15, 1, 'IN',  1500,  1500, 'GR-202606-003', 'GR', '2026-06-03 08:30:00'),
(24, 2, 'IN', 15000, 15000, 'GR-202606-004', 'GR', '2026-06-03 09:00:00'),

-- OUT movements (Goods Issues — selected)
(11, 1, 'OUT', 1200, 18800, 'ISS-202601-001', 'GI', '2026-01-16 07:30:00'),
(12, 1, 'OUT',  400, 14600, 'ISS-202601-002', 'GI', '2026-01-16 07:35:00'),
(14, 5, 'OUT',  100,  4700, 'ISS-202601-003', 'GI', '2026-01-16 07:40:00'),
(11, 1, 'OUT', 1050, 17750, 'ISS-202601-004', 'GI', '2026-01-17 07:30:00'),
(12, 1, 'OUT',  375, 14225, 'ISS-202601-005', 'GI', '2026-01-17 07:35:00'),
(16, 1, 'OUT',   60,  7940, 'ISS-202601-006', 'GI', '2026-01-18 07:30:00'),
(17, 5, 'OUT',   45,  4955, 'ISS-202601-007', 'GI', '2026-01-18 07:35:00'),
(12, 1, 'OUT', 1600, 12625, 'ISS-202601-008', 'GI', '2026-01-21 07:30:00'),
(13, 1, 'OUT',  200,  9800, 'ISS-202601-009', 'GI', '2026-01-21 07:35:00'),
(11, 1, 'OUT',  100, 17650, 'ISS-202601-010', 'GI', '2026-01-25 09:00:00'),
(11, 1, 'OUT', 1500, 34150, 'ISS-202602-001', 'GI', '2026-02-16 07:30:00'),
(12, 1, 'OUT',  500, 24725, 'ISS-202602-002', 'GI', '2026-02-16 07:35:00'),
(11, 1, 'OUT', 1000, 33150, 'ISS-202602-003', 'GI', '2026-02-17 07:30:00'),
(20, 1, 'OUT',    4,   796, 'ISS-202602-004', 'GI', '2026-02-17 07:35:00'),
(16, 1, 'OUT',   45,  7895, 'ISS-202602-005', 'GI', '2026-02-18 07:30:00'),
(17, 5, 'OUT',   50,  4905, 'ISS-202602-006', 'GI', '2026-02-18 07:35:00'),
(11, 1, 'OUT',  720, 32430, 'ISS-202602-007', 'GI', '2026-02-19 07:30:00'),
(19, 1, 'OUT',  144,  1856, 'ISS-202602-008', 'GI', '2026-02-19 07:35:00'),
(11, 1, 'OUT', 1800, 52630, 'ISS-202603-001', 'GI', '2026-03-16 07:30:00'),
(12, 1, 'OUT',  600, 25125, 'ISS-202603-002', 'GI', '2026-03-16 07:35:00'),
(15, 1, 'OUT',  525,  4475, 'ISS-202603-003', 'GI', '2026-03-17 07:30:00'),
(18, 5, 'OUT',  180,  5220, 'ISS-202603-008', 'GI', '2026-03-19 07:35:00'),
(11, 1, 'OUT', 1200, 37300, 'ISS-202604-001', 'GI', '2026-04-15 07:30:00'),
(12, 1, 'OUT',  400, 25125, 'ISS-202604-002', 'GI', '2026-04-15 07:35:00'),
(11, 1, 'OUT', 1925, 15575, 'ISS-202605-005', 'GI', '2026-05-16 07:30:00'),

-- OUT movements (Delivery Orders)
(1,  3, 'OUT', 1200, 2300, 'DO-202601-001', 'DO', '2026-01-24 08:00:00'),
(2,  3, 'OUT',  800, 1200, 'DO-202601-002', 'DO', '2026-01-24 10:00:00'),
(5,  3, 'OUT', 1500, 1300, 'DO-202601-003', 'DO', '2026-01-25 09:00:00'),
(9,  3, 'OUT', 2000, 2800, 'DO-202601-004', 'DO', '2026-01-27 08:00:00'),
(1,  3, 'OUT', 1500, 3600, 'DO-202602-001', 'DO', '2026-02-22 09:00:00'),
(3,  3, 'OUT',  900, 1200, 'DO-202602-002', 'DO', '2026-02-23 08:00:00'),
(6,  3, 'OUT', 1200,  800, 'DO-202602-003', 'DO', '2026-02-24 09:00:00'),
(1,  3, 'OUT', 1800, 4200, 'DO-202603-001', 'DO', '2026-03-22 09:00:00'),
(4,  3, 'OUT', 1500, 2000, 'DO-202603-002', 'DO', '2026-03-23 08:00:00'),
(5,  3, 'OUT', 2000, 3300, 'DO-202603-005', 'DO', '2026-03-26 09:00:00'),
(1,  3, 'OUT', 2000, 3000, 'DO-202604-001', 'DO', '2026-04-22 09:00:00'),
(9,  3, 'OUT', 3000, 4300, 'DO-202604-003', 'DO', '2026-04-23 09:00:00'),
(5,  3, 'OUT', 2500, 2800, 'DO-202604-005', 'DO', '2026-04-25 09:00:00'),

-- ADJ (stock opname correction)
(22, 2, 'IN',  300,  7300, 'ADJ-202602-001', 'ADJ', '2026-02-28 16:00:00'),
(26, 2, 'OUT', 500, 10000, 'ADJ-202603-001', 'ADJ', '2026-03-31 16:00:00');


-- ─────────────────────────────────────────────────────────────────────
-- RE-ENABLE triggers
-- ─────────────────────────────────────────────────────────────────────
SET session_replication_role = DEFAULT;


-- =====================================================================
-- VERIFICATION QUERIES (opsional — comment out kalau tidak dibutuhkan)
-- =====================================================================
/*
-- Cek jumlah record per tabel
SELECT 'ms_products'              AS tabel, COUNT(*) AS total FROM ms_products
UNION ALL SELECT 'ms_warehouses',  COUNT(*) FROM ms_warehouses
UNION ALL SELECT 'ms_suppliers',   COUNT(*) FROM ms_suppliers
UNION ALL SELECT 'ms_bom',         COUNT(*) FROM ms_bom
UNION ALL SELECT 'tr_purchase_requisition', COUNT(*) FROM tr_purchase_requisition
UNION ALL SELECT 'tr_goods_receipt',        COUNT(*) FROM tr_goods_receipt
UNION ALL SELECT 'tr_production_request',   COUNT(*) FROM tr_production_request
UNION ALL SELECT 'tr_goods_issue',          COUNT(*) FROM tr_goods_issue
UNION ALL SELECT 'tr_delivery_order',       COUNT(*) FROM tr_delivery_order
UNION ALL SELECT 'tr_stock_balance',        COUNT(*) FROM tr_stock_balance
UNION ALL SELECT 'tr_stock_movements',      COUNT(*) FROM tr_stock_movements;

-- Cek stock health via view
SELECT product_code, product_name, current_stock, minimum_stock, stock_health
FROM vw_stock_summary
ORDER BY stock_health, product_code;
*/

-- =====================================================================
-- END OF DUMMY DATA
-- =====================================================================