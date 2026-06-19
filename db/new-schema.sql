

-- =====================================================================
-- 0. CUSTOM ENUM TYPES
-- =====================================================================

CREATE TYPE status_akun_enum            AS ENUM ('ACTIVE','INACTIVE','LOCKED');
CREATE TYPE kategori_produk_enum        AS ENUM ('FG','RM','PM','WIP');
CREATE TYPE kategori_customer_enum      AS ENUM ('MODERN_TRADE','GENERAL_TRADE','AGEN_DISTRIBUTOR');
CREATE TYPE payment_term_enum           AS ENUM ('COD','NET_7','NET_14','NET_30','NET_45');
CREATE TYPE kategori_supplier_enum      AS ENUM ('RM','PM');
CREATE TYPE status_supplier_enum        AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE so_type_enum                AS ENUM ('REGULAR','PO');
CREATE TYPE so_approval_status_enum     AS ENUM ('DRAFT','WAITING_APPROVAL','APPROVED','REJECTED_CREDIT','CANCELLED');
CREATE TYPE do_status_enum              AS ENUM ('CREATED','SENT','DELIVERED','RETURNED','VOID');
CREATE TYPE payment_status_enum         AS ENUM ('UNPAID','PAID','OVERDUE');
CREATE TYPE finance_status_enum         AS ENUM ('SUBMITTED','VERIFIED','REJECTED');
CREATE TYPE piutang_status_enum         AS ENUM ('OUTSTANDING','PAID','OVERDUE');
CREATE TYPE quotation_status_enum       AS ENUM ('PROPOSED','SENT','AGREED','REJECTED','CANCELLED');
CREATE TYPE pr_status_enum              AS ENUM ('PENDING','PROCESSED','CLOSED');
CREATE TYPE po_status_enum              AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','RELEASED','REVISION_REQUIRED','COMPLETED');
CREATE TYPE gr_status_enum              AS ENUM ('ACCEPTED','REJECTED','PARTIAL');
CREATE TYPE ap_status_enum              AS ENUM ('DRAFT','PENDING_VERIFICATION','APPROVED','PARTIAL_RECEIPT','PRICE_MISMATCH','OUTSTANDING','PAID','OVERDUE');
CREATE TYPE stock_status_enum           AS ENUM ('AVAILABLE','RESERVED','QUARANTINE');
CREATE TYPE movement_type_enum          AS ENUM ('IN','OUT');
CREATE TYPE movement_ref_type_enum      AS ENUM ('GR','GI','DO','PROD_RECEIPT','ADJ');
CREATE TYPE goods_issue_purpose_enum    AS ENUM ('PRODUCTION','SAMPLING','RETURN');
CREATE TYPE production_request_status_enum AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE qc_status_enum              AS ENUM ('PASS','FAIL','HOLD');
CREATE TYPE permintaan_bayar_status_enum AS ENUM ('PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED');
CREATE TYPE perintah_bayar_status_enum  AS ENUM ('DRAFT','SENT','EXECUTED','CANCELLED');
CREATE TYPE kas_type_enum               AS ENUM ('INFLOW','OUTFLOW');
CREATE TYPE module_source_enum          AS ENUM ('TR','AP','AR','CA');
CREATE TYPE transaksi_status_enum       AS ENUM ('PENDING','VERIFIED');
CREATE TYPE laporan_type_enum           AS ENUM ('NERACA','LABA_RUGI','ARUS_KAS');
CREATE TYPE laporan_status_enum         AS ENUM ('DRAFT','FINALIZED','DISTRIBUTED');
CREATE TYPE valuation_method_enum       AS ENUM ('FIFO','WEIGHTED_AVERAGE');
CREATE TYPE valuation_status_enum       AS ENUM ('DRAFT','SENT','VALIDATED');

