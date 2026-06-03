
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_product_category') THEN
        CREATE TYPE inv_product_category AS ENUM ('FG', 'RM', 'PM');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_stock_unit') THEN
        CREATE TYPE inv_stock_unit AS ENUM ('kg', 'L', 'pcs', 'roll', 'pack', 'carton', 'bag', 'drum');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_pr_status') THEN
        CREATE TYPE inv_pr_status AS ENUM ('Pending', 'Processed', 'Closed');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_gr_status') THEN
        CREATE TYPE inv_gr_status AS ENUM ('Accepted', 'Rejected', 'Partial');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_production_status') THEN
        CREATE TYPE inv_production_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Cancelled');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_issue_purpose') THEN
        CREATE TYPE inv_issue_purpose AS ENUM ('Production', 'Sampling', 'Return');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_do_status') THEN
        CREATE TYPE inv_do_status AS ENUM ('Pending', 'Shipped', 'Delivered', 'Void');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_stock_status') THEN
        CREATE TYPE inv_stock_status AS ENUM ('Available', 'Reserved', 'Quarantine');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_movement_type') THEN
        CREATE TYPE inv_movement_type AS ENUM ('IN', 'OUT');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inv_reference_type') THEN
        CREATE TYPE inv_reference_type AS ENUM ('GR', 'GI', 'DO', 'ADJ');
    END IF;
END $$;


-- =====================================================================
-- SHARED TRIGGER FUNCTION — updated_at
-- Dibuat hanya jika belum ada; nama prefixed "inv_" agar tidak
-- konflik dengan modul lain yang mungkin punya fungsi serupa.
-- =====================================================================

CREATE OR REPLACE FUNCTION inv_fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- =====================================================================
-- 1. ms_products
-- =====================================================================
CREATE TABLE IF NOT EXISTS ms_products (
    product_id      SERIAL                  PRIMARY KEY,
    product_code    VARCHAR(20)             NOT NULL,
    product_name    VARCHAR(200)            NOT NULL,
    category        inv_product_category    NOT NULL,
    units           inv_stock_unit          NOT NULL,
    minimum_stock   DECIMAL(15, 2)          NOT NULL DEFAULT 0,
    expiry_flag     BOOLEAN                 NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP               NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP               NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_products_code UNIQUE (product_code)
);

COMMENT ON TABLE  ms_products               IS 'Master produk: Finished Goods (FG), Raw Material (RM), Packaging Material (PM)';
COMMENT ON COLUMN ms_products.product_code  IS 'Kode unik produk — e.g. FG-001, RM-001, PM-001';
COMMENT ON COLUMN ms_products.minimum_stock IS 'Safety stock threshold — memicu Purchase Requisition jika stok di bawah nilai ini';
COMMENT ON COLUMN ms_products.expiry_flag   IS 'TRUE = expiry_date wajib diisi saat Goods Receipt';

-- Trigger updated_at (hanya tambah jika belum ada)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_inv_products_updated_at'
    ) THEN
        CREATE TRIGGER trg_inv_products_updated_at
            BEFORE UPDATE ON ms_products
            FOR EACH ROW EXECUTE FUNCTION inv_fn_set_updated_at();
    END IF;
END $$;


-- =====================================================================
-- 2. ms_warehouses
-- =====================================================================
CREATE TABLE IF NOT EXISTS ms_warehouses (
    warehouse_id    SERIAL          PRIMARY KEY,
    warehouse_code  VARCHAR(20)     NOT NULL,
    warehouse_name  VARCHAR(100)    NOT NULL,
    location        TEXT,
    capacity        DECIMAL(15, 2),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_warehouses_code UNIQUE (warehouse_code)
);

COMMENT ON TABLE  ms_warehouses                IS 'Master lokasi gudang PT Mayora Indah Tbk';
COMMENT ON COLUMN ms_warehouses.warehouse_code IS 'Kode unik gudang — e.g. WH-001';
COMMENT ON COLUMN ms_warehouses.capacity       IS 'Kapasitas maksimum penyimpanan gudang';


