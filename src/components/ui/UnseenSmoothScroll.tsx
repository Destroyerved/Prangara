'use client';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

export function UnseenSmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Only initialize on desktop / capable devices
    if (typeof window === 'undefined') return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Unseen Studio exponential out curve
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
      infinite: false,
      allowNestedScroll: true,
      prevent: (node) => {
        return Boolean(
          node.hasAttribute?.('data-lenis-prevent') ||
            node.closest?.('[data-lenis-prevent], .rag-scroll-container, [role="dialog"], aside')
        );
      },
    });

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Expose lenis globally for interactive programmatic scroll if needed
    window.__lenis = lenis;

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  // When route changes, smoothly reset scroll position to top
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
