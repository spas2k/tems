-- ============================================================
-- TEMS - Additional Demo Data
-- Run AFTER seed.sql (additive — does not drop tables)
-- mysql -u root -p doctore < seed_extra.sql
-- ============================================================

USE doctore;

-- ================================================================
-- ACCOUNTS  (5 more vendors)
-- ================================================================
INSERT INTO accounts (name, account_number, vendor_type, contact_email, contact_phone, status, created_at) VALUES
  ('Zayo Group',            'ZYO-1092834', 'Fiber/Colocation', 'billing@zayo.com',        '844-492-9624', 'Active',   '2023-08-01'),
  ('Windstream Enterprise', 'WNS-7743001', 'SD-WAN/Carrier',   'enterprise@windstream.com','800-347-1991', 'Active',   '2024-01-10'),
  ('T-Mobile Business',     'TMO-5512887', 'Wireless',         'business@t-mobile.com',   '800-375-1126', 'Active',   '2024-03-15'),
  ('Crown Castle Fiber',    'CCF-3308812', 'Fiber/Small Cell',  'billing@crowncastle.com', '888-632-2122', 'Active',   '2024-06-01'),
  ('Spectrum Enterprise',   'SPE-8819034', 'ISP/Cable',        'enterprise@spectrum.com', '855-299-9463', 'Inactive', '2022-11-20');

-- ================================================================
-- CONTRACTS  (6 new — including 1 expired, 1 expiring-soon)
-- accounts: Zayo=5, Windstream=6, T-Mobile=7, Crown Castle=8, Spectrum=9, AT&T=1, Verizon=2, Lumen=3
-- ================================================================
INSERT INTO contracts (account_id, name, contract_number, start_date, end_date, contracted_rate, rate_unit, term_months, status, auto_renew) VALUES
  (5, 'Zayo Dark Fiber IRU',             'ZYO-FIBER-2023', '2023-08-01', '2027-07-31', 8500.00, 'per route/month', 48, 'Active',   0),   -- id=7
  (6, 'Windstream SD-WAN Backbone',      'WNS-SDWAN-2024', '2024-01-15', '2026-04-14',  980.00, 'per site/month',  27, 'Active',   1),   -- id=8  <<< EXPIRING SOON (April 2026)
  (7, 'T-Mobile Business Wireless',      'TMO-BIZ-2024',   '2024-03-15', '2027-03-14',   55.00, 'per line/month',  36, 'Active',   1),   -- id=9
  (8, 'Crown Castle Small Cell',         'CCF-SCELL-2024', '2024-06-01', '2029-05-31', 3200.00, 'per node/month',  60, 'Active',   0),   -- id=10
  (9, 'Spectrum Business Coax',          'SPE-COAX-2022',  '2022-11-20', '2025-11-19',  445.00, 'per site/month',  36, 'Expired',  0),   -- id=11  <<< EXPIRED
  (1, 'AT&T Managed Security Services',  'ATT-MSS-2023',   '2023-02-01', '2026-01-31', 2400.00, 'per month',       36, 'Active',   1);   -- id=12  <<< just expired 1/31/26

-- ================================================================
-- ORDERS  (9 new — various statuses, tied to new+existing contracts)
-- ================================================================
INSERT INTO orders (account_id, contract_id, circuit_id, order_number, description, contracted_rate, order_date, due_date, status, notes) VALUES
  -- New vendor orders (all Completed so we can link circuits)
  (5, 7,  NULL, 'ORD-2023-0071', 'Zayo Dark Fiber — Denver to Chicago route',   8500.00, '2023-08-05', '2023-09-30', 'Completed',   'Cross-connect included at both ends'),       -- id=7
  (6, 8,  NULL, 'ORD-2024-0031', 'Windstream SD-WAN — Seattle HQ',               980.00, '2024-01-20', '2024-02-28', 'Completed',   'Managed CPE deployed on-site'),              -- id=8
  (6, 8,  NULL, 'ORD-2024-0032', 'Windstream SD-WAN — Denver Branch',            980.00, '2024-02-01', '2024-03-15', 'Completed',   ''),                                          -- id=9
  (7, 9,  NULL, 'ORD-2024-0055', 'T-Mobile Business — Initial Fleet (25 lines)',  55.00, '2024-03-20', '2024-04-01', 'Completed',   'MDM enrolled all devices'),                  -- id=10
  (8, 10, NULL, 'ORD-2024-0099', 'Crown Castle — Small Cell Node NYC-Midtown',  3200.00, '2024-06-10', '2024-09-01', 'Completed',   'City permit required — 90-day lead time'),   -- id=11
  -- In Progress / recent
  (6, 8,  NULL, 'ORD-2026-0021', 'Windstream SD-WAN — Portland New Site',        980.00, '2026-01-10', '2026-03-15', 'In Progress', 'Local loop order placed 1/12/26'),           -- id=12
  (1, 1,  NULL, 'ORD-2026-0013', 'AT&T MPLS Upgrade — Chicago HQ 100→500 Mbps',1850.00, '2026-01-25', '2026-03-10', 'In Progress', 'Bandwidth upgrade, same circuit ID'),        -- id=13
  (3, 4,  NULL, 'ORD-2026-0014', 'Lumen Wave — Los Angeles Data Center',        4500.00, '2026-02-01', '2026-04-15', 'In Progress', 'New colocation cross-connect required'),     -- id=14
  -- Cancelled
  (2, 3,  NULL, 'ORD-2025-0088', 'Verizon Private IP — Miami Office (cancelled)',2200.00, '2025-11-01', '2026-01-15', 'Cancelled',   'Office lease not renewed; order cancelled'); -- id=15

