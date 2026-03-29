/**
 * @file Sticky detail-page header with scroll detection.
 * @module DetailHeader
 *
 * Detects scroll position via IntersectionObserver and adds a .stuck class when the header is pinned to the top of its scroll container.
 *
 * @param {ReactNode} props.children - Header content (title, actions, etc.)
 */
import { useEffect, useRef, useState } from 'react';

export default function DetailHeader({ children }) {
  const headerRef = useRef(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    // Walk up to the nearest scroll container
    let scrollParent = header.parentElement;
    while (scrollParent) {
      const overflow = getComputedStyle(scrollParent).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') break;
      scrollParent = scrollParent.parentElement;
    }
    if (!scrollParent) return;

    const handleScroll = () => {
      const containerTop = scrollParent.getBoundingClientRect().top;
      const headerTop = header.getBoundingClientRect().top;
      setIsStuck(headerTop <= containerTop + 1);
    };

    scrollParent.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // check initial state
    return () => scrollParent.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={headerRef} className={`detail-header${isStuck ? ' stuck' : ''}`}>
      {children}
    </div>
  );
}
