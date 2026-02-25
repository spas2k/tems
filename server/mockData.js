// ============================================================
// MOCK DATA — in-memory demo dataset
// Replace calls in routes with real DB queries when ready.
// ============================================================
const { v4: uuidv4 } = require('uuid');

const accounts = [
  { id: 'acc-001', name: 'AT&T', account_number: 'ATT-8872341', vendor_type: 'Telecom', contact_email: 'billing@att.com', contact_phone: '800-288-2020', status: 'Active', created_at: '2023-01-15' },
  { id: 'acc-002', name: 'Verizon Business', account_number: 'VZB-4491023', vendor_type: 'Telecom', contact_email: 'vzbilling@verizon.com', contact_phone: '800-922-0204', status: 'Active', created_at: '2023-02-01' },
  { id: 'acc-003', name: 'Lumen Technologies', account_number: 'LMN-6612099', vendor_type: 'Telecom', contact_email: 'billing@lumen.com', contact_phone: '877-453-8353', status: 'Active', created_at: '2023-03-10' },
  { id: 'acc-004', name: 'Comcast Business', account_number: 'CMB-3309812', vendor_type: 'ISP', contact_email: 'business@comcast.com', contact_phone: '800-391-3000', status: 'Active', created_at: '2023-04-22' },
];

const contracts = [
  { id: 'con-001', account_id: 'acc-001', name: 'AT&T MPLS Master Agreement', contract_number: 'ATT-MPLS-2023', start_date: '2023-01-01', end_date: '2026-12-31', contracted_rate: 1850.00, rate_unit: 'per circuit/month', term_months: 48, status: 'Active', auto_renew: true },
  { id: 'con-002', account_id: 'acc-001', name: 'AT&T DIA Agreement', contract_number: 'ATT-DIA-2023', start_date: '2023-06-01', end_date: '2026-05-31', contracted_rate: 750.00, rate_unit: 'per circuit/month', term_months: 36, status: 'Active', auto_renew: false },
  { id: 'con-003', account_id: 'acc-002', name: 'Verizon Private IP', contract_number: 'VZ-PIP-2022', start_date: '2022-09-01', end_date: '2025-08-31', contracted_rate: 2200.00, rate_unit: 'per circuit/month', term_months: 36, status: 'Active', auto_renew: true },
  { id: 'con-004', account_id: 'acc-003', name: 'Lumen Wave Services', contract_number: 'LMN-WAVE-2024', start_date: '2024-01-01', end_date: '2027-12-31', contracted_rate: 4500.00, rate_unit: 'per circuit/month', term_months: 48, status: 'Active', auto_renew: false },
  { id: 'con-005', account_id: 'acc-004', name: 'Comcast SD-WAN', contract_number: 'CMB-SDWAN-2023', start_date: '2023-07-01', end_date: '2026-06-30', contracted_rate: 620.00, rate_unit: 'per circuit/month', term_months: 36, status: 'Active', auto_renew: true },
  { id: 'con-006', account_id: 'acc-002', name: 'Verizon Wireless Fleet', contract_number: 'VZ-WL-2024', start_date: '2024-03-01', end_date: '2027-02-28', contracted_rate: 45.00, rate_unit: 'per line/month', term_months: 36, status: 'Active', auto_renew: true },
];

