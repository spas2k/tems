import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.querySelector('.app-content');
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop > 200) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial state
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    const container = document.querySelector('.app-content');
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      title="Scroll to top"
      style={{
        position: 'fixed',
        bottom: 55,
        right: 55,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgba(148, 163, 184, 0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 9999,
        color: 'var(--text-primary, #334155)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        pointerEvents: visible ? 'auto' : 'none'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(148, 163, 184, 0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(148, 163, 184, 0.3)';
      }}
    >
      <ArrowUp size={20} />
    </button>
  );
}
