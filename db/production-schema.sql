-- =====================================================================
-- Production Module Schema
-- Run this in Supabase SQL Editor
-- Tables: products, production_orders, production_bom, production_bom_details,
--         production_work_centers, production_routing, production_mrp,
--         production_goods_issue, production_goods_receipts,
--         production_quality_control, production_order_settlements
-- =====================================================================

CREATE OR REPLACE FUNCTION prod_fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- products table (shared catalog for SNM + Production)
CREATE TABLE IF NOT EXISTS products (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sku         VARCHAR(50) NOT NULL,
    name        VARCHAR(200) NOT NULL,
    unit        VARCHAR(20) NOT NULL DEFAULT 'pcs',
    category    VARCHAR(50),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_products_sku UNIQUE (sku)
);

-- Auto PO Number
CREATE SEQUENCE IF NOT EXISTS prod_po_seq START 1;

CREATE OR REPLACE FUNCTION prod_fn_auto_po_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
        NEW.po_number := 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-'
            || LPAD(nextval('prod_po_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;

-- production_orders
CREATE TABLE IF NOT EXISTS production_orders (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_number   VARCHAR(50) NOT NULL DEFAULT '',
    product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
    planned_qty DECIMAL(15,2) NOT NULL DEFAULT 0,
    actual_qty  DECIMAL(15,2),
    status      VARCHAR(20) NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','mrp_ready','in_progress','on_hold','completed','cancelled')),
    start_date  DATE,
    end_date    DATE,
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prod_orders_po UNIQUE (po_number)
);
DROP TRIGGER IF EXISTS trg_prod_po_number ON production_orders;
CREATE TRIGGER trg_prod_po_number BEFORE INSERT ON production_orders FOR EACH ROW EXECUTE FUNCTION prod_fn_auto_po_number();
DROP TRIGGER IF EXISTS trg_prod_orders_upd ON production_orders;
CREATE TRIGGER trg_prod_orders_upd BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION prod_fn_set_updated_at();

-- production_bom
CREATE TABLE IF NOT EXISTS production_bom (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
    version     VARCHAR(20) NOT NULL DEFAULT '1.0',
    status      VARCHAR(20) NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','active','obsolete')),
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_prod_bom_upd ON production_bom;
CREATE TRIGGER trg_prod_bom_upd BEFORE UPDATE ON production_bom FOR EACH ROW EXECUTE FUNCTION prod_fn_set_updated_at();

-- production_bom_details
CREATE TABLE IF NOT EXISTS production_bom_details (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bom_id      UUID NOT NULL REFERENCES production_bom(id) ON DELETE CASCADE,
    material_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity    DECIMAL(15,2) NOT NULL DEFAULT 0,
    unit        VARCHAR(20) NOT NULL DEFAULT 'kg',
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- production_work_centers
CREATE TABLE IF NOT EXISTS production_work_centers (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code          VARCHAR(20) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    type          VARCHAR(50),
    capacity      DECIMAL(10,2),
    capacity_unit VARCHAR(20) DEFAULT 'unit/hr',
    status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','maintenance')),
    notes         TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prod_wc_code UNIQUE (code)
);
DROP TRIGGER IF EXISTS trg_prod_wc_upd ON production_work_centers;
CREATE TRIGGER trg_prod_wc_upd BEFORE UPDATE ON production_work_centers FOR EACH ROW EXECUTE FUNCTION prod_fn_set_updated_at();

-- production_routing
CREATE TABLE IF NOT EXISTS production_routing (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bom_id          UUID REFERENCES production_bom(id) ON DELETE CASCADE,
    work_center_id  UUID REFERENCES production_work_centers(id) ON DELETE SET NULL,
    sequence        INTEGER NOT NULL DEFAULT 1,
    operation_name  VARCHAR(100) NOT NULL,
    duration_hours  DECIMAL(8,2),
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- production_mrp
CREATE TABLE IF NOT EXISTS production_mrp (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
    planned_qty   DECIMAL(15,2) NOT NULL DEFAULT 0,
    planned_start DATE,
    planned_end   DATE,
    status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','released','closed')),
    notes         TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_prod_mrp_upd ON production_mrp;
CREATE TRIGGER trg_prod_mrp_upd BEFORE UPDATE ON production_mrp FOR EACH ROW EXECUTE FUNCTION prod_fn_set_updated_at();

-- production_goods_issue
CREATE TABLE IF NOT EXISTS production_goods_issue (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    production_order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity            DECIMAL(15,2) NOT NULL DEFAULT 0,
    issue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'issued'
                        CHECK (status IN ('draft','issued','cancelled')),
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- production_goods_receipts
CREATE TABLE IF NOT EXISTS production_goods_receipts (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    production_order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    quantity_received   DECIMAL(15,2) NOT NULL DEFAULT 0,
    receipt_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    batch_number        VARCHAR(50),
    status              VARCHAR(20) NOT NULL DEFAULT 'received'
                        CHECK (status IN ('draft','received','rejected')),
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- production_quality_control
CREATE TABLE IF NOT EXISTS production_quality_control (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    production_order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    inspector           VARCHAR(100),
    inspection_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    result              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (result IN ('pass','fail','pending')),
    defect_qty          DECIMAL(15,2) DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- production_order_settlements
CREATE TABLE IF NOT EXISTS production_order_settlements (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    production_order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    settlement_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    actual_cost         DECIMAL(15,2),
    variance            DECIMAL(15,2),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','settled','cancelled')),
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