const circuits = [
  { id: 'cir-001', account_id: 'acc-001', contract_id: 'con-001', order_id: 'ord-001', circuit_id: 'ATT/MPLS/00112233', type: 'MPLS', bandwidth: '100 Mbps', location: 'Chicago, IL - HQ', contracted_rate: 1850.00, status: 'Active', install_date: '2023-02-10', disconnect_date: null },
  { id: 'cir-002', account_id: 'acc-001', contract_id: 'con-001', order_id: 'ord-002', circuit_id: 'ATT/MPLS/00445566', type: 'MPLS', bandwidth: '50 Mbps', location: 'Dallas, TX - Branch', contracted_rate: 1850.00, status: 'Active', install_date: '2023-03-15', disconnect_date: null },
  { id: 'cir-003', account_id: 'acc-002', contract_id: 'con-003', order_id: 'ord-003', circuit_id: 'VZ/PIP/887722AA', type: 'Private IP', bandwidth: '200 Mbps', location: 'New York, NY - Office', contracted_rate: 2200.00, status: 'Active', install_date: '2022-10-01', disconnect_date: null },
  { id: 'cir-004', account_id: 'acc-003', contract_id: 'con-004', order_id: 'ord-004', circuit_id: 'LMN/WAVE/00FFAA12', type: 'Wavelength', bandwidth: '1 Gbps', location: 'Chicago, IL - DataCenter', contracted_rate: 4500.00, status: 'Active', install_date: '2024-02-01', disconnect_date: null },
  { id: 'cir-005', account_id: 'acc-004', contract_id: 'con-005', order_id: 'ord-005', circuit_id: 'CMB/SDWAN/3301XQ', type: 'SD-WAN', bandwidth: '500 Mbps', location: 'Phoenix, AZ - Branch', contracted_rate: 620.00, status: 'Active', install_date: '2023-08-20', disconnect_date: null },
  { id: 'cir-006', account_id: 'acc-001', contract_id: 'con-002', order_id: null, circuit_id: 'ATT/DIA/77BB1199', type: 'DIA', bandwidth: '1 Gbps', location: 'Austin, TX - Office', contracted_rate: 750.00, status: 'Pending', install_date: null, disconnect_date: null },
];

const orders = [
  { id: 'ord-001', account_id: 'acc-001', contract_id: 'con-001', circuit_id: 'cir-001', order_number: 'ORD-2023-0001', description: 'MPLS Circuit - Chicago HQ', contracted_rate: 1850.00, order_date: '2023-01-20', due_date: '2023-02-10', status: 'Completed', notes: 'Standard install, no issues' },
  { id: 'ord-002', account_id: 'acc-001', contract_id: 'con-001', circuit_id: 'cir-002', order_number: 'ORD-2023-0002', description: 'MPLS Circuit - Dallas Branch', contracted_rate: 1850.00, order_date: '2023-03-01', due_date: '2023-03-15', status: 'Completed', notes: '' },
  { id: 'ord-003', account_id: 'acc-002', contract_id: 'con-003', circuit_id: 'cir-003', order_number: 'ORD-2022-0041', description: 'Verizon Private IP - NY Office', contracted_rate: 2200.00, order_date: '2022-09-05', due_date: '2022-10-01', status: 'Completed', notes: 'Expedited install requested' },
  { id: 'ord-004', account_id: 'acc-003', contract_id: 'con-004', circuit_id: 'cir-004', order_number: 'ORD-2024-0011', description: 'Lumen Wavelength - Chicago DC', contracted_rate: 4500.00, order_date: '2024-01-05', due_date: '2024-02-01', status: 'Completed', notes: 'Data center cross connect included' },
  { id: 'ord-005', account_id: 'acc-004', contract_id: 'con-005', circuit_id: 'cir-005', order_number: 'ORD-2023-0088', description: 'Comcast SD-WAN - Phoenix Branch', contracted_rate: 620.00, order_date: '2023-08-01', due_date: '2023-08-20', status: 'Completed', notes: '' },
  { id: 'ord-006', account_id: 'acc-001', contract_id: 'con-002', circuit_id: null, order_number: 'ORD-2026-0012', description: 'AT&T DIA 1Gbps - Austin Office', contracted_rate: 750.00, order_date: '2026-01-15', due_date: '2026-03-01', status: 'In Progress', notes: 'Awaiting local loop provisioning' },
];

