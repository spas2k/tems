/**
 * TEMS â€” Demo Seed Data
 *
 * Populates all tables with realistic telecom expense data.
 * This combines data from seed.sql and seed_extra.sql,
 * plus Phase A: USOC codes, contract rates, and enhanced line items.
 *
 * Run:  npx knex seed:run
 *
 * NOTE: This seed truncates tables before inserting. Any existing
 * data will be replaced.
 */

exports.seed = async function (knex) {
  // â”€â”€ Clear tables in reverse-dependency order â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hasDisputes = await knex.schema.hasTable('disputes');
  if (hasDisputes) await knex('disputes').del();
  await knex('cost_savings').del();
  await knex('allocations').del();
  await knex('line_items').del();
  await knex('invoices').del();
  await knex('circuits').del();
  await knex('orders').del();
  await knex('contract_rates').del();
  await knex('contracts').del();
  await knex('usoc_codes').del();
  // New tables
  await knex('vendor_remit').del();
  await knex('locations').del();
  await knex('spend_categories').del().whereNotNull('parent_id');
  await knex('spend_categories').del();
  await knex('field_catalog').del();
  await knex('announcements').del();
  await knex('accounts').del();

  // â”€â”€ accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('accounts').insert([
    { accounts_id: 1, name: 'AT&T',               account_number: 'ATT-8872341', vendor_type: 'Telecom',          contact_name: 'Sarah Mitchell',   contact_email: 'billing@att.com',            contact_phone: '800-288-2020', status: 'Active',   created_at: '2023-01-15' },
    { accounts_id: 2, name: 'Verizon Business',   account_number: 'VZB-4491023', vendor_type: 'Telecom',          contact_name: 'James Overstreet',  contact_email: 'vzbilling@verizon.com',     contact_phone: '800-922-0204', status: 'Active',   created_at: '2023-02-01' },
    { accounts_id: 3, name: 'Lumen Technologies', account_number: 'LMN-6612099', vendor_type: 'Telecom',          contact_name: 'Dana Forsythe',     contact_email: 'billing@lumen.com',         contact_phone: '877-453-8353', status: 'Active',   created_at: '2023-03-10' },
    { accounts_id: 4, name: 'Comcast Business',   account_number: 'CMB-3309812', vendor_type: 'ISP',              contact_name: 'Roger Halverson',   contact_email: 'business@comcast.com',      contact_phone: '800-391-3000', status: 'Active',   created_at: '2023-04-22' },
    { accounts_id: 5, name: 'Zayo Group',          account_number: 'ZYO-1092834', vendor_type: 'Fiber/Colocation', contact_name: 'Patricia Alves',    contact_email: 'billing@zayo.com',          contact_phone: '844-492-9624', status: 'Active',   created_at: '2023-08-01' },
    { accounts_id: 6, name: 'Windstream Enterprise', account_number: 'WNS-7743001', vendor_type: 'SD-WAN/Carrier', contact_name: 'Mike Delacroix',  contact_email: 'enterprise@windstream.com', contact_phone: '800-347-1991', status: 'Active',   created_at: '2024-01-10' },
    { accounts_id: 7, name: 'T-Mobile Business',  account_number: 'TMO-5512887', vendor_type: 'Wireless',         contact_name: 'Carla Nguyen',      contact_email: 'business@t-mobile.com',     contact_phone: '800-375-1126', status: 'Active',   created_at: '2024-03-15' },
    { accounts_id: 8, name: 'Crown Castle Fiber', account_number: 'CCF-3308812', vendor_type: 'Fiber/Small Cell', contact_name: 'Tom Whitaker',      contact_email: 'billing@crowncastle.com',   contact_phone: '888-632-2122', status: 'Active',   created_at: '2024-06-01' },
    { accounts_id: 9, name: 'Spectrum Enterprise', account_number: 'SPE-8819034', vendor_type: 'ISP/Cable',       contact_name: 'Lisa Thornton',     contact_email: 'enterprise@spectrum.com',   contact_phone: '855-299-9463', status: 'Inactive', created_at: '2022-11-20' },
  ]);

  // â”€â”€ usoc_codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('usoc_codes').insert([
    { usoc_codes_id: 1,  usoc_code: '1LN',    description: 'Basic Business Line',                      category: 'Access',     sub_category: 'Voice',      default_mrc: 45.00,    default_nrc: 150.00,  unit: 'per line',    status: 'Active' },
    { usoc_codes_id: 2,  usoc_code: 'MPLS1',   description: 'MPLS Port â€” Standard',                    category: 'Transport',  sub_category: 'MPLS',       default_mrc: 1850.00,  default_nrc: 500.00,  unit: 'per circuit', status: 'Active' },
    { usoc_codes_id: 3,  usoc_code: 'DIA1G',   description: 'Dedicated Internet Access â€” 1 Gbps',      category: 'Access',     sub_category: 'DIA',        default_mrc: 750.00,   default_nrc: 350.00,  unit: 'per circuit', status: 'Active' },
    { usoc_codes_id: 4,  usoc_code: 'PIP200',  description: 'Private IP â€” 200 Mbps',                   category: 'Transport',  sub_category: 'Private IP', default_mrc: 2200.00,  default_nrc: 450.00,  unit: 'per circuit', status: 'Active' },
    { usoc_codes_id: 5,  usoc_code: 'WAVE1G',  description: 'Wavelength Service â€” 1 Gbps',             category: 'Transport',  sub_category: 'Wavelength', default_mrc: 4500.00,  default_nrc: 1000.00, unit: 'per circuit', status: 'Active' },
    { usoc_codes_id: 6,  usoc_code: 'SDWAN',   description: 'SD-WAN Managed Service',                  category: 'Transport',  sub_category: 'SD-WAN',     default_mrc: 620.00,   default_nrc: 250.00,  unit: 'per site',    status: 'Active' },
    { usoc_codes_id: 7,  usoc_code: 'WRLSS55', description: 'Wireless Business Line â€” Unlimited',      category: 'Wireless',   sub_category: 'Voice+Data', default_mrc: 55.00,    default_nrc: 0.00,    unit: 'per line',    status: 'Active' },
    { usoc_codes_id: 8,  usoc_code: 'DKFBR',   description: 'Dark Fiber IRU',                          category: 'Transport',  sub_category: 'Fiber',      default_mrc: 8500.00,  default_nrc: 5000.00, unit: 'per route',   status: 'Active' },
    { usoc_codes_id: 9,  usoc_code: 'SDWN2',   description: 'SD-WAN Managed Service â€” Enhanced',       category: 'Transport',  sub_category: 'SD-WAN',     default_mrc: 980.00,   default_nrc: 500.00,  unit: 'per site',    status: 'Active' },
    { usoc_codes_id: 10, usoc_code: 'SCELL',   description: 'Small Cell Node',                         category: 'Wireless',   sub_category: 'Small Cell', default_mrc: 3200.00,  default_nrc: 8000.00, unit: 'per node',    status: 'Active' },
    { usoc_codes_id: 11, usoc_code: 'COAX300', description: 'Coax Internet â€” 300 Mbps',                category: 'Access',     sub_category: 'Cable',      default_mrc: 445.00,   default_nrc: 100.00,  unit: 'per site',    status: 'Active' },
    { usoc_codes_id: 12, usoc_code: 'MSEC',    description: 'Managed Security Services',               category: 'Feature',    sub_category: 'Security',   default_mrc: 2400.00,  default_nrc: 1500.00, unit: 'per month',   status: 'Active' },
    { usoc_codes_id: 13, usoc_code: 'USF',     description: 'Federal Universal Service Fund Surcharge', category: 'Surcharge',  sub_category: 'Regulatory', default_mrc: 0.00,     default_nrc: 0.00,    unit: 'per invoice', status: 'Active' },
    { usoc_codes_id: 14, usoc_code: 'STAX',    description: 'State Taxes & Fees',                      category: 'Surcharge',  sub_category: 'Tax',        default_mrc: 0.00,     default_nrc: 0.00,    unit: 'per invoice', status: 'Active' },
    { usoc_codes_id: 15, usoc_code: 'REGTAX',  description: 'Taxes & Regulatory Fees (bundle)',        category: 'Surcharge',  sub_category: 'Tax',        default_mrc: 0.00,     default_nrc: 0.00,    unit: 'per invoice', status: 'Active' },
    { usoc_codes_id: 16, usoc_code: 'WRLSS45', description: 'Wireless Business Line â€” Standard',       category: 'Wireless',   sub_category: 'Voice+Data', default_mrc: 45.00,    default_nrc: 0.00,    unit: 'per line',    status: 'Active' },
    { usoc_codes_id: 17, usoc_code: 'WAVE10G', description: 'Wavelength Service â€” 10 Gbps',            category: 'Transport',  sub_category: 'Wavelength', default_mrc: 4500.00,  default_nrc: 1500.00, unit: 'per circuit', status: 'Active' },
    { usoc_codes_id: 18, usoc_code: 'MPLS50',  description: 'MPLS Port â€” 50 Mbps',                     category: 'Transport',  sub_category: 'MPLS',       default_mrc: 1850.00,  default_nrc: 500.00,  unit: 'per circuit', status: 'Active' },
  ]);

  // â”€â”€ contracts (with new Phase A columns: minimum_spend, etf_amount, commitment_type) â”€â”€
  await knex('contracts').insert([
    { contracts_id: 1,  accounts_id: 1, name: 'AT&T MPLS Master Agreement',     contract_number: 'ATT-MPLS-2023', start_date: '2023-01-01', end_date: '2026-12-31', contracted_rate: 1850.00, rate_unit: 'per circuit/month', term_months: 48, status: 'Active',  auto_renew: true,  minimum_spend: 44400.00, etf_amount: 11100.00, commitment_type: 'Minimum Spend' },
    { contracts_id: 2,  accounts_id: 1, name: 'AT&T DIA Agreement',             contract_number: 'ATT-DIA-2023',  start_date: '2023-06-01', end_date: '2026-05-31', contracted_rate: 750.00,  rate_unit: 'per circuit/month', term_months: 36, status: 'Active',  auto_renew: false, minimum_spend: null,     etf_amount: 4500.00,  commitment_type: 'Revenue' },
    { contracts_id: 3,  accounts_id: 2, name: 'Verizon Private IP',             contract_number: 'VZ-PIP-2022',   start_date: '2022-09-01', end_date: '2025-08-31', contracted_rate: 2200.00, rate_unit: 'per circuit/month', term_months: 36, status: 'Active',  auto_renew: true,  minimum_spend: 79200.00, etf_amount: 13200.00, commitment_type: 'Minimum Spend' },
    { contracts_id: 4,  accounts_id: 3, name: 'Lumen Wave Services',            contract_number: 'LMN-WAVE-2024', start_date: '2024-01-01', end_date: '2027-12-31', contracted_rate: 4500.00, rate_unit: 'per circuit/month', term_months: 48, status: 'Active',  auto_renew: false, minimum_spend: null,     etf_amount: 27000.00, commitment_type: 'Revenue' },
    { contracts_id: 5,  accounts_id: 4, name: 'Comcast SD-WAN',                 contract_number: 'CMB-SDWAN-2023',start_date: '2023-07-01', end_date: '2026-06-30', contracted_rate: 620.00,  rate_unit: 'per circuit/month', term_months: 36, status: 'Active',  auto_renew: true,  minimum_spend: null,     etf_amount: 3720.00,  commitment_type: 'None' },
    { contracts_id: 6,  accounts_id: 2, name: 'Verizon Wireless Fleet',         contract_number: 'VZ-WL-2024',    start_date: '2024-03-01', end_date: '2027-02-28', contracted_rate: 45.00,   rate_unit: 'per line/month',    term_months: 36, status: 'Active',  auto_renew: true,  minimum_spend: 16200.00, etf_amount: null,     commitment_type: 'Volume' },
    { contracts_id: 7,  accounts_id: 5, name: 'Zayo Dark Fiber IRU',            contract_number: 'ZYO-FIBER-2023',start_date: '2023-08-01', end_date: '2027-07-31', contracted_rate: 8500.00, rate_unit: 'per route/month',   term_months: 48, status: 'Active',  auto_renew: false, minimum_spend: null,     etf_amount: 51000.00, commitment_type: 'Revenue' },
    { contracts_id: 8,  accounts_id: 6, name: 'Windstream SD-WAN Backbone',     contract_number: 'WNS-SDWAN-2024',start_date: '2024-01-15', end_date: '2026-04-14', contracted_rate: 980.00,  rate_unit: 'per site/month',    term_months: 27, status: 'Active',  auto_renew: true,  minimum_spend: null,     etf_amount: 5880.00,  commitment_type: 'None' },
    { contracts_id: 9,  accounts_id: 7, name: 'T-Mobile Business Wireless',     contract_number: 'TMO-BIZ-2024',  start_date: '2024-03-15', end_date: '2027-03-14', contracted_rate: 55.00,   rate_unit: 'per line/month',    term_months: 36, status: 'Active',  auto_renew: true,  minimum_spend: 49500.00, etf_amount: null,     commitment_type: 'Volume' },
    { contracts_id: 10, accounts_id: 8, name: 'Crown Castle Small Cell',        contract_number: 'CCF-SCELL-2024',start_date: '2024-06-01', end_date: '2029-05-31', contracted_rate: 3200.00, rate_unit: 'per node/month',    term_months: 60, status: 'Active',  auto_renew: false, minimum_spend: null,     etf_amount: 96000.00, commitment_type: 'Revenue' },
    { contracts_id: 11, accounts_id: 9, name: 'Spectrum Business Coax',         contract_number: 'SPE-COAX-2022', start_date: '2022-11-20', end_date: '2025-11-19', contracted_rate: 445.00,  rate_unit: 'per site/month',    term_months: 36, status: 'Expired', auto_renew: false, minimum_spend: null,     etf_amount: null,     commitment_type: 'None' },
    { contracts_id: 12, accounts_id: 1, name: 'AT&T Managed Security Services', contract_number: 'ATT-MSS-2023',  start_date: '2023-02-01', end_date: '2026-01-31', contracted_rate: 2400.00, rate_unit: 'per month',         term_months: 36, status: 'Active',  auto_renew: true,  minimum_spend: 86400.00, etf_amount: 14400.00, commitment_type: 'Minimum Spend' },
  ]);

  // â”€â”€ contract_rates â€” per-USOC rate schedule per contract â”€â”€
  await knex('contract_rates').insert([
    // Contract 1: AT&T MPLS â€” USOC MPLS1 (100Mbps) & MPLS50 (50Mbps)
    { contract_rates_id: 1,  contracts_id: 1,  usoc_codes_id: 2,  mrc: 1850.00, nrc: 500.00,  effective_date: '2023-01-01', expiration_date: '2026-12-31', notes: 'MPLS Port 100 Mbps standard rate' },
    { contract_rates_id: 2,  contracts_id: 1,  usoc_codes_id: 18, mrc: 1850.00, nrc: 500.00,  effective_date: '2023-01-01', expiration_date: '2026-12-31', notes: 'MPLS Port 50 Mbps same tier pricing' },
    // Contract 2: AT&T DIA â€” USOC DIA1G
    { contract_rates_id: 3,  contracts_id: 2,  usoc_codes_id: 3,  mrc: 750.00,  nrc: 350.00,  effective_date: '2023-06-01', expiration_date: '2026-05-31', notes: 'DIA 1 Gbps' },
    // Contract 3: Verizon PIP â€” USOC PIP200
    { contract_rates_id: 4,  contracts_id: 3,  usoc_codes_id: 4,  mrc: 2200.00, nrc: 450.00,  effective_date: '2022-09-01', expiration_date: '2025-08-31', notes: 'Private IP 200 Mbps' },
    // Contract 4: Lumen Wave â€” USOC WAVE1G & WAVE10G
    { contract_rates_id: 5,  contracts_id: 4,  usoc_codes_id: 5,  mrc: 4500.00, nrc: 1000.00, effective_date: '2024-01-01', expiration_date: '2027-12-31', notes: 'Wavelength 1 Gbps' },
    { contract_rates_id: 6,  contracts_id: 4,  usoc_codes_id: 17, mrc: 4500.00, nrc: 1500.00, effective_date: '2024-01-01', expiration_date: '2027-12-31', notes: 'Wavelength 10 Gbps â€” same MRC, higher NRC' },
    // Contract 5: Comcast SD-WAN â€” USOC SDWAN
    { contract_rates_id: 7,  contracts_id: 5,  usoc_codes_id: 6,  mrc: 620.00,  nrc: 250.00,  effective_date: '2023-07-01', expiration_date: '2026-06-30', notes: 'SD-WAN managed per site' },
    // Contract 6: Verizon Wireless Fleet â€” USOC WRLSS45
    { contract_rates_id: 8,  contracts_id: 6,  usoc_codes_id: 16, mrc: 45.00,   nrc: 0.00,    effective_date: '2024-03-01', expiration_date: '2027-02-28', notes: 'Wireless standard plan' },
    // Contract 7: Zayo Dark Fiber â€” USOC DKFBR
    { contract_rates_id: 9,  contracts_id: 7,  usoc_codes_id: 8,  mrc: 8500.00, nrc: 5000.00, effective_date: '2023-08-01', expiration_date: '2027-07-31', notes: 'Dark Fiber IRU Denver-Chicago' },
    // Contract 8: Windstream SD-WAN â€” USOC SDWN2
    { contract_rates_id: 10, contracts_id: 8,  usoc_codes_id: 9,  mrc: 980.00,  nrc: 500.00,  effective_date: '2024-01-15', expiration_date: '2026-04-14', notes: 'Enhanced SD-WAN per site' },
    // Contract 9: T-Mobile Wireless â€” USOC WRLSS55
    { contract_rates_id: 11, contracts_id: 9,  usoc_codes_id: 7,  mrc: 55.00,   nrc: 0.00,    effective_date: '2024-03-15', expiration_date: '2027-03-14', notes: 'Unlimited wireless per line' },
    // Contract 10: Crown Castle Small Cell â€” USOC SCELL
    { contract_rates_id: 12, contracts_id: 10, usoc_codes_id: 10, mrc: 3200.00, nrc: 8000.00, effective_date: '2024-06-01', expiration_date: '2029-05-31', notes: 'Small cell node NYC' },
    // Contract 11: Spectrum Coax â€” USOC COAX300
    { contract_rates_id: 13, contracts_id: 11, usoc_codes_id: 11, mrc: 445.00,  nrc: 100.00,  effective_date: '2022-11-20', expiration_date: '2025-11-19', notes: 'Coax 300 Mbps' },
    // Contract 12: AT&T MSS â€” USOC MSEC
    { contract_rates_id: 14, contracts_id: 12, usoc_codes_id: 12, mrc: 2400.00, nrc: 1500.00, effective_date: '2023-02-01', expiration_date: '2026-01-31', notes: 'Managed security services' },
    // Surcharge USOCs added to contracts 1, 3 so they appear in rate schedules
    { contract_rates_id: 15, contracts_id: 1,  usoc_codes_id: 13, mrc: 190.00,  nrc: 0.00,    effective_date: '2023-01-01', expiration_date: '2026-12-31', notes: 'Federal USF passthrough' },
    { contract_rates_id: 16, contracts_id: 3,  usoc_codes_id: 14, mrc: 65.50,   nrc: 0.00,    effective_date: '2022-09-01', expiration_date: '2025-08-31', notes: 'State tax estimate' },
  ]);

  // â”€â”€ orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('orders').insert([
    { orders_id: 1,  accounts_id: 1, contracts_id: 1,  cir_id: null, order_number: 'ORD-2023-0001', description: 'MPLS Circuit - Chicago HQ',                   contracted_rate: 1850.00, order_date: '2023-01-20', due_date: '2023-02-10', status: 'Completed',   notes: 'Standard install, no issues' },
    { orders_id: 2,  accounts_id: 1, contracts_id: 1,  cir_id: null, order_number: 'ORD-2023-0002', description: 'MPLS Circuit - Dallas Branch',                 contracted_rate: 1850.00, order_date: '2023-03-01', due_date: '2023-03-15', status: 'Completed',   notes: '' },
    { orders_id: 3,  accounts_id: 2, contracts_id: 3,  cir_id: null, order_number: 'ORD-2022-0041', description: 'Verizon Private IP - NY Office',               contracted_rate: 2200.00, order_date: '2022-09-05', due_date: '2022-10-01', status: 'Completed',   notes: 'Expedited install requested' },
    { orders_id: 4,  accounts_id: 3, contracts_id: 4,  cir_id: null, order_number: 'ORD-2024-0011', description: 'Lumen Wavelength - Chicago DC',                contracted_rate: 4500.00, order_date: '2024-01-05', due_date: '2024-02-01', status: 'Completed',   notes: 'Data center cross connect included' },
    { orders_id: 5,  accounts_id: 4, contracts_id: 5,  cir_id: null, order_number: 'ORD-2023-0088', description: 'Comcast SD-WAN - Phoenix Branch',              contracted_rate: 620.00,  order_date: '2023-08-01', due_date: '2023-08-20', status: 'Completed',   notes: '' },
    { orders_id: 6,  accounts_id: 1, contracts_id: 2,  cir_id: null, order_number: 'ORD-2026-0012', description: 'AT&T DIA 1Gbps - Austin Office',               contracted_rate: 750.00,  order_date: '2026-01-15', due_date: '2026-03-01', status: 'In Progress', notes: 'Awaiting local loop provisioning' },
    { orders_id: 7,  accounts_id: 5, contracts_id: 7,  cir_id: null, order_number: 'ORD-2023-0071', description: 'Zayo Dark Fiber â€” Denver to Chicago route',    contracted_rate: 8500.00, order_date: '2023-08-05', due_date: '2023-09-30', status: 'Completed',   notes: 'Cross-connect included at both ends' },
    { orders_id: 8,  accounts_id: 6, contracts_id: 8,  cir_id: null, order_number: 'ORD-2024-0031', description: 'Windstream SD-WAN â€” Seattle HQ',               contracted_rate: 980.00,  order_date: '2024-01-20', due_date: '2024-02-28', status: 'Completed',   notes: 'Managed CPE deployed on-site' },
    { orders_id: 9,  accounts_id: 6, contracts_id: 8,  cir_id: null, order_number: 'ORD-2024-0032', description: 'Windstream SD-WAN â€” Denver Branch',            contracted_rate: 980.00,  order_date: '2024-02-01', due_date: '2024-03-15', status: 'Completed',   notes: '' },
    { orders_id: 10, accounts_id: 7, contracts_id: 9,  cir_id: null, order_number: 'ORD-2024-0055', description: 'T-Mobile Business â€” Initial Fleet (25 lines)', contracted_rate: 55.00,   order_date: '2024-03-20', due_date: '2024-04-01', status: 'Completed',   notes: 'MDM enrolled all devices' },
    { orders_id: 11, accounts_id: 8, contracts_id: 10, cir_id: null, order_number: 'ORD-2024-0099', description: 'Crown Castle â€” Small Cell Node NYC-Midtown',   contracted_rate: 3200.00, order_date: '2024-06-10', due_date: '2024-09-01', status: 'Completed',   notes: 'City permit required â€” 90-day lead time' },
    { orders_id: 12, accounts_id: 6, contracts_id: 8,  cir_id: null, order_number: 'ORD-2026-0021', description: 'Windstream SD-WAN â€” Portland New Site',        contracted_rate: 980.00,  order_date: '2026-01-10', due_date: '2026-03-15', status: 'In Progress', notes: 'Local loop order placed 1/12/26' },
    { orders_id: 13, accounts_id: 1, contracts_id: 1,  cir_id: null, order_number: 'ORD-2026-0013', description: 'AT&T MPLS Upgrade â€” Chicago HQ 100â†’500 Mbps', contracted_rate: 1850.00, order_date: '2026-01-25', due_date: '2026-03-10', status: 'In Progress', notes: 'Bandwidth upgrade, same circuit ID' },
    { orders_id: 14, accounts_id: 3, contracts_id: 4,  cir_id: null, order_number: 'ORD-2026-0014', description: 'Lumen Wave â€” Los Angeles Data Center',         contracted_rate: 4500.00, order_date: '2026-02-01', due_date: '2026-04-15', status: 'In Progress', notes: 'New colocation cross-connect required' },
    { orders_id: 15, accounts_id: 2, contracts_id: 3,  cir_id: null, order_number: 'ORD-2025-0088', description: 'Verizon Private IP â€” Miami Office (cancelled)',contracted_rate: 2200.00, order_date: '2025-11-01', due_date: '2026-01-15', status: 'Cancelled',   notes: 'Office lease not renewed; order cancelled' },
  ]);

  // â”€â”€ circuits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('circuits').insert([
    { cir_id: 1,  accounts_id: 1, contracts_id: 1,  orders_id: 1,    circuit_id: 'ATT/MPLS/00112233',  type: 'MPLS',       bandwidth: '100 Mbps', location: 'Chicago, IL - HQ',              contracted_rate: 1850.00, status: 'Active',       install_date: '2023-02-10', disconnect_date: null },
    { cir_id: 2,  accounts_id: 1, contracts_id: 1,  orders_id: 2,    circuit_id: 'ATT/MPLS/00445566',  type: 'MPLS',       bandwidth: '50 Mbps',  location: 'Dallas, TX - Branch',           contracted_rate: 1850.00, status: 'Active',       install_date: '2023-03-15', disconnect_date: null },
    { cir_id: 3,  accounts_id: 2, contracts_id: 3,  orders_id: 3,    circuit_id: 'VZ/PIP/887722AA',    type: 'Private IP', bandwidth: '200 Mbps', location: 'New York, NY - Office',         contracted_rate: 2200.00, status: 'Active',       install_date: '2022-10-01', disconnect_date: null },
    { cir_id: 4,  accounts_id: 3, contracts_id: 4,  orders_id: 4,    circuit_id: 'LMN/WAVE/00FFAA12',  type: 'Wavelength', bandwidth: '1 Gbps',   location: 'Chicago, IL - DataCenter',      contracted_rate: 4500.00, status: 'Active',       install_date: '2024-02-01', disconnect_date: null },
    { cir_id: 5,  accounts_id: 4, contracts_id: 5,  orders_id: 5,    circuit_id: 'CMB/SDWAN/3301XQ',   type: 'SD-WAN',     bandwidth: '500 Mbps', location: 'Phoenix, AZ - Branch',          contracted_rate: 620.00,  status: 'Active',       install_date: '2023-08-20', disconnect_date: null },
    { cir_id: 6,  accounts_id: 1, contracts_id: 2,  orders_id: 6,    circuit_id: 'ATT/DIA/77BB1199',   type: 'DIA',        bandwidth: '1 Gbps',   location: 'Austin, TX - Office',           contracted_rate: 750.00,  status: 'Pending',      install_date: null,         disconnect_date: null },
    { cir_id: 7,  accounts_id: 5, contracts_id: 7,  orders_id: 7,    circuit_id: 'ZYO/FIBER/DEN-CHI-001', type: 'Dark Fiber', bandwidth: '10 Gbps', location: 'Denver, CO â†’ Chicago, IL',     contracted_rate: 8500.00, status: 'Active',       install_date: '2023-09-30', disconnect_date: null },
    { cir_id: 8,  accounts_id: 6, contracts_id: 8,  orders_id: 8,    circuit_id: 'WNS/SDWAN/SEA-001',  type: 'SD-WAN',     bandwidth: '500 Mbps', location: 'Seattle, WA â€” HQ',              contracted_rate: 980.00,  status: 'Active',       install_date: '2024-02-28', disconnect_date: null },
    { cir_id: 9,  accounts_id: 6, contracts_id: 8,  orders_id: 9,    circuit_id: 'WNS/SDWAN/DEN-001',  type: 'SD-WAN',     bandwidth: '200 Mbps', location: 'Denver, CO â€” Branch',           contracted_rate: 980.00,  status: 'Active',       install_date: '2024-03-15', disconnect_date: null },
    { cir_id: 10, accounts_id: 7, contracts_id: 9,  orders_id: 10,   circuit_id: 'TMO/WRLSS/FLEET-A01',type: 'Wireless',   bandwidth: '4G/5G',    location: 'Mobile Fleet â€” Group A (10 lines)', contracted_rate: 55.00, status: 'Active',     install_date: '2024-04-01', disconnect_date: null },
    { cir_id: 11, accounts_id: 7, contracts_id: 9,  orders_id: 10,   circuit_id: 'TMO/WRLSS/FLEET-A02',type: 'Wireless',   bandwidth: '4G/5G',    location: 'Mobile Fleet â€” Group B (10 lines)', contracted_rate: 55.00, status: 'Active',     install_date: '2024-04-01', disconnect_date: null },
    { cir_id: 12, accounts_id: 7, contracts_id: 9,  orders_id: 10,   circuit_id: 'TMO/WRLSS/FLEET-A03',type: 'Wireless',   bandwidth: '4G/5G',    location: 'Mobile Fleet â€” Group C (5 lines)',  contracted_rate: 55.00, status: 'Active',     install_date: '2024-04-01', disconnect_date: null },
    { cir_id: 13, accounts_id: 8, contracts_id: 10, orders_id: 11,   circuit_id: 'CCF/SCELL/NYC-MDT-001',type: 'Small Cell',bandwidth: 'N/A',      location: 'New York, NY â€” Midtown Node',   contracted_rate: 3200.00, status: 'Active',       install_date: '2024-09-01', disconnect_date: null },
    { cir_id: 14, accounts_id: 9, contracts_id: 11, orders_id: null,  circuit_id: 'SPE/COAX/LA-0071',   type: 'Coax/Cable', bandwidth: '300 Mbps', location: 'Los Angeles, CA â€” West Office',  contracted_rate: 445.00,  status: 'Disconnected', install_date: '2022-12-15', disconnect_date: '2025-11-19' },
    { cir_id: 15, accounts_id: 3, contracts_id: 4,  orders_id: 14,   circuit_id: 'LMN/WAVE/LAX-DC-001',type: 'Wavelength', bandwidth: '10 Gbps',  location: 'Los Angeles, CA â€” DataCenter',  contracted_rate: 4500.00, status: 'Pending',      install_date: null,         disconnect_date: null },
  ]);

  // Link completed orders â†’ circuits
  await knex('orders').where('orders_id', 1).update({ cir_id: 1 });
  await knex('orders').where('orders_id', 2).update({ cir_id: 2 });
  await knex('orders').where('orders_id', 3).update({ cir_id: 3 });
  await knex('orders').where('orders_id', 4).update({ cir_id: 4 });
  await knex('orders').where('orders_id', 5).update({ cir_id: 5 });
  await knex('orders').where('orders_id', 6).update({ cir_id: 6 });
  await knex('orders').where('orders_id', 7).update({ cir_id: 7 });
  await knex('orders').where('orders_id', 8).update({ cir_id: 8 });
  await knex('orders').where('orders_id', 9).update({ cir_id: 9 });
  await knex('orders').where('orders_id', 10).update({ cir_id: 10 });
  await knex('orders').where('orders_id', 11).update({ cir_id: 11 });

  // â”€â”€ invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('invoices').insert([
    { invoices_id: 1,  accounts_id: 1, invoice_number: 'ATT-INV-20260101', invoice_date: '2026-01-01', due_date: '2026-01-31', period_start: '2026-01-01', period_end: '2026-01-31', total_amount: 3890.00,  status: 'Paid',     payment_date: '2026-01-28' },
    { invoices_id: 2,  accounts_id: 1, invoice_number: 'ATT-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-02-28', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 4120.00,  status: 'Open',     payment_date: null },
    { invoices_id: 3,  accounts_id: 2, invoice_number: 'VZB-INV-20260115', invoice_date: '2026-01-15', due_date: '2026-02-14', period_start: '2026-01-01', period_end: '2026-01-31', total_amount: 2265.50,  status: 'Paid',     payment_date: '2026-02-10' },
    { invoices_id: 4,  accounts_id: 2, invoice_number: 'VZB-INV-20260215', invoice_date: '2026-02-15', due_date: '2026-03-16', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 2310.00,  status: 'Open',     payment_date: null },
    { invoices_id: 5,  accounts_id: 3, invoice_number: 'LMN-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-03-03', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 4500.00,  status: 'Open',     payment_date: null },
    { invoices_id: 6,  accounts_id: 4, invoice_number: 'CMB-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-03-03', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 645.00,   status: 'Disputed', payment_date: null },
    { invoices_id: 7,  accounts_id: 5, invoice_number: 'ZYO-INV-20260101', invoice_date: '2026-01-01', due_date: '2026-01-31', period_start: '2026-01-01', period_end: '2026-01-31', total_amount: 8500.00,  status: 'Paid',     payment_date: '2026-01-28' },
    { invoices_id: 8,  accounts_id: 5, invoice_number: 'ZYO-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-02-28', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 8500.00,  status: 'Open',     payment_date: null },
    { invoices_id: 9,  accounts_id: 6, invoice_number: 'WNS-INV-20260101', invoice_date: '2026-01-01', due_date: '2026-01-31', period_start: '2026-01-01', period_end: '2026-01-31', total_amount: 2040.00,  status: 'Paid',     payment_date: '2026-01-29' },
    { invoices_id: 10, accounts_id: 6, invoice_number: 'WNS-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-02-28', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 2105.00,  status: 'Disputed', payment_date: null },
    { invoices_id: 11, accounts_id: 7, invoice_number: 'TMO-INV-20260201', invoice_date: '2026-02-05', due_date: '2026-03-07', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 1375.00,  status: 'Open',     payment_date: null },
    { invoices_id: 12, accounts_id: 8, invoice_number: 'CCF-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-03-03', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 3200.00,  status: 'Paid',     payment_date: '2026-02-25' },
    { invoices_id: 13, accounts_id: 9, invoice_number: 'SPE-INV-20251101', invoice_date: '2025-11-01', due_date: '2025-11-30', period_start: '2025-11-01', period_end: '2025-11-30', total_amount: 445.00,   status: 'Paid',     payment_date: '2025-11-28' },
    { invoices_id: 14, accounts_id: 1, invoice_number: 'ATT-INV-20251201', invoice_date: '2025-12-01', due_date: '2025-12-31', period_start: '2025-12-01', period_end: '2025-12-31', total_amount: 3890.00,  status: 'Paid',     payment_date: '2025-12-29' },
    { invoices_id: 15, accounts_id: 2, invoice_number: 'VZB-INV-20251215', invoice_date: '2025-12-15', due_date: '2026-01-14', period_start: '2025-12-01', period_end: '2025-12-31', total_amount: 2265.50,  status: 'Paid',     payment_date: '2026-01-12' },
  ]);

  // â”€â”€ line_items (with Phase A columns: usoc_codes_id, mrc_amount, nrc_amount, audit_status) â”€â”€
  await knex('line_items').insert([
    // Invoice 1 â€“ AT&T January (Paid)
    { line_items_id: 1,  invoices_id: 1, cir_id: 1,    usoc_codes_id: 2,    description: 'MPLS MRC - Chicago HQ',    charge_type: 'MRC',          amount: 1850.00, mrc_amount: 1850.00, nrc_amount: null,  contracted_rate: 1850.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-01-01', period_end: '2026-01-31' },
    { line_items_id: 2,  invoices_id: 1, cir_id: 2,    usoc_codes_id: 18,   description: 'MPLS MRC - Dallas Branch',  charge_type: 'MRC',          amount: 1850.00, mrc_amount: 1850.00, nrc_amount: null,  contracted_rate: 1850.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-01-01', period_end: '2026-01-31' },
    { line_items_id: 3,  invoices_id: 1, cir_id: null,  usoc_codes_id: 13,   description: 'Federal USF Surcharge',     charge_type: 'Tax/Surcharge',amount: 190.00,  mrc_amount: 190.00,  nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2026-01-01', period_end: '2026-01-31' },
    // Invoice 2 â€“ AT&T February (Open, has variance)
    { line_items_id: 4,  invoices_id: 2, cir_id: 1,    usoc_codes_id: 2,    description: 'MPLS MRC - Chicago HQ',     charge_type: 'MRC',          amount: 1850.00, mrc_amount: 1850.00, nrc_amount: null,  contracted_rate: 1850.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    { line_items_id: 5,  invoices_id: 2, cir_id: 2,    usoc_codes_id: 18,   description: 'MPLS MRC - Dallas Branch',   charge_type: 'MRC',          amount: 2080.00, mrc_amount: 2080.00, nrc_amount: null,  contracted_rate: 1850.00, variance: 230.00, audit_status: 'Variance',  period_start: '2026-02-01', period_end: '2026-02-28' },
    { line_items_id: 6,  invoices_id: 2, cir_id: null,  usoc_codes_id: 13,   description: 'Federal USF Surcharge',     charge_type: 'Tax/Surcharge',amount: 190.00,  mrc_amount: 190.00,  nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 3 â€“ Verizon January (Paid)
    { line_items_id: 7,  invoices_id: 3, cir_id: 3,    usoc_codes_id: 4,    description: 'Verizon Private IP MRC',     charge_type: 'MRC',          amount: 2200.00, mrc_amount: 2200.00, nrc_amount: null,  contracted_rate: 2200.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-01-01', period_end: '2026-01-31' },
    { line_items_id: 8,  invoices_id: 3, cir_id: null,  usoc_codes_id: 14,   description: 'State Taxes',               charge_type: 'Tax/Surcharge',amount: 65.50,   mrc_amount: 65.50,   nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2026-01-01', period_end: '2026-01-31' },
    // Invoice 4 â€“ Verizon February (Open, has variance)
    { line_items_id: 9,  invoices_id: 4, cir_id: 3,    usoc_codes_id: 4,    description: 'Verizon Private IP MRC',     charge_type: 'MRC',          amount: 2245.00, mrc_amount: 2245.00, nrc_amount: null,  contracted_rate: 2200.00, variance: 45.00,  audit_status: 'Variance',  period_start: '2026-02-01', period_end: '2026-02-28' },
    { line_items_id: 10, invoices_id: 4, cir_id: null,  usoc_codes_id: 14,   description: 'State Taxes',               charge_type: 'Tax/Surcharge',amount: 65.00,   mrc_amount: 65.00,   nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 5 â€“ Lumen February (Open)
    { line_items_id: 11, invoices_id: 5, cir_id: 4,    usoc_codes_id: 5,    description: 'Lumen Wavelength MRC',       charge_type: 'MRC',          amount: 4500.00, mrc_amount: 4500.00, nrc_amount: null,  contracted_rate: 4500.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 6 â€“ Comcast February (Disputed)
    { line_items_id: 12, invoices_id: 6, cir_id: 5,    usoc_codes_id: 6,    description: 'Comcast SD-WAN MRC',         charge_type: 'MRC',          amount: 645.00,  mrc_amount: 645.00,  nrc_amount: null,  contracted_rate: 620.00,  variance: 25.00,  audit_status: 'Variance',  period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 7 â€“ Zayo January (Paid)
    { line_items_id: 13, invoices_id: 7,  cir_id: 7,   usoc_codes_id: 8,    description: 'Zayo Dark Fiber MRC â€” Denver-Chicago',      charge_type: 'MRC',          amount: 8500.00, mrc_amount: 8500.00, nrc_amount: null,  contracted_rate: 8500.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-01-01', period_end: '2026-01-31' },
    // Invoice 8 â€“ Zayo February (Open)
    { line_items_id: 14, invoices_id: 8,  cir_id: 7,   usoc_codes_id: 8,    description: 'Zayo Dark Fiber MRC â€” Denver-Chicago',      charge_type: 'MRC',          amount: 8500.00, mrc_amount: 8500.00, nrc_amount: null,  contracted_rate: 8500.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 9 â€“ Windstream January (Paid)
    { line_items_id: 15, invoices_id: 9,  cir_id: 8,   usoc_codes_id: 9,    description: 'Windstream SD-WAN MRC â€” Seattle HQ',        charge_type: 'MRC',          amount: 980.00,  mrc_amount: 980.00,  nrc_amount: null,  contracted_rate: 980.00,  variance: 0.00,   audit_status: 'Validated', period_start: '2026-01-01', period_end: '2026-01-31' },
    { line_items_id: 16, invoices_id: 9,  cir_id: 9,   usoc_codes_id: 9,    description: 'Windstream SD-WAN MRC â€” Denver Branch',     charge_type: 'MRC',          amount: 980.00,  mrc_amount: 980.00,  nrc_amount: null,  contracted_rate: 980.00,  variance: 0.00,   audit_status: 'Validated', period_start: '2026-01-01', period_end: '2026-01-31' },
    { line_items_id: 17, invoices_id: 9,  cir_id: null, usoc_codes_id: 15,   description: 'Taxes & Regulatory Fees',                  charge_type: 'Tax/Surcharge',amount: 80.00,   mrc_amount: 80.00,   nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2026-01-01', period_end: '2026-01-31' },
    // Invoice 10 â€“ Windstream February (Disputed)
    { line_items_id: 18, invoices_id: 10, cir_id: 8,   usoc_codes_id: 9,    description: 'Windstream SD-WAN MRC â€” Seattle HQ',        charge_type: 'MRC',          amount: 1050.00, mrc_amount: 1050.00, nrc_amount: null,  contracted_rate: 980.00,  variance: 70.00,  audit_status: 'Variance',  period_start: '2026-02-01', period_end: '2026-02-28' },
    { line_items_id: 19, invoices_id: 10, cir_id: 9,   usoc_codes_id: 9,    description: 'Windstream SD-WAN MRC â€” Denver Branch',     charge_type: 'MRC',          amount: 975.00,  mrc_amount: 975.00,  nrc_amount: null,  contracted_rate: 980.00,  variance: -5.00,  audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    { line_items_id: 20, invoices_id: 10, cir_id: null, usoc_codes_id: 15,   description: 'Taxes & Regulatory Fees',                  charge_type: 'Tax/Surcharge',amount: 80.00,   mrc_amount: 80.00,   nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 11 â€“ T-Mobile February (Open)
    { line_items_id: 21, invoices_id: 11, cir_id: 10,  usoc_codes_id: 7,    description: 'T-Mobile Wireless â€” Fleet Group A (10 ln)', charge_type: 'MRC',          amount: 550.00,  mrc_amount: 550.00,  nrc_amount: null,  contracted_rate: 550.00,  variance: 0.00,   audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    { line_items_id: 22, invoices_id: 11, cir_id: 11,  usoc_codes_id: 7,    description: 'T-Mobile Wireless â€” Fleet Group B (10 ln)', charge_type: 'MRC',          amount: 550.00,  mrc_amount: 550.00,  nrc_amount: null,  contracted_rate: 550.00,  variance: 0.00,   audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    { line_items_id: 23, invoices_id: 11, cir_id: 12,  usoc_codes_id: 7,    description: 'T-Mobile Wireless â€” Fleet Group C (5 ln)',  charge_type: 'MRC',          amount: 275.00,  mrc_amount: 275.00,  nrc_amount: null,  contracted_rate: 275.00,  variance: 0.00,   audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 12 â€“ Crown Castle February (Paid)
    { line_items_id: 24, invoices_id: 12, cir_id: 13,  usoc_codes_id: 10,   description: 'Crown Castle Small Cell Node â€” NYC Midtown', charge_type: 'MRC',         amount: 3200.00, mrc_amount: 3200.00, nrc_amount: null,  contracted_rate: 3200.00, variance: 0.00,   audit_status: 'Validated', period_start: '2026-02-01', period_end: '2026-02-28' },
    // Invoice 13 â€“ Spectrum November 2025 (Paid)
    { line_items_id: 25, invoices_id: 13, cir_id: 14,  usoc_codes_id: 11,   description: 'Spectrum Business Coax â€” LA West Office',   charge_type: 'MRC',          amount: 445.00,  mrc_amount: 445.00,  nrc_amount: null,  contracted_rate: 445.00,  variance: 0.00,   audit_status: 'Validated', period_start: '2025-11-01', period_end: '2025-11-30' },
    // Invoice 14 â€“ AT&T December 2025 historical
    { line_items_id: 26, invoices_id: 14, cir_id: 1,   usoc_codes_id: 2,    description: 'AT&T MPLS MRC â€” Chicago HQ',               charge_type: 'MRC',          amount: 1850.00, mrc_amount: 1850.00, nrc_amount: null,  contracted_rate: 1850.00, variance: 0.00,   audit_status: 'Validated', period_start: '2025-12-01', period_end: '2025-12-31' },
    { line_items_id: 27, invoices_id: 14, cir_id: 2,   usoc_codes_id: 18,   description: 'AT&T MPLS MRC â€” Dallas Branch',             charge_type: 'MRC',          amount: 1850.00, mrc_amount: 1850.00, nrc_amount: null,  contracted_rate: 1850.00, variance: 0.00,   audit_status: 'Validated', period_start: '2025-12-01', period_end: '2025-12-31' },
    { line_items_id: 28, invoices_id: 14, cir_id: null, usoc_codes_id: 13,   description: 'Federal USF Surcharge',                    charge_type: 'Tax/Surcharge',amount: 190.00,  mrc_amount: 190.00,  nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2025-12-01', period_end: '2025-12-31' },
    // Invoice 15 â€“ Verizon December 2025 historical
    { line_items_id: 29, invoices_id: 15, cir_id: 3,   usoc_codes_id: 4,    description: 'Verizon Private IP MRC â€” NY Office',        charge_type: 'MRC',          amount: 2200.00, mrc_amount: 2200.00, nrc_amount: null,  contracted_rate: 2200.00, variance: 0.00,   audit_status: 'Validated', period_start: '2025-12-01', period_end: '2025-12-31' },
    { line_items_id: 30, invoices_id: 15, cir_id: null, usoc_codes_id: 14,   description: 'State Taxes',                              charge_type: 'Tax/Surcharge',amount: 65.50,   mrc_amount: 65.50,   nrc_amount: null,  contracted_rate: null,    variance: null,   audit_status: null,        period_start: '2025-12-01', period_end: '2025-12-31' },
  ]);

  // â”€â”€ allocations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('allocations').insert([
    // seed.sql allocations
    { allocations_id: 1,  line_items_id: 1,  cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100.00, allocated_amount: 1850.00, notes: 'Full allocation to IT' },
    { allocations_id: 2,  line_items_id: 2,  cost_center: 'CC-200 - Operations',        department: 'Operations',              percentage: 60.00,  allocated_amount: 1110.00, notes: 'Split with Sales' },
    { allocations_id: 3,  line_items_id: 2,  cost_center: 'CC-300 - Sales',             department: 'Sales',                   percentage: 40.00,  allocated_amount: 740.00,  notes: 'Partial - Sales team usage' },
    { allocations_id: 4,  line_items_id: 4,  cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100.00, allocated_amount: 1850.00, notes: '' },
    { allocations_id: 5,  line_items_id: 5,  cost_center: 'CC-200 - Operations',        department: 'Operations',              percentage: 100.00, allocated_amount: 2080.00, notes: 'Overcharge under dispute' },
    { allocations_id: 6,  line_items_id: 7,  cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 50.00,  allocated_amount: 1100.00, notes: '' },
    { allocations_id: 7,  line_items_id: 7,  cost_center: 'CC-400 - Finance',           department: 'Finance',                 percentage: 50.00,  allocated_amount: 1100.00, notes: '' },
    { allocations_id: 8,  line_items_id: 11, cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100.00, allocated_amount: 4500.00, notes: 'Data center connectivity' },
    // seed_extra.sql allocations
    { allocations_id: 9,  line_items_id: 13, cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 70.00,  allocated_amount: 5950.00, notes: 'Primary network backbone' },
    { allocations_id: 10, line_items_id: 13, cost_center: 'CC-200 - Operations',        department: 'Operations',              percentage: 30.00,  allocated_amount: 2550.00, notes: 'Operations shared usage' },
    { allocations_id: 11, line_items_id: 14, cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 70.00,  allocated_amount: 5950.00, notes: '' },
    { allocations_id: 12, line_items_id: 14, cost_center: 'CC-200 - Operations',        department: 'Operations',              percentage: 30.00,  allocated_amount: 2550.00, notes: '' },
    { allocations_id: 13, line_items_id: 15, cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100.00, allocated_amount: 980.00,  notes: 'Seattle HQ â€” all IT' },
    { allocations_id: 14, line_items_id: 16, cost_center: 'CC-200 - Operations',        department: 'Operations',              percentage: 50.00,  allocated_amount: 490.00,  notes: '' },
    { allocations_id: 15, line_items_id: 16, cost_center: 'CC-300 - Sales',             department: 'Sales',                   percentage: 50.00,  allocated_amount: 490.00,  notes: 'Denver sales team' },
    { allocations_id: 16, line_items_id: 21, cost_center: 'CC-500 - Field Services',    department: 'Field Operations',        percentage: 100.00, allocated_amount: 550.00,  notes: 'Fleet Group A â€” field techs' },
    { allocations_id: 17, line_items_id: 22, cost_center: 'CC-500 - Field Services',    department: 'Field Operations',        percentage: 100.00, allocated_amount: 550.00,  notes: 'Fleet Group B â€” field techs' },
    { allocations_id: 18, line_items_id: 23, cost_center: 'CC-300 - Sales',             department: 'Sales',                   percentage: 100.00, allocated_amount: 275.00,  notes: 'Fleet Group C â€” sales reps' },
    { allocations_id: 19, line_items_id: 24, cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100.00, allocated_amount: 3200.00, notes: 'Network densification project' },
    { allocations_id: 20, line_items_id: 26, cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100.00, allocated_amount: 1850.00, notes: '' },
    { allocations_id: 21, line_items_id: 27, cost_center: 'CC-200 - Operations',        department: 'Operations',              percentage: 60.00,  allocated_amount: 1110.00, notes: '' },
    { allocations_id: 22, line_items_id: 27, cost_center: 'CC-300 - Sales',             department: 'Sales',                   percentage: 40.00,  allocated_amount: 740.00,  notes: '' },
  ]);

  // â”€â”€ cost_savings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('cost_savings').insert([
    // seed.sql cost savings
    { cost_savings_id: 1, accounts_id: 1, cir_id: 2,  line_items_id: 5,    invoices_id: 2,    category: 'Billing Error',         description: 'AT&T Dallas MPLS overbilled $230 vs contracted rate of $1,850/mo',       identified_date: '2026-02-10', status: 'In Progress', projected_savings: 230.00,  realized_savings: 0.00,   notes: 'Credit request submitted 2/10/26' },
    { cost_savings_id: 2, accounts_id: 2, cir_id: 3,  line_items_id: 9,    invoices_id: 4,    category: 'Billing Error',         description: 'Verizon Private IP billing $45 over contracted rate this cycle',         identified_date: '2026-02-20', status: 'Identified',  projected_savings: 45.00,   realized_savings: 0.00,   notes: 'Need to open ticket with Verizon' },
    { cost_savings_id: 3, accounts_id: 4, cir_id: 5,  line_items_id: 12,   invoices_id: 6,    category: 'Billing Error',         description: 'Comcast SD-WAN billed $645 vs contracted $620 â€” $25 overcharge',         identified_date: '2026-02-15', status: 'In Progress', projected_savings: 25.00,   realized_savings: 0.00,   notes: 'Invoice in dispute status' },
    { cost_savings_id: 4, accounts_id: 1, cir_id: null,line_items_id: null, invoices_id: null, category: 'Contract Optimization', description: 'AT&T DIA contract renewal â€” market rates 15% lower than current term',    identified_date: '2026-01-30', status: 'Identified',  projected_savings: 1350.00, realized_savings: 0.00,   notes: 'Contract expires 2026-05-31; begin renegotiation Q1' },
    // seed_extra.sql cost savings
    { cost_savings_id: 5, accounts_id: 6, cir_id: 8,   line_items_id: 18,  invoices_id: 10,   category: 'Billing Error',         description: 'Windstream billed $1,050 for Seattle SD-WAN vs contracted $980 â€” $70 overcharge', identified_date: '2026-02-18', status: 'In Progress', projected_savings: 70.00,   realized_savings: 0.00,   notes: 'Dispute ticket WNS-2026-0234 opened; awaiting credit memo' },
    { cost_savings_id: 6, accounts_id: 6, cir_id: null, line_items_id: null,invoices_id: null, category: 'Contract Optimization', description: 'Windstream SD-WAN contract WNS-SDWAN-2024 expires April 2026 â€” benchmark shows 18% savings available with renegotiation', identified_date: '2026-02-15', status: 'Identified', projected_savings: 3528.00, realized_savings: 0.00, notes: '2-site contract at $980/site; market rate ~$800/site; 27-mo savings = $3,528' },
    { cost_savings_id: 7, accounts_id: 9, cir_id: 14,  line_items_id: null, invoices_id: null, category: 'Service Termination',  description: 'Spectrum Coax LA â€” contract expired 11/19/2025, circuit disconnected. Traffic migrated to new Zayo route.', identified_date: '2025-11-20', status: 'Realized', projected_savings: 445.00, realized_savings: 445.00, notes: 'Full MRC realized monthly; no replacement cost' },
    { cost_savings_id: 8, accounts_id: 5, cir_id: 7,   line_items_id: null, invoices_id: null, category: 'Right-Sizing',         description: 'Zayo Dark Fiber currently provisioned at 10 Gbps but peak utilization under 2 Gbps â€” evaluate lower-cost 1 Gbps option at contract renewal', identified_date: '2026-02-20', status: 'Identified', projected_savings: 2500.00, realized_savings: 0.00, notes: 'Contract renewal July 2027; begin analysis Q3 2026' },
    { cost_savings_id: 9, accounts_id: 7, cir_id: null, line_items_id: null, invoices_id: null, category: 'Right-Sizing',        description: 'T-Mobile fleet has 8 inactive lines identified through MDM platform â€” elimination would save $440/mo', identified_date: '2026-02-22', status: 'Identified', projected_savings: 5280.00, realized_savings: 0.00, notes: '$55/line Ã— 8 lines Ã— 12 months = $5,280 annually; submit change order' },
  ]);

  // â”€â”€ disputes (Phase C) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (hasDisputes) {
    await knex('disputes').insert([
      { disputes_id: 1, line_items_id: 5,  invoices_id: 2,  accounts_id: 1, dispute_type: 'Overcharge',        amount: 230.00,  status: 'Open',         filed_date: '2026-02-12', resolved_date: null,         resolution_notes: null,                            credit_amount: null,   reference_number: 'DSP-ATT-2026-001',   notes: 'AT&T Dallas MPLS overbilled $230 vs contracted rate of $1,850/mo' },
      { disputes_id: 2, line_items_id: 9,  invoices_id: 4,  accounts_id: 2, dispute_type: 'Overcharge',        amount: 45.00,   status: 'Under Review', filed_date: '2026-02-22', resolved_date: null,         resolution_notes: null,                            credit_amount: null,   reference_number: 'DSP-VZ-2026-003',    notes: 'Verizon Private IP $45 over contracted rate' },
      { disputes_id: 3, line_items_id: 12, invoices_id: 6,  accounts_id: 4, dispute_type: 'Overcharge',        amount: 25.00,   status: 'Open',         filed_date: '2026-02-16', resolved_date: null,         resolution_notes: null,                            credit_amount: null,   reference_number: 'DSP-CMCST-2026-002', notes: 'Comcast SD-WAN billed $645 vs contracted $620' },
      { disputes_id: 4, line_items_id: 18, invoices_id: 10, accounts_id: 6, dispute_type: 'Overcharge',        amount: 70.00,   status: 'Under Review', filed_date: '2026-02-19', resolved_date: null,         resolution_notes: null,                            credit_amount: null,   reference_number: 'DSP-WNS-2026-004',   notes: 'Windstream billed $1,050 for Seattle SD-WAN vs contracted $980' },
      { disputes_id: 5, line_items_id: 3,  invoices_id: 1,  accounts_id: 1, dispute_type: 'Missing Credit',    amount: 150.00,  status: 'Credited',     filed_date: '2026-01-15', resolved_date: '2026-02-05', resolution_notes: 'Credit applied on next invoice', credit_amount: 150.00, reference_number: 'DSP-ATT-2026-005',   notes: 'Missing promo credit from Q4 2025 agreement' },
      { disputes_id: 6, line_items_id: 20, invoices_id: 11, accounts_id: 8, dispute_type: 'Duplicate Charge',  amount: 520.00,  status: 'Open',         filed_date: '2026-02-25', resolved_date: null,         resolution_notes: null,                            credit_amount: null,   reference_number: 'DSP-CROWN-2026-006', notes: 'Crown Castle DIA billed twice for same circuit Feb cycle' },
      { disputes_id: 7, line_items_id: 22, invoices_id: 12, accounts_id: 3, dispute_type: 'Wrong Rate',        amount: 85.00,   status: 'Denied',       filed_date: '2026-01-28', resolved_date: '2026-02-18', resolution_notes: 'Vendor claims rate increase per contract clause 4.2', credit_amount: 0.00,  reference_number: 'DSP-LUMEN-2026-007', notes: 'Lumen Chicago rate higher than expected after renewal' },
      { disputes_id: 8, line_items_id: null, invoices_id: 13, accounts_id: 9, dispute_type: 'Service Not Delivered', amount: 445.00, status: 'Closed', filed_date: '2025-12-01', resolved_date: '2026-01-10', resolution_notes: 'Spectrum confirmed circuit disconnect; final bill voided', credit_amount: 445.00, reference_number: 'DSP-SPEC-2025-008', notes: 'Billed after disconnect order confirmed' },
    ]);
  }

  // â”€â”€ locations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('locations').insert([
    { locations_id: 1,  name: 'Chicago HQ',              site_code: 'CHI-HQ',   site_type: 'Office',       address: '200 W Jackson Blvd',      city: 'Chicago',     state: 'IL', zip: '60606', country: 'USA', contact_name: 'Ben Carruthers',  contact_phone: '312-555-0101', contact_email: 'bcarruthers@corp.com',    status: 'Active',   notes: 'Main corporate headquarters â€” 8 floors' },
    { locations_id: 2,  name: 'Dallas Branch Office',    site_code: 'DAL-BR1',  site_type: 'Office',       address: '1700 Pacific Ave',         city: 'Dallas',      state: 'TX', zip: '75201', country: 'USA', contact_name: 'Gwen Fontaine',   contact_phone: '214-555-0188', contact_email: 'gfontaine@corp.com',      status: 'Active',   notes: 'Regional sales office â€” 2nd floor' },
    { locations_id: 3,  name: 'New York Office',         site_code: 'NYC-OFF',  site_type: 'Office',       address: '230 Park Ave',             city: 'New York',    state: 'NY', zip: '10169', country: 'USA', contact_name: 'Marcus Yuen',     contact_phone: '212-555-0234', contact_email: 'myuen@corp.com',          status: 'Active',   notes: 'East coast finance hub' },
    { locations_id: 4,  name: 'Austin Office',           site_code: 'AUS-OFF',  site_type: 'Office',       address: '98 San Jacinto Blvd',      city: 'Austin',      state: 'TX', zip: '78701', country: 'USA', contact_name: 'Priya Sharma',    contact_phone: '512-555-0312', contact_email: 'psharma@corp.com',        status: 'Active',   notes: 'Tech team expansion site â€” circuit pending' },
    { locations_id: 5,  name: 'Phoenix Branch',          site_code: 'PHX-BR1',  site_type: 'Office',       address: '2525 E Camelback Rd',      city: 'Phoenix',     state: 'AZ', zip: '85016', country: 'USA', contact_name: 'Ron Decker',      contact_phone: '602-555-0456', contact_email: 'rdecker@corp.com',        status: 'Active',   notes: '' },
    { locations_id: 6,  name: 'Seattle HQ West',         site_code: 'SEA-HQ',   site_type: 'Office',       address: '1420 5th Ave',             city: 'Seattle',     state: 'WA', zip: '98101', country: 'USA', contact_name: 'Aisha Brennan',   contact_phone: '206-555-0677', contact_email: 'abrennan@corp.com',       status: 'Active',   notes: 'Western region HQ â€” SD-WAN primary site' },
    { locations_id: 7,  name: 'Denver Branch',           site_code: 'DEN-BR1',  site_type: 'Office',       address: '1125 17th St',             city: 'Denver',      state: 'CO', zip: '80202', country: 'USA', contact_name: 'Chris Kowalski',  contact_phone: '720-555-0091', contact_email: 'ckowalski@corp.com',      status: 'Active',   notes: '' },
    { locations_id: 8,  name: 'Chicago Data Center',     site_code: 'CHI-DC1',  site_type: 'Data Center',  address: '350 E Cermak Rd',          city: 'Chicago',     state: 'IL', zip: '60616', country: 'USA', contact_name: 'NOC Operations',  contact_phone: '312-555-0800', contact_email: 'noc@colocrossings.com',   status: 'Active',   notes: 'Primary colocation â€” Lumen Wavelength termination point' },
    { locations_id: 9,  name: 'Los Angeles Data Center', site_code: 'LAX-DC1',  site_type: 'Data Center',  address: '900 N Alameda St',         city: 'Los Angeles', state: 'CA', zip: '90012', country: 'USA', contact_name: 'NOC West',        contact_phone: '213-555-0900', contact_email: 'noc-west@colocrossings.com', status: 'Active', notes: 'New Lumen wavelength circuit pending install' },
    { locations_id: 10, name: 'NYC Midtown Small Cell',  site_code: 'NYC-SC1',  site_type: 'Remote',       address: '550 7th Ave',              city: 'New York',    state: 'NY', zip: '10018', country: 'USA', contact_name: 'Crown Castle NOC', contact_phone: '888-632-2122', contact_email: 'noc@crowncastle.com',    status: 'Active',   notes: 'Crown Castle small cell node â€” street-level install' },
    { locations_id: 11, name: 'Miami Office',            site_code: 'MIA-OFF',  site_type: 'Office',       address: '1 SE 3rd Ave',             city: 'Miami',       state: 'FL', zip: '33131', country: 'USA', contact_name: 'Yvette Calderon', contact_phone: '305-555-0141', contact_email: 'ycalderon@corp.com',      status: 'Inactive', notes: 'Cancelled â€” lease not renewed Q4 2025' },
    { locations_id: 12, name: 'Los Angeles West Office', site_code: 'LAX-OFF',  site_type: 'Office',       address: '10960 Wilshire Blvd',      city: 'Los Angeles', state: 'CA', zip: '90024', country: 'USA', contact_name: 'Derek Tanaka',    contact_phone: '310-555-0277', contact_email: 'dtanaka@corp.com',        status: 'Inactive', notes: 'Spectrum coax disconnected Nov 2025 â€” circuit migrated' },
    { locations_id: 13, name: 'Denver Colocation',       site_code: 'DEN-COL1', site_type: 'Colocation',   address: '910 15th St',              city: 'Denver',      state: 'CO', zip: '80202', country: 'USA', contact_name: 'Zayo NOC',        contact_phone: '844-492-9624', contact_email: 'noc@zayo.com',            status: 'Active',   notes: 'Zayo dark fiber origination point â€” Denver end' },
  ]);

  // â”€â”€ field_catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('field_catalog').insert([
    // Circuit Types
    { field_catalog_id: 1,  category: 'Circuit Type', label: 'MPLS',         value: 'MPLS',         sort_order: 1,  is_active: true,  description: 'Multi-Protocol Label Switching' },
    { field_catalog_id: 2,  category: 'Circuit Type', label: 'DIA',          value: 'DIA',          sort_order: 2,  is_active: true,  description: 'Dedicated Internet Access' },
    { field_catalog_id: 3,  category: 'Circuit Type', label: 'SD-WAN',       value: 'SD-WAN',       sort_order: 3,  is_active: true,  description: 'Software Defined WAN' },
    { field_catalog_id: 4,  category: 'Circuit Type', label: 'Dark Fiber',   value: 'Dark Fiber',   sort_order: 4,  is_active: true,  description: 'Unlit fiber IRU' },
    { field_catalog_id: 5,  category: 'Circuit Type', label: 'Wavelength',   value: 'Wavelength',   sort_order: 5,  is_active: true,  description: 'Optical wavelength service' },
    { field_catalog_id: 6,  category: 'Circuit Type', label: 'Wireless',     value: 'Wireless',     sort_order: 6,  is_active: true,  description: '4G/5G wireless service' },
    { field_catalog_id: 7,  category: 'Circuit Type', label: 'Small Cell',   value: 'Small Cell',   sort_order: 7,  is_active: true,  description: 'Small cell wireless node' },
    { field_catalog_id: 8,  category: 'Circuit Type', label: 'Coax/Cable',   value: 'Coax/Cable',   sort_order: 8,  is_active: true,  description: 'Cable modem / coax broadband' },
    { field_catalog_id: 9,  category: 'Circuit Type', label: 'Private IP',   value: 'Private IP',   sort_order: 9,  is_active: true,  description: 'Carrier private IP network' },
    // Bandwidth Options
    { field_catalog_id: 10, category: 'Bandwidth',    label: '50 Mbps',      value: '50 Mbps',      sort_order: 1,  is_active: true,  description: '' },
    { field_catalog_id: 11, category: 'Bandwidth',    label: '100 Mbps',     value: '100 Mbps',     sort_order: 2,  is_active: true,  description: '' },
    { field_catalog_id: 12, category: 'Bandwidth',    label: '200 Mbps',     value: '200 Mbps',     sort_order: 3,  is_active: true,  description: '' },
    { field_catalog_id: 13, category: 'Bandwidth',    label: '500 Mbps',     value: '500 Mbps',     sort_order: 4,  is_active: true,  description: '' },
    { field_catalog_id: 14, category: 'Bandwidth',    label: '1 Gbps',       value: '1 Gbps',       sort_order: 5,  is_active: true,  description: '' },
    { field_catalog_id: 15, category: 'Bandwidth',    label: '10 Gbps',      value: '10 Gbps',      sort_order: 6,  is_active: true,  description: '' },
    // Site Types
    { field_catalog_id: 16, category: 'Site Type',    label: 'Office',       value: 'Office',       sort_order: 1,  is_active: true,  description: 'Standard corporate office' },
    { field_catalog_id: 17, category: 'Site Type',    label: 'Data Center',  value: 'Data Center',  sort_order: 2,  is_active: true,  description: 'Colocation or owned data center' },
    { field_catalog_id: 18, category: 'Site Type',    label: 'Remote',       value: 'Remote',       sort_order: 3,  is_active: true,  description: 'Remote or field location' },
    { field_catalog_id: 19, category: 'Site Type',    label: 'Warehouse',    value: 'Warehouse',    sort_order: 4,  is_active: true,  description: 'Distribution or warehouse facility' },
    { field_catalog_id: 20, category: 'Site Type',    label: 'Colocation',   value: 'Colocation',   sort_order: 5,  is_active: true,  description: 'Third-party colocation cage' },
    // Dispute Types
    { field_catalog_id: 21, category: 'Dispute Type', label: 'Overcharge',           value: 'Overcharge',           sort_order: 1, is_active: true, description: 'Billed amount exceeds contracted rate' },
    { field_catalog_id: 22, category: 'Dispute Type', label: 'Duplicate Charge',     value: 'Duplicate Charge',     sort_order: 2, is_active: true, description: 'Same charge billed more than once' },
    { field_catalog_id: 23, category: 'Dispute Type', label: 'Wrong Rate',           value: 'Wrong Rate',           sort_order: 3, is_active: true, description: 'Rate applied does not match contract' },
    { field_catalog_id: 24, category: 'Dispute Type', label: 'Service Not Delivered','value': 'Service Not Delivered', sort_order: 4, is_active: true, description: 'Charged for service not rendered' },
    { field_catalog_id: 25, category: 'Dispute Type', label: 'Missing Credit',       value: 'Missing Credit',       sort_order: 5, is_active: true, description: 'Expected credit not applied' },
  ]);

  // â”€â”€ vendor_remit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('vendor_remit').insert([
    { vendor_remit_id: 1, accounts_id: 1, remit_name: 'AT&T Telecom Remittance',        remit_code: 'ATT-REM-01', payment_method: 'ACH',   bank_name: 'JPMorgan Chase',    routing_number: '021000021', bank_account_number: '4001123456789', remit_address: 'PO Box 5001',       remit_city: 'Carol Stream', remit_state: 'IL', remit_zip: '60197', status: 'Active', notes: 'ACH credit â€” net 30' },
    { vendor_remit_id: 2, accounts_id: 1, remit_name: 'AT&T Managed Security Remit',    remit_code: 'ATT-REM-02', payment_method: 'Wire',  bank_name: 'JPMorgan Chase',    routing_number: '021000021', bank_account_number: '4001198765432', remit_address: 'PO Box 5010',       remit_city: 'Carol Stream', remit_state: 'IL', remit_zip: '60197', status: 'Active', notes: 'Wire transfer â€” separate BU billing' },
    { vendor_remit_id: 3, accounts_id: 2, remit_name: 'Verizon Business ACH',           remit_code: 'VZB-REM-01', payment_method: 'ACH',   bank_name: 'Bank of America',   routing_number: '026009593', bank_account_number: '8800441122334', remit_address: 'PO Box 15124',      remit_city: 'Albany',       remit_state: 'NY', remit_zip: '12212', status: 'Active', notes: '' },
    { vendor_remit_id: 4, accounts_id: 3, remit_name: 'Lumen Technologies Check',       remit_code: 'LMN-REM-01', payment_method: 'Check', bank_name: null,               routing_number: null,        bank_account_number: null,           remit_address: 'PO Box 52187',      remit_city: 'Phoenix',      remit_state: 'AZ', remit_zip: '85072', status: 'Active', notes: 'Check payable to Lumen Technologies Inc.' },
    { vendor_remit_id: 5, accounts_id: 5, remit_name: 'Zayo Group Wire',                remit_code: 'ZYO-REM-01', payment_method: 'Wire',  bank_name: 'Wells Fargo',       routing_number: '121000248', bank_account_number: '7712345678901', remit_address: '1821 30th St Ste 100', remit_city: 'Boulder',   remit_state: 'CO', remit_zip: '80301', status: 'Active', notes: 'Wire â€” include invoice number in memo field' },
    { vendor_remit_id: 6, accounts_id: 6, remit_name: 'Windstream Enterprise EFT',      remit_code: 'WNS-REM-01', payment_method: 'EFT',   bank_name: 'Regions Bank',      routing_number: '062000019', bank_account_number: '3300987654321', remit_address: '4001 Rodney Parham Rd', remit_city: 'Little Rock', remit_state: 'AR', remit_zip: '72212', status: 'Active', notes: '' },
    { vendor_remit_id: 7, accounts_id: 7, remit_name: 'T-Mobile Business ACH',          remit_code: 'TMO-REM-01', payment_method: 'ACH',   bank_name: 'Deutsche Bank',     routing_number: '021001033', bank_account_number: '5500213456789', remit_address: 'PO Box 37380',      remit_city: 'Philadelphia', remit_state: 'PA', remit_zip: '19101', status: 'Active', notes: 'ACH â€” 25-day terms from invoice date' },
    { vendor_remit_id: 8, accounts_id: 9, remit_name: 'Spectrum Enterprise (Inactive)', remit_code: 'SPE-REM-01', payment_method: 'Check', bank_name: null,               routing_number: null,        bank_account_number: null,           remit_address: 'PO Box 223085',     remit_city: 'Pittsburgh',   remit_state: 'PA', remit_zip: '15251', status: 'Inactive', notes: 'Vendor inactive â€” no new payments' },
  ]);

  // â”€â”€ announcements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  await knex('announcements').insert([
    { announcements_id: 1, title: 'Scheduled Maintenance â€” March 15, 2026',       message: 'TEMS will be offline for database maintenance from 2:00 AM â€“ 4:00 AM CT on March 15. Plan accordingly.', type: 'warning', is_active: true,  start_date: '2026-03-10', end_date: '2026-03-15', created_by: null },
    { announcements_id: 2, title: 'Windstream Contract Expiring April 2026',       message: 'Contract WNS-SDWAN-2024 expires April 14, 2026. Renegotiation should be complete before March 31 to avoid month-to-month rates.', type: 'danger', is_active: true, start_date: '2026-03-01', end_date: '2026-04-14', created_by: null },
    { announcements_id: 3, title: 'New Feature: Field Catalog & Spend Categories', message: 'Admins can now configure dropdown options via Field Catalog and classify spend using Spend Categories. See Administration menu.', type: 'info', is_active: true, start_date: '2026-03-07', end_date: null, created_by: null },
    { announcements_id: 4, title: 'Q1 Invoice Review Complete',                    message: 'All January and February invoices have been reviewed. Outstanding disputes: 4 open. See Disputes for details.', type: 'success', is_active: true, start_date: '2026-03-05', end_date: '2026-03-20', created_by: null },
  ]);

  // â”€â”€ spend_categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Insert top-level parents first
  await knex('spend_categories').insert([
    { spend_categories_id: 1,  name: 'Network Services',          code: 'NET',     description: 'All wide-area and local network connectivity',          parent_id: null, is_active: true },
    { spend_categories_id: 2,  name: 'Wireless Services',         code: 'WRL',     description: 'Mobile and wireless fleet services',                    parent_id: null, is_active: true },
    { spend_categories_id: 3,  name: 'Cloud & Colocation',        code: 'CLD',     description: 'Data center hosting, colocation, and cloud connect',    parent_id: null, is_active: true },
    { spend_categories_id: 4,  name: 'Managed Services',          code: 'MGD',     description: 'Managed network, security, and SD-WAN services',        parent_id: null, is_active: true },
    { spend_categories_id: 5,  name: 'Taxes & Surcharges',        code: 'TAX',     description: 'Regulatory fees, federal USF, and state taxes',         parent_id: null, is_active: true },
  ]);
  // Insert children
  await knex('spend_categories').insert([
    { spend_categories_id: 6,  name: 'MPLS / Private IP',         code: 'NET-MPLS',description: 'MPLS ports and private IP circuits',                    parent_id: 1, is_active: true },
    { spend_categories_id: 7,  name: 'Dedicated Internet Access', code: 'NET-DIA', description: 'Dedicated fiber internet access circuits',               parent_id: 1, is_active: true },
    { spend_categories_id: 8,  name: 'Dark Fiber / Wavelength',   code: 'NET-FIB', description: 'Lit and unlit fiber transport',                          parent_id: 1, is_active: true },
    { spend_categories_id: 9,  name: '4G/5G Wireless Lines',      code: 'WRL-MOB', description: 'Business mobile lines and fleet plans',                  parent_id: 2, is_active: true },
    { spend_categories_id: 10, name: 'Small Cell Nodes',          code: 'WRL-SC',  description: 'Crown Castle and similar small cell deployments',        parent_id: 2, is_active: true },
    { spend_categories_id: 11, name: 'Colocation Hosting',        code: 'CLD-COL', description: 'Third-party colo cage and power',                        parent_id: 3, is_active: true },
    { spend_categories_id: 12, name: 'Cloud Interconnect',        code: 'CLD-CNX', description: 'Direct cloud connect circuits (AWS, Azure, GCP)',         parent_id: 3, is_active: true },
    { spend_categories_id: 13, name: 'SD-WAN Managed',            code: 'MGD-SDW', description: 'Managed SD-WAN per-site fees',                           parent_id: 4, is_active: true },
    { spend_categories_id: 14, name: 'Managed Security',          code: 'MGD-SEC', description: 'Managed firewall, SIEM, and security services',          parent_id: 4, is_active: true },
    { spend_categories_id: 15, name: 'Federal USF',               code: 'TAX-USF', description: 'Universal Service Fund passthrough surcharges',           parent_id: 5, is_active: true },
    { spend_categories_id: 16, name: 'State & Local Taxes',       code: 'TAX-STT', description: 'State telecom taxes and regulatory recovery fees',        parent_id: 5, is_active: true },
  ]);
};
