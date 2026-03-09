-- ============================================================
-- TEMS - Telecom Expense Management System
-- SQL Seed Script (DEPRECATED - PostgreSQL)
--
-- *** DEPRECATED: This file uses the OLD column naming scheme. ***
-- *** Use Knex migrations and seeds instead:                   ***
-- ***   npx knex migrate:latest                                ***
-- ***   npx knex seed:run                                      ***
-- *** See server/migrations/ and server/seeds/ for current     ***
-- *** schema and data with the new {table}_id PK convention.   ***
-- ============================================================

-- ----------------------------------------------------------------
-- Drop tables in reverse dependency order
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS cost_savings;
DROP TABLE IF EXISTS allocations;
DROP TABLE IF EXISTS line_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS circuits;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS accounts;

-- ----------------------------------------------------------------
-- accounts
-- ----------------------------------------------------------------
CREATE TABLE accounts (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  account_number VARCHAR(80),
  vendor_type    VARCHAR(60),
  contact_email  VARCHAR(120),
  contact_phone  VARCHAR(40),
  status         VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at     DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX idx_accounts_status ON accounts (status);

-- ----------------------------------------------------------------
-- contracts
-- ----------------------------------------------------------------
CREATE TABLE contracts (
  id               SERIAL PRIMARY KEY,
  account_id       INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  name             VARCHAR(160) NOT NULL,
  contract_number  VARCHAR(80),
  start_date       DATE,
  end_date         DATE,
  contracted_rate  DECIMAL(12,2),
  rate_unit        VARCHAR(60),
  term_months      INT,
  status           VARCHAR(30) NOT NULL DEFAULT 'Active',
  auto_renew       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_contracts_account ON contracts (account_id);
CREATE INDEX idx_contracts_status  ON contracts (status);

-- ----------------------------------------------------------------
-- orders  (before circuits — circuits reference orders)
-- ----------------------------------------------------------------
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  account_id       INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  contract_id      INT NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
  circuit_id       INT DEFAULT NULL,
  order_number     VARCHAR(80) NOT NULL,
  description      VARCHAR(255),
  contracted_rate  DECIMAL(12,2),
  order_date       DATE,
  due_date         DATE,
  status           VARCHAR(40) NOT NULL DEFAULT 'In Progress',
  notes            TEXT
);
CREATE INDEX idx_orders_account  ON orders (account_id);
CREATE INDEX idx_orders_contract ON orders (contract_id);
CREATE INDEX idx_orders_status   ON orders (status);

-- ----------------------------------------------------------------
-- circuits
-- ----------------------------------------------------------------
CREATE TABLE circuits (
  id               SERIAL PRIMARY KEY,
  account_id       INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  contract_id      INT NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
  order_id         INT DEFAULT NULL REFERENCES orders(id) ON DELETE SET NULL,
  circuit_id       VARCHAR(100) NOT NULL,
  type             VARCHAR(60),
  bandwidth        VARCHAR(40),
  location         VARCHAR(200),
  contracted_rate  DECIMAL(12,2),
  status           VARCHAR(40) NOT NULL DEFAULT 'Pending',
  install_date     DATE,
  disconnect_date  DATE
);
CREATE INDEX idx_circuits_account  ON circuits (account_id);
CREATE INDEX idx_circuits_contract ON circuits (contract_id);
CREATE INDEX idx_circuits_status   ON circuits (status);

-- ----------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------
CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  account_id      INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  invoice_number  VARCHAR(80) NOT NULL,
  invoice_date    DATE,
  due_date        DATE,
  period_start    DATE,
  period_end      DATE,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(40)   NOT NULL DEFAULT 'Open',
  payment_date    DATE
);
CREATE INDEX idx_invoices_account ON invoices (account_id);
CREATE INDEX idx_invoices_status  ON invoices (status);

