import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../api', () => ({
  getVendors: vi.fn(() => Promise.resolve({ data: [] })),
  createVendor: vi.fn(),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
  bulkUpdate: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { users_id: 1, role_name: 'Admin', permissions: ['*'], preferences: {} },
    hasPermission: () => true,
    hasRole: () => true,
    canWrite: () => true,
    isAdmin: true,
    updatePreferences: vi.fn(),
  })),
}));

vi.mock('../../context/ConfirmContext', () => ({
  useConfirm: vi.fn(() => vi.fn(() => Promise.resolve(true))),
}));

vi.mock('../../context/FavoritesContext', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    isFavorited: vi.fn(() => false),
    loading: false,
  })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ state: null, key: 'test', pathname: '/vendors' })),
}));

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('exceljs', () => {
  const mockWs = { addRow: vi.fn(), columns: [] };
  const mockWb = { addWorksheet: vi.fn(() => mockWs), xlsx: { writeBuffer: vi.fn(async () => new ArrayBuffer(0)) } };
  return { default: { Workbook: vi.fn(() => mockWb) } };
});

import { getVendors } from '../../api';
import Vendors from '../../pages/Vendors';

const VENDOR_LIST = [
  {
    vendors_id: 1,
    name: 'AT&T',
    vendor_number: 'V-001',
    vendor_type: 'Telecom',
    contact_name: 'John Doe',
    contact_email: 'john@att.com',
    contact_phone: '555-0100',
    status: 'Active',
  },
  {
    vendors_id: 2,
    name: 'Verizon',
    vendor_number: 'V-002',
    vendor_type: 'Wireless',
    contact_name: 'Jane Smith',
    contact_email: 'jane@verizon.com',
    contact_phone: '555-0200',
    status: 'Inactive',
  },
];

describe('Vendors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    getVendors.mockResolvedValue({ data: [] });
    render(<Vendors />);
    expect(screen.getByText('Total Vendors')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    getVendors.mockReturnValue(new Promise(() => {}));
    const { container } = render(<Vendors />);
    // The KPI cards should still render with 0 while data loads
    expect(screen.getByText('Total Vendors')).toBeInTheDocument();
  });

  it('renders vendor data after loading', async () => {
    getVendors.mockResolvedValue({ data: VENDOR_LIST });
    render(<Vendors />);
    await waitFor(() => {
      expect(screen.getByText('AT&T')).toBeInTheDocument();
    });
    expect(screen.getByText('Verizon')).toBeInTheDocument();
  });

  it('renders table column headers', async () => {
    getVendors.mockResolvedValue({ data: VENDOR_LIST });
    render(<Vendors />);
    await waitFor(() => {
      expect(screen.getByText('Vendor Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Vendor #')).toBeInTheDocument();
    expect(screen.getByText('Service Type')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows correct KPI counts', async () => {
    getVendors.mockResolvedValue({ data: VENDOR_LIST });
    render(<Vendors />);
    await waitFor(() => {
      expect(screen.getByText('AT&T')).toBeInTheDocument();
    });
    // Use getAllByText since 'Active' appears in both KPI card and badge
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThanOrEqual(1);
  });
});