-- ================================================================
-- CIRCUITS  (9 new — linked to new accounts/contracts/orders)
-- ================================================================
INSERT INTO circuits (account_id, contract_id, order_id, circuit_id, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date) VALUES
  (5, 7,  7,  'ZYO/FIBER/DEN-CHI-001', 'Dark Fiber',  '10 Gbps',  'Denver, CO → Chicago, IL',        8500.00, 'Active',       '2023-09-30', NULL),       -- id=7
  (6, 8,  8,  'WNS/SDWAN/SEA-001',     'SD-WAN',      '500 Mbps', 'Seattle, WA — HQ',                 980.00, 'Active',       '2024-02-28', NULL),       -- id=8
  (6, 8,  9,  'WNS/SDWAN/DEN-001',     'SD-WAN',      '200 Mbps', 'Denver, CO — Branch',              980.00, 'Active',       '2024-03-15', NULL),       -- id=9
  (7, 9,  10, 'TMO/WRLSS/FLEET-A01',   'Wireless',    '4G/5G',    'Mobile Fleet — Group A (10 lines)', 55.00, 'Active',       '2024-04-01', NULL),       -- id=10
  (7, 9,  10, 'TMO/WRLSS/FLEET-A02',   'Wireless',    '4G/5G',    'Mobile Fleet — Group B (10 lines)', 55.00, 'Active',       '2024-04-01', NULL),       -- id=11
  (7, 9,  10, 'TMO/WRLSS/FLEET-A03',   'Wireless',    '4G/5G',    'Mobile Fleet — Group C (5 lines)',  55.00, 'Active',       '2024-04-01', NULL),       -- id=12
  (8, 10, 11, 'CCF/SCELL/NYC-MDT-001', 'Small Cell',  'N/A',      'New York, NY — Midtown Node',     3200.00, 'Active',       '2024-09-01', NULL),       -- id=13
  (9, 11, NULL,'SPE/COAX/LA-0071',     'Coax/Cable',  '300 Mbps', 'Los Angeles, CA — West Office',    445.00, 'Disconnected', '2022-12-15', '2025-11-19'), -- id=14  (Spectrum expired)
  (3, 4,  14, 'LMN/WAVE/LAX-DC-001',   'Wavelength',  '10 Gbps',  'Los Angeles, CA — DataCenter',    4500.00, 'Pending',      NULL,          NULL);       -- id=15

-- Link completed order circuit_ids
UPDATE orders SET circuit_id = 7  WHERE id = 7;
UPDATE orders SET circuit_id = 8  WHERE id = 8;
UPDATE orders SET circuit_id = 9  WHERE id = 9;
UPDATE orders SET circuit_id = 10 WHERE id = 10;
UPDATE orders SET circuit_id = 11 WHERE id = 11;
-- orders 12, 13, 14, 15 stay NULL (in progress / cancelled)

