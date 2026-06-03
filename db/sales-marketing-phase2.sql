-- =====================================================================
-- MODUL SALES & MARKETING — PHASE 2
-- Sales Forecast (UC-SLS-03), Monitoring Realisasi vs Target (UC-SLS-04),
-- dan Notifikasi (UC-SLS-09).
--
-- Jalankan SETELAH db/sales-marketing-schema.sql.
-- Aman di-run ulang (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABEL: an_sales_forecast  (target penjualan per item/wilayah/periode)
--    UNIQUE(product_id, wilayah, periode) -> mendukung upsert/overwrite.
-- ---------------------------------------------------------------------
create table if not exists public.an_sales_forecast (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references public.products(id),
  wilayah     text not null default '',
  periode     text not null,                         -- format YYYY-MM
  target_qty  numeric not null check (target_qty > 0),
  created_by  uuid references public.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint uq_forecast unique (product_id, wilayah, periode)
);

create index if not exists idx_forecast_periode on public.an_sales_forecast(periode);

drop trigger if exists trg_forecast_updated_at on public.an_sales_forecast;
create trigger trg_forecast_updated_at before update on public.an_sales_forecast
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. TABEL: notifications  (notifikasi dashboard, UC-SLS-09)
--    recipient_role: broadcast ke seluruh user role tsb (mis. 'SNM').
--    recipient_id  : opsional, target user spesifik.
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id             uuid primary key default uuid_generate_v4(),
  recipient_role text,
  recipient_id   uuid references public.users(id),
  title          text not null,
  message        text,
  type           text not null default 'INFO',       -- INFO | SO_APPROVAL | SO_APPROVED | SO_REJECTED | DELIVERY | INVOICE
  link           text,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_notif_role    on public.notifications(recipient_role);
create index if not exists idx_notif_unread   on public.notifications(is_read);
create index if not exists idx_notif_created  on public.notifications(created_at desc);

-- ---------------------------------------------------------------------
-- 3. VIEW: v_sales_realisasi
--    Realisasi qty aktual per item/wilayah/periode dari SO yang APPROVED.
-- ---------------------------------------------------------------------
create or replace view public.v_sales_realisasi as
select
  soi.product_id,
  coalesce(c.wilayah, '')                  as wilayah,
  to_char(so.so_date, 'YYYY-MM')           as periode,
  sum(soi.qty_order)                       as actual_qty,
  sum(soi.subtotal)                        as actual_value
from public.sales_order_items soi
join public.sales_orders so on so.id = soi.so_id
join public.customers c     on c.id = so.customer_id
where so.approval_status = 'APPROVED'
group by soi.product_id, coalesce(c.wilayah, ''), to_char(so.so_date, 'YYYY-MM');

-- ---------------------------------------------------------------------
-- 4. VIEW: v_forecast_vs_actual
--    Gabungan target (forecast) vs realisasi + % pencapaian (UC-SLS-04).
-- ---------------------------------------------------------------------
create or replace view public.v_forecast_vs_actual as
select
  f.id            as forecast_id,
  f.product_id,
  p.sku,
  p.name          as product_name,
  p.unit,
  f.wilayah,
  f.periode,
  f.target_qty,
  coalesce(r.actual_qty, 0)   as actual_qty,
  coalesce(r.actual_value, 0) as actual_value,
  case when f.target_qty > 0
       then round(coalesce(r.actual_qty, 0) / f.target_qty * 100, 2)
       else 0 end             as achievement_pct
from public.an_sales_forecast f
join public.products p on p.id = f.product_id
left join public.v_sales_realisasi r
       on r.product_id = f.product_id
      and r.wilayah    = f.wilayah
      and r.periode    = f.periode;

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.an_sales_forecast enable row level security;
alter table public.notifications     enable row level security;

drop policy if exists p_forecast_auth on public.an_sales_forecast;
create policy p_forecast_auth on public.an_sales_forecast
  for all to authenticated using (true) with check (true);

drop policy if exists p_notif_auth on public.notifications;
create policy p_notif_auth on public.notifications
  for all to authenticated using (true) with check (true);

-- =====================================================================
-- SELESAI PHASE 2
-- =====================================================================
