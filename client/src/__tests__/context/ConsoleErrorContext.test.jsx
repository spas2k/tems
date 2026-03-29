/**
 * Unit tests for ConsoleErrorContext
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConsoleErrorProvider, useConsoleErrors } from '../../context/ConsoleErrorContext';

let origConsoleError;

beforeEach(() => {
  origConsoleError = console.error;
});

afterEach(() => {
  // Restore so test runner's console.error works
  console.error = origConsoleError;
});

function TestConsumer() {
  const { errors, clearErrors, formatted } = useConsoleErrors();
  return (
    <div>
      <span data-testid="count">{errors.length}</span>
      <span data-testid="formatted">{formatted()}</span>
      <button data-testid="clear" onClick={clearErrors}>Clear</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ConsoleErrorProvider>
      <TestConsumer />
    </ConsoleErrorProvider>
  );
}

describe('ConsoleErrorContext', () => {
  it('renders children', () => {
    renderWithProvider();
    expect(screen.getByTestId('count')).toBeInTheDocument();
  });

  it('starts with empty errors', () => {
    renderWithProvider();
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('captures console.error calls', () => {
    renderWithProvider();
    act(() => {
      console.error('test error message');
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('formatted output includes the error message', () => {
    renderWithProvider();
    act(() => {
      console.error('hello world');
    });
    expect(screen.getByTestId('formatted').textContent).toContain('hello world');
  });

  it('clearErrors resets to empty', () => {
    renderWithProvider();
    act(() => {
      console.error('err1');
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
    act(() => {
      screen.getByTestId('clear').click();
    });
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('captures multiple errors', () => {
    renderWithProvider();
    act(() => {
      console.error('err1');
      console.error('err2');
      console.error('err3');
    });
    expect(Number(screen.getByTestId('count').textContent)).toBe(3);
  });

  it('stringifies objects in console.error', () => {
    renderWithProvider();
    act(() => {
      console.error({ code: 500, msg: 'fail' });
    });
    expect(screen.getByTestId('formatted').textContent).toContain('500');
    expect(screen.getByTestId('formatted').textContent).toContain('fail');
  });
});
