-- =====================================================================
-- MODUL SALES & MARKETING — PT MAYORA ERP
-- Schema migration (scope CORE: Customer, Sales Order, Validasi Kredit,
--                   Approval Manager, Delivery Order, Sales Invoice)
--
-- Dirancang untuk dieksekusi MANUAL di Supabase SQL Editor.
-- Aman di-run ulang (idempotent: IF NOT EXISTS / OR REPLACE).
-- Konvensi: reuse tabel `products` & `users` yang sudah ada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extension (umumnya sudah aktif karena schema lama pakai uuid_generate_v4)
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. Tambah kolom stok ke products (untuk cek ketersediaan saat buat SO)
--    Aman kalau kolom sudah ada.
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists stock_qty numeric not null default 0;

-- ---------------------------------------------------------------------
-- 2. Sequence untuk nomor dokumen human-readable
-- ---------------------------------------------------------------------
create sequence if not exists public.seq_customer_code;
create sequence if not exists public.seq_so_number;
create sequence if not exists public.seq_do_number;
create sequence if not exists public.seq_inv_number;

-- ---------------------------------------------------------------------
-- 3. Reusable trigger: auto-update kolom updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 4. TABEL: customers  (mapping ms_customer)
-- =====================================================================
create table if not exists public.customers (
  id            uuid primary key default uuid_generate_v4(),
  cust_code     text unique not null default ('CUST-' || lpad(nextval('public.seq_customer_code')::text, 4, '0')),
  cust_name     text not null,
  category      text not null default 'GENERAL_TRADE'
                  check (category in ('MODERN_TRADE','GENERAL_TRADE','AGEN_DISTRIBUTOR')),
  address       text,
  wilayah       text,
  credit_limit  numeric not null default 0 check (credit_limit >= 0),
  payment_term  text not null default 'NET_30'
                  check (payment_term in ('COD','NET_7','NET_14','NET_30','NET_45')),
  is_active     boolean not null default true,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 5. TABEL: sales_orders  (mapping tr_so_header)
-- =====================================================================
create table if not exists public.sales_orders (
  id               uuid primary key default uuid_generate_v4(),
  so_number        text unique not null default ('SO-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.seq_so_number')::text, 5, '0')),
  customer_id      uuid not null references public.customers(id),
  so_date          timestamptz not null default now(),
  so_type          text not null default 'REGULAR' check (so_type in ('REGULAR','PO')),
  approval_status  text not null default 'DRAFT'
                     check (approval_status in ('DRAFT','WAITING_APPROVAL','APPROVED','REJECTED_CREDIT','CANCELLED')),
  grand_total      numeric not null default 0,
  created_by       uuid references public.users(id),
  approved_by      uuid references public.users(id),
  approved_at      timestamptz,
  rejection_reason text,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_so_customer on public.sales_orders(customer_id);
create index if not exists idx_so_status   on public.sales_orders(approval_status);

drop trigger if exists trg_so_updated_at on public.sales_orders;
create trigger trg_so_updated_at before update on public.sales_orders
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 6. TABEL: sales_order_items  (mapping tr_so_detail)
--    -> refer ke products.id (reuse master produk yang sudah ada)
-- =====================================================================
create table if not exists public.sales_order_items (
  id          uuid primary key default uuid_generate_v4(),
  so_id       uuid not null references public.sales_orders(id) on delete cascade,
  product_id  uuid not null references public.products(id),
  qty_order   numeric not null check (qty_order > 0),
  unit_price  numeric not null default 0,
  subtotal    numeric generated always as (qty_order * unit_price) stored,
  created_at  timestamptz not null default now()
);

create index if not exists idx_soi_so      on public.sales_order_items(so_id);
create index if not exists idx_soi_product on public.sales_order_items(product_id);

-- ---------------------------------------------------------------------
-- 6b. Trigger: recalculate grand_total header otomatis dari detail item
-- ---------------------------------------------------------------------
create or replace function public.recalc_so_grand_total()
returns trigger language plpgsql as $$
declare
  v_so_id uuid := coalesce(new.so_id, old.so_id);
begin
  update public.sales_orders
    set grand_total = coalesce((
      select sum(subtotal) from public.sales_order_items where so_id = v_so_id
    ), 0)
  where id = v_so_id;
  return null;
end;
$$;

drop trigger if exists trg_recalc_so_total on public.sales_order_items;
create trigger trg_recalc_so_total
  after insert or update or delete on public.sales_order_items
  for each row execute function public.recalc_so_grand_total();

