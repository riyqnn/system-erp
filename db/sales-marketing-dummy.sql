-- =====================================================================
-- MODUL SALES & MARKETING — DUMMY / SEED DATA (untuk demo semua fitur)
--
-- Jalankan SETELAH:
--   1) db/sales-marketing-schema.sql
--   2) db/sales-marketing-phase2.sql
--
-- Sifat: IDEMPOTENT. Semua baris dummy memakai UUID ber-prefix khusus
-- dan dihapus dulu (urut FK) sebelum di-insert ulang, jadi aman di-run
-- berkali-kali. Tabel `products` di-UPSERT by sku (tidak menghapus
-- produk lain). Data ini mengacu tanggal "hari ini" = 2026-06-03.
--
-- Prefix UUID:
--   customers      11111111-...   sales_orders   22222222-...
--   delivery_order 33333333-...   sales_invoices 44444444-...
--   forecast       55555555-...   notifications  66666666-...
-- =====================================================================

do $$
declare
  v_user uuid;
  v_fg1 uuid; v_fg2 uuid; v_fg3 uuid; v_fg4 uuid; v_fg5 uuid; v_fg6 uuid;
begin
  -- Ambil satu user sebagai pembuat/approver (NULL kalau tabel users kosong)
  select id into v_user from public.users order by created_at limit 1;

  -- -------------------------------------------------------------------
  -- 0. Bersihkan data dummy lama (urut sesuai foreign key)
  -- -------------------------------------------------------------------
  delete from public.notifications     where id::text like '66666666%';
  delete from public.sales_invoices     where id::text like '44444444%';
  delete from public.delivery_orders    where id::text like '33333333%';
  delete from public.sales_order_items  where so_id in (select id from public.sales_orders where id::text like '22222222%');
  delete from public.sales_orders       where id::text like '22222222%';
  delete from public.an_sales_forecast  where id::text like '55555555%';
  delete from public.customers          where id::text like '11111111%';

  -- -------------------------------------------------------------------
  -- 1. Produk (Finished Good Mayora) — UPSERT by sku
  -- -------------------------------------------------------------------
  insert into public.products (sku, name, description, category, unit, type, cost_price, selling_price, stock_qty, is_active)
  values
    ('FG-001', 'Kopiko Coffee Candy',  'Permen kopi isi per dus',     'Confectionery', 'dus',    'FINISHED_GOOD', 120000, 180000, 5000, true),
    ('FG-002', 'Kopiko 78C RTD',       'Minuman kopi siap minum',     'Beverage',      'carton', 'FINISHED_GOOD', 160000, 240000, 3200, true),
    ('FG-003', 'Beng-Beng Share It',   'Wafer cokelat karamel',       'Confectionery', 'dus',    'FINISHED_GOOD', 100000, 150000, 1200, true),
    ('FG-004', 'Astor Wafer Roll',     'Wafer stik cokelat',          'Confectionery', 'dus',    'FINISHED_GOOD',  80000, 120000, 8000, true),
    ('FG-005', 'Energen Sereal',       'Minuman sereal bergizi',      'Beverage',      'dus',    'FINISHED_GOOD',  62000,  95000, 6500, true),
    ('FG-006', 'Roma Malkist',         'Biskuit malkist',             'Confectionery', 'dus',    'FINISHED_GOOD',  70000, 110000,  200, true)
  on conflict (sku) do update
    set name = excluded.name, description = excluded.description, category = excluded.category,
        unit = excluded.unit, type = excluded.type, cost_price = excluded.cost_price,
        selling_price = excluded.selling_price, stock_qty = excluded.stock_qty, is_active = true;

  select id into v_fg1 from public.products where sku = 'FG-001';
  select id into v_fg2 from public.products where sku = 'FG-002';
  select id into v_fg3 from public.products where sku = 'FG-003';
  select id into v_fg4 from public.products where sku = 'FG-004';
  select id into v_fg5 from public.products where sku = 'FG-005';
  select id into v_fg6 from public.products where sku = 'FG-006';

  -- -------------------------------------------------------------------
  -- 2. Customers (B2B) — 8 aktif + 1 nonaktif
  -- -------------------------------------------------------------------
  insert into public.customers (id, cust_name, category, address, wilayah, credit_limit, payment_term, is_active, created_by, created_at) values
    ('11111111-1111-1111-1111-000000000001', 'PT Indomarco Prismatama',  'MODERN_TRADE',     'Jl. Ancol Barat I, Jakarta Utara',    'DKI Jakarta',     800000000, 'NET_30', true,  v_user, '2026-01-08 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000002', 'PT Sumber Alfaria Trijaya','MODERN_TRADE',     'Jl. MH Thamrin, Tangerang',           'Banten',          700000000, 'NET_30', true,  v_user, '2026-01-20 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000003', 'PT Hero Supermarket',      'MODERN_TRADE',     'Jl. Gatot Subroto, Jakarta Selatan',  'DKI Jakarta',     500000000, 'NET_14', true,  v_user, '2026-02-11 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000004', 'UD Maju Jaya',             'GENERAL_TRADE',    'Jl. Soekarno Hatta, Bandung',         'Jawa Barat',      400000000, 'NET_14', true,  v_user, '2026-02-25 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000005', 'Toko Berkah Sembako',      'GENERAL_TRADE',    'Jl. Raya Darmo, Surabaya',            'Jawa Timur',      300000000, 'COD',    true,  v_user, '2026-03-14 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000006', 'CV Distribusi Nusantara',  'AGEN_DISTRIBUTOR', 'Jl. Gatot Subroto, Medan',            'Sumatera Utara',  600000000, 'NET_45', true,  v_user, '2026-03-29 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000007', 'PT Lotte Mart Indonesia',  'MODERN_TRADE',     'Jl. Casablanca, Jakarta Selatan',     'DKI Jakarta',     450000000, 'NET_30', true,  v_user, '2026-04-18 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000008', 'UD Sinar Terang',          'GENERAL_TRADE',    'Jl. Ahmad Yani, Bekasi',              'Jawa Barat',      200000000, 'NET_7',  true,  v_user, '2026-05-06 09:00:00+07'),
    ('11111111-1111-1111-1111-000000000009', 'Toko Cahaya Abadi',        'GENERAL_TRADE',    'Jl. Bypass Ngurah Rai, Denpasar',     'Bali',            100000000, 'COD',    false, v_user, '2026-05-22 09:00:00+07');

  -- -------------------------------------------------------------------
  -- 3. Sales Orders (header). grand_total akan dihitung ulang oleh
  --    trigger dari detail item, nilai di sini sudah konsisten.
  -- -------------------------------------------------------------------
  insert into public.sales_orders
    (id, customer_id, so_date, so_type, approval_status, grand_total, created_by, approved_by, approved_at, rejection_reason, cancelled_at, created_at) values
  -- == APPROVED Juni 2026 (menyumbang realisasi periode 2026-06) ==
  ('22222222-2222-2222-2222-000000000001','11111111-1111-1111-1111-000000000001','2026-06-02 10:00:00+07','REGULAR','APPROVED',  438000000, v_user, v_user, '2026-06-02 10:05:00+07', null, null, '2026-06-02 10:00:00+07'),
  ('22222222-2222-2222-2222-000000000002','11111111-1111-1111-1111-000000000003','2026-06-02 11:00:00+07','REGULAR','APPROVED',  108000000, v_user, v_user, '2026-06-02 11:05:00+07', null, null, '2026-06-02 11:00:00+07'),
  ('22222222-2222-2222-2222-000000000003','11111111-1111-1111-1111-000000000007','2026-06-03 09:30:00+07','REGULAR','APPROVED',  126000000, v_user, v_user, '2026-06-03 09:35:00+07', null, null, '2026-06-03 09:30:00+07'),
  ('22222222-2222-2222-2222-000000000004','11111111-1111-1111-1111-000000000004','2026-06-01 14:00:00+07','REGULAR','APPROVED',  258000000, v_user, v_user, '2026-06-01 14:05:00+07', null, null, '2026-06-01 14:00:00+07'),
  ('22222222-2222-2222-2222-000000000005','11111111-1111-1111-1111-000000000008','2026-06-01 15:00:00+07','REGULAR','APPROVED',  135000000, v_user, v_user, '2026-06-01 15:05:00+07', null, null, '2026-06-01 15:00:00+07'),
  ('22222222-2222-2222-2222-000000000006','11111111-1111-1111-1111-000000000002','2026-06-02 13:00:00+07','REGULAR','APPROVED',  316800000, v_user, v_user, '2026-06-02 13:05:00+07', null, null, '2026-06-02 13:00:00+07'),
  ('22222222-2222-2222-2222-000000000007','11111111-1111-1111-1111-000000000005','2026-06-02 16:00:00+07','REGULAR','APPROVED',  150000000, v_user, v_user, '2026-06-02 16:05:00+07', null, null, '2026-06-02 16:00:00+07'),
  ('22222222-2222-2222-2222-000000000008','11111111-1111-1111-1111-000000000006','2026-06-01 10:00:00+07','REGULAR','APPROVED',  152000000, v_user, v_user, '2026-06-01 10:05:00+07', null, null, '2026-06-01 10:00:00+07'),
  -- == WAITING_APPROVAL (antrian approval manager + notif) ==
  ('22222222-2222-2222-2222-000000000009','11111111-1111-1111-1111-000000000003','2026-06-03 08:30:00+07','REGULAR','WAITING_APPROVAL', 552000000, v_user, null, null, null, null, '2026-06-03 08:30:00+07'),
  ('22222222-2222-2222-2222-000000000010','11111111-1111-1111-1111-000000000005','2026-06-03 10:15:00+07','REGULAR','WAITING_APPROVAL', 306000000, v_user, null, null, null, null, '2026-06-03 10:15:00+07'),
  ('22222222-2222-2222-2222-000000000011','11111111-1111-1111-1111-000000000006','2026-06-03 11:20:00+07','PO',     'WAITING_APPROVAL',  55000000, v_user, null, null, null, null, '2026-06-03 11:20:00+07'),
  -- == REJECTED_CREDIT (dengan alasan) ==
  ('22222222-2222-2222-2222-000000000012','11111111-1111-1111-1111-000000000008','2026-06-02 09:00:00+07','REGULAR','REJECTED_CREDIT', 240000000, v_user, v_user, '2026-06-02 09:30:00+07', 'Akumulasi piutang melebihi batas kredit, riwayat pembayaran kurang baik.', null, '2026-06-02 09:00:00+07'),
  ('22222222-2222-2222-2222-000000000013','11111111-1111-1111-1111-000000000004','2026-05-28 14:00:00+07','REGULAR','REJECTED_CREDIT', 360000000, v_user, v_user, '2026-05-28 14:30:00+07', 'Nilai pesanan melebihi limit, perlu jaminan tambahan.', null, '2026-05-28 14:00:00+07'),
  -- == CANCELLED (dengan alasan + cancelled_at) ==
  ('22222222-2222-2222-2222-000000000014','11111111-1111-1111-1111-000000000001','2026-06-01 09:00:00+07','REGULAR','CANCELLED',  75000000, v_user, null, null, 'Customer membatalkan PO.', '2026-06-02 08:00:00+07', '2026-06-01 09:00:00+07'),
  ('22222222-2222-2222-2222-000000000015','11111111-1111-1111-1111-000000000007','2026-05-30 16:00:00+07','REGULAR','CANCELLED',  38000000, v_user, null, null, 'Kesalahan input quantity, dibuat ulang.', '2026-05-30 17:00:00+07', '2026-05-30 16:00:00+07'),
  -- == DRAFT ==
  ('22222222-2222-2222-2222-000000000016','11111111-1111-1111-1111-000000000002','2026-06-03 12:00:00+07','REGULAR','DRAFT',      36000000, v_user, null, null, null, null, '2026-06-03 12:00:00+07'),
  -- == APPROVED bulan-bulan sebelumnya (tren chart + variasi piutang) ==
  ('22222222-2222-2222-2222-000000000017','11111111-1111-1111-1111-000000000001','2026-03-12 10:00:00+07','REGULAR','APPROVED', 216000000, v_user, v_user, '2026-03-12 10:05:00+07', null, null, '2026-03-12 10:00:00+07'),
  ('22222222-2222-2222-2222-000000000018','11111111-1111-1111-1111-000000000002','2026-04-08 10:00:00+07','REGULAR','APPROVED', 240000000, v_user, v_user, '2026-04-08 10:05:00+07', null, null, '2026-04-08 10:00:00+07'),
  ('22222222-2222-2222-2222-000000000019','11111111-1111-1111-1111-000000000004','2026-02-20 10:00:00+07','REGULAR','APPROVED', 180000000, v_user, v_user, '2026-02-20 10:05:00+07', null, null, '2026-02-20 10:00:00+07'),
  ('22222222-2222-2222-2222-000000000020','11111111-1111-1111-1111-000000000005','2026-04-10 10:00:00+07','REGULAR','APPROVED', 135000000, v_user, v_user, '2026-04-10 10:05:00+07', null, null, '2026-04-10 10:00:00+07'),
  ('22222222-2222-2222-2222-000000000021','11111111-1111-1111-1111-000000000008','2026-05-05 10:00:00+07','REGULAR','APPROVED', 240000000, v_user, v_user, '2026-05-05 10:05:00+07', null, null, '2026-05-05 10:00:00+07'),
  ('22222222-2222-2222-2222-000000000022','11111111-1111-1111-1111-000000000006','2026-01-15 10:00:00+07','REGULAR','APPROVED',  76000000, v_user, v_user, '2026-01-15 10:05:00+07', null, null, '2026-01-15 10:00:00+07'),
  ('22222222-2222-2222-2222-000000000023','11111111-1111-1111-1111-000000000007','2026-05-18 10:00:00+07','REGULAR','APPROVED',  90000000, v_user, v_user, '2026-05-18 10:05:00+07', null, null, '2026-05-18 10:00:00+07');

  -- -------------------------------------------------------------------
  -- 4. Sales Order Items (id pakai default uuid). subtotal = generated.
  -- -------------------------------------------------------------------
  insert into public.sales_order_items (so_id, product_id, qty_order, unit_price) values
    ('22222222-2222-2222-2222-000000000001', v_fg1, 1500, 180000),
    ('22222222-2222-2222-2222-000000000001', v_fg2,  700, 240000),
    ('22222222-2222-2222-2222-000000000002', v_fg1,  600, 180000),
    ('22222222-2222-2222-2222-000000000003', v_fg1,  300, 180000),
    ('22222222-2222-2222-2222-000000000003', v_fg2,  300, 240000),
    ('22222222-2222-2222-2222-000000000004', v_fg1,  900, 180000),
    ('22222222-2222-2222-2222-000000000004', v_fg4,  800, 120000),
    ('22222222-2222-2222-2222-000000000005', v_fg1,  750, 180000),
    ('22222222-2222-2222-2222-000000000006', v_fg2, 1320, 240000),
    ('22222222-2222-2222-2222-000000000007', v_fg3, 1000, 150000),
    ('22222222-2222-2222-2222-000000000008', v_fg5, 1600,  95000),
    ('22222222-2222-2222-2222-000000000009', v_fg2, 2300, 240000),
    ('22222222-2222-2222-2222-000000000010', v_fg1, 1700, 180000),
    ('22222222-2222-2222-2222-000000000011', v_fg6,  500, 110000),
    ('22222222-2222-2222-2222-000000000012', v_fg2, 1000, 240000),
    ('22222222-2222-2222-2222-000000000013', v_fg4, 3000, 120000),
    ('22222222-2222-2222-2222-000000000014', v_fg3,  500, 150000),
    ('22222222-2222-2222-2222-000000000015', v_fg5,  400,  95000),
    ('22222222-2222-2222-2222-000000000016', v_fg1,  200, 180000),
    ('22222222-2222-2222-2222-000000000017', v_fg1, 1200, 180000),
    ('22222222-2222-2222-2222-000000000018', v_fg2, 1000, 240000),
    ('22222222-2222-2222-2222-000000000019', v_fg4, 1500, 120000),
    ('22222222-2222-2222-2222-000000000020', v_fg3,  900, 150000),
    ('22222222-2222-2222-2222-000000000021', v_fg2, 1000, 240000),
    ('22222222-2222-2222-2222-000000000022', v_fg5,  800,  95000),
    ('22222222-2222-2222-2222-000000000023', v_fg1,  500, 180000);

  -- -------------------------------------------------------------------
  -- 5. Delivery Orders — semua status (CREATED/SENT/DELIVERED/RETURNED)
  -- -------------------------------------------------------------------
  insert into public.delivery_orders (id, so_id, do_date, delivery_address, status, delivered_at, created_by, created_at) values
    ('33333333-3333-3333-3333-000000000001','22222222-2222-2222-2222-000000000001','2026-06-02 12:00:00+07','Jl. Ancol Barat I, Jakarta Utara',    'DELIVERED', '2026-06-04 14:00:00+07', v_user, '2026-06-02 12:00:00+07'),
    ('33333333-3333-3333-3333-000000000002','22222222-2222-2222-2222-000000000002','2026-06-02 12:30:00+07','Jl. Gatot Subroto, Jakarta Selatan',  'DELIVERED', '2026-06-04 10:00:00+07', v_user, '2026-06-02 12:30:00+07'),
    ('33333333-3333-3333-3333-000000000003','22222222-2222-2222-2222-000000000003','2026-06-03 10:00:00+07','Jl. Casablanca, Jakarta Selatan',     'SENT',      null,                     v_user, '2026-06-03 10:00:00+07'),
    ('33333333-3333-3333-3333-000000000004','22222222-2222-2222-2222-000000000004','2026-06-01 15:00:00+07','Jl. Soekarno Hatta, Bandung',         'CREATED',   null,                     v_user, '2026-06-01 15:00:00+07'),
    ('33333333-3333-3333-3333-000000000005','22222222-2222-2222-2222-000000000005','2026-06-01 16:00:00+07','Jl. Ahmad Yani, Bekasi',              'RETURNED',  null,                     v_user, '2026-06-01 16:00:00+07'),
    ('33333333-3333-3333-3333-000000000006','22222222-2222-2222-2222-000000000006','2026-06-02 14:00:00+07','Jl. MH Thamrin, Tangerang',           'DELIVERED', '2026-06-04 09:00:00+07', v_user, '2026-06-02 14:00:00+07'),
    ('33333333-3333-3333-3333-000000000007','22222222-2222-2222-2222-000000000007','2026-06-02 17:00:00+07','Jl. Raya Darmo, Surabaya',            'DELIVERED', '2026-06-04 11:00:00+07', v_user, '2026-06-02 17:00:00+07'),
    ('33333333-3333-3333-3333-000000000008','22222222-2222-2222-2222-000000000008','2026-06-01 11:00:00+07','Jl. Gatot Subroto, Medan',            'DELIVERED', '2026-06-03 12:00:00+07', v_user, '2026-06-01 11:00:00+07'),
    ('33333333-3333-3333-3333-000000000017','22222222-2222-2222-2222-000000000017','2026-03-12 12:00:00+07','Jl. Ancol Barat I, Jakarta Utara',    'DELIVERED', '2026-03-14 12:00:00+07', v_user, '2026-03-12 12:00:00+07'),
    ('33333333-3333-3333-3333-000000000018','22222222-2222-2222-2222-000000000018','2026-04-08 12:00:00+07','Jl. MH Thamrin, Tangerang',           'DELIVERED', '2026-04-10 12:00:00+07', v_user, '2026-04-08 12:00:00+07'),
    ('33333333-3333-3333-3333-000000000019','22222222-2222-2222-2222-000000000019','2026-02-20 12:00:00+07','Jl. Soekarno Hatta, Bandung',         'DELIVERED', '2026-02-22 12:00:00+07', v_user, '2026-02-20 12:00:00+07'),
    ('33333333-3333-3333-3333-000000000020','22222222-2222-2222-2222-000000000020','2026-04-10 12:00:00+07','Jl. Raya Darmo, Surabaya',            'DELIVERED', '2026-04-12 12:00:00+07', v_user, '2026-04-10 12:00:00+07'),
    ('33333333-3333-3333-3333-000000000021','22222222-2222-2222-2222-000000000021','2026-05-05 12:00:00+07','Jl. Ahmad Yani, Bekasi',              'DELIVERED', '2026-05-07 12:00:00+07', v_user, '2026-05-05 12:00:00+07'),
    ('33333333-3333-3333-3333-000000000022','22222222-2222-2222-2222-000000000022','2026-01-15 12:00:00+07','Jl. Gatot Subroto, Medan',            'DELIVERED', '2026-01-17 12:00:00+07', v_user, '2026-01-15 12:00:00+07'),
    ('33333333-3333-3333-3333-000000000023','22222222-2222-2222-2222-000000000023','2026-05-18 12:00:00+07','Jl. Casablanca, Jakarta Selatan',     'DELIVERED', '2026-05-20 12:00:00+07', v_user, '2026-05-18 12:00:00+07');

  -- -------------------------------------------------------------------
  -- 6. Sales Invoices — status UNPAID / PAID / OVERDUE
  -- -------------------------------------------------------------------
  insert into public.sales_invoices (id, so_id, do_id, customer_id, inv_date, due_date, grand_total, payment_status, payment_term, sent_finance_at, created_by, created_at) values
    ('44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000001','33333333-3333-3333-3333-000000000001','11111111-1111-1111-1111-000000000001','2026-06-05','2026-07-05', 438000000, 'PAID',    'NET_30','2026-06-05 09:00:00+07', v_user, '2026-06-05 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000002','22222222-2222-2222-2222-000000000002','33333333-3333-3333-3333-000000000002','11111111-1111-1111-1111-000000000003','2026-06-05','2026-06-19', 108000000, 'UNPAID',  'NET_14','2026-06-05 09:00:00+07', v_user, '2026-06-05 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000006','22222222-2222-2222-2222-000000000006','33333333-3333-3333-3333-000000000006','11111111-1111-1111-1111-000000000002','2026-06-05','2026-07-05', 316800000, 'PAID',    'NET_30','2026-06-05 09:00:00+07', v_user, '2026-06-05 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000007','22222222-2222-2222-2222-000000000007','33333333-3333-3333-3333-000000000007','11111111-1111-1111-1111-000000000005','2026-06-05','2026-06-05', 150000000, 'UNPAID',  'COD',   '2026-06-05 09:00:00+07', v_user, '2026-06-05 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000008','22222222-2222-2222-2222-000000000008','33333333-3333-3333-3333-000000000008','11111111-1111-1111-1111-000000000006','2026-06-04','2026-07-19', 152000000, 'UNPAID',  'NET_45','2026-06-04 09:00:00+07', v_user, '2026-06-04 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000017','22222222-2222-2222-2222-000000000017','33333333-3333-3333-3333-000000000017','11111111-1111-1111-1111-000000000001','2026-03-15','2026-04-14', 216000000, 'PAID',    'NET_30','2026-03-15 09:00:00+07', v_user, '2026-03-15 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000018','22222222-2222-2222-2222-000000000018','33333333-3333-3333-3333-000000000018','11111111-1111-1111-1111-000000000002','2026-04-10','2026-05-10', 240000000, 'PAID',    'NET_30','2026-04-10 09:00:00+07', v_user, '2026-04-10 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000019','22222222-2222-2222-2222-000000000019','33333333-3333-3333-3333-000000000019','11111111-1111-1111-1111-000000000004','2026-02-22','2026-03-08', 180000000, 'PAID',    'NET_14','2026-02-22 09:00:00+07', v_user, '2026-02-22 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000020','22222222-2222-2222-2222-000000000020','33333333-3333-3333-3333-000000000020','11111111-1111-1111-1111-000000000005','2026-04-12','2026-04-26', 135000000, 'OVERDUE', 'COD',   '2026-04-12 09:00:00+07', v_user, '2026-04-12 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000021','22222222-2222-2222-2222-000000000021','33333333-3333-3333-3333-000000000021','11111111-1111-1111-1111-000000000008','2026-05-07','2026-05-14', 240000000, 'OVERDUE', 'NET_7', '2026-05-07 09:00:00+07', v_user, '2026-05-07 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000022','22222222-2222-2222-2222-000000000022','33333333-3333-3333-3333-000000000022','11111111-1111-1111-1111-000000000006','2026-01-17','2026-03-03',  76000000, 'PAID',    'NET_45','2026-01-17 09:00:00+07', v_user, '2026-01-17 09:00:00+07'),
    ('44444444-4444-4444-4444-000000000023','22222222-2222-2222-2222-000000000023','33333333-3333-3333-3333-000000000023','11111111-1111-1111-1111-000000000007','2026-05-20','2026-06-19',  90000000, 'UNPAID',  'NET_30','2026-05-20 09:00:00+07', v_user, '2026-05-20 09:00:00+07');

  -- -------------------------------------------------------------------
  -- 7. Sales Forecast — target periode 2026-06 (+ contoh 2026-05)
  -- -------------------------------------------------------------------
  insert into public.an_sales_forecast (id, product_id, wilayah, periode, target_qty, created_by, created_at) values
    ('55555555-5555-5555-5555-000000000001', v_fg1, 'DKI Jakarta',    '2026-06', 3000, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000002', v_fg1, 'Jawa Barat',     '2026-06', 1500, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000003', v_fg2, 'DKI Jakarta',    '2026-06', 2000, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000004', v_fg2, 'Banten',         '2026-06', 1200, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000005', v_fg3, 'Jawa Timur',     '2026-06', 1000, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000006', v_fg4, 'Jawa Barat',     '2026-06', 2500, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000007', v_fg5, 'Sumatera Utara', '2026-06', 1800, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000008', v_fg6, 'DKI Jakarta',    '2026-06',  800, v_user, '2026-06-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000009', v_fg1, 'DKI Jakarta',    '2026-05', 2800, v_user, '2026-05-01 08:00:00+07'),
    ('55555555-5555-5555-5555-000000000010', v_fg2, 'Banten',         '2026-05', 1000, v_user, '2026-05-01 08:00:00+07');

  -- -------------------------------------------------------------------
  -- 8. Notifications (recipient_role = SNM). 5 unread untuk badge bell.
  -- -------------------------------------------------------------------
  insert into public.notifications (id, recipient_role, recipient_id, title, message, type, link, is_read, created_at) values
    ('66666666-6666-6666-6666-000000000001','SNM', null, 'Sales Order menunggu approval', 'PT Hero Supermarket - Rp 552.000.000 (nilai >= Rp500jt, perlu persetujuan manager)', 'SO_APPROVAL', '/snm/sales', false, '2026-06-03 08:30:00+07'),
    ('66666666-6666-6666-6666-000000000002','SNM', null, 'Sales Order menunggu approval', 'Toko Berkah Sembako - Rp 306.000.000 (melebihi sisa kredit)', 'SO_APPROVAL', '/snm/sales', false, '2026-06-03 10:15:00+07'),
    ('66666666-6666-6666-6666-000000000003','SNM', null, 'Pre-Order menunggu approval', 'CV Distribusi Nusantara - Roma Malkist (stok tidak mencukupi)', 'SO_APPROVAL', '/snm/sales', false, '2026-06-03 11:20:00+07'),
    ('66666666-6666-6666-6666-000000000004','SNM', null, 'Sales Order disetujui', 'PT Indomarco Prismatama - Rp 438.000.000 telah disetujui.', 'SO_APPROVED', '/snm/sales', true, '2026-06-02 10:05:00+07'),
    ('66666666-6666-6666-6666-000000000005','SNM', null, 'Sales Invoice diterbitkan', 'PT Indomarco Prismatama - Rp 438.000.000 ditransmisikan ke Finance.', 'INVOICE', '/snm/sales', true, '2026-06-05 09:00:00+07'),
    ('66666666-6666-6666-6666-000000000006','SNM', null, 'Barang telah diterima customer', 'Pengiriman ke PT Hero Supermarket berstatus Delivered.', 'DELIVERY', '/snm/sales', true, '2026-06-04 10:00:00+07'),
    ('66666666-6666-6666-6666-000000000007','SNM', null, 'Sales Order ditolak', 'UD Sinar Terang - Rp 240.000.000 ditolak: melebihi batas kredit.', 'SO_REJECTED', '/snm/sales', false, '2026-06-02 09:30:00+07'),
    ('66666666-6666-6666-6666-000000000008','SNM', null, 'Invoice jatuh tempo', 'Invoice UD Sinar Terang - Rp 240.000.000 telah Overdue.', 'INVOICE', '/snm/sales', false, '2026-06-01 07:00:00+07'),
    ('66666666-6666-6666-6666-000000000009','SNM', null, 'Delivery Order diterbitkan', 'UD Maju Jaya - DO baru siap diproses gudang.', 'DELIVERY', '/snm/sales', true, '2026-06-01 14:10:00+07'),
    ('66666666-6666-6666-6666-000000000010','SNM', null, 'Sales Order baru dibuat', 'PT Sumber Alfaria Trijaya - Rp 316.800.000 (auto-approved).', 'INFO', '/snm/sales', true, '2026-06-02 13:05:00+07');

end $$;

-- =====================================================================
-- VERIFIKASI (opsional) — jalankan untuk mengecek hasil seed
-- =====================================================================
-- select 'customers' tbl, count(*) from public.customers where id::text like '11111111%'
-- union all select 'sales_orders', count(*) from public.sales_orders where id::text like '22222222%'
-- union all select 'so_items', count(*) from public.sales_order_items where so_id::text like '22222222%'
-- union all select 'delivery_orders', count(*) from public.delivery_orders where id::text like '33333333%'
-- union all select 'sales_invoices', count(*) from public.sales_invoices where id::text like '44444444%'
-- union all select 'forecast', count(*) from public.an_sales_forecast where id::text like '55555555%'
-- union all select 'notifications', count(*) from public.notifications where id::text like '66666666%';

-- Cek realisasi vs target periode 2026-06:
-- select product_name, wilayah, target_qty, actual_qty, achievement_pct
-- from public.v_forecast_vs_actual where periode = '2026-06' order by product_name, wilayah;

-- Cek sisa kredit customer (UD Sinar Terang harus negatif / over limit):
-- select cust_name, credit_limit, outstanding_receivable, available_credit
-- from public.v_customer_credit order by available_credit;
-- =====================================================================