-- =====================================================================
-- 1. MASTER TABLES (ms_)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1.1 ms_user
-- Gabungan: ms_users (INV), users (FIN), users (PUR)
-- ---------------------------------------------------------------------
CREATE TABLE ms_user (
    user_id        SERIAL PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(100),
    email          VARCHAR(128),
    role           VARCHAR(50)  NOT NULL,
    status         status_akun_enum NOT NULL DEFAULT 'ACTIVE',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN ms_user.role IS 'Peran lintas modul: Staff Inventory / Admin Sales / Sales Manager / Staf Purchasing / Manager Purchasing / Staf Gudang / Account Receivable / Account Payable / Treasury / Accounting-GL / Cost Accounting / Production / Management';

-- ---------------------------------------------------------------------
-- 1.2 ms_product
-- Gabungan: ms_product (SM), ms_products (INV), ms_product (PROD), ms_products (PUR)
-- stock_qty DIHAPUS (stok dari tr_stock_balance)
-- ---------------------------------------------------------------------
CREATE TABLE ms_product (
    product_id      VARCHAR(20) PRIMARY KEY,
    product_name    VARCHAR(200) NOT NULL,
    category        kategori_produk_enum NOT NULL,
    uom             VARCHAR(20)  NOT NULL,
    minimum_stock   NUMERIC(15,2),
    expiry_flag     SMALLINT DEFAULT 0,
    shelf_life_days INTEGER,
    hpp             BIGINT,
    status          SMALLINT DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN ms_product.product_id IS 'Kode produk, mis. FG-001 / RM-001 / PM-001 (dulu item_id di Sales)';
COMMENT ON COLUMN ms_product.expiry_flag IS '1 = wajib isi expiry_date saat Goods Receipt';
COMMENT ON COLUMN ms_product.hpp IS 'Harga Pokok Produksi / standard cost per satuan';
COMMENT ON COLUMN ms_product.status IS 'Status aktif produk (1=aktif)';

-- ---------------------------------------------------------------------
-- Compatibility view: expose ms_product as `products` for legacy app code
-- This view maps ms_product columns to the shape expected by queries
-- that reference the `products` table (id, sku, name, unit, is_active, etc.).
-- Adjust mappings below if you need different field names or values.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW products AS
SELECT
    product_id                 AS id,
    product_id                 AS sku,
    product_name               AS name,
    NULL::text                 AS description,
    category::text             AS category,
    uom                        AS unit,
    'FINISHED_GOOD'::text      AS type,
    COALESCE(hpp, 0)::bigint   AS cost_price,
    0::bigint                  AS selling_price,
    (status = 1)               AS is_active,
    created_at,
    updated_at
FROM ms_product;

-- ---------------------------------------------------------------------
-- View: vw_stock_summary
-- Aggregated stock per product with computed health/status for UI
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_stock_summary AS
SELECT
    p.product_id,
    p.product_name,
    p.category::text AS category,
    p.uom AS uom,
    p.minimum_stock,
    COALESCE(SUM(sb.quantity) FILTER (WHERE sb.status = 'AVAILABLE'), 0)::numeric(18,4) AS current_stock,
    CASE
        WHEN COALESCE(SUM(sb.quantity) FILTER (WHERE sb.status = 'AVAILABLE'), 0) <= 0 THEN 'Out of Stock'
        WHEN COALESCE(SUM(sb.quantity) FILTER (WHERE sb.status = 'AVAILABLE'), 0) < COALESCE(p.minimum_stock, 0) THEN 'Below Safety Stock'
        WHEN COALESCE(SUM(sb.quantity) FILTER (WHERE sb.status = 'AVAILABLE'), 0) < COALESCE(p.minimum_stock, 0) * 2 THEN 'Low'
        ELSE 'Adequate'
    END AS stock_health
FROM ms_product p
LEFT JOIN tr_stock_balance sb ON sb.product_id = p.product_id
GROUP BY p.product_id, p.product_name, p.category, p.uom, p.minimum_stock;

-- ---------------------------------------------------------------------
-- View: vw_stock_per_warehouse
-- Available qty per product per warehouse (used for critical stock listing)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_stock_per_warehouse AS
SELECT
    p.product_id,
    p.product_name,
    p.category::text AS category,
    sb.warehouse_id,
    COALESCE(SUM(sb.quantity) FILTER (WHERE sb.status = 'AVAILABLE'), 0)::numeric(18,4) AS available_qty,
    p.minimum_stock
FROM ms_product p
LEFT JOIN tr_stock_balance sb ON sb.product_id = p.product_id
GROUP BY p.product_id, p.product_name, p.category, sb.warehouse_id, p.minimum_stock;



-- ---------------------------------------------------------------------
-- 1.3 ms_customer
-- Dari Sales & Marketing (tidak ada duplikat)
-- ---------------------------------------------------------------------
CREATE TABLE ms_customer (
    cust_id       VARCHAR(20) PRIMARY KEY,
    cust_name     VARCHAR(100),
    category      kategori_customer_enum,
    address       TEXT,
    wilayah       VARCHAR(50),
    credit_limit  BIGINT,
    payment_term  payment_term_enum,
    status_aktif  SMALLINT DEFAULT 1,
    created_by    INTEGER REFERENCES ms_user (user_id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN ms_customer.status_aktif IS '1=Aktif, 0=Nonaktif';

-- ---------------------------------------------------------------------
-- 1.4 ms_supplier
-- Gabungan: ms_suppliers (INV) + ms_supplier (PUR)
-- ---------------------------------------------------------------------
CREATE TABLE ms_supplier (
    supplier_id   VARCHAR(20) PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    category      kategori_supplier_enum,
    contact       VARCHAR(100),
    address       TEXT,
    lead_time     INTEGER,
    top           VARCHAR(20),
    status        status_supplier_enum,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN ms_supplier.supplier_id IS 'Kode supplier, mis. SUP-001 / VND-RM-001';
COMMENT ON COLUMN ms_supplier.category IS 'Kategori yang disuplai: Raw Material / Packaging';
COMMENT ON COLUMN ms_supplier.top IS 'Term of Payment, mis. Net 30 / Net 45';

-- ---------------------------------------------------------------------
-- 1.5 ms_supplier_price
-- Normalisasi dari ms_supplier (PUR) yang menaruh product_id & unit_price di master supplier
-- ---------------------------------------------------------------------
CREATE TABLE ms_supplier_price (
    supplier_price_id    BIGSERIAL PRIMARY KEY,
    supplier_id          VARCHAR(20) REFERENCES ms_supplier (supplier_id),
    product_id           VARCHAR(20) REFERENCES ms_product (product_id),
    unit_price_estimate  BIGINT,
    uom                  VARCHAR(20)
);
COMMENT ON COLUMN ms_supplier_price.unit_price_estimate IS 'Harga estimasi per satuan (Rupiah)';

-- ---------------------------------------------------------------------
-- 1.6 ms_warehouse
-- Dari Inventory (ms_warehouses). Tidak ada duplikat
-- ---------------------------------------------------------------------
CREATE TABLE ms_warehouse (
    warehouse_id    VARCHAR(20) PRIMARY KEY,
    warehouse_name  VARCHAR(100) NOT NULL,
    location        TEXT,
    capacity        NUMERIC(15,2),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN ms_warehouse.warehouse_id IS 'Kode gudang, mis. WH-001';

-- ---------------------------------------------------------------------
-- 1.7 ms_bom_header
-- Struktur header+detail (Produksi); menggantikan ms_bom tunggal milik Inventory
-- ---------------------------------------------------------------------
CREATE TABLE ms_bom_header (
    bom_id      VARCHAR(20) PRIMARY KEY,
    product_id  VARCHAR(20) REFERENCES ms_product (product_id),
    version     INTEGER,
    is_active   SMALLINT DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN ms_bom_header.product_id IS 'FG yang dibuat';

-- ---------------------------------------------------------------------
-- 1.8 ms_bom_detail
-- Dari Produksi (ms_bom_detail)
-- ---------------------------------------------------------------------
CREATE TABLE ms_bom_detail (
    bom_detail_id  BIGSERIAL PRIMARY KEY,
    bom_id         VARCHAR(20) REFERENCES ms_bom_header (bom_id),
    component_id   VARCHAR(20) REFERENCES ms_product (product_id),
    qty_required   NUMERIC(10,4) NOT NULL,
    scrap_factor   NUMERIC(5,2)
);
COMMENT ON COLUMN ms_bom_detail.component_id IS 'Material';
COMMENT ON COLUMN ms_bom_detail.qty_required IS 'Kebutuhan material per 1 unit FG';

-- ---------------------------------------------------------------------
-- 1.9 ms_work_center
-- Dari Produksi. Tidak ada duplikat
-- ---------------------------------------------------------------------
CREATE TABLE ms_work_center (
    wc_id             VARCHAR(20) PRIMARY KEY,
    wc_name           VARCHAR(100),
    capacity_per_hour NUMERIC(10,2),
    cost_per_hour     NUMERIC(15,2)
);

-- ---------------------------------------------------------------------
-- 1.10 ms_routing
-- Dari Produksi. Tidak ada duplikat
-- ---------------------------------------------------------------------
CREATE TABLE ms_routing (
    routing_id      VARCHAR(20) PRIMARY KEY,
    product_id      VARCHAR(20) REFERENCES ms_product (product_id),
    wc_id           VARCHAR(20) REFERENCES ms_work_center (wc_id),
    operation_name  VARCHAR(100),
    setup_time      NUMERIC(10,2),
    process_time    NUMERIC(10,2),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 1.11 ms_price_list
-- Dari Sales & Marketing (item_id -> product_id)
-- ---------------------------------------------------------------------
CREATE TABLE ms_price_list (
    price_id      SERIAL PRIMARY KEY,
    product_id    VARCHAR(20) REFERENCES ms_product (product_id),
    unit_price    BIGINT,
    discount_pct  NUMERIC(5,2),
    start_date    DATE,
    end_date      DATE,
    status        SMALLINT DEFAULT 1,
    created_by    INTEGER REFERENCES ms_user (user_id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 2. ANALYTIC TABLES (an_)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 2.1 an_sales_forecast
-- Dari Sales (item_id -> product_id)
-- ---------------------------------------------------------------------
CREATE TABLE an_sales_forecast (
    forecast_id  SERIAL PRIMARY KEY,
    product_id   VARCHAR(20) REFERENCES ms_product (product_id),
    wilayah      VARCHAR(50),
    periode      VARCHAR(10),
    target_qty   NUMERIC(10,2),
    created_by   INTEGER REFERENCES ms_user (user_id),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN an_sales_forecast.periode IS 'Format YYYY-MM';

-- =====================================================================
-- 3. TRANSACTION TABLES (tr_) - SALES & MARKETING
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3.1 tr_so_header
-- Dari Sales. Tidak ada duplikat
-- ---------------------------------------------------------------------
CREATE TABLE tr_so_header (
    so_id            VARCHAR(20) PRIMARY KEY,
    cust_id          VARCHAR(20) REFERENCES ms_customer (cust_id),
    so_date          TIMESTAMP,
    so_type          so_type_enum,
    approval_status  so_approval_status_enum DEFAULT 'DRAFT',
    grand_total      BIGINT,
    created_by       INTEGER REFERENCES ms_user (user_id),
    approved_by      INTEGER REFERENCES ms_user (user_id),
    approved_at      TIMESTAMP,
    rejection_reason TEXT,
    cancelled_at     TIMESTAMP,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_so_header.created_by IS 'Admin Sales';
COMMENT ON COLUMN tr_so_header.approved_by IS 'Sales Manager';

-- ---------------------------------------------------------------------
-- 3.2 tr_so_detail
-- Dari Sales (item_id -> product_id)
-- ---------------------------------------------------------------------
CREATE TABLE tr_so_detail (
    so_detail_id  SERIAL PRIMARY KEY,
    so_id         VARCHAR(20) REFERENCES tr_so_header (so_id),
    product_id    VARCHAR(20) REFERENCES ms_product (product_id),
    qty_order     NUMERIC(10,2),
    unit_price    BIGINT,
    subtotal      BIGINT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_so_detail.subtotal IS 'Subtotal (qty x harga)';

-- ---------------------------------------------------------------------
-- 3.3 tr_delivery_order
-- Gabungan: tr_delivery_order (SM) + tr_delivery_order (INV)
-- ---------------------------------------------------------------------
CREATE TABLE tr_delivery_order (
    do_id             VARCHAR(20) PRIMARY KEY,
    so_id             VARCHAR(20) REFERENCES tr_so_header (so_id),
    warehouse_id      VARCHAR(20) REFERENCES ms_warehouse (warehouse_id),
    do_date           TIMESTAMP,
    delivery_address  TEXT,
    status            do_status_enum DEFAULT 'CREATED',
    delivered_at      TIMESTAMP,
    created_by        INTEGER REFERENCES ms_user (user_id),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_delivery_order.do_id IS 'Format DO-YYYYMM-XXX';
COMMENT ON COLUMN tr_delivery_order.warehouse_id IS 'Gudang asal';

-- ---------------------------------------------------------------------
-- 3.4 tr_sales_invoice
-- Gabungan: tr_sales_invoice (SM) + sales_invoices (FIN)
-- ---------------------------------------------------------------------
CREATE TABLE tr_sales_invoice (
    inv_id           VARCHAR(20) PRIMARY KEY,
    invoice_number   VARCHAR(50) UNIQUE,
    so_id            VARCHAR(20) REFERENCES tr_so_header (so_id),
    do_id            VARCHAR(20) REFERENCES tr_delivery_order (do_id),
    cust_id          VARCHAR(20) REFERENCES ms_customer (cust_id),
    inv_date         DATE,
    due_date         DATE,
    grand_total      BIGINT,
    payment_status   payment_status_enum DEFAULT 'UNPAID',
    payment_term     payment_term_enum,
    finance_status   finance_status_enum DEFAULT 'SUBMITTED',
    sent_finance_at  TIMESTAMP,
    created_by       INTEGER REFERENCES ms_user (user_id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 3.5 piutang
-- Dari Finance. invoice_id -> tr_sales_invoice; customer dinormalisasi ke cust_id
-- ---------------------------------------------------------------------
CREATE TABLE piutang (
    piutang_id        SERIAL PRIMARY KEY,
    inv_id            VARCHAR(20) REFERENCES tr_sales_invoice (inv_id),
    cust_id           VARCHAR(20) REFERENCES ms_customer (cust_id),
    amount            NUMERIC(18,2),
    due_date          DATE,
    status            piutang_status_enum DEFAULT 'OUTSTANDING',
    reminder_sent_at  TIMESTAMP,
    created_date      DATE
);

-- =====================================================================
-- 4. TRANSACTION TABLES (tr_) - PURCHASING
-- =====================================================================

-- ---------------------------------------------------------------------
-- 4.1 tr_price_quotation
-- Dari Purchasing. Tidak ada duplikat
-- ---------------------------------------------------------------------
CREATE TABLE tr_price_quotation (
    quotation_id     VARCHAR(20) PRIMARY KEY,
    supplier_id      VARCHAR(20) REFERENCES ms_supplier (supplier_id),
    product_id       VARCHAR(20) REFERENCES ms_product (product_id),
    negotiated_by    INTEGER REFERENCES ms_user (user_id),
    proposed_price   BIGINT,
    accepted_price   BIGINT,
    final_price      BIGINT,
    qty_requested    NUMERIC(10,2),
    status           quotation_status_enum DEFAULT 'PROPOSED',
    quotation_date   TIMESTAMP,
    expiry_date      DATE,
    notes            TEXT
);
COMMENT ON COLUMN tr_price_quotation.quotation_id IS 'Format QUO-YYYYMM-XXX';
COMMENT ON COLUMN tr_price_quotation.negotiated_by IS 'Staf Purchasing';
COMMENT ON COLUMN tr_price_quotation.accepted_price IS 'Harga respons supplier (nullable)';
COMMENT ON COLUMN tr_price_quotation.final_price IS 'Harga final disepakati (nullable)';

-- ---------------------------------------------------------------------
-- 4.2 tr_purchase_requisition
-- Gabungan: tr_purchase_requisition (INV) + tr_purchase_requisition (PUR)
-- ---------------------------------------------------------------------
CREATE TABLE tr_purchase_requisition (
    pr_id          VARCHAR(20) PRIMARY KEY,
    requested_by   INTEGER REFERENCES ms_user (user_id),
    request_date   TIMESTAMP,
    status         pr_status_enum DEFAULT 'PENDING',
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_purchase_requisition.pr_id IS 'Format PR-YYYYMM-XXX';

-- ---------------------------------------------------------------------
-- 4.3 tr_pr_detail
-- Dari Purchasing (tr_pr_detail); menyerap baris item PR Inventory
-- ---------------------------------------------------------------------
CREATE TABLE tr_pr_detail (
    pr_detail_id  BIGSERIAL PRIMARY KEY,
    pr_id         VARCHAR(20) REFERENCES tr_purchase_requisition (pr_id),
    product_id    VARCHAR(20) REFERENCES ms_product (product_id),
    qty_requested NUMERIC(15,2)
);

-- ---------------------------------------------------------------------
-- 4.4 tr_purchase_order
-- Dari Purchasing. PK po_id = PURCHASE Order (beda dari prod_order_id di Produksi)
-- ---------------------------------------------------------------------
CREATE TABLE tr_purchase_order (
    po_id            VARCHAR(20) PRIMARY KEY,
    pr_id            VARCHAR(20) REFERENCES tr_purchase_requisition (pr_id),
    supplier_id      VARCHAR(20) REFERENCES ms_supplier (supplier_id),
    quotation_id     VARCHAR(20) REFERENCES tr_price_quotation (quotation_id),
    approved_by      INTEGER REFERENCES ms_user (user_id),
    total_value      BIGINT,
    status           po_status_enum DEFAULT 'DRAFT',
    rejection_reason TEXT,
    created_at       TIMESTAMP,
    po_release_date  TIMESTAMP
);
COMMENT ON COLUMN tr_purchase_order.po_id IS 'Format PO-YYYYMM-XXX';
COMMENT ON COLUMN tr_purchase_order.pr_id IS 'nullable';
COMMENT ON COLUMN tr_purchase_order.quotation_id IS 'nullable';
COMMENT ON COLUMN tr_purchase_order.approved_by IS 'Approver, nullable';

-- ---------------------------------------------------------------------
-- 4.5 tr_po_detail
-- Dari Purchasing
-- ---------------------------------------------------------------------
CREATE TABLE tr_po_detail (
    po_detail_id  BIGSERIAL PRIMARY KEY,
    po_id         VARCHAR(20) REFERENCES tr_purchase_order (po_id),
    product_id    VARCHAR(20) REFERENCES ms_product (product_id),
    qty_order     NUMERIC(10,2),
    unit_price    BIGINT,
    subtotal      BIGINT
);
COMMENT ON COLUMN tr_po_detail.subtotal IS 'Subtotal = qty x harga';

-- ---------------------------------------------------------------------
-- 4.6 tr_goods_receipt
-- Gabungan: tr_goods_receipt (INV) + tr_goods_receipt (PUR) - Three-Way Matching
-- ---------------------------------------------------------------------
CREATE TABLE tr_goods_receipt (
    receipt_id    VARCHAR(20) PRIMARY KEY,
    po_id         VARCHAR(20) REFERENCES tr_purchase_order (po_id),
    pr_id         VARCHAR(20) REFERENCES tr_purchase_requisition (pr_id),
    supplier_id   VARCHAR(20) REFERENCES ms_supplier (supplier_id),
    product_id    VARCHAR(20) REFERENCES ms_product (product_id),
    warehouse_id  VARCHAR(20) REFERENCES ms_warehouse (warehouse_id),
    quantity      NUMERIC(15,2) NOT NULL,
    batch_number  VARCHAR(50),
    expiry_date   DATE,
    receipt_date  TIMESTAMP,
    received_by   INTEGER REFERENCES ms_user (user_id),
    status        gr_status_enum DEFAULT 'ACCEPTED',
    reject_qty    NUMERIC(15,2),
    reject_reason TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_goods_receipt.receipt_id IS 'Format GR-YYYYMM-XXX';
COMMENT ON COLUMN tr_goods_receipt.po_id IS 'nullable';
COMMENT ON COLUMN tr_goods_receipt.pr_id IS 'nullable';
COMMENT ON COLUMN tr_goods_receipt.expiry_date IS 'Wajib jika expiry_flag = 1';

-- ---------------------------------------------------------------------
-- 4.7 tr_account_payable
-- Gabungan: tr_account_payable (PUR) + hutang (FIN) + purchase_invoices (FIN)
-- ---------------------------------------------------------------------
CREATE TABLE tr_account_payable (
    ap_id         VARCHAR(20) PRIMARY KEY,
    po_id         VARCHAR(20) REFERENCES tr_purchase_order (po_id),
    supplier_id   VARCHAR(20) REFERENCES ms_supplier (supplier_id),
    inv_supp_no   VARCHAR(50),
    invoice_date  DATE,
    ap_amount     BIGINT,
    ap_status     ap_status_enum DEFAULT 'DRAFT',
    due_date      DATE,
    approved_by   INTEGER REFERENCES ms_user (user_id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_account_payable.ap_id IS 'Format AP-YYYYMM-XXX';
COMMENT ON COLUMN tr_account_payable.inv_supp_no IS 'Nomor invoice resmi supplier';
COMMENT ON COLUMN tr_account_payable.due_date IS 'Jatuh tempo berdasarkan TOP supplier';

-- =====================================================================
-- 5. TRANSACTION TABLES (tr_) - INVENTORY
-- =====================================================================

-- ---------------------------------------------------------------------
-- 5.1 tr_stock_balance
-- Versi Inventory (per gudang per batch); menggantikan versi Purchasing
-- ---------------------------------------------------------------------
CREATE TABLE tr_stock_balance (
    stock_id      BIGSERIAL PRIMARY KEY,
    product_id    VARCHAR(20) REFERENCES ms_product (product_id),
    warehouse_id  VARCHAR(20) REFERENCES ms_warehouse (warehouse_id),
    batch_number  VARCHAR(50),
    quantity      NUMERIC(15,2) NOT NULL,
    expiry_date   DATE,
    status        stock_status_enum DEFAULT 'AVAILABLE',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_stock_balance.batch_number IS 'Untuk tracking FEFO';

-- ---------------------------------------------------------------------
-- 5.2 tr_stock_movement
-- Dari Inventory (tr_stock_movements). Append-only, tidak boleh dihapus
-- ---------------------------------------------------------------------
CREATE TABLE tr_stock_movement (
    movement_id     VARCHAR(20) PRIMARY KEY,
    product_id      VARCHAR(20) REFERENCES ms_product (product_id),
    warehouse_id    VARCHAR(20) REFERENCES ms_warehouse (warehouse_id),
    type            movement_type_enum NOT NULL,
    quantity        NUMERIC(15,2) NOT NULL,
    balance_after   NUMERIC(15,2),
    reference_id    VARCHAR(20),
    reference_type  movement_ref_type_enum,
    movement_date   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_stock_movement.reference_id IS 'ID dokumen pemicu (GR/GI/DO/Prod Receipt)';
COMMENT ON COLUMN tr_stock_movement.reference_type IS 'Tipe dokumen pemicu';

-- ---------------------------------------------------------------------
-- 5.3 tr_production_request
-- Dari Inventory (tr_production_request). PK production_request_id
-- ---------------------------------------------------------------------
CREATE TABLE tr_production_request (
    production_request_id  VARCHAR(20) PRIMARY KEY,
    fg_product_id          VARCHAR(20) REFERENCES ms_product (product_id),
    qty_requested           NUMERIC(15,2),
    request_date           TIMESTAMP,
    requested_by           INTEGER REFERENCES ms_user (user_id),
    status                  production_request_status_enum DEFAULT 'PENDING',
    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_production_request.production_request_id IS 'Format PRD-YYYYMM-XXX';
COMMENT ON COLUMN tr_production_request.fg_product_id IS 'FG diminta';
COMMENT ON COLUMN tr_production_request.requested_by IS 'Staff Inventory';

-- =====================================================================
-- 6. TRANSACTION TABLES (tr_) - PRODUKSI
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6.1 tr_production_order
-- Dari Produksi (tx_production_order). PK direname prod_order_id
-- ---------------------------------------------------------------------
CREATE TABLE tr_production_order (
    prod_order_id           VARCHAR(30) PRIMARY KEY,
    production_request_id  VARCHAR(20) REFERENCES tr_production_request (production_request_id),
    product_id              VARCHAR(20) REFERENCES ms_product (product_id),
    bom_id                  VARCHAR(20) REFERENCES ms_bom_header (bom_id),
    target_qty              NUMERIC(10,2),
    batch_number            VARCHAR(50),
    status                  VARCHAR(30),
    start_date              TIMESTAMP,
    end_date                TIMESTAMP
);
COMMENT ON COLUMN tr_production_order.production_request_id IS 'Sumber permintaan, nullable';
COMMENT ON COLUMN tr_production_order.product_id IS 'Produk diproduksi';
COMMENT ON COLUMN tr_production_order.bom_id IS 'BOM yang dipakai, nullable';

-- ---------------------------------------------------------------------
-- 6.2 tr_goods_issue
-- Gabungan: tr_goods_issue (INV) + tx_goods_issue (PROD)
-- ---------------------------------------------------------------------
CREATE TABLE tr_goods_issue (
    issue_id       VARCHAR(20) PRIMARY KEY,
    prod_order_id  VARCHAR(30) REFERENCES tr_production_order (prod_order_id),
    product_id     VARCHAR(20) REFERENCES ms_product (product_id),
    warehouse_id   VARCHAR(20) REFERENCES ms_warehouse (warehouse_id),
    batch_number   VARCHAR(50),
    quantity       NUMERIC(15,2) NOT NULL,
    purpose        goods_issue_purpose_enum,
    issue_date     TIMESTAMP,
    issued_by      INTEGER REFERENCES ms_user (user_id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN tr_goods_issue.issue_id IS 'Format ISS-YYYYMM-XXX';
COMMENT ON COLUMN tr_goods_issue.prod_order_id IS 'Production Order pemicu, nullable';
COMMENT ON COLUMN tr_goods_issue.product_id IS 'Material';
COMMENT ON COLUMN tr_goods_issue.batch_number IS 'Batch/lot sesuai FEFO';

-- ---------------------------------------------------------------------
-- 6.3 tr_mrp_calculation
-- Dari Produksi (tx_mrp_calculation)
-- ---------------------------------------------------------------------
CREATE TABLE tr_mrp_calculation (
    mrp_id         SERIAL PRIMARY KEY,
    prod_order_id  VARCHAR(30) REFERENCES tr_production_order (prod_order_id),
    component_id   VARCHAR(20) REFERENCES ms_product (product_id),
    required_qty   NUMERIC(10,2),
    available_qty  NUMERIC(10,2),
    is_shortage    SMALLINT DEFAULT 0,
    calc_date      TIMESTAMP
);
COMMENT ON COLUMN tr_mrp_calculation.component_id IS 'Material';
COMMENT ON COLUMN tr_mrp_calculation.is_shortage IS '1 = material kurang';

-- ---------------------------------------------------------------------
-- 6.4 tr_production_confirmation
-- Dari Produksi. operator_id -> INTEGER FK ke ms_user
-- ---------------------------------------------------------------------
CREATE TABLE tr_production_confirmation (
    conf_id            SERIAL PRIMARY KEY,
    prod_order_id      VARCHAR(30) REFERENCES tr_production_order (prod_order_id),
    wc_id              VARCHAR(20) REFERENCES ms_work_center (wc_id),
    qty_good           NUMERIC(10,2),
    qty_scrap          NUMERIC(10,2),
    operator_id        INTEGER REFERENCES ms_user (user_id),
    confirmation_date  TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 6.5 tr_quality_control
-- Dari Produksi
-- ---------------------------------------------------------------------
CREATE TABLE tr_quality_control (
    qc_id            VARCHAR(30) PRIMARY KEY,
    prod_order_id    VARCHAR(30) REFERENCES tr_production_order (prod_order_id),
    batch_number     VARCHAR(50),
    qc_status        qc_status_enum,
    coa_attachment   VARCHAR(255),
    inspected_by     INTEGER REFERENCES ms_user (user_id),
    inspection_date  TIMESTAMP
);
COMMENT ON COLUMN tr_quality_control.coa_attachment IS 'Lampiran Certificate of Analysis';
COMMENT ON COLUMN tr_quality_control.inspected_by IS 'Petugas QC';

-- ---------------------------------------------------------------------
-- 6.6 tr_rework_batch
-- Dari Produksi
-- ---------------------------------------------------------------------
CREATE TABLE tr_rework_batch (
    rework_id      VARCHAR(20) PRIMARY KEY,
    qc_id          VARCHAR(30) REFERENCES tr_quality_control (qc_id),
    prod_order_id  VARCHAR(30) REFERENCES tr_production_order (prod_order_id),
    rework_reason  VARCHAR(255),
    status         VARCHAR(30),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 6.7 tr_scrap_record
-- Dari Produksi
-- ---------------------------------------------------------------------
CREATE TABLE tr_scrap_record (
    scrap_id    VARCHAR(20) PRIMARY KEY,
    qc_id       VARCHAR(30) REFERENCES tr_quality_control (qc_id),
    qty_scrap   NUMERIC(10,2),
    loss_value  NUMERIC(15,2),
    notes       VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 6.8 tr_production_receipt
-- Dari Produksi (tx_goods_receipt). DIRENAME prod_receipt_id
-- ---------------------------------------------------------------------
CREATE TABLE tr_production_receipt (
    prod_receipt_id  VARCHAR(30) PRIMARY KEY,
    prod_order_id    VARCHAR(30) REFERENCES tr_production_order (prod_order_id),
    warehouse_id     VARCHAR(20) REFERENCES ms_warehouse (warehouse_id),
    qty_received     NUMERIC(10,2),
    batch_number     VARCHAR(50),
    receipt_date     TIMESTAMP
);
COMMENT ON COLUMN tr_production_receipt.warehouse_id IS 'Gudang tujuan';
COMMENT ON COLUMN tr_production_receipt.batch_number IS 'Untuk traceability';

-- ---------------------------------------------------------------------
-- 6.9 tr_order_settlement
-- tx_order_settlement (PROD) + menyerap dokumen_biaya_produksi (FIN)
-- ---------------------------------------------------------------------
CREATE TABLE tr_order_settlement (
    settlement_id      VARCHAR(30) PRIMARY KEY,
    prod_order_id      VARCHAR(30) REFERENCES tr_production_order (prod_order_id),
    period             VARCHAR(10),
    material_cost      NUMERIC(18,2),
    labor_cost         NUMERIC(18,2),
    other_cost         NUMERIC(18,2),
    actual_cost        NUMERIC(18,2),
    standard_cost      NUMERIC(18,2),
    variance_cost      NUMERIC(18,2),
    settlement_status  VARCHAR(20),
    settlement_date    TIMESTAMP
);
COMMENT ON COLUMN tr_order_settlement.period IS 'Format YYYY-MM';

-- =====================================================================
-- 7. TRANSACTION TABLES (tr_) - FINANCE
-- =====================================================================

-- ---------------------------------------------------------------------
-- 7.1 harga_pokok_produksi
-- Dari Finance. doc_id -> tr_order_settlement. Ditambah product_id
-- ---------------------------------------------------------------------
CREATE TABLE harga_pokok_produksi (
    hpp_id         SERIAL PRIMARY KEY,
    settlement_id  VARCHAR(30) REFERENCES tr_order_settlement (settlement_id),
    product_id     VARCHAR(20) REFERENCES ms_product (product_id),
    period         VARCHAR(10),
    material_cost  NUMERIC(18,2),
    labor_cost     NUMERIC(18,2),
    overhead_cost  NUMERIC(18,2),
    total_hpp      NUMERIC(18,2),
    calculated_by  INTEGER REFERENCES ms_user (user_id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN harga_pokok_produksi.period IS 'Format YYYY-MM';
COMMENT ON COLUMN harga_pokok_produksi.calculated_by IS 'Cost Accounting';

-- ---------------------------------------------------------------------
-- 7.2 permintaan_pembayaran
-- Dari Finance. hutang_id -> tr_account_payable
-- ---------------------------------------------------------------------
CREATE TABLE permintaan_pembayaran (
    request_id     SERIAL PRIMARY KEY,
    ap_id          VARCHAR(20) REFERENCES tr_account_payable (ap_id),
    amount         NUMERIC(18,2),
    request_date   DATE,
    status         permintaan_bayar_status_enum DEFAULT 'PENDING_APPROVAL',
    requested_by   INTEGER REFERENCES ms_user (user_id),
    rejection_note TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN permintaan_pembayaran.requested_by IS 'Account Payable';

-- ---------------------------------------------------------------------
-- 7.3 perintah_pembayaran
-- Dari Finance
-- ---------------------------------------------------------------------
CREATE TABLE perintah_pembayaran (
    order_id         SERIAL PRIMARY KEY,
    request_id       INTEGER REFERENCES permintaan_pembayaran (request_id),
    amount           NUMERIC(18,2),
    supplier_account VARCHAR(50),
    order_date       DATE,
    status           perintah_bayar_status_enum DEFAULT 'DRAFT',
    confirmed_by     INTEGER REFERENCES ms_user (user_id),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 7.4 catatan_kas
-- Dari Finance
-- ---------------------------------------------------------------------
CREATE TABLE catatan_kas (
    kas_id            SERIAL PRIMARY KEY,
    order_id          INTEGER REFERENCES perintah_pembayaran (order_id),
    transaction_date  DATE,
    type              kas_type_enum,
    amount            NUMERIC(18,2),
    description       TEXT,
    balance           NUMERIC(18,2),
    recorded_by       INTEGER REFERENCES ms_user (user_id),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN catatan_kas.order_id IS 'nullable';
COMMENT ON COLUMN catatan_kas.recorded_by IS 'Treasury';
COMMENT ON COLUMN catatan_kas.balance IS 'Saldo setelah transaksi';

-- ---------------------------------------------------------------------
-- 7.5 transaksi
-- Dari Finance. Hub integrasi pergerakan keuangan TR/AP/AR/CA
-- ---------------------------------------------------------------------
CREATE TABLE transaksi (
    transaction_id    SERIAL PRIMARY KEY,
    kas_id            INTEGER REFERENCES catatan_kas (kas_id),
    transaction_date  DATE,
    module_source     module_source_enum,
    amount            NUMERIC(18,2),
    description       TEXT,
    status            transaksi_status_enum DEFAULT 'PENDING',
    verified_by       INTEGER REFERENCES ms_user (user_id),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN transaksi.kas_id IS 'nullable';
COMMENT ON COLUMN transaksi.verified_by IS 'Accounting/GL';

-- ---------------------------------------------------------------------
-- 7.6 jurnal
-- Dari Finance
-- ---------------------------------------------------------------------
CREATE TABLE jurnal (
    jurnal_id      SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transaksi (transaction_id),
    jurnal_date    DATE,
    account_debet  VARCHAR(20),
    account_kredit VARCHAR(20),
    amount         NUMERIC(18,2),
    description    TEXT,
    created_by     INTEGER REFERENCES ms_user (user_id),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN jurnal.account_debet IS 'Kode akun debet';
COMMENT ON COLUMN jurnal.account_kredit IS 'Kode akun kredit';
COMMENT ON COLUMN jurnal.amount IS 'Jumlah (debet = kredit)';
COMMENT ON COLUMN jurnal.created_by IS 'Accounting/GL';

-- ---------------------------------------------------------------------
-- 7.7 general_ledger
-- Dari Finance
-- ---------------------------------------------------------------------
CREATE TABLE general_ledger (
    gl_id         SERIAL PRIMARY KEY,
    jurnal_id     INTEGER REFERENCES jurnal (jurnal_id),
    account_code  VARCHAR(20),
    account_name  VARCHAR(100),
    debet_total   NUMERIC(18,2),
    kredit_total  NUMERIC(18,2),
    balance       NUMERIC(18,2),
    period        VARCHAR(10),
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN general_ledger.account_code IS 'Kode akun COA';
COMMENT ON COLUMN general_ledger.balance IS 'Saldo = debet - kredit';
COMMENT ON COLUMN general_ledger.period IS 'Format YYYY-MM';

-- ---------------------------------------------------------------------
-- 7.8 laporan_keuangan
-- Dari Finance
-- ---------------------------------------------------------------------
CREATE TABLE laporan_keuangan (
    report_id       SERIAL PRIMARY KEY,
    report_type     laporan_type_enum,
    period          VARCHAR(10),
    generated_date  DATE,
    status          laporan_status_enum DEFAULT 'DRAFT',
    decision_note   TEXT,
    generated_by    INTEGER REFERENCES ms_user (user_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN laporan_keuangan.period IS 'Format YYYY-MM';
COMMENT ON COLUMN laporan_keuangan.generated_by IS 'Accounting/GL';

-- ---------------------------------------------------------------------
-- 7.9 inventory_valuation
-- Dari Finance. Menyerap laporan_penilaian_persediaan
-- ---------------------------------------------------------------------
CREATE TABLE inventory_valuation (
    valuation_id  SERIAL PRIMARY KEY,
    product_id    VARCHAR(20) REFERENCES ms_product (product_id),
    warehouse_id  VARCHAR(20) REFERENCES ms_warehouse (warehouse_id),
    hpp_id        INTEGER REFERENCES harga_pokok_produksi (hpp_id),
    period        VARCHAR(10),
    method        valuation_method_enum,
    quantity      NUMERIC(18,4),
    unit_cost     NUMERIC(18,2),
    total_value   NUMERIC(18,2),
    status        valuation_status_enum DEFAULT 'DRAFT',
    jurnal_id     INTEGER REFERENCES jurnal (jurnal_id),
    created_by    INTEGER REFERENCES ms_user (user_id),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN inventory_valuation.warehouse_id IS 'nullable';
COMMENT ON COLUMN inventory_valuation.hpp_id IS 'nullable';
COMMENT ON COLUMN inventory_valuation.period IS 'Format YYYY-MM';
COMMENT ON COLUMN inventory_valuation.jurnal_id IS 'Posting GL, nullable';
COMMENT ON COLUMN inventory_valuation.created_by IS 'Cost Accounting';

-- =====================================================================
-- 8. SYSTEM / LOG TABLES (sys_)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 8.1 sys_audit_trail
-- Gabungan: sys_audit_trail (PROD) + sys_audit_trail (PUR). INSERT ONLY
-- ---------------------------------------------------------------------
CREATE TABLE sys_audit_trail (
    audit_id        BIGSERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES ms_user (user_id),
    action_type     VARCHAR(50),
    table_affected  VARCHAR(50),
    ip_address      VARCHAR(45),
    "timestamp"     TIMESTAMP
);
COMMENT ON COLUMN sys_audit_trail.user_id IS 'Pelaku, nullable';
COMMENT ON COLUMN sys_audit_trail.action_type IS 'mis. APPROVE_PO';

-- =====================================================================
-- END OF SCRIPT - Total 46 tabel terpadu (versi PostgreSQL)
-- =====================================================================