-- =====================================================================
-- 7. TABEL: delivery_orders  (mapping tr_delivery_order)
-- =====================================================================
create table if not exists public.delivery_orders (
  id               uuid primary key default uuid_generate_v4(),
  do_number        text unique not null default ('DO-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.seq_do_number')::text, 5, '0')),
  so_id            uuid not null references public.sales_orders(id),
  do_date          timestamptz not null default now(),
  delivery_address text,
  status           text not null default 'CREATED'
                     check (status in ('CREATED','SENT','DELIVERED','RETURNED')),
  delivered_at     timestamptz,
  created_by       uuid references public.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_do_so on public.delivery_orders(so_id);

drop trigger if exists trg_do_updated_at on public.delivery_orders;
create trigger trg_do_updated_at before update on public.delivery_orders
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 8. TABEL: sales_invoices  (mapping tr_sales_invoice)
-- =====================================================================
create table if not exists public.sales_invoices (
  id               uuid primary key default uuid_generate_v4(),
  inv_number       text unique not null default ('INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.seq_inv_number')::text, 5, '0')),
  so_id            uuid references public.sales_orders(id),
  do_id            uuid references public.delivery_orders(id),
  customer_id      uuid references public.customers(id),
  inv_date         date not null default current_date,
  due_date         date,
  grand_total      numeric not null default 0,
  payment_status   text not null default 'UNPAID'
                     check (payment_status in ('UNPAID','PAID','OVERDUE')),
  payment_term     text check (payment_term in ('COD','NET_7','NET_14','NET_30','NET_45')),
  sent_finance_at  timestamptz,
  created_by       uuid references public.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_inv_customer on public.sales_invoices(customer_id);
create index if not exists idx_inv_status   on public.sales_invoices(payment_status);

drop trigger if exists trg_inv_updated_at on public.sales_invoices;
create trigger trg_inv_updated_at before update on public.sales_invoices
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 9. VIEW: customer + saldo piutang berjalan & sisa credit limit (UC-SLS-02)
--    saldo piutang = SUM grand_total invoice yang belum lunas (UNPAID/OVERDUE)
-- =====================================================================
create or replace view public.v_customer_credit as
select
  c.*,
  coalesce(r.outstanding, 0)                       as outstanding_receivable,
  (c.credit_limit - coalesce(r.outstanding, 0))    as available_credit
from public.customers c
left join (
  select customer_id, sum(grand_total) as outstanding
  from public.sales_invoices
  where payment_status <> 'PAID'
  group by customer_id
) r on r.customer_id = c.id;

-- =====================================================================
-- 10. ROW LEVEL SECURITY
--     App memakai Supabase Auth (browser client membawa session user),
--     jadi cukup izinkan role `authenticated` untuk full akses modul ini.
-- =====================================================================
alter table public.customers          enable row level security;
alter table public.sales_orders       enable row level security;
alter table public.sales_order_items  enable row level security;
alter table public.delivery_orders    enable row level security;
alter table public.sales_invoices     enable row level security;

drop policy if exists p_customers_auth on public.customers;
create policy p_customers_auth on public.customers
  for all to authenticated using (true) with check (true);

drop policy if exists p_so_auth on public.sales_orders;
create policy p_so_auth on public.sales_orders
  for all to authenticated using (true) with check (true);

drop policy if exists p_soi_auth on public.sales_order_items;
create policy p_soi_auth on public.sales_order_items
  for all to authenticated using (true) with check (true);

drop policy if exists p_do_auth on public.delivery_orders;
create policy p_do_auth on public.delivery_orders
  for all to authenticated using (true) with check (true);

drop policy if exists p_inv_auth on public.sales_invoices;
create policy p_inv_auth on public.sales_invoices
  for all to authenticated using (true) with check (true);

-- =====================================================================
-- 11. (OPSIONAL) Seed beberapa customer contoh untuk testing.
--     Hapus blok ini kalau tidak diperlukan.
-- =====================================================================
-- insert into public.customers (cust_name, category, address, wilayah, credit_limit, payment_term)
-- values
--   ('PT Indomarco Prismatama', 'MODERN_TRADE',  'Jakarta', 'DKI Jakarta', 500000000, 'NET_30'),
--   ('PT Sumber Alfaria Trijaya','MODERN_TRADE', 'Tangerang','Banten',      400000000, 'NET_30'),
--   ('UD Maju Jaya',             'GENERAL_TRADE', 'Bandung',  'Jawa Barat',  100000000, 'NET_14');

-- =====================================================================
-- SELESAI
-- =====================================================================