-- ================================================================
-- INVOICES  (9 new — historical + current for new vendors + extra AT&T)
-- ================================================================
INSERT INTO invoices (account_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, payment_date) VALUES
  -- Zayo
  (5, 'ZYO-INV-20260101', '2026-01-01', '2026-01-31', '2026-01-01', '2026-01-31', 8500.00, 'Paid',      '2026-01-28'),  -- id=7
  (5, 'ZYO-INV-20260201', '2026-02-01', '2026-02-28', '2026-02-01', '2026-02-28', 8500.00, 'Open',      NULL),          -- id=8
  -- Windstream
  (6, 'WNS-INV-20260101', '2026-01-01', '2026-01-31', '2026-01-01', '2026-01-31', 2040.00, 'Paid',      '2026-01-29'),  -- id=9
  (6, 'WNS-INV-20260201', '2026-02-01', '2026-02-28', '2026-02-01', '2026-02-28', 2105.00, 'Disputed',  NULL),          -- id=10
  -- T-Mobile
  (7, 'TMO-INV-20260201', '2026-02-05', '2026-03-07', '2026-02-01', '2026-02-28', 1375.00, 'Open',      NULL),          -- id=11
  -- Crown Castle
  (8, 'CCF-INV-20260201', '2026-02-01', '2026-03-03', '2026-02-01', '2026-02-28', 3200.00, 'Paid',      '2026-02-25'),  -- id=12
  -- Spectrum (legacy — already expired contract)
  (9, 'SPE-INV-20251101', '2025-11-01', '2025-11-30', '2025-11-01', '2025-11-30',  445.00, 'Paid',      '2025-11-28'),  -- id=13
  -- AT&T Dec 2025 historical
  (1, 'ATT-INV-20251201', '2025-12-01', '2025-12-31', '2025-12-01', '2025-12-31', 3890.00, 'Paid',      '2025-12-29'),  -- id=14
  -- Verizon Dec 2025 historical
  (2, 'VZB-INV-20251215', '2025-12-15', '2026-01-14', '2025-12-01', '2025-12-31', 2265.50, 'Paid',      '2026-01-12');  -- id=15

-- ================================================================
-- LINE ITEMS  (covering the new invoices — ids 7-15)
-- ================================================================
INSERT INTO line_items (invoice_id, circuit_id, description, charge_type, amount, contracted_rate, variance, period_start, period_end) VALUES
  -- Invoice 7: Zayo January (Paid)
  (7,  7,    'Zayo Dark Fiber MRC — Denver-Chicago',     'MRC',          8500.00, 8500.00,    0.00, '2026-01-01', '2026-01-31'),  -- li=13
  -- Invoice 8: Zayo February (Open)
  (8,  7,    'Zayo Dark Fiber MRC — Denver-Chicago',     'MRC',          8500.00, 8500.00,    0.00, '2026-02-01', '2026-02-28'),  -- li=14
  -- Invoice 9: Windstream January (Paid)
  (9,  8,    'Windstream SD-WAN MRC — Seattle HQ',       'MRC',           980.00,  980.00,    0.00, '2026-01-01', '2026-01-31'),  -- li=15
  (9,  9,    'Windstream SD-WAN MRC — Denver Branch',    'MRC',           980.00,  980.00,    0.00, '2026-01-01', '2026-01-31'),  -- li=16
  (9,  NULL, 'Taxes & Regulatory Fees',                  'Tax/Surcharge',  80.00,    NULL,    NULL, '2026-01-01', '2026-01-31'),  -- li=17
  -- Invoice 10: Windstream February (Disputed)
  (10, 8,    'Windstream SD-WAN MRC — Seattle HQ',       'MRC',          1050.00,  980.00,   70.00, '2026-02-01', '2026-02-28'), -- li=18  OVERBILLED
  (10, 9,    'Windstream SD-WAN MRC — Denver Branch',    'MRC',           975.00,  980.00,   -5.00, '2026-02-01', '2026-02-28'), -- li=19  credit
  (10, NULL, 'Taxes & Regulatory Fees',                  'Tax/Surcharge',  80.00,    NULL,    NULL, '2026-02-01', '2026-02-28'),  -- li=20
  -- Invoice 11: T-Mobile February (Open)
  (11, 10,   'T-Mobile Wireless — Fleet Group A (10 ln)','MRC',           550.00,  550.00,    0.00, '2026-02-01', '2026-02-28'), -- li=21
  (11, 11,   'T-Mobile Wireless — Fleet Group B (10 ln)','MRC',           550.00,  550.00,    0.00, '2026-02-01', '2026-02-28'), -- li=22
  (11, 12,   'T-Mobile Wireless — Fleet Group C (5 ln)', 'MRC',           275.00,  275.00,    0.00, '2026-02-01', '2026-02-28'), -- li=23
  -- Invoice 12: Crown Castle February (Paid)
  (12, 13,   'Crown Castle Small Cell Node — NYC Midtown','MRC',          3200.00, 3200.00,    0.00, '2026-02-01', '2026-02-28'), -- li=24
  -- Invoice 13: Spectrum November 2025 (Paid)
  (13, 14,   'Spectrum Business Coax — LA West Office',  'MRC',           445.00,  445.00,    0.00, '2025-11-01', '2025-11-30'), -- li=25
  -- Invoice 14: AT&T December 2025 historical
  (14, 1,    'AT&T MPLS MRC — Chicago HQ',               'MRC',          1850.00, 1850.00,    0.00, '2025-12-01', '2025-12-31'), -- li=26
  (14, 2,    'AT&T MPLS MRC — Dallas Branch',            'MRC',          1850.00, 1850.00,    0.00, '2025-12-01', '2025-12-31'), -- li=27
  (14, NULL, 'Federal USF Surcharge',                    'Tax/Surcharge',  190.00,    NULL,    NULL, '2025-12-01', '2025-12-31'), -- li=28
  -- Invoice 15: Verizon December 2025 historical
  (15, 3,    'Verizon Private IP MRC — NY Office',       'MRC',          2200.00, 2200.00,    0.00, '2025-12-01', '2025-12-31'), -- li=29
  (15, NULL, 'State Taxes',                              'Tax/Surcharge',   65.50,    NULL,    NULL, '2025-12-01', '2025-12-31'); -- li=30

