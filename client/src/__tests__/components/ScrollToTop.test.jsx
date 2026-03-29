/**
 * Unit tests for ScrollToTop component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ScrollToTop from '../../components/ScrollToTop';

describe('ScrollToTop', () => {
  let appContent;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create .app-content container that ScrollToTop looks for
    appContent = document.createElement('div');
    appContent.className = 'app-content';
    Object.defineProperty(appContent, 'scrollTop', { value: 0, writable: true, configurable: true });
    appContent.scrollTo = vi.fn();
    document.body.appendChild(appContent);
  });

  afterEach(() => {
    document.body.removeChild(appContent);
  });

  it('renders a button', () => {
    render(<ScrollToTop />);
    expect(screen.getByTitle('Scroll to top')).toBeInTheDocument();
  });

  it('button is hidden when scrollTop is 0', () => {
    render(<ScrollToTop />);
    const btn = screen.getByTitle('Scroll to top');
    // opacity should be 0 or visibility hidden
    expect(btn.style.opacity === '0' || btn.style.pointerEvents === 'none').toBe(true);
  });

  it('button becomes visible when scrolled past 200px', () => {
    render(<ScrollToTop />);
    act(() => {
      Object.defineProperty(appContent, 'scrollTop', { value: 300, writable: true, configurable: true });
      appContent.dispatchEvent(new Event('scroll'));
    });
    const btn = screen.getByTitle('Scroll to top');
    expect(btn.style.opacity).toBe('1');
  });

  it('scrolls to top when clicked', () => {
    render(<ScrollToTop />);
    act(() => {
      Object.defineProperty(appContent, 'scrollTop', { value: 300, writable: true, configurable: true });
      appContent.dispatchEvent(new Event('scroll'));
    });
    fireEvent.click(screen.getByTitle('Scroll to top'));
    expect(appContent.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