-- ----------------------------------------------------------------
-- line_items
-- ----------------------------------------------------------------
CREATE TABLE line_items (
  id               SERIAL PRIMARY KEY,
  invoice_id       INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  circuit_id       INT DEFAULT NULL REFERENCES circuits(id) ON DELETE SET NULL,
  description      VARCHAR(255),
  charge_type      VARCHAR(60),
  amount           DECIMAL(12,2) NOT NULL,
  contracted_rate  DECIMAL(12,2),
  variance         DECIMAL(12,2),
  period_start     DATE,
  period_end       DATE
);
CREATE INDEX idx_li_invoice ON line_items (invoice_id);
CREATE INDEX idx_li_circuit ON line_items (circuit_id);

-- ----------------------------------------------------------------
-- allocations
-- ----------------------------------------------------------------
CREATE TABLE allocations (
  id                SERIAL PRIMARY KEY,
  line_item_id      INT NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
  cost_center       VARCHAR(120),
  department        VARCHAR(120),
  percentage        DECIMAL(5,2),
  allocated_amount  DECIMAL(12,2),
  notes             TEXT
);
CREATE INDEX idx_alloc_li ON allocations (line_item_id);

-- ----------------------------------------------------------------
-- cost_savings
-- ----------------------------------------------------------------
CREATE TABLE cost_savings (
  id                 SERIAL PRIMARY KEY,
  account_id         INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  circuit_id         INT DEFAULT NULL REFERENCES circuits(id) ON DELETE SET NULL,
  line_item_id       INT DEFAULT NULL REFERENCES line_items(id) ON DELETE SET NULL,
  invoice_id         INT DEFAULT NULL REFERENCES invoices(id) ON DELETE SET NULL,
  category           VARCHAR(80),
  description        TEXT,
  identified_date    DATE,
  status             VARCHAR(40) NOT NULL DEFAULT 'Identified',
  projected_savings  DECIMAL(12,2),
  realized_savings   DECIMAL(12,2) DEFAULT 0,
  notes              TEXT
);
CREATE INDEX idx_cs_account ON cost_savings (account_id);
CREATE INDEX idx_cs_status  ON cost_savings (status);


-- ================================================================
-- DEMO SEED DATA
-- ================================================================

-- Accounts
INSERT INTO accounts (name, account_number, vendor_type, contact_email, contact_phone, status, created_at) VALUES
  ('AT&T',              'ATT-8872341', 'Telecom', 'billing@att.com',        '800-288-2020', 'Active', '2023-01-15'),
  ('Verizon Business',  'VZB-4491023', 'Telecom', 'vzbilling@verizon.com',  '800-922-0204', 'Active', '2023-02-01'),
  ('Lumen Technologies','LMN-6612099', 'Telecom', 'billing@lumen.com',      '877-453-8353', 'Active', '2023-03-10'),
  ('Comcast Business',  'CMB-3309812', 'ISP',     'business@comcast.com',   '800-391-3000', 'Active', '2023-04-22');

-- Contracts
INSERT INTO contracts (account_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, status, auto_renew) VALUES
  (1, 'AT&T MPLS Master Agreement', 'ATT-MPLS-2023', '2023-01-01', '2026-12-31', 1850.00, 'per circuit/month', 48, 'Active', 1),
  (1, 'AT&T DIA Agreement',         'ATT-DIA-2023',  '2023-06-01', '2026-05-31',  750.00, 'per circuit/month', 36, 'Active', 0),
  (2, 'Verizon Private IP',         'VZ-PIP-2022',   '2022-09-01', '2025-08-31', 2200.00, 'per circuit/month', 36, 'Active', 1),
  (3, 'Lumen Wave Services',        'LMN-WAVE-2024', '2024-01-01', '2027-12-31', 4500.00, 'per circuit/month', 48, 'Active', 0),
  (4, 'Comcast SD-WAN',             'CMB-SDWAN-2023','2023-07-01', '2026-06-30',  620.00, 'per circuit/month', 36, 'Active', 1),
  (2, 'Verizon Wireless Fleet',     'VZ-WL-2024',    '2024-03-01', '2027-02-28',   45.00, 'per line/month',    36, 'Active', 1);