-- =====================================================================
-- 3. ms_suppliers
-- =====================================================================
CREATE TABLE IF NOT EXISTS ms_suppliers (
    supplier_id     SERIAL          PRIMARY KEY,
    supplier_code   VARCHAR(20)     NOT NULL,
    supplier_name   VARCHAR(200)    NOT NULL,
    contact         VARCHAR(100),
    address         TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_suppliers_code UNIQUE (supplier_code)
);

COMMENT ON TABLE  ms_suppliers               IS 'Master pemasok bahan baku dan packaging material';
COMMENT ON COLUMN ms_suppliers.supplier_code IS 'Kode unik supplier — e.g. SUP-001';
COMMENT ON COLUMN ms_suppliers.contact       IS 'Informasi kontak: nama PIC dan nomor telepon';


-- =====================================================================
-- 4. ms_bom  (Bill of Materials)
-- =====================================================================
CREATE TABLE IF NOT EXISTS ms_bom (
    bom_id          SERIAL          PRIMARY KEY,
    fg_product_id   INT             NOT NULL,
    rm_product_id   INT             NOT NULL,
    qty_required    DECIMAL(10, 4)  NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_bom_fg  FOREIGN KEY (fg_product_id) REFERENCES ms_products (product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bom_rm  FOREIGN KEY (rm_product_id) REFERENCES ms_products (product_id) ON DELETE RESTRICT,
    CONSTRAINT uq_bom     UNIQUE (fg_product_id, rm_product_id)
);

COMMENT ON TABLE  ms_bom               IS 'Bill of Materials: komposisi RM/PM per unit FG';
COMMENT ON COLUMN ms_bom.fg_product_id IS 'Produk jadi (FG) yang akan diproduksi';
COMMENT ON COLUMN ms_bom.rm_product_id IS 'Bahan baku atau packaging material yang dibutuhkan';
COMMENT ON COLUMN ms_bom.qty_required  IS 'Kuantitas RM/PM per 1 unit FG';

CREATE INDEX IF NOT EXISTS idx_bom_fg ON ms_bom (fg_product_id);
CREATE INDEX IF NOT EXISTS idx_bom_rm ON ms_bom (rm_product_id);


-- =====================================================================
-- 5. tr_purchase_requisition
-- =====================================================================
CREATE TABLE IF NOT EXISTS tr_purchase_requisition (
    purchase_request_id SERIAL          PRIMARY KEY,
    pr_code             VARCHAR(20)     NOT NULL,
    product_id          INT             NOT NULL,
    qty_requested       DECIMAL(15, 2)  NOT NULL,
    request_date        TIMESTAMP       NOT NULL DEFAULT NOW(),
    requested_by        VARCHAR(50)     NOT NULL,
    status              inv_pr_status   NOT NULL DEFAULT 'Pending',
    notes               TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_pr_code    UNIQUE (pr_code),
    CONSTRAINT fk_pr_product FOREIGN KEY (product_id) REFERENCES ms_products (product_id) ON DELETE RESTRICT
);

COMMENT ON TABLE  tr_purchase_requisition              IS 'Dokumen Purchase Requisition (PR) — permintaan pengadaan ke Purchasing saat stok di bawah safety stock';
COMMENT ON COLUMN tr_purchase_requisition.pr_code      IS 'Kode PR — format PR-YYYYMM-XXX (e.g. PR-202601-001)';
COMMENT ON COLUMN tr_purchase_requisition.requested_by IS 'user_id Staff Inventory pembuat PR';

CREATE INDEX IF NOT EXISTS idx_pr_product ON tr_purchase_requisition (product_id);
CREATE INDEX IF NOT EXISTS idx_pr_status  ON tr_purchase_requisition (status);
CREATE INDEX IF NOT EXISTS idx_pr_date    ON tr_purchase_requisition (request_date DESC);


-- =====================================================================
-- 6. tr_goods_receipt
-- =====================================================================
CREATE TABLE IF NOT EXISTS tr_goods_receipt (
    receipt_id      SERIAL          PRIMARY KEY,
    gr_code         VARCHAR(20)     NOT NULL,
    pr_id           INT,                                -- nullable: GR tanpa PR diizinkan
    supplier_id     INT             NOT NULL,
    product_id      INT             NOT NULL,
    warehouse_id    INT             NOT NULL,
    quantity        DECIMAL(15, 2)  NOT NULL,
    batch_number    VARCHAR(50)     NOT NULL,
    expiry_date     DATE,
    receipt_date    TIMESTAMP       NOT NULL DEFAULT NOW(),
    received_by     VARCHAR(50)     NOT NULL,
    status          inv_gr_status   NOT NULL DEFAULT 'Accepted',
    reject_qty      DECIMAL(15, 2)  NOT NULL DEFAULT 0,
    reject_reason   TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_gr_code           UNIQUE (gr_code),
    CONSTRAINT fk_gr_pr             FOREIGN KEY (pr_id)        REFERENCES tr_purchase_requisition (purchase_request_id) ON DELETE SET NULL,
    CONSTRAINT fk_gr_supplier       FOREIGN KEY (supplier_id)  REFERENCES ms_suppliers   (supplier_id)  ON DELETE RESTRICT,
    CONSTRAINT fk_gr_product        FOREIGN KEY (product_id)   REFERENCES ms_products    (product_id)   ON DELETE RESTRICT,
    CONSTRAINT fk_gr_warehouse      FOREIGN KEY (warehouse_id) REFERENCES ms_warehouses  (warehouse_id) ON DELETE RESTRICT,
    CONSTRAINT chk_gr_quantity      CHECK (quantity > 0),
    CONSTRAINT chk_gr_reject_qty    CHECK (reject_qty >= 0),
    CONSTRAINT chk_gr_reject_reason CHECK (reject_qty = 0 OR reject_reason IS NOT NULL)
);

COMMENT ON TABLE  tr_goods_receipt             IS 'Penerimaan barang dari supplier — GR ter-accept otomatis update tr_stock_balance';
COMMENT ON COLUMN tr_goods_receipt.gr_code     IS 'Kode GR — format GR-YYYYMM-XXX';
COMMENT ON COLUMN tr_goods_receipt.reject_qty  IS 'Kuantitas barang ditolak (tidak sesuai spesifikasi)';

CREATE INDEX IF NOT EXISTS idx_gr_product   ON tr_goods_receipt (product_id);
CREATE INDEX IF NOT EXISTS idx_gr_supplier  ON tr_goods_receipt (supplier_id);
CREATE INDEX IF NOT EXISTS idx_gr_warehouse ON tr_goods_receipt (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_gr_date      ON tr_goods_receipt (receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_gr_batch     ON tr_goods_receipt (batch_number);


-- =====================================================================
-- 7. tr_production_request
-- =====================================================================
CREATE TABLE IF NOT EXISTS tr_production_request (
    production_request_id SERIAL                  PRIMARY KEY,
    prd_code              VARCHAR(20)             NOT NULL,
    product_id            INT                     NOT NULL,
    qty_requested         DECIMAL(15, 2)          NOT NULL,
    request_date          TIMESTAMP               NOT NULL DEFAULT NOW(),
    requested_by          VARCHAR(50)             NOT NULL,
    status                inv_production_status   NOT NULL DEFAULT 'Pending',
    notes                 TEXT,
    created_at            TIMESTAMP               NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_prd_code    UNIQUE (prd_code),
    CONSTRAINT fk_prd_product FOREIGN KEY (product_id) REFERENCES ms_products (product_id) ON DELETE RESTRICT
);

COMMENT ON TABLE  tr_production_request              IS 'Permintaan produksi ke departemen Production setelah BOM diverifikasi';
COMMENT ON COLUMN tr_production_request.prd_code     IS 'Kode PRD — format PRD-YYYYMM-XXX';
COMMENT ON COLUMN tr_production_request.product_id   IS 'Produk jadi (FG) yang diminta diproduksi';
COMMENT ON COLUMN tr_production_request.requested_by IS 'user_id Staff Inventory pembuat permintaan';

CREATE INDEX IF NOT EXISTS idx_prd_product ON tr_production_request (product_id);
CREATE INDEX IF NOT EXISTS idx_prd_status  ON tr_production_request (status);
CREATE INDEX IF NOT EXISTS idx_prd_date    ON tr_production_request (request_date DESC);


-- =====================================================================
-- 8. tr_goods_issue
-- =====================================================================
CREATE TABLE IF NOT EXISTS tr_goods_issue (
    issue_id        SERIAL              PRIMARY KEY,
    issue_code      VARCHAR(20)         NOT NULL,
    product_id      INT                 NOT NULL,
    warehouse_id    INT                 NOT NULL,
    batch_number    VARCHAR(50)         NOT NULL,
    quantity        DECIMAL(15, 2)      NOT NULL,
    purpose         inv_issue_purpose   NOT NULL,
    ref_id          VARCHAR(20),                        -- references prd_code yang memicu
    issue_date      TIMESTAMP           NOT NULL DEFAULT NOW(),
    issued_by       VARCHAR(50)         NOT NULL,
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_issue_code   UNIQUE (issue_code),
    CONSTRAINT fk_gi_product   FOREIGN KEY (product_id)   REFERENCES ms_products  (product_id)   ON DELETE RESTRICT,
    CONSTRAINT fk_gi_warehouse FOREIGN KEY (warehouse_id) REFERENCES ms_warehouses (warehouse_id) ON DELETE RESTRICT,
    CONSTRAINT chk_gi_quantity CHECK (quantity > 0)
);

COMMENT ON TABLE  tr_goods_issue              IS 'Pengeluaran bahan baku ke produksi — prinsip FEFO (First Expired First Out)';
COMMENT ON COLUMN tr_goods_issue.issue_code   IS 'Kode Issue — format ISS-YYYYMM-XXX';
COMMENT ON COLUMN tr_goods_issue.batch_number IS 'Batch yang dikeluarkan sesuai urutan FEFO';
COMMENT ON COLUMN tr_goods_issue.ref_id       IS 'Referensi prd_code pemicu pengeluaran';

CREATE INDEX IF NOT EXISTS idx_gi_product   ON tr_goods_issue (product_id);
CREATE INDEX IF NOT EXISTS idx_gi_warehouse ON tr_goods_issue (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_gi_batch     ON tr_goods_issue (batch_number);
CREATE INDEX IF NOT EXISTS idx_gi_date      ON tr_goods_issue (issue_date DESC);


-- =====================================================================
-- 9. tr_delivery_order
-- =====================================================================
CREATE TABLE IF NOT EXISTS tr_delivery_order (
    do_id               SERIAL          PRIMARY KEY,
    do_code             VARCHAR(20)     NOT NULL,
    customer_id         VARCHAR(20)     NOT NULL,
    customer_name       VARCHAR(200)    NOT NULL,
    product_id          INT             NOT NULL,
    quantity            DECIMAL(15, 2)  NOT NULL,
    order_date          TIMESTAMP       NOT NULL DEFAULT NOW(),
    shipping_date       TIMESTAMP,
    delivery_address    TEXT,
    status              inv_do_status   NOT NULL DEFAULT 'Pending',
    shipped_by          VARCHAR(50),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_do_code           UNIQUE (do_code),
    CONSTRAINT fk_do_product        FOREIGN KEY (product_id) REFERENCES ms_products (product_id) ON DELETE RESTRICT,
    CONSTRAINT chk_do_quantity      CHECK (quantity > 0),
    CONSTRAINT chk_do_shipping_date CHECK (shipping_date IS NULL OR shipping_date >= order_date)
);

COMMENT ON TABLE  tr_delivery_order            IS 'Pengiriman produk jadi ke pelanggan — konfirmasi otomatis kurangi stock balance';
COMMENT ON COLUMN tr_delivery_order.do_code    IS 'Kode DO — format DO-YYYYMM-XXX';
COMMENT ON COLUMN tr_delivery_order.shipped_by IS 'user_id Staff yang mengkonfirmasi pengiriman';

CREATE INDEX IF NOT EXISTS idx_do_product  ON tr_delivery_order (product_id);
CREATE INDEX IF NOT EXISTS idx_do_customer ON tr_delivery_order (customer_id);
CREATE INDEX IF NOT EXISTS idx_do_status   ON tr_delivery_order (status);
CREATE INDEX IF NOT EXISTS idx_do_date     ON tr_delivery_order (order_date DESC);


-- =====================================================================
-- 10. tr_stock_balance
-- =====================================================================
CREATE TABLE IF NOT EXISTS tr_stock_balance (
    stock_id        SERIAL              PRIMARY KEY,
    product_id      INT                 NOT NULL,
    warehouse_id    INT                 NOT NULL,
    batch_number    VARCHAR(50)         NOT NULL,
    quantity        DECIMAL(15, 2)      NOT NULL DEFAULT 0,
    expiry_date     DATE,
    status          inv_stock_status    NOT NULL DEFAULT 'Available',
    created_at      TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_sb_product   FOREIGN KEY (product_id)   REFERENCES ms_products  (product_id)   ON DELETE RESTRICT,
    CONSTRAINT fk_sb_warehouse FOREIGN KEY (warehouse_id) REFERENCES ms_warehouses (warehouse_id) ON DELETE RESTRICT,
    CONSTRAINT uq_sb_key       UNIQUE (product_id, warehouse_id, batch_number),
    CONSTRAINT chk_sb_quantity CHECK (quantity >= 0)
);

COMMENT ON TABLE  tr_stock_balance              IS 'Saldo stok aktual per produk × gudang × batch — diperbarui otomatis oleh setiap transaksi GR/GI/DO';
COMMENT ON COLUMN tr_stock_balance.batch_number IS 'Nomor batch untuk pelacakan FEFO';
COMMENT ON COLUMN tr_stock_balance.status       IS 'Available | Reserved | Quarantine';

CREATE INDEX IF NOT EXISTS idx_sb_product   ON tr_stock_balance (product_id);
CREATE INDEX IF NOT EXISTS idx_sb_warehouse ON tr_stock_balance (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sb_batch     ON tr_stock_balance (batch_number);
CREATE INDEX IF NOT EXISTS idx_sb_expiry    ON tr_stock_balance (expiry_date ASC NULLS LAST);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inv_stock_balance_updated_at'
    ) THEN
        CREATE TRIGGER trg_inv_stock_balance_updated_at
            BEFORE UPDATE ON tr_stock_balance
            FOR EACH ROW EXECUTE FUNCTION inv_fn_set_updated_at();
    END IF;
END $$;


-- =====================================================================
-- 11. tr_stock_movements  (APPEND ONLY — jangan di-DELETE/UPDATE)
-- =====================================================================
CREATE TABLE IF NOT EXISTS tr_stock_movements (
    movement_id     SERIAL                  PRIMARY KEY,
    product_id      INT                     NOT NULL,
    warehouse_id    INT,
    type            inv_movement_type       NOT NULL,
    quantity        DECIMAL(15, 2)          NOT NULL,
    balance_after   DECIMAL(15, 2),
    reference_id    VARCHAR(20),
    reference_type  inv_reference_type,
    movement_date   TIMESTAMP               NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP               NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_mv_product   FOREIGN KEY (product_id)   REFERENCES ms_products  (product_id)   ON DELETE RESTRICT,
    CONSTRAINT fk_mv_warehouse FOREIGN KEY (warehouse_id) REFERENCES ms_warehouses (warehouse_id) ON DELETE RESTRICT,
    CONSTRAINT chk_mv_quantity CHECK (quantity > 0)
);

COMMENT ON TABLE  tr_stock_movements               IS 'Audit trail pergerakan stok — APPEND ONLY, tidak boleh di-UPDATE/DELETE';
COMMENT ON COLUMN tr_stock_movements.type          IS 'IN = stok masuk (GR / Production), OUT = stok keluar (GI / DO)';
COMMENT ON COLUMN tr_stock_movements.balance_after IS 'Snapshot saldo stok setelah pergerakan';
COMMENT ON COLUMN tr_stock_movements.reference_id  IS 'ID dokumen pemicu: gr_code / issue_code / do_code';

CREATE INDEX IF NOT EXISTS idx_mv_product   ON tr_stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_mv_warehouse ON tr_stock_movements (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_mv_date      ON tr_stock_movements (movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_mv_ref       ON tr_stock_movements (reference_id, reference_type);


-- =====================================================================
-- VIEWS (CREATE OR REPLACE — aman di-run ulang)
-- =====================================================================

-- Ringkasan stok per produk (semua gudang, status Available)
CREATE OR REPLACE VIEW vw_stock_summary AS
SELECT
    p.product_id,
    p.product_code,
    p.product_name,
    p.category,
    p.units,
    p.minimum_stock,
    COALESCE(SUM(CASE WHEN sb.status = 'Available' THEN sb.quantity ELSE 0 END), 0) AS current_stock,
    COALESCE(SUM(sb.quantity), 0)                                                     AS total_stock_all_status,
    CASE
        WHEN COALESCE(SUM(CASE WHEN sb.status = 'Available' THEN sb.quantity ELSE 0 END), 0) = 0
            THEN 'Out of Stock'
        WHEN COALESCE(SUM(CASE WHEN sb.status = 'Available' THEN sb.quantity ELSE 0 END), 0) <= p.minimum_stock
            THEN 'Below Safety Stock'
        WHEN COALESCE(SUM(CASE WHEN sb.status = 'Available' THEN sb.quantity ELSE 0 END), 0) <= (p.minimum_stock * 1.25)
            THEN 'Low'
        ELSE 'Adequate'
    END AS stock_health
FROM ms_products p
LEFT JOIN tr_stock_balance sb ON sb.product_id = p.product_id
GROUP BY p.product_id, p.product_code, p.product_name, p.category, p.units, p.minimum_stock;

COMMENT ON VIEW vw_stock_summary IS 'Ringkasan saldo stok per produk (semua gudang) — digunakan di dashboard Inventory';


-- Stok per produk per gudang (Stock Monitoring per-lokasi)
CREATE OR REPLACE VIEW vw_stock_per_warehouse AS
SELECT
    p.product_id,
    p.product_code,
    p.product_name,
    p.category,
    p.units,
    p.minimum_stock,
    w.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    COALESCE(SUM(CASE WHEN sb.status = 'Available'  THEN sb.quantity ELSE 0 END), 0) AS available_qty,
    COALESCE(SUM(CASE WHEN sb.status = 'Reserved'   THEN sb.quantity ELSE 0 END), 0) AS reserved_qty,
    COALESCE(SUM(CASE WHEN sb.status = 'Quarantine' THEN sb.quantity ELSE 0 END), 0) AS quarantine_qty,
    MIN(sb.expiry_date) AS nearest_expiry
FROM ms_products  p
CROSS JOIN ms_warehouses w
LEFT JOIN tr_stock_balance sb
    ON sb.product_id   = p.product_id
   AND sb.warehouse_id = w.warehouse_id
GROUP BY
    p.product_id, p.product_code, p.product_name, p.category, p.units, p.minimum_stock,
    w.warehouse_id, w.warehouse_code, w.warehouse_name;

COMMENT ON VIEW vw_stock_per_warehouse IS 'Saldo stok per produk per gudang — untuk halaman Stock Monitoring';


-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
