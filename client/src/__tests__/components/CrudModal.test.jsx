/**
 * Unit tests for CrudModal component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CrudModal from '../../components/CrudModal';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ pathname: '/vendors' })),
}));
vi.mock('../../components/FormInstructionBanner', () => ({
  default: () => null,
}));

const defaultProps = {
  open: true,
  title: 'New Vendor',
  onClose: vi.fn(),
  onSave: vi.fn(),
  form: { name: '', status: 'Active', notes: '' },
  setField: vi.fn(),
  fields: [
    { key: 'name', label: 'Vendor Name', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

describe('CrudModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when not open', () => {
    const { container } = render(<CrudModal {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders title', () => {
    render(<CrudModal {...defaultProps} />);
    expect(screen.getByText('New Vendor')).toBeInTheDocument();
  });

  it('renders text input field', () => {
    render(<CrudModal {...defaultProps} />);
    expect(screen.getByText('Vendor Name *')).toBeInTheDocument();
  });

  it('renders select field with options', () => {
    render(<CrudModal {...defaultProps} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    const select = screen.getByDisplayValue('Active');
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe('SELECT');
  });

  it('renders textarea field', () => {
    render(<CrudModal {...defaultProps} />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();
  });

  it('calls setField on text input change', () => {
    const setField = vi.fn();
    render(<CrudModal {...defaultProps} setField={setField} />);
    const inputs = document.querySelectorAll('input.form-input');
    fireEvent.change(inputs[0], { target: { value: 'AT&T' } });
    expect(setField).toHaveBeenCalledWith('name', 'AT&T');
  });

  it('calls setField on select change', () => {
    const setField = vi.fn();
    render(<CrudModal {...defaultProps} setField={setField} />);
    const select = screen.getByDisplayValue('Active');
    fireEvent.change(select, { target: { value: 'Inactive' } });
    expect(setField).toHaveBeenCalledWith('status', 'Inactive');
  });

  it('calls onSave when Save button clicked', () => {
    const onSave = vi.fn();
    render(<CrudModal {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn();
    render(<CrudModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders checkbox field type', () => {
    const fields = [
      { key: 'auto_renew', label: 'Auto Renew', type: 'checkbox' },
    ];
    render(<CrudModal {...defaultProps} fields={fields} form={{ auto_renew: true }} />);
    expect(screen.getByText('Auto Renew')).toBeInTheDocument();
    const checkbox = document.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(true);
  });

  it('renders half-width fields in a row', () => {
    const fields = [
      { key: 'first', label: 'First', half: true },
      { key: 'last', label: 'Last', half: true },
    ];
    render(<CrudModal {...defaultProps} fields={fields} form={{ first: '', last: '' }} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Last')).toBeInTheDocument();
    // They should be in a form-row container
    const formRow = document.querySelector('.form-row');
    expect(formRow).toBeTruthy();
  });

  it('renders children instead of fields when provided', () => {
    render(
      <CrudModal {...defaultProps}>
        <div data-testid="custom">Custom Content</div>
      </CrudModal>
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('renders select placeholder option', () => {
    render(<CrudModal {...defaultProps} />);
    expect(screen.getByText('Select…')).toBeInTheDocument();
  });

  it('renders custom placeholder for select', () => {
    const fields = [
      { key: 'type', label: 'Type', type: 'select', options: ['A', 'B'], placeholder: 'Choose type...' },
    ];
    render(<CrudModal {...defaultProps} fields={fields} form={{ type: '' }} />);
    expect(screen.getByText('Choose type...')).toBeInTheDocument();
  });

  it('renders select with object-style options', () => {
    const fields = [
      { key: 'region', label: 'Region', type: 'select', options: [{ value: 'us', label: 'United States' }, { value: 'eu', label: 'Europe' }] },
    ];
    render(<CrudModal {...defaultProps} fields={fields} form={{ region: '' }} />);
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('Europe')).toBeInTheDocument();
  });

  it('renders disabled field', () => {
    const fields = [
      { key: 'id', label: 'ID', disabled: true },
    ];
    render(<CrudModal {...defaultProps} fields={fields} form={{ id: '123' }} />);
    const input = document.querySelector('input[disabled]');
    expect(input).toBeTruthy();
  });

  it('renders date input type', () => {
    const fields = [
      { key: 'start_date', label: 'Start Date', type: 'date' },
    ];
    render(<CrudModal {...defaultProps} fields={fields} form={{ start_date: '2025-01-01' }} />);
    const dateInput = document.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();
    expect(dateInput.value).toBe('2025-01-01');
  });

  it('renders number input with step', () => {
    const fields = [
      { key: 'amount', label: 'Amount', type: 'number', step: '0.01' },
    ];
    render(<CrudModal {...defaultProps} fields={fields} form={{ amount: '100.50' }} />);
    const numInput = document.querySelector('input[type="number"]');
    expect(numInput).toBeTruthy();
    expect(numInput.getAttribute('step')).toBe('0.01');
  });

  it('calls custom render function for field', () => {
    const customRender = vi.fn((form) => <div data-testid="custom-field">Custom: {form.name}</div>);
    const fields = [
      { key: 'custom', label: 'Custom', render: customRender },
    ];
    render(<CrudModal {...defaultProps} fields={fields} />);
    expect(customRender).toHaveBeenCalled();
    expect(screen.getByTestId('custom-field')).toBeInTheDocument();
  });
});