const invoices = [
  { id: 'inv-001', account_id: 'acc-001', invoice_number: 'ATT-INV-20260101', invoice_date: '2026-01-01', due_date: '2026-01-31', period_start: '2026-01-01', period_end: '2026-01-31', total_amount: 3890.00, status: 'Paid', payment_date: '2026-01-28' },
  { id: 'inv-002', account_id: 'acc-001', invoice_number: 'ATT-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-02-28', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 4120.00, status: 'Open', payment_date: null },
  { id: 'inv-003', account_id: 'acc-002', invoice_number: 'VZB-INV-20260115', invoice_date: '2026-01-15', due_date: '2026-02-14', period_start: '2026-01-01', period_end: '2026-01-31', total_amount: 2265.50, status: 'Paid', payment_date: '2026-02-10' },
  { id: 'inv-004', account_id: 'acc-002', invoice_number: 'VZB-INV-20260215', invoice_date: '2026-02-15', due_date: '2026-03-16', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 2310.00, status: 'Open', payment_date: null },
  { id: 'inv-005', account_id: 'acc-003', invoice_number: 'LMN-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-03-03', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 4500.00, status: 'Open', payment_date: null },
  { id: 'inv-006', account_id: 'acc-004', invoice_number: 'CMB-INV-20260201', invoice_date: '2026-02-01', due_date: '2026-03-03', period_start: '2026-02-01', period_end: '2026-02-28', total_amount: 645.00, status: 'Disputed', payment_date: null },
];

const lineItems = [
  { id: 'li-001', invoice_id: 'inv-001', circuit_id: 'cir-001', description: 'MPLS MRC - Chicago HQ', charge_type: 'MRC', amount: 1850.00, contracted_rate: 1850.00, variance: 0.00, period_start: '2026-01-01', period_end: '2026-01-31' },
  { id: 'li-002', invoice_id: 'inv-001', circuit_id: 'cir-002', description: 'MPLS MRC - Dallas Branch', charge_type: 'MRC', amount: 1850.00, contracted_rate: 1850.00, variance: 0.00, period_start: '2026-01-01', period_end: '2026-01-31' },
  { id: 'li-003', invoice_id: 'inv-001', circuit_id: null, description: 'Federal USF Surcharge', charge_type: 'Tax/Surcharge', amount: 190.00, contracted_rate: null, variance: null, period_start: '2026-01-01', period_end: '2026-01-31' },
  { id: 'li-004', invoice_id: 'inv-002', circuit_id: 'cir-001', description: 'MPLS MRC - Chicago HQ', charge_type: 'MRC', amount: 1850.00, contracted_rate: 1850.00, variance: 0.00, period_start: '2026-02-01', period_end: '2026-02-28' },
  { id: 'li-005', invoice_id: 'inv-002', circuit_id: 'cir-002', description: 'MPLS MRC - Dallas Branch', charge_type: 'MRC', amount: 2080.00, contracted_rate: 1850.00, variance: 230.00, period_start: '2026-02-01', period_end: '2026-02-28' },
  { id: 'li-006', invoice_id: 'inv-002', circuit_id: null, description: 'Federal USF Surcharge', charge_type: 'Tax/Surcharge', amount: 190.00, contracted_rate: null, variance: null, period_start: '2026-02-01', period_end: '2026-02-28' },
  { id: 'li-007', invoice_id: 'inv-003', circuit_id: 'cir-003', description: 'Verizon Private IP MRC', charge_type: 'MRC', amount: 2200.00, contracted_rate: 2200.00, variance: 0.00, period_start: '2026-01-01', period_end: '2026-01-31' },
  { id: 'li-008', invoice_id: 'inv-003', circuit_id: null, description: 'State Taxes', charge_type: 'Tax/Surcharge', amount: 65.50, contracted_rate: null, variance: null, period_start: '2026-01-01', period_end: '2026-01-31' },
  { id: 'li-009', invoice_id: 'inv-004', circuit_id: 'cir-003', description: 'Verizon Private IP MRC', charge_type: 'MRC', amount: 2245.00, contracted_rate: 2200.00, variance: 45.00, period_start: '2026-02-01', period_end: '2026-02-28' },
  { id: 'li-010', invoice_id: 'inv-004', circuit_id: null, description: 'State Taxes', charge_type: 'Tax/Surcharge', amount: 65.00, contracted_rate: null, variance: null, period_start: '2026-02-01', period_end: '2026-02-28' },
  { id: 'li-011', invoice_id: 'inv-005', circuit_id: 'cir-004', description: 'Lumen Wavelength MRC', charge_type: 'MRC', amount: 4500.00, contracted_rate: 4500.00, variance: 0.00, period_start: '2026-02-01', period_end: '2026-02-28' },
  { id: 'li-012', invoice_id: 'inv-006', circuit_id: 'cir-005', description: 'Comcast SD-WAN MRC', charge_type: 'MRC', amount: 645.00, contracted_rate: 620.00, variance: 25.00, period_start: '2026-02-01', period_end: '2026-02-28' },
];

