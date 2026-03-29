/**
 * Unit tests for useCrudTable hook
 * Tests the filter engine, sort, pagination, and CRUD state management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock dependencies before imports
vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ state: null, key: 'default', pathname: '/test' })),
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { users_id: 1, role_name: 'Admin', permissions: ['*'], preferences: { rows_per_page: 10 } },
    hasPermission: () => true,
  })),
}));

vi.mock('../../context/ConfirmContext', () => ({
  useConfirm: vi.fn(() => vi.fn(() => Promise.resolve(true))),
}));

vi.mock('../../api', () => ({
  bulkUpdate: vi.fn(() => Promise.resolve({ data: { updated: 2 } })),
}));

import useCrudTable from '../../hooks/useCrudTable';

const mockData = [
  { vendors_id: 1, name: 'AT&T', vendor_type: 'Telecom', status: 'Active', amount: 5000 },
  { vendors_id: 2, name: 'Verizon', vendor_type: 'Wireless', status: 'Active', amount: 3000 },
  { vendors_id: 3, name: 'Comcast', vendor_type: 'ISP', status: 'Inactive', amount: 1000 },
  { vendors_id: 4, name: 'Charter', vendor_type: 'ISP', status: 'Active', amount: 2000 },
  { vendors_id: 5, name: 'Sprint', vendor_type: 'Wireless', status: 'Inactive', amount: 500 },
];

const defaultConfig = {
  api: {
    list: vi.fn(() => Promise.resolve({ data: [...mockData] })),
    create: vi.fn(() => Promise.resolve({ data: {} })),
    update: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({})),
  },
  idKey: 'vendors_id',
  emptyForm: { name: '', vendor_type: 'Telecom', status: 'Active' },
  filterConfig: { name: 'text', vendor_type: 'select', status: 'select', amount: 'number' },
  resourceName: 'vendors',
};

function createConfig(overrides = {}) {
  return {
    ...defaultConfig,
    api: { ...defaultConfig.api },
    ...overrides,
  };
}

describe('useCrudTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    defaultConfig.api.list.mockResolvedValue({ data: [...mockData] });
    defaultConfig.api.create.mockResolvedValue({ data: {} });
    defaultConfig.api.update.mockResolvedValue({ data: {} });
    defaultConfig.api.delete.mockResolvedValue({});
  });

  // ── Data Loading ──────────────────────────────────────────

  it('starts in loading state', () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    expect(result.current.loading).toBe(true);
  });

  it('loads data from API on mount', async () => {
    const config = createConfig();
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(config.api.list).toHaveBeenCalledOnce();
    expect(result.current.data).toHaveLength(5);
  });

  // ── Filtering ─────────────────────────────────────────────

  it('filters by text contains', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'contains', value: 'at' });
    });
    expect(result.current.processedData).toHaveLength(1); // AT&T
    expect(result.current.processedData[0].name).toBe('AT&T');
  });

  it('filters by text starts_with', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'starts_with', value: 'com' });
    });
    expect(result.current.processedData).toHaveLength(1);
    expect(result.current.processedData[0].name).toBe('Comcast');
  });

  it('filters by text ends_with', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'ends_with', value: 'zon' });
    });
    expect(result.current.processedData).toHaveLength(1);
    expect(result.current.processedData[0].name).toBe('Verizon');
  });

  it('filters by text equals', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'equals', value: 'sprint' });
    });
    expect(result.current.processedData).toHaveLength(1);
    expect(result.current.processedData[0].name).toBe('Sprint');
  });

  it('filters by text not_contains', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'not_contains', value: 'at' });
    });
    // Verizon, Comcast, Sprint (Comcast contains 'ast' not 'at'... wait 'comcast' has 'ast')
    // AT&T -> 'at&t' includes 'at' -> excluded
    // Verizon -> no -> included
    // Comcast -> 'comcast' includes 'ast' not 'at'... wait 'comcast' => c-o-m-c-a-s-t, no 'at' substring
    // Charter -> 'charter' => c-h-a-r-t-e-r, no 'at'
    // Sprint -> no -> included
    // So only AT&T is excluded
    expect(result.current.processedData).toHaveLength(4);
  });

  it('filters by select equals', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('status', { op: 'equals', value: 'Active' });
    });
    expect(result.current.processedData).toHaveLength(3); // AT&T, Verizon, Charter
  });

  it('filters by select not_equals', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('status', { op: 'not_equals', value: 'Active' });
    });
    expect(result.current.processedData).toHaveLength(2); // Comcast, Sprint
  });

  it('filters by in_set', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'in_set', value: 'AT&T,Sprint' });
    });
    expect(result.current.processedData).toHaveLength(2);
  });

  it('filters by not_in_set', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'not_in_set', value: 'AT&T,Sprint' });
    });
    expect(result.current.processedData).toHaveLength(3);
  });

  it('filters by is_empty', async () => {
    const data = [...mockData, { vendors_id: 6, name: '', vendor_type: 'Other', status: 'Active', amount: 0 }];
    const config = createConfig();
    config.api.list.mockResolvedValue({ data });
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'is_empty', value: '' });
    });
    expect(result.current.processedData).toHaveLength(1);
    expect(result.current.processedData[0].vendors_id).toBe(6);
  });

  it('filters by not_empty', async () => {
    const data = [...mockData, { vendors_id: 6, name: '', vendor_type: 'Other', status: 'Active', amount: 0 }];
    const config = createConfig();
    config.api.list.mockResolvedValue({ data });
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('name', { op: 'not_empty', value: '' });
    });
    expect(result.current.processedData).toHaveLength(5);
  });

  it('filters by number equals', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('amount', { op: 'equals', value: '5000' });
    });
    expect(result.current.processedData).toHaveLength(1);
    expect(result.current.processedData[0].name).toBe('AT&T');
  });

  it('filters by number gt', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('amount', { op: 'gt', value: '2000' });
    });
    expect(result.current.processedData).toHaveLength(2); // AT&T (5000), Verizon (3000)
  });

  it('filters by number between', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('amount', { op: 'between', value: '1000|3000' });
    });
    expect(result.current.processedData).toHaveLength(3); // Verizon, Comcast, Charter
  });

  it('combines multiple filters', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('status', { op: 'equals', value: 'Active' });
      result.current.setFilter('amount', { op: 'gt', value: '2000' });
    });
    expect(result.current.processedData).toHaveLength(2); // AT&T, Verizon
  });

  it('clearFilters resets all filters', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('status', { op: 'equals', value: 'Active' });
    });
    expect(result.current.processedData).toHaveLength(3);

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.processedData).toHaveLength(5);
  });

  it('hasActiveFilters reflects filter state', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.setFilter('name', { op: 'contains', value: 'test' });
    });
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ── Sorting ───────────────────────────────────────────────

  it('sorts ascending by string column', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.toggleSort('name');
    });
    expect(result.current.processedData[0].name).toBe('AT&T');
    expect(result.current.processedData[4].name).toBe('Verizon');
  });

  it('sorts descending on second toggle', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.toggleSort('name');
    });
    act(() => {
      result.current.toggleSort('name');
    });
    expect(result.current.processedData[0].name).toBe('Verizon');
  });

  it('sorts numerically by amount', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.toggleSort('amount');
    });
    expect(result.current.processedData[0].amount).toBe(500);
    expect(result.current.processedData[4].amount).toBe(5000);
  });

  it('arrow returns indicator for sorted column', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.toggleSort('name');
    });
    expect(result.current.arrow('name')).toContain('▲');
    expect(result.current.arrow('amount')).toBe('');
  });

  // ── Pagination ────────────────────────────────────────────

  it('paginates data based on pageSize', async () => {
    // create 15 rows
    const bigData = Array.from({ length: 15 }, (_, i) => ({
      vendors_id: i + 1, name: `V${i}`, vendor_type: 'Telecom', status: 'Active', amount: i * 100,
    }));
    const config = createConfig();
    config.api.list.mockResolvedValue({ data: bigData });
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Default page size is 10 (from mocked user preferences)
    expect(result.current.paginatedData.length).toBe(10);
    expect(result.current.processedData.length).toBe(15);
  });

  it('setPage changes visible slice', async () => {
    const bigData = Array.from({ length: 15 }, (_, i) => ({
      vendors_id: i + 1, name: `V${i}`, vendor_type: 'Telecom', status: 'Active', amount: i * 100,
    }));
    const config = createConfig();
    config.api.list.mockResolvedValue({ data: bigData });
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.paginatedData.length).toBe(5); // remaining 5 of 15
  });

  it('resets to page 1 on filter change', async () => {
    const bigData = Array.from({ length: 15 }, (_, i) => ({
      vendors_id: i + 1, name: `V${i}`, vendor_type: 'Telecom', status: 'Active', amount: i * 100,
    }));
    const config = createConfig();
    config.api.list.mockResolvedValue({ data: bigData });
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.setPage(2); });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.setFilter('name', { op: 'contains', value: 'V1' });
    });
    // After filter change it resets to page 1
    await waitFor(() => expect(result.current.page).toBe(1));
  });

  // ── CRUD State ────────────────────────────────────────────

  it('openNew sets modal and empty form', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openNew();
    });
    expect(result.current.modal).toBe(true);
    expect(result.current.editing).toBeNull();
    expect(result.current.form.name).toBe('');
  });

  it('openEdit sets modal and populates form', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openEdit(mockData[0]);
    });
    expect(result.current.modal).toBe(true);
    expect(result.current.editing).toBeTruthy();
    expect(result.current.form.name).toBe('AT&T');
  });

  it('setField updates form field', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openNew();
    });
    act(() => {
      result.current.setField('name', 'New Vendor');
    });
    expect(result.current.form.name).toBe('New Vendor');
  });

  it('handleSave calls create for new record', async () => {
    const config = createConfig();
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openNew();
      result.current.setField('name', 'NewCo');
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(config.api.create).toHaveBeenCalledOnce();
    expect(result.current.modal).toBe(false);
  });

  it('handleSave calls update for existing record', async () => {
    const config = createConfig();
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openEdit(mockData[0]);
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(config.api.update).toHaveBeenCalledWith(1, expect.any(Object));
    expect(result.current.modal).toBe(false);
  });

  it('handleDelete calls delete API', async () => {
    const config = createConfig();
    const { result } = renderHook(() => useCrudTable(config));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleDelete(1, { skipConfirm: true });
    });
    expect(config.api.delete).toHaveBeenCalledWith(1);
  });

  // ── tableProps ────────────────────────────────────────────

  it('exposes tableProps with required keys', async () => {
    const { result } = renderHook(() => useCrudTable(createConfig()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const tp = result.current.tableProps;
    expect(tp).toHaveProperty('idKey', 'vendors_id');
    expect(tp).toHaveProperty('data');
    expect(tp).toHaveProperty('allData');
    expect(tp).toHaveProperty('totalItems');
    expect(tp).toHaveProperty('sort');
    expect(tp).toHaveProperty('toggleSort');
    expect(tp).toHaveProperty('filters');
    expect(tp).toHaveProperty('page');
    expect(tp).toHaveProperty('pageSize');
    expect(typeof tp.onPageChange).toBe('function');
    expect(typeof tp.onPageSizeChange).toBe('function');
  });
});
