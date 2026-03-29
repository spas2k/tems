/**
 * Unit tests for ConfirmContext
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from '../../context/ConfirmContext';

function TestConsumer() {
  const confirm = useConfirm();
  return (
    <button
      data-testid="trigger"
      onClick={async () => {
        const result = await confirm('Are you sure?', { title: 'Delete Item', danger: true, confirmLabel: 'Yes, Delete' });
        document.getElementById('result').textContent = String(result);
      }}
    >
      Trigger
      <span id="result" data-testid="result" />
    </button>
  );
}

function renderWithProvider() {
  return render(
    <ConfirmProvider>
      <TestConsumer />
    </ConfirmProvider>
  );
}

describe('ConfirmContext', () => {
  it('renders children', () => {
    renderWithProvider();
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
  });

  it('does not show dialog initially', () => {
    renderWithProvider();
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('shows dialog on confirm()', async () => {
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('shows custom title', async () => {
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });

  it('shows custom confirm label', async () => {
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
  });

  it('resolves true on confirm click', async () => {
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Yes, Delete'));
    });
    expect(screen.getByTestId('result').textContent).toBe('true');
    // Dialog should be hidden
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('resolves false on cancel click', async () => {
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });
    expect(screen.getByTestId('result').textContent).toBe('false');
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
  });

  it('resolves false on overlay click', async () => {
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    // The overlay is the modal-overlay div
    const overlay = document.querySelector('.modal-overlay');
    expect(overlay).toBeTruthy();
    await act(async () => {
      fireEvent.click(overlay);
    });
    expect(screen.getByTestId('result').textContent).toBe('false');
  });

  it('shows Cancel button', async () => {
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger'));
    });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
