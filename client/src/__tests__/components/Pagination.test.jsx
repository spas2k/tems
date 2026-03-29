/**
 * Unit tests for Pagination component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../../components/Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalItems: 100,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText('Rows per page:')).toBeInTheDocument();
  });

  it('shows correct range for page 1', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText('1–10 of 100')).toBeInTheDocument();
  });

  it('shows correct range for middle page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    expect(screen.getByText('21–30 of 100')).toBeInTheDocument();
  });

  it('shows correct range for last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    expect(screen.getByText('91–100 of 100')).toBeInTheDocument();
  });

  it('shows correct range when last page is partial', () => {
    render(<Pagination {...defaultProps} totalItems={95} currentPage={10} />);
    expect(screen.getByText('91–95 of 95')).toBeInTheDocument();
  });

  it('shows "0 results" when totalItems is 0', () => {
    render(<Pagination {...defaultProps} totalItems={0} />);
    expect(screen.getByText('0 results')).toBeInTheDocument();
  });

  it('renders page size dropdown with correct options', () => {
    render(<Pagination {...defaultProps} />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.map(o => o.value)).toEqual(['10', '25', '50', '100', '250']);
  });

  it('calls onPageSizeChange when dropdown changes', () => {
    render(<Pagination {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '25' } });
    expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('renders navigation buttons when more than 1 page', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTitle('First page')).toBeInTheDocument();
    expect(screen.getByTitle('Previous page')).toBeInTheDocument();
    expect(screen.getByTitle('Next page')).toBeInTheDocument();
    expect(screen.getByTitle('Last page')).toBeInTheDocument();
  });

  it('does not render navigation when only 1 page', () => {
    render(<Pagination {...defaultProps} totalItems={5} />);
    expect(screen.queryByTitle('First page')).not.toBeInTheDocument();
  });

  it('disables First and Previous on page 1', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTitle('First page')).toBeDisabled();
    expect(screen.getByTitle('Previous page')).toBeDisabled();
  });

  it('enables Next and Last on page 1', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTitle('Next page')).not.toBeDisabled();
    expect(screen.getByTitle('Last page')).not.toBeDisabled();
  });

  it('disables Next and Last on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    expect(screen.getByTitle('Next page')).toBeDisabled();
    expect(screen.getByTitle('Last page')).toBeDisabled();
  });

  it('enables First and Previous on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    expect(screen.getByTitle('First page')).not.toBeDisabled();
    expect(screen.getByTitle('Previous page')).not.toBeDisabled();
  });

  it('calls onPageChange(1) when First is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByTitle('First page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange(prev) when Previous is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByTitle('Previous page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange(next) when Next is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByTitle('Next page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(6);
  });

  it('calls onPageChange(last) when Last is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByTitle('Last page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(10);
  });

  it('shows page indicator text', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    expect(screen.getByText('Page 3 of 10')).toBeInTheDocument();
  });

  it('handles pageSize of 250 correctly', () => {
    render(<Pagination {...defaultProps} pageSize={250} totalItems={1000} currentPage={1} />);
    expect(screen.getByText('1–250 of 1000')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 4')).toBeInTheDocument();
  });
});