-- Orders (circuit_id left NULL, will update after circuits insert)
INSERT INTO orders (account_id, contract_id, circuit_id, order_number, description, contracted_rate, order_date, due_date, status, notes) VALUES
  (1, 1, NULL, 'ORD-2023-0001', 'MPLS Circuit - Chicago HQ',          1850.00, '2023-01-20', '2023-02-10', 'Completed',    'Standard install, no issues'),
  (1, 1, NULL, 'ORD-2023-0002', 'MPLS Circuit - Dallas Branch',       1850.00, '2023-03-01', '2023-03-15', 'Completed',    ''),
  (2, 3, NULL, 'ORD-2022-0041', 'Verizon Private IP - NY Office',     2200.00, '2022-09-05', '2022-10-01', 'Completed',    'Expedited install requested'),
  (3, 4, NULL, 'ORD-2024-0011', 'Lumen Wavelength - Chicago DC',      4500.00, '2024-01-05', '2024-02-01', 'Completed',    'Data center cross connect included'),
  (4, 5, NULL, 'ORD-2023-0088', 'Comcast SD-WAN - Phoenix Branch',     620.00, '2023-08-01', '2023-08-20', 'Completed',    ''),
  (1, 2, NULL, 'ORD-2026-0012', 'AT&T DIA 1Gbps - Austin Office',      750.00, '2026-01-15', '2026-03-01', 'In Progress',  'Awaiting local loop provisioning');

-- Circuits
INSERT INTO circuits (account_id, contract_id, order_id, circuit_id, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date) VALUES
  (1, 1, 1, 'ATT/MPLS/00112233', 'MPLS',       '100 Mbps', 'Chicago, IL - HQ',          1850.00, 'Active',  '2023-02-10', NULL),
  (1, 1, 2, 'ATT/MPLS/00445566', 'MPLS',       '50 Mbps',  'Dallas, TX - Branch',       1850.00, 'Active',  '2023-03-15', NULL),
  (2, 3, 3, 'VZ/PIP/887722AA',   'Private IP', '200 Mbps', 'New York, NY - Office',     2200.00, 'Active',  '2022-10-01', NULL),
  (3, 4, 4, 'LMN/WAVE/00FFAA12','Wavelength', '1 Gbps',   'Chicago, IL - DataCenter',  4500.00, 'Active',  '2024-02-01', NULL),
  (4, 5, 5, 'CMB/SDWAN/3301XQ', 'SD-WAN',      '500 Mbps', 'Phoenix, AZ - Branch',       620.00, 'Active',  '2023-08-20', NULL),
  (1, 2, 6, 'ATT/DIA/77BB1199', 'DIA',         '1 Gbps',   'Austin, TX - Office',        750.00, 'Pending', NULL,          NULL);

-- Link order circuit_ids back
UPDATE orders SET circuit_id = 1 WHERE id = 1;
UPDATE orders SET circuit_id = 2 WHERE id = 2;
UPDATE orders SET circuit_id = 3 WHERE id = 3;
UPDATE orders SET circuit_id = 4 WHERE id = 4;
UPDATE orders SET circuit_id = 5 WHERE id = 5;
UPDATE orders SET circuit_id = 6 WHERE id = 6;

-- Invoices
INSERT INTO invoices (account_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date) VALUES
  (1, 'ATT-INV-20260101', '2026-01-01', '2026-01-31', '2026-01-01', '2026-01-31', 3890.00, 'Paid',     '2026-01-28'),
  (1, 'ATT-INV-20260201', '2026-02-01', '2026-02-28', '2026-02-01', '2026-02-28', 4120.00, 'Open',      NULL),
  (2, 'VZB-INV-20260115', '2026-01-15', '2026-02-14', '2026-01-01', '2026-01-31', 2265.50, 'Paid',     '2026-02-10'),
  (2, 'VZB-INV-20260215', '2026-02-15', '2026-03-16', '2026-02-01', '2026-02-28', 2310.00, 'Open',      NULL),
  (3, 'LMN-INV-20260201', '2026-02-01', '2026-03-03', '2026-02-01', '2026-02-28', 4500.00, 'Open',      NULL),
  (4, 'CMB-INV-20260201', '2026-02-01', '2026-03-03', '2026-02-01', '2026-02-28',  645.00, 'Disputed',  NULL);