-- ================================================================
-- ALLOCATIONS
-- ================================================================
INSERT INTO allocations (line_item_id, cost_center, department, percentage, allocated_amount, notes) VALUES
  -- Zayo Dark Fiber — split IT/Operations
  (13, 'CC-100 - IT Infrastructure', 'Information Technology', 70.00, 5950.00, 'Primary network backbone'),
  (13, 'CC-200 - Operations',        'Operations',              30.00, 2550.00, 'Operations shared usage'),
  (14, 'CC-100 - IT Infrastructure', 'Information Technology', 70.00, 5950.00, ''),
  (14, 'CC-200 - Operations',        'Operations',              30.00, 2550.00, ''),
  -- Windstream SD-WAN Seattle — IT only
  (15, 'CC-100 - IT Infrastructure', 'Information Technology', 100.00,  980.00, 'Seattle HQ — all IT'),
  -- Windstream SD-WAN Denver — split Ops/Sales
  (16, 'CC-200 - Operations', 'Operations', 50.00, 490.00, ''),
  (16, 'CC-300 - Sales',      'Sales',       50.00, 490.00, 'Denver sales team'),
  -- T-Mobile Wireless — split by group
  (21, 'CC-500 - Field Services', 'Field Operations', 100.00, 550.00, 'Fleet Group A — field techs'),
  (22, 'CC-500 - Field Services', 'Field Operations', 100.00, 550.00, 'Fleet Group B — field techs'),
  (23, 'CC-300 - Sales',          'Sales',             100.00, 275.00, 'Fleet Group C — sales reps'),
  -- Crown Castle Small Cell
  (24, 'CC-100 - IT Infrastructure', 'Information Technology', 100.00, 3200.00, 'Network densification project'),
  -- AT&T Dec 2025 historical
  (26, 'CC-100 - IT Infrastructure', 'Information Technology', 100.00, 1850.00, ''),
  (27, 'CC-200 - Operations',        'Operations',              60.00, 1110.00, ''),
  (27, 'CC-300 - Sales',             'Sales',                   40.00,  740.00, '');

-- ================================================================
-- COST SAVINGS
-- ================================================================
INSERT INTO cost_savings (account_id, circuit_id, line_item_id, invoice_id, category, description, identified_date, status, projected_savings, realized_savings, notes) VALUES
  -- Windstream overbilling Feb
  (6, 8,  18, 10, 'Billing Error',         'Windstream billed $1,050 for Seattle SD-WAN vs contracted $980 — $70 overcharge', '2026-02-18', 'In Progress', 70.00, 0.00, 'Dispute ticket WNS-2026-0234 opened; awaiting credit memo'),
  -- Windstream contract renewal (expiring April 2026)
  (6, NULL, NULL, NULL, 'Contract Optimization', 'Windstream SD-WAN contract WNS-SDWAN-2024 expires April 2026 — benchmark shows 18% savings available with renegotiation', '2026-02-15', 'Identified', 3528.00, 0.00, '2-site contract at $980/site; market rate ~$800/site; 27-mo savings = $3,528'),
  -- Spectrum expired — disconnection savings realized
  (9, 14, NULL, NULL, 'Service Termination',  'Spectrum Coax LA — contract expired 11/19/2025, circuit disconnected. Traffic migrated to new Zayo route.', '2025-11-20', 'Realized', 445.00, 445.00, 'Full MRC realized monthly; no replacement cost'),
  -- Zayo route — bandwidth right-sizing opportunity
  (5, 7,  NULL, NULL, 'Right-Sizing',          'Zayo Dark Fiber currently provisioned at 10 Gbps but peak utilization under 2 Gbps — evaluate lower-cost 1 Gbps option at contract renewal', '2026-02-20', 'Identified', 2500.00, 0.00, 'Contract renewal July 2027; begin analysis Q3 2026'),
  -- T-Mobile — unused lines
  (7, NULL, NULL, NULL, 'Right-Sizing',         'T-Mobile fleet has 8 inactive lines identified through MDM platform — elimination would save $440/mo', '2026-02-22', 'Identified', 5280.00, 0.00, '$55/line × 8 lines × 12 months = $5,280 annually; submit change order');

SELECT 'TEMS extra seed completed successfully.' AS result;
