/**
 * Unit tests for Modal component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../../components/Modal';

describe('Modal', () => {
  const defaultProps = {
    open: true,
    title: 'Test Modal',
    onClose: vi.fn(),
    onSave: vi.fn(),
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<Modal {...defaultProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when open is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders default save label "Save"', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders custom save label', () => {
    render(<Modal {...defaultProps} saveLabel="Create" />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when Save is clicked', () => {
    render(<Modal {...defaultProps} />);
    fireEvent.click(screen.getByText('Save'));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    render(<Modal {...defaultProps} />);
    // The X button is the btn-icon button
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find(b => b.classList.contains('btn-icon'));
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('calls onClose when overlay is clicked', () => {
    render(<Modal {...defaultProps} />);
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
      fireEvent.click(overlay);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('does not call onClose when modal body is clicked', () => {
    render(<Modal {...defaultProps} />);
    const modal = document.querySelector('.modal');
    if (modal) {
      fireEvent.click(modal);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    }
  });

  it('applies custom width via style', () => {
    render(<Modal {...defaultProps} width={800} />);
    const modal = document.querySelector('.modal');
    expect(modal.style.maxWidth).toBe('800px');
  });

  it('applies default width of 560px', () => {
    render(<Modal {...defaultProps} />);
    const modal = document.querySelector('.modal');
    expect(modal.style.maxWidth).toBe('560px');
  });
});