-- Line Items
INSERT INTO line_items (invoice_id, circuit_id, description, charge_type, amount, contracted_rate, variance, period_start, period_end) VALUES
  (1, 1, 'MPLS MRC - Chicago HQ',    'MRC',          1850.00, 1850.00,   0.00, '2026-01-01', '2026-01-31'),
  (1, 2, 'MPLS MRC - Dallas Branch', 'MRC',          1850.00, 1850.00,   0.00, '2026-01-01', '2026-01-31'),
  (1, NULL,'Federal USF Surcharge',  'Tax/Surcharge',  190.00,    NULL,   NULL, '2026-01-01', '2026-01-31'),
  (2, 1, 'MPLS MRC - Chicago HQ',    'MRC',          1850.00, 1850.00,   0.00, '2026-02-01', '2026-02-28'),
  (2, 2, 'MPLS MRC - Dallas Branch', 'MRC',          2080.00, 1850.00, 230.00, '2026-02-01', '2026-02-28'),
  (2, NULL,'Federal USF Surcharge',  'Tax/Surcharge',  190.00,    NULL,   NULL, '2026-02-01', '2026-02-28'),
  (3, 3, 'Verizon Private IP MRC',   'MRC',          2200.00, 2200.00,   0.00, '2026-01-01', '2026-01-31'),
  (3, NULL,'State Taxes',            'Tax/Surcharge',   65.50,    NULL,   NULL, '2026-01-01', '2026-01-31'),
  (4, 3, 'Verizon Private IP MRC',   'MRC',          2245.00, 2200.00,  45.00, '2026-02-01', '2026-02-28'),
  (4, NULL,'State Taxes',            'Tax/Surcharge',   65.00,    NULL,   NULL, '2026-02-01', '2026-02-28'),
  (5, 4, 'Lumen Wavelength MRC',     'MRC',          4500.00, 4500.00,   0.00, '2026-02-01', '2026-02-28'),
  (6, 5, 'Comcast SD-WAN MRC',       'MRC',           645.00,  620.00,  25.00, '2026-02-01', '2026-02-28');

-- Allocations
INSERT INTO allocations (line_item_id, cost_center, department, percentage, allocated_amount, notes) VALUES
  (1,  'CC-100 - IT Infrastructure', 'Information Technology', 100.00, 1850.00, 'Full allocation to IT'),
  (2,  'CC-200 - Operations',        'Operations',              60.00, 1110.00, 'Split with Sales'),
  (2,  'CC-300 - Sales',             'Sales',                   40.00,  740.00, 'Partial - Sales team usage'),
  (4,  'CC-100 - IT Infrastructure', 'Information Technology', 100.00, 1850.00, ''),
  (5,  'CC-200 - Operations',        'Operations',             100.00, 2080.00, 'Overcharge under dispute'),
  (7,  'CC-100 - IT Infrastructure', 'Information Technology',  50.00, 1100.00, ''),
  (7,  'CC-400 - Finance',           'Finance',                 50.00, 1100.00, ''),
  (11, 'CC-100 - IT Infrastructure', 'Information Technology', 100.00, 4500.00, 'Data center connectivity');

-- Cost Savings
INSERT INTO cost_savings (account_id, circuit_id, line_item_id, invoice_id, category, description, identified_date, status, projected_savings, realized_savings, notes) VALUES
  (1, 2, 5,    2, 'Billing Error',        'AT&T Dallas MPLS overbilled $230 vs contracted rate of $1,850/mo', '2026-02-10', 'In Progress', 230.00, 0.00, 'Credit request submitted 2/10/26'),
  (2, 3, 9,    4, 'Billing Error',        'Verizon Private IP billing $45 over contracted rate this cycle',   '2026-02-20', 'Identified',  45.00,  0.00, 'Need to open ticket with Verizon'),
  (4, 5, 12,   6, 'Billing Error',        'Comcast SD-WAN billed $645 vs contracted $620 — $25 overcharge',  '2026-02-15', 'In Progress', 25.00,  0.00, 'Invoice in dispute status'),
  (1, NULL,NULL,NULL,'Contract Optimization','AT&T DIA contract renewal — market rates 15% lower than current term','2026-01-30','Identified',1350.00,0.00,'Contract expires 2026-05-31; begin renegotiation Q1');

SELECT 'TEMS seed completed successfully.' AS result;
