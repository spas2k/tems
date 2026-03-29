// ============================================================
// Seed: Test Data for TEMS
// Inserts realistic telecommunications data across all
// major entities while maintaining FK relationships
// ============================================================

exports.seed = async function (knex) {
  // ──────────────────────────────────────────────────────
  // 1. REFERENCE DATA (no FK dependencies)
  // ──────────────────────────────────────────────────────

  // Currencies
  const currencies = [
    { currency_code: 'USD', name: 'US Dollar', symbol: '$', status: 'Active' },
    { currency_code: 'EUR', name: 'Euro', symbol: '€', status: 'Active' },
    { currency_code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', status: 'Active' },
    { currency_code: 'GBP', name: 'British Pound', symbol: '£', status: 'Active' },
  ];
  await knex.raw('TRUNCATE TABLE currencies CASCADE');
  const currenciesResult = await knex('currencies').insert(currencies).returning('*');
  const currencyMap = Object.fromEntries(currenciesResult.map(c => [c.currency_code, c.currencies_id]));

  // Locations
  const locations = [
    {
      name: 'New York HQ',
      site_code: 'NYC-HQ',
      site_type: 'Headquarters',
      address: '123 Park Avenue',
      city: 'New York',
      state: 'NY',
      zip: '10022',
      country: 'USA',
      contact_name: 'John Smith',
      contact_phone: '212-555-0100',
      contact_email: 'john.smith@company.com',
      status: 'Active',
    },
    {
      name: 'Chicago Data Center',
      site_code: 'CHI-DC1',
      site_type: 'Data Center',
      address: '456 West Lake Street',
      city: 'Chicago',
      state: 'IL',
      zip: '60661',
      country: 'USA',
      contact_name: 'Sarah Johnson',
      contact_phone: '312-555-0200',
      contact_email: 'sarah.johnson@company.com',
      status: 'Active',
    },
    {
      name: 'San Francisco Office',
      site_code: 'SF-OFF1',
      site_type: 'Office',
      address: '789 Market Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94103',
      country: 'USA',
      contact_name: 'Michael Chen',
      contact_phone: '415-555-0300',
      contact_email: 'michael.chen@company.com',
      status: 'Active',
    },
    {
      name: 'Atlanta Regional Office',
      site_code: 'ATL-OFF2',
      site_type: 'Office',
      address: '321 Peachtree Street',
      city: 'Atlanta',
      state: 'GA',
      zip: '30303',
      country: 'USA',
      contact_name: 'Emily Davis',
      contact_phone: '404-555-0400',
      contact_email: 'emily.davis@company.com',
      status: 'Active',
    },
  ];
  await knex('locations').del();
  const locationsResult = await knex('locations').insert(locations).returning('*');
  const locationMap = Object.fromEntries(locationsResult.map(l => [l.site_code, l.locations_id]));

  // Company Codes
  const companyCodes = [
    { name: 'US Operations', code: 'USO', entity_type: 'Division', country: 'USA', currency: 'USD', status: 'Active' },
    { name: 'International', code: 'INTL', entity_type: 'Division', country: 'USA', currency: 'USD', status: 'Active' },
    { name: 'Technology', code: 'TECH', entity_type: 'Department', country: 'USA', currency: 'USD', status: 'Active' },
  ];
  await knex('company_codes').del();
  const companyCodesResult = await knex('company_codes').insert(companyCodes).returning('*');
  const companyCodeMap = Object.fromEntries(companyCodesResult.map(c => [c.code, c.company_codes_id]));

  // Bank Cost Centers
  const costCenters = [
    { name: 'IT Infrastructure', code: 'CC-001', department: 'IT', manager: 'IT Director', status: 'Active' },
    { name: 'Network Operations', code: 'CC-002', department: 'Network', manager: 'Network Manager', status: 'Active' },
    { name: 'Telecommunications', code: 'CC-003', department: 'Telecom', manager: 'Telecom Lead', status: 'Active' },
    { name: 'Data Center', code: 'CC-004', department: 'Infrastructure', manager: 'DC Manager', status: 'Active' },
  ];
  await knex('bank_cost_centers').del();
  const costCentersResult = await knex('bank_cost_centers').insert(costCenters).returning('*');
  const costCenterMap = Object.fromEntries(costCentersResult.map(c => [c.code, c.bank_cost_centers_id]));

  // Spend Categories
  const spendCategories = [
    { name: 'Telecom Services', code: 'TS-001', description: 'Telecommunications and voice services', is_active: true },
    { name: 'Data Services', code: 'DS-001', description: 'Data connectivity and bandwidth', is_active: true },
    { name: 'IT Infrastructure', code: 'IT-001', description: 'Information technology equipment', is_active: true },
  ];
  await knex('spend_categories').del();
  const spendCatsResult = await knex('spend_categories').insert(spendCategories).returning('*');
  const spendCatMap = Object.fromEntries(spendCatsResult.map(s => [s.code, s.spend_categories_id]));

  // ──────────────────────────────────────────────────────
  // 2. USERS (already created by auth seed, fetch them)
  // ──────────────────────────────────────────────────────
  const usersResult = await knex('users').select('users_id', 'email').limit(3);
  const userMap = Object.fromEntries(usersResult.map(u => [u.email, u.users_id]));
  const adminUserId = userMap['admin@tems.local'];
  const managerUserId = userMap['manager@tems.local'] || adminUserId;
  const viewerUserId = userMap['viewer@tems.local'] || adminUserId;

  // ──────────────────────────────────────────────────────
  // 3. VENDORS
  // ──────────────────────────────────────────────────────
  const vendors = [
    {
      name: 'AT&T Business',
      vendor_number: 'ATT-001',
      vendor_type: 'Telecom Carrier',
      contact_name: 'Robert Wilson',
      contact_email: 'robert.wilson@att.com',
      contact_phone: '800-331-0500',
      country: 'USA',
      currency_id: currencyMap['USD'],
      tier: 'Tier-1',
      fourth_party_vendor: false,
      website: 'https://business.att.com',
      status: 'Active',
      created_by: adminUserId,
    },
    {
      name: 'Verizon Business',
      vendor_number: 'VZ-001',
      vendor_type: 'Telecom Carrier',
      contact_name: 'Jennifer Martinez',
      contact_email: 'jennifer.martinez@verizon.com',
      contact_phone: '800-922-0204',
      country: 'USA',
      currency_id: currencyMap['USD'],
      tier: 'Tier-1',
      fourth_party_vendor: false,
      website: 'https://business.verizon.com',
      status: 'Active',
      created_by: adminUserId,
    },
    {
      name: 'Comcast Business',
      vendor_number: 'CMC-001',
      vendor_type: 'Telecom Carrier',
      contact_name: 'David Thompson',
      contact_email: 'david.thompson@comcast.com',
      contact_phone: '866-429-3085',
      country: 'USA',
      currency_id: currencyMap['USD'],
      tier: 'Tier-2',
      fourth_party_vendor: false,
      website: 'https://business.comcast.com',
      status: 'Active',
      created_by: managerUserId,
    },
    {
      name: 'Level 3 Communications',
      vendor_number: 'LEVEL3-001',
      vendor_type: 'Network Carrier',
      contact_name: 'Amanda Brown',
      contact_email: 'amanda.brown@level3.com',
      contact_phone: '877-453-8353',
      country: 'USA',
      currency_id: currencyMap['USD'],
      tier: 'Tier-2',
      fourth_party_vendor: false,
      website: 'https://www.lumen.com',
      status: 'Active',
      created_by: managerUserId,
    },
  ];
  await knex('vendors').del();
  const vendorsResult = await knex('vendors').insert(vendors).returning('*');
  const vendorMap = Object.fromEntries(vendorsResult.map(v => [v.vendor_number, v.vendors_id]));

  // ──────────────────────────────────────────────────────
  // 4. VENDOR REMIT INFO
  // ──────────────────────────────────────────────────────
  const vendorRemits = [
    {
      vendors_id: vendorMap['ATT-001'],
      remit_name: 'AT&T Accounts Payable',
      remit_code: 'ATT-AP',
      payment_method: 'ACH',
      bank_name: 'Bank of America',
      routing_number: '111111116',
      bank_account_number: '098765432109876',
      remit_address: '208 S. Akard Street',
      remit_city: 'Dallas',
      remit_state: 'TX',
      remit_zip: '75202',
      status: 'Active',
    },
    {
      vendors_id: vendorMap['VZ-001'],
      remit_name: 'Verizon Business AP',
      remit_code: 'VZ-AP',
      payment_method: 'ACH',
      bank_name: 'Citi Bank',
      routing_number: '021000021',
      bank_account_number: '123456789012345',
      remit_address: '1095 Avenue of the Americas',
      remit_city: 'New York',
      remit_state: 'NY',
      remit_zip: '10036',
      status: 'Active',
    },
    {
      vendors_id: vendorMap['CMC-001'],
      remit_name: 'Comcast Business AP',
      remit_code: 'CMC-AP',
      payment_method: 'Wire Transfer',
      bank_name: 'PNC Bank',
      routing_number: '043000096',
      bank_account_number: '111222333444555',
      remit_address: '1701 John F. Kennedy Boulevard',
      remit_city: 'Philadelphia',
      remit_state: 'PA',
      remit_zip: '19103',
      status: 'Active',
    },
  ];
  await knex('vendor_remit').del();
  await knex('vendor_remit').insert(vendorRemits);

  // ──────────────────────────────────────────────────────
  // 5. ACCOUNTS (linked to vendors, locations, company codes, users)
  // ──────────────────────────────────────────────────────
  const accounts = [
    {
      vendors_id: vendorMap['ATT-001'],
      name: 'AT&T - Corporate Primary',
      account_number: 'ATT-ACC-001',
      subaccount_number: 'ATT-SUB-001',
      assigned_user_id: managerUserId,
      team: 'Network Operations',
      account_hierarchy: 'Corporate/Telecom',
      currency_id: currencyMap['USD'],
      company_code_id: companyCodeMap['USO'],
      ship_to_location_id: locationMap['NYC-HQ'],
      asset_location_id: locationMap['CHI-DC1'],
      tax_analyst_id: viewerUserId,
      payment_info: JSON.stringify({ method: 'ACH', terms: 'Net 30' }),
      allocation_settings: JSON.stringify({ auto_allocate: true, default_cc: 'CC-003' }),
      contact_details: JSON.stringify({
        primary_contact: 'John Smith',
        phone: '212-555-0100',
        email: 'john.smith@company.com',
      }),
      status: 'Active',
      created_by: adminUserId,
    },
    {
      vendors_id: vendorMap['ATT-001'],
      name: 'AT&T - Regional West',
      account_number: 'ATT-ACC-002',
      subaccount_number: 'ATT-SUB-002',
      assigned_user_id: managerUserId,
      team: 'Network Operations',
      account_hierarchy: 'Regional/West',
      currency_id: currencyMap['USD'],
      company_code_id: companyCodeMap['USO'],
      ship_to_location_id: locationMap['SF-OFF1'],
      asset_location_id: locationMap['SF-OFF1'],
      tax_analyst_id: viewerUserId,
      status: 'Active',
      created_by: managerUserId,
    },
    {
      vendors_id: vendorMap['VZ-001'],
      name: 'Verizon - Corporate',
      account_number: 'VZ-ACC-001',
      subaccount_number: 'VZ-SUB-001',
      assigned_user_id: adminUserId,
      team: 'Network Operations',
      account_hierarchy: 'Corporate/Telecom',
      currency_id: currencyMap['USD'],
      company_code_id: companyCodeMap['INTL'],
      ship_to_location_id: locationMap['NYC-HQ'],
      asset_location_id: locationMap['CHI-DC1'],
      status: 'Active',
      created_by: adminUserId,
    },
    {
      vendors_id: vendorMap['CMC-001'],
      name: 'Comcast - Primary',
      account_number: 'CMC-ACC-001',
      assigned_user_id: managerUserId,
      team: 'Network Operations',
      account_hierarchy: 'Corporate/Data',
      currency_id: currencyMap['USD'],
      company_code_id: companyCodeMap['TECH'],
      ship_to_location_id: locationMap['ATL-OFF2'],
      asset_location_id: locationMap['ATL-OFF2'],
      status: 'Active',
      created_by: managerUserId,
    },
  ];
  await knex('accounts').del();
  const accountsResult = await knex('accounts').insert(accounts).returning('*');
  const accountMap = Object.fromEntries(accountsResult.map(a => [a.account_number, a.accounts_id]));

  // ──────────────────────────────────────────────────────
  // 6. CONTRACTS (linked to vendors, currencies, users)
  // ──────────────────────────────────────────────────────
  const contracts = [
    {
      vendors_id: vendorMap['ATT-001'],
      contract_number: 'ATT-CONT-001',
      contract_name: 'AT&T Enterprise Voice & Data 2026',
      type: 'Master Service Agreement',
      subtype: 'Voice and Data',
      currency_id: currencyMap['USD'],
      start_date: new Date('2025-08-01'),
      expiration_date: new Date('2026-07-31'),
      term_type: 'Annual',
      term_months: 12,
      contracted_rate: 5500.00,
      rate_unit: 'Monthly',
      minimum_spend: 60000.00,
      contract_value: 66000.00,
      product_service_types: 'Voice,Data,Internet',
      business_line: 'Telecom',
      status: 'Active',
      auto_renew: true,
      created_by: adminUserId,
    },
    {
      vendors_id: vendorMap['VZ-001'],
      contract_number: 'VZ-CONT-001',
      contract_name: 'Verizon Digital Market Solutions',
      type: 'Service Agreement',
      subtype: 'Managed Services',
      currency_id: currencyMap['USD'],
      start_date: new Date('2025-06-15'),
      expiration_date: new Date('2027-06-14'),
      term_type: '2-Year',
      term_months: 24,
      contracted_rate: 8200.00,
      rate_unit: 'Monthly',
      minimum_spend: 150000.00,
      contract_value: 196800.00,
      product_service_types: 'Data,Cloud Services',
      business_line: 'Technology',
      status: 'Active',
      auto_renew: false,
      created_by: managerUserId,
    },
    {
      vendors_id: vendorMap['CMC-001'],
      contract_number: 'CMC-CONT-001',
      contract_name: 'Comcast Connectivity Services',
      type: 'Service Agreement',
      subtype: 'Internet and Cable',
      currency_id: currencyMap['USD'],
      start_date: new Date('2024-01-01'),
      expiration_date: new Date('2026-12-31'),
      term_type: '3-Year',
      term_months: 36,
      contracted_rate: 2800.00,
      rate_unit: 'Monthly',
      minimum_spend: 84000.00,
      contract_value: 100800.00,
      product_service_types: 'Internet,Video',
      business_line: 'Infrastructure',
      status: 'Active',
      auto_renew: true,
      created_by: managerUserId,
    },
    {
      vendors_id: vendorMap['LEVEL3-001'],
      contract_number: 'L3-CONT-001',
      contract_name: 'Lumen Wavelength Services',
      type: 'Service Agreement',
      currency_id: currencyMap['USD'],
      start_date: new Date('2025-03-01'),
      expiration_date: new Date('2026-02-28'),
      term_type: 'Annual',
      term_months: 12,
      contracted_rate: 6500.00,
      rate_unit: 'Monthly',
      minimum_spend: 72000.00,
      contract_value: 78000.00,
      product_service_types: 'Wavelength,MPLS',
      business_line: 'Network',
      status: 'Active',
      auto_renew: false,
      created_by: adminUserId,
    },
  ];
  await knex('contracts').del();
  const contractsResult = await knex('contracts').insert(contracts).returning('*');
  const contractMap = Object.fromEntries(contractsResult.map(c => [c.contract_number, c.contracts_id]));

  // ──────────────────────────────────────────────────────
  // 7. USOC CODES (Universal Service Order Codes - Telecom standard)
  // ──────────────────────────────────────────────────────
  const usocCodes = [
    // Voice Services
    {
      usoc_code: 'WLS800',
      description: 'Wireless Local Service - 800 Plan',
      category: 'Voice',
      sub_category: 'Wireless',
      default_mrc: 25.00,
      default_nrc: 50.00,
      unit: 'Line',
      status: 'Active',
    },
    {
      usoc_code: 'LLS99',
      description: 'Local Long Distance Service',
      category: 'Voice',
      sub_category: 'Long Distance',
      default_mrc: 50.00,
      default_nrc: 0,
      unit: 'Service',
      status: 'Active',
    },
    // Data Services
    {
      usoc_code: 'DS1-56',
      description: 'Data Service 56Kbps',
      category: 'Data',
      sub_category: 'Dial-up',
      default_mrc: 35.00,
      default_nrc: 100.00,
      unit: 'Circuit',
      status: 'Active',
    },
    {
      usoc_code: 'T1',
      description: 'T1 Dedicated Connection',
      category: 'Data',
      sub_category: 'Dedicated',
      default_mrc: 450.00,
      default_nrc: 500.00,
      unit: 'Circuit',
      status: 'Active',
    },
    {
      usoc_code: 'ETH-100',
      description: 'Ethernet 100Mbps',
      category: 'Data',
      sub_category: 'Ethernet',
      default_mrc: 800.00,
      default_nrc: 1200.00,
      unit: 'Connection',
      status: 'Active',
    },
    {
      usoc_code: 'ETH-1GB',
      description: 'Ethernet 1Gbps',
      category: 'Data',
      sub_category: 'Ethernet',
      default_mrc: 2500.00,
      default_nrc: 3000.00,
      unit: 'Connection',
      status: 'Active',
    },
    // Internet Services
    {
      usoc_code: 'INET-BB',
      description: 'Internet Broadband',
      category: 'Internet',
      sub_category: 'Broadband',
      default_mrc: 120.00,
      default_nrc: 200.00,
      unit: 'Service',
      status: 'Active',
    },
    {
      usoc_code: 'MPLS-10',
      description: 'MPLS VPN 10Mbps',
      category: 'Data',
      sub_category: 'VPN',
      default_mrc: 650.00,
      default_nrc: 800.00,
      unit: 'Service',
      status: 'Active',
    },
    {
      usoc_code: 'MPLS-50',
      description: 'MPLS VPN 50Mbps',
      category: 'Data',
      sub_category: 'VPN',
      default_mrc: 1200.00,
      default_nrc: 1500.00,
      unit: 'Service',
      status: 'Active',
    },
    // Installation & Support
    {
      usoc_code: 'INST-STD',
      description: 'Standard Installation',
      category: 'Installation',
      sub_category: 'Labor',
      default_mrc: 0,
      default_nrc: 300.00,
      unit: 'Occurrence',
      status: 'Active',
    },
    {
      usoc_code: 'INST-PREM',
      description: 'Premium Installation',
      category: 'Installation',
      sub_category: 'Labor',
      default_mrc: 0,
      default_nrc: 750.00,
      unit: 'Occurrence',
      status: 'Active',
    },
  ];
  await knex('usoc_codes').del();
  const usocResult = await knex('usoc_codes').insert(usocCodes).returning('*');
  const usocMap = Object.fromEntries(usocResult.map(u => [u.usoc_code, u.usoc_codes_id]));

  // ──────────────────────────────────────────────────────
  // 8. CONTRACT RATES (link contracts to USOC codes with rates)
  // ──────────────────────────────────────────────────────
  const contractRates = [
    // ATT Contract rates
    {
      contracts_id: contractMap['ATT-CONT-001'],
      usoc_codes_id: usocMap['WLS800'],
      mrc: 22.50,
      nrc: 45.00,
      effective_date: new Date('2025-08-01'),
      expiration_date: new Date('2026-07-31'),
      notes: 'Corporate wireless discount applied',
    },
    {
      contracts_id: contractMap['ATT-CONT-001'],
      usoc_codes_id: usocMap['T1'],
      mrc: 425.00,
      nrc: 450.00,
      effective_date: new Date('2025-08-01'),
      expiration_date: new Date('2026-07-31'),
      notes: 'Volume discount 5%',
    },
    {
      contracts_id: contractMap['ATT-CONT-001'],
      usoc_codes_id: usocMap['ETH-100'],
      mrc: 750.00,
      nrc: 1100.00,
      effective_date: new Date('2025-08-01'),
      expiration_date: new Date('2026-07-31'),
      notes: 'Promotional rate',
    },
    // VZ Contract rates
    {
      contracts_id: contractMap['VZ-CONT-001'],
      usoc_codes_id: usocMap['ETH-1GB'],
      mrc: 2300.00,
      nrc: 2500.00,
      effective_date: new Date('2025-06-15'),
      expiration_date: new Date('2027-06-14'),
      notes: '2-year commitment discount',
    },
    {
      contracts_id: contractMap['VZ-CONT-001'],
      usoc_codes_id: usocMap['MPLS-50'],
      mrc: 1100.00,
      nrc: 1400.00,
      effective_date: new Date('2025-06-15'),
      expiration_date: new Date('2027-06-14'),
      notes: 'Managed service included',
    },
    // CMC Contract rates
    {
      contracts_id: contractMap['CMC-CONT-001'],
      usoc_codes_id: usocMap['INET-BB'],
      mrc: 110.00,
      nrc: 180.00,
      effective_date: new Date('2024-01-01'),
      expiration_date: new Date('2026-12-31'),
      notes: '3-year term discount',
    },
    {
      contracts_id: contractMap['CMC-CONT-001'],
      usoc_codes_id: usocMap['ETH-100'],
      mrc: 700.00,
      nrc: 1000.00,
      effective_date: new Date('2024-01-01'),
      expiration_date: new Date('2026-12-31'),
    },
    // Level3 Contract rates
    {
      contracts_id: contractMap['L3-CONT-001'],
      usoc_codes_id: usocMap['MPLS-50'],
      mrc: 1050.00,
      nrc: 1300.00,
      effective_date: new Date('2025-03-01'),
      expiration_date: new Date('2026-02-28'),
      notes: 'Wavelength included',
    },
  ];
  await knex('contract_rates').del();
  await knex('contract_rates').insert(contractRates);

  // ──────────────────────────────────────────────────────
  // 9. ORDERS (linked to vendors, contracts, users)
  // ──────────────────────────────────────────────────────
  const orders = [
    {
      vendors_id: vendorMap['ATT-001'],
      contracts_id: contractMap['ATT-CONT-001'],
      order_number: 'ORD-ATT-001',
      description: 'Ethernet 100Mbps NYC-Chicago',
      contracted_rate: 750.00,
      order_date: new Date('2025-07-15'),
      due_date: new Date('2025-08-15'),
      status: 'Completed',
      assigned_users_id: managerUserId,
      notes: 'Installation completed on time',
    },
    {
      vendors_id: vendorMap['ATT-001'],
      contracts_id: contractMap['ATT-CONT-001'],
      order_number: 'ORD-ATT-002',
      description: 'T1 San Francisco Branch',
      contracted_rate: 425.00,
      order_date: new Date('2025-08-01'),
      due_date: new Date('2025-09-01'),
      status: 'In Progress',
      assigned_users_id: managerUserId,
      notes: 'Equipment on backorder, expected 2025-09-15',
    },
    {
      vendors_id: vendorMap['VZ-001'],
      contracts_id: contractMap['VZ-CONT-001'],
      order_number: 'ORD-VZ-001',
      description: 'Ethernet 1Gbps Upgrade',
      contracted_rate: 2300.00,
      order_date: new Date('2025-06-01'),
      due_date: new Date('2025-07-01'),
      status: 'Completed',
      assigned_users_id: adminUserId,
      notes: 'Upgraded from 100Mbps',
    },
    {
      vendors_id: vendorMap['CMC-001'],
      contracts_id: contractMap['CMC-CONT-001'],
      order_number: 'ORD-CMC-001',
      description: 'Broadband Installation Atlanta',
      contracted_rate: 110.00,
      order_date: new Date('2025-11-01'),
      due_date: new Date('2025-12-01'),
      status: 'Pending',
      assigned_users_id: managerUserId,
      notes: 'Awaiting customer site survey',
    },
  ];
  await knex('orders').del();
  const ordersResult = await knex('orders').insert(orders).returning('*');
  const orderMap = Object.fromEntries(ordersResult.map(o => [o.order_number, o.orders_id]));

  // ──────────────────────────────────────────────────────
  // 10. INVENTORY (linked to accounts, contracts, orders)
  // ──────────────────────────────────────────────────────
  const inventory = [
    {
      accounts_id: accountMap['ATT-ACC-001'],
      contracts_id: contractMap['ATT-CONT-001'],
      orders_id: orderMap['ORD-ATT-001'],
      inventory_number: 'INV-ATT-ETH-001',
      type: 'Ethernet',
      bandwidth: '100Mbps',
      location: 'NYC-CHI',
      contracted_rate: 750.00,
      status: 'Active',
      install_date: new Date('2025-08-15'),
    },
    {
      accounts_id: accountMap['ATT-ACC-002'],
      contracts_id: contractMap['ATT-CONT-001'],
      orders_id: orderMap['ORD-ATT-002'],
      inventory_number: 'INV-ATT-T1-001',
      type: 'T1',
      bandwidth: '1.544Mbps',
      location: 'SF-HQ',
      contracted_rate: 425.00,
      status: 'Pending',
      install_date: new Date('2025-09-15'),
    },
    {
      accounts_id: accountMap['VZ-ACC-001'],
      contracts_id: contractMap['VZ-CONT-001'],
      orders_id: orderMap['ORD-VZ-001'],
      inventory_number: 'INV-VZ-ETH-1GB',
      type: 'Ethernet',
      bandwidth: '1Gbps',
      location: 'NYC-DC',
      contracted_rate: 2300.00,
      status: 'Active',
      install_date: new Date('2025-07-10'),
    },
    {
      accounts_id: accountMap['CMC-ACC-001'],
      contracts_id: contractMap['CMC-CONT-001'],
      orders_id: orderMap['ORD-CMC-001'],
      inventory_number: 'INV-CMC-INET-001',
      type: 'Broadband',
      bandwidth: 'Up to 300Mbps',
      location: 'ATL-HQ',
      contracted_rate: 110.00,
      status: 'Pending',
    },
    // Additional inventory not tied to orders
    {
      accounts_id: accountMap['ATT-ACC-001'],
      contracts_id: contractMap['ATT-CONT-001'],
      inventory_number: 'INV-ATT-WLS-001',
      type: 'Wireless',
      bandwidth: 'N/A',
      location: 'Mobile',
      contracted_rate: 22.50,
      status: 'Active',
      install_date: new Date('2025-06-01'),
    },
  ];
  await knex('inventory').del();
  const inventoryResult = await knex('inventory').insert(inventory).returning('*');
  const inventoryMap = Object.fromEntries(inventoryResult.map(i => [i.inventory_number, i.inventory_id]));

  // ──────────────────────────────────────────────────────
  // 11. INVOICES (linked to accounts, users)
  // ──────────────────────────────────────────────────────
  const invoices = [
    {
      accounts_id: accountMap['ATT-ACC-001'],
      invoice_number: 'INV-ATT-202509-001',
      invoice_date: new Date('2025-09-01'),
      due_date: new Date('2025-10-01'),
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
      total_amount: 0, // Will be calculated from line items
      status: 'Paid',
      payment_date: new Date('2025-09-25'),
      assigned_users_id: managerUserId,
    },
    {
      accounts_id: accountMap['ATT-ACC-001'],
      invoice_number: 'INV-ATT-202510-001',
      invoice_date: new Date('2025-10-01'),
      due_date: new Date('2025-11-01'),
      period_start: new Date('2025-09-01'),
      period_end: new Date('2025-09-30'),
      total_amount: 0,
      status: 'Unpaid',
      assigned_users_id: managerUserId,
    },
    {
      accounts_id: accountMap['VZ-ACC-001'],
      invoice_number: 'INV-VZ-202509-001',
      invoice_date: new Date('2025-09-05'),
      due_date: new Date('2025-10-05'),
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
      total_amount: 0,
      status: 'Paid',
      payment_date: new Date('2025-10-01'),
      assigned_users_id: adminUserId,
    },
    {
      accounts_id: accountMap['CMC-ACC-001'],
      invoice_number: 'INV-CMC-202510-001',
      invoice_date: new Date('2025-10-15'),
      due_date: new Date('2025-11-15'),
      period_start: new Date('2025-09-15'),
      period_end: new Date('2025-10-15'),
      total_amount: 0,
      status: 'Unpaid',
      assigned_users_id: managerUserId,
    },
  ];
  await knex('invoices').del();
  const invoicesResult = await knex('invoices').insert(invoices).returning('*');
  const invoiceMap = Object.fromEntries(invoicesResult.map(i => [i.invoice_number, i.invoices_id]));

  // ──────────────────────────────────────────────────────
  // 12. LINE ITEMS (linked to invoices, inventory, USOC codes)
  // ──────────────────────────────────────────────────────
  const lineItems = [
    // ATT Invoice 1 line items
    {
      invoices_id: invoiceMap['INV-ATT-202509-001'],
      inventory_id: inventoryMap['INV-ATT-ETH-001'],
      usoc_codes_id: usocMap['ETH-100'],
      description: 'Ethernet 100Mbps NYC-Chicago - September 2025',
      charge_type: 'MRC',
      amount: 750.00,
      mrc_amount: 750.00,
      nrc_amount: 0,
      contracted_rate: 750.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
    },
    {
      invoices_id: invoiceMap['INV-ATT-202509-001'],
      inventory_id: inventoryMap['INV-ATT-WLS-001'],
      usoc_codes_id: usocMap['WLS800'],
      description: 'Wireless Local Service - Corporate Phones',
      charge_type: 'MRC',
      amount: 675.00,
      mrc_amount: 675.00,
      nrc_amount: 0,
      contracted_rate: 675.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
    },
    {
      invoices_id: invoiceMap['INV-ATT-202509-001'],
      inventory_id: null,
      usoc_codes_id: usocMap['INST-STD'],
      description: 'Installation charge for Ethernet upgrade',
      charge_type: 'NRC',
      amount: 300.00,
      mrc_amount: 0,
      nrc_amount: 300.00,
      contracted_rate: 0,
      variance: 0,
      audit_status: 'Flagged',
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
    },
    // ATT Invoice 2 line items
    {
      invoices_id: invoiceMap['INV-ATT-202510-001'],
      inventory_id: inventoryMap['INV-ATT-ETH-001'],
      usoc_codes_id: usocMap['ETH-100'],
      description: 'Ethernet 100Mbps NYC-Chicago - October 2025',
      charge_type: 'MRC',
      amount: 750.00,
      mrc_amount: 750.00,
      nrc_amount: 0,
      contracted_rate: 750.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-09-01'),
      period_end: new Date('2025-09-30'),
    },
    {
      invoices_id: invoiceMap['INV-ATT-202510-001'],
      inventory_id: inventoryMap['INV-ATT-WLS-001'],
      usoc_codes_id: usocMap['WLS800'],
      description: 'Wireless Local Service - Corporate Phones',
      charge_type: 'MRC',
      amount: 675.00,
      mrc_amount: 675.00,
      nrc_amount: 0,
      contracted_rate: 675.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-09-01'),
      period_end: new Date('2025-09-30'),
    },
    {
      invoices_id: invoiceMap['INV-ATT-202510-001'],
      inventory_id: null,
      usoc_codes_id: null,
      description: 'Unauthorized Bonus Charges',
      charge_type: 'MRC',
      amount: 125.00,
      mrc_amount: 125.00,
      nrc_amount: 0,
      contracted_rate: 0,
      variance: 125.00,
      audit_status: 'Flagged',
      period_start: new Date('2025-09-01'),
      period_end: new Date('2025-09-30'),
    },
    // VZ Invoice line items
    {
      invoices_id: invoiceMap['INV-VZ-202509-001'],
      inventory_id: inventoryMap['INV-VZ-ETH-1GB'],
      usoc_codes_id: usocMap['ETH-1GB'],
      description: 'Ethernet 1Gbps Premium Connection',
      charge_type: 'MRC',
      amount: 2300.00,
      mrc_amount: 2300.00,
      nrc_amount: 0,
      contracted_rate: 2300.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
    },
    {
      invoices_id: invoiceMap['INV-VZ-202509-001'],
      inventory_id: null,
      usoc_codes_id: usocMap['MPLS-50'],
      description: 'MPLS VPN Service 50Mbps',
      charge_type: 'MRC',
      amount: 1100.00,
      mrc_amount: 1100.00,
      nrc_amount: 0,
      contracted_rate: 1100.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
    },
    {
      invoices_id: invoiceMap['INV-VZ-202509-001'],
      inventory_id: null,
      usoc_codes_id: usocMap['INST-PREM'],
      description: 'Premium installation and configuration',
      charge_type: 'NRC',
      amount: 750.00,
      mrc_amount: 0,
      nrc_amount: 750.00,
      contracted_rate: 0,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-08-01'),
      period_end: new Date('2025-08-31'),
    },
    // CMC Invoice line items
    {
      invoices_id: invoiceMap['INV-CMC-202510-001'],
      inventory_id: null,
      usoc_codes_id: usocMap['INET-BB'],
      description: 'Broadband Internet Service',
      charge_type: 'MRC',
      amount: 110.00,
      mrc_amount: 110.00,
      nrc_amount: 0,
      contracted_rate: 110.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-09-15'),
      period_end: new Date('2025-10-15'),
    },
    {
      invoices_id: invoiceMap['INV-CMC-202510-001'],
      inventory_id: null,
      usoc_codes_id: usocMap['ETH-100'],
      description: 'Ethernet 100Mbps Backup Connection',
      charge_type: 'MRC',
      amount: 700.00,
      mrc_amount: 700.00,
      nrc_amount: 0,
      contracted_rate: 700.00,
      variance: 0,
      audit_status: 'Passed',
      period_start: new Date('2025-09-15'),
      period_end: new Date('2025-10-15'),
    },
  ];
  await knex('line_items').del();
  const lineItemsResult = await knex('line_items').insert(lineItems).returning('*');

  // Update invoice totals based on line items
  await knex('invoices').where('invoice_number', 'INV-ATT-202509-001').update({
    total_amount: 750.00 + 675.00 + 300.00,
  });
  await knex('invoices').where('invoice_number', 'INV-ATT-202510-001').update({
    total_amount: 750.00 + 675.00 + 125.00,
  });
  await knex('invoices').where('invoice_number', 'INV-VZ-202509-001').update({
    total_amount: 2300.00 + 1100.00 + 750.00,
  });
  await knex('invoices').where('invoice_number', 'INV-CMC-202510-001').update({
    total_amount: 110.00 + 700.00,
  });

  // ──────────────────────────────────────────────────────
  // 13. ALLOCATIONS (linked to line items, cost centers, departments)
  // ──────────────────────────────────────────────────────
  const allocations = [
    // ATT Invoice 1 Allocations
    {
      line_items_id: lineItemsResult[0].line_items_id, // ETH-100
      cost_center: 'CC-002',
      department: 'Network',
      percentage: 60.00,
      allocated_amount: 450.00,
      notes: 'Network Ops primary allocation',
    },
    {
      line_items_id: lineItemsResult[0].line_items_id,
      cost_center: 'CC-003',
      department: 'Telecom',
      percentage: 40.00,
      allocated_amount: 300.00,
      notes: 'Telecom support allocation',
    },
    {
      line_items_id: lineItemsResult[1].line_items_id, // WLS800
      cost_center: 'CC-003',
      department: 'Telecom',
      percentage: 100.00,
      allocated_amount: 675.00,
      notes: 'Full allocation to Telecom',
    },
    {
      line_items_id: lineItemsResult[2].line_items_id, // INST-STD
      cost_center: 'CC-002',
      department: 'Network',
      percentage: 100.00,
      allocated_amount: 300.00,
      notes: 'Installation labor costs',
    },
    // VZ Invoice Allocations
    {
      line_items_id: lineItemsResult[5].line_items_id, // ETH-1GB
      cost_center: 'CC-001',
      department: 'IT',
      percentage: 50.00,
      allocated_amount: 1150.00,
      notes: 'IT Infrastructure - primary',
    },
    {
      line_items_id: lineItemsResult[5].line_items_id,
      cost_center: 'CC-004',
      department: 'Infrastructure',
      percentage: 50.00,
      allocated_amount: 1150.00,
      notes: 'Data Center backhaul',
    },
    {
      line_items_id: lineItemsResult[6].line_items_id, // MPLS-50
      cost_center: 'CC-002',
      department: 'Network',
      percentage: 100.00,
      allocated_amount: 1100.00,
      notes: 'MPLS management',
    },
    // CMC Invoice Allocations
    {
      line_items_id: lineItemsResult[8].line_items_id, // INET-BB
      cost_center: 'CC-002',
      department: 'Network',
      percentage: 100.00,
      allocated_amount: 110.00,
      notes: 'Atlanta broadband',
    },
    {
      line_items_id: lineItemsResult[9].line_items_id, // ETH-100 backup
      cost_center: 'CC-004',
      department: 'Infrastructure',
      percentage: 100.00,
      allocated_amount: 700.00,
      notes: 'Backup connection allocation',
    },
  ];
  await knex('allocations').del();
  await knex('allocations').insert(allocations);

  console.log('✓ Test data seeded successfully');
  console.log(`  - Currencies: ${currenciesResult.length}`);
  console.log(`  - Locations: ${locationsResult.length}`);
  console.log(`  - Company Codes: ${companyCodesResult.length}`);
  console.log(`  - Cost Centers: ${costCentersResult.length}`);
  console.log(`  - Vendors: ${vendorsResult.length}`);
  console.log(`  - Accounts: ${accountsResult.length}`);
  console.log(`  - Contracts: ${contractsResult.length}`);
  console.log(`  - USOC Codes: ${usocResult.length}`);
  console.log(`  - Orders: ${ordersResult.length}`);
  console.log(`  - Inventory: ${inventoryResult.length}`);
  console.log(`  - Invoices: ${invoicesResult.length}`);
  console.log(`  - Line Items: ${lineItemsResult.length}`);
  console.log(`  - Allocations: ${allocations.length}`);
};