const allocations = [
  { id: 'all-001', line_item_id: 'li-001', cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100, allocated_amount: 1850.00, notes: 'Full allocation to IT' },
  { id: 'all-002', line_item_id: 'li-002', cost_center: 'CC-200 - Operations', department: 'Operations', percentage: 60, allocated_amount: 1110.00, notes: 'Split with Sales' },
  { id: 'all-003', line_item_id: 'li-002', cost_center: 'CC-300 - Sales', department: 'Sales', percentage: 40, allocated_amount: 740.00, notes: 'Partial - Sales team usage' },
  { id: 'all-004', line_item_id: 'li-004', cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100, allocated_amount: 1850.00, notes: '' },
  { id: 'all-005', line_item_id: 'li-005', cost_center: 'CC-200 - Operations', department: 'Operations', percentage: 100, allocated_amount: 2080.00, notes: 'Overcharge under dispute' },
  { id: 'all-006', line_item_id: 'li-007', cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 50, allocated_amount: 1100.00, notes: '' },
  { id: 'all-007', line_item_id: 'li-007', cost_center: 'CC-400 - Finance', department: 'Finance', percentage: 50, allocated_amount: 1100.00, notes: '' },
  { id: 'all-008', line_item_id: 'li-011', cost_center: 'CC-100 - IT Infrastructure', department: 'Information Technology', percentage: 100, allocated_amount: 4500.00, notes: 'Data center connectivity' },
];

const costSavings = [
  { id: 'cs-001', account_id: 'acc-001', circuit_id: 'cir-002', line_item_id: 'li-005', invoice_id: 'inv-002', category: 'Billing Error', description: 'AT&T Dallas MPLS overbilled $230 vs contracted rate of $1,850/mo', identified_date: '2026-02-10', status: 'In Progress', projected_savings: 230.00, realized_savings: 0, notes: 'Credit request submitted 2/10/26' },
  { id: 'cs-002', account_id: 'acc-002', circuit_id: 'cir-003', line_item_id: 'li-009', invoice_id: 'inv-004', category: 'Billing Error', description: 'Verizon Private IP billing $45 over contracted rate this cycle', identified_date: '2026-02-20', status: 'Identified', projected_savings: 45.00, realized_savings: 0, notes: 'Need to open ticket with Verizon' },
  { id: 'cs-003', account_id: 'acc-004', circuit_id: 'cir-005', line_item_id: 'li-012', invoice_id: 'inv-006', category: 'Billing Error', description: 'Comcast SD-WAN billed $645 vs contracted $620 — $25 overcharge', identified_date: '2026-02-15', status: 'In Progress', projected_savings: 25.00, realized_savings: 0, notes: 'Invoice in dispute status' },
  { id: 'cs-004', account_id: 'acc-001', circuit_id: null, line_item_id: null, invoice_id: null, category: 'Contract Optimization', description: 'AT&T DIA contract renewal opportunity — market rates 15% lower than current term', identified_date: '2026-01-30', status: 'Identified', projected_savings: 1350.00, realized_savings: 0, notes: 'Contract expires 2026-05-31; begin renegotiation Q1' },
];

module.exports = { accounts, contracts, circuits, orders, invoices, lineItems, allocations, costSavings };
