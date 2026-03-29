import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../api', () => ({
  getDashboard: vi.fn(),
  getSystemSetting: vi.fn(() => Promise.resolve({ data: { key: 'defaultDashboardLayout', value: null } })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { preferences: {} } })),
}));

vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
}));

import { getDashboard } from '../../api';
import Dashboard from '../../pages/Dashboard';

const MOCK_DATA = {
  totalBilled: 150000,
  totalMrc: 120000,
  totalNrc: 30000,
  totalVariance: -5000,
  totalSavingsIdentified: 25000,
  totalSavingsRealized: 15000,
  totalVendors: 12,
  totalAccounts: 30,
  activeContracts: 8,
  activeInventory: 200,
  totalLocations: 15,
  openInvoices: 5,
  totalInvoices: 50,
  pendingOrders: 3,
  openTickets: 2,
  totalTickets: 20,
  openDisputes: 3,
  disputeAmount: 5000,
  creditRecovered: 2000,
  auditCounts: { validated: 50, variance: 10, pending: 5, disputed: 2 },
  monthlyTrend: [{ month: '2025-01', total: 50000 }],
  topVendors: [{ vendor_name: 'AT&T', total: 30000 }],
  spendByType: [{ type: 'Telecom', total: 80000 }],
  spendByChargeType: [],
  savingsOpportunities: [],
  expiringContracts: [],
  recentInvoices: [],
  recentDisputes: [],
  recentOrders: [],
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading spinner initially', () => {
    getDashboard.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<Dashboard />);
    // The spinner is a div with border + animation style
    expect(container.querySelector('[style*="animation"]')).toBeTruthy();
  });

  it('renders an error message when API fails', async () => {
    getDashboard.mockRejectedValue(new Error('Network failure'));
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Network failure/)).toBeInTheDocument();
    });
  });

  it('renders KPI values on success', async () => {
    getDashboard.mockResolvedValue({ data: MOCK_DATA });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('150,000.00', { exact: false })).toBeInTheDocument();
    });
    // KPI card values
    expect(screen.getByText('12')).toBeInTheDocument();   // Vendors
    expect(screen.getByText('8')).toBeInTheDocument();    // Contracts
    expect(screen.getByText('200')).toBeInTheDocument();  // Inventory
  });

  it('renders section headings on success', async () => {
    getDashboard.mockResolvedValue({ data: MOCK_DATA });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Telecom Expense Overview')).toBeInTheDocument();
    });
    expect(screen.getByText(/Monthly Spend Trend/)).toBeInTheDocument();
    expect(screen.getByText(/Top Vendors by Spend/)).toBeInTheDocument();
    expect(screen.getByText(/Audit Status Breakdown/)).toBeInTheDocument();
  });

  it('renders chart containers on success', async () => {
    getDashboard.mockResolvedValue({ data: MOCK_DATA });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });
});
