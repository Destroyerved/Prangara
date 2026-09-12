'use client';

import { useEffect, useRef, useState } from 'react';

export function UnseenCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isOverInput, setIsOverInput] = useState(false);

  useEffect(() => {
    // Only run on non-touch desktop devices
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    // Add class to body to indicate custom cursor is active
    document.body.classList.add('has-unseen-cursor');

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let animFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      const target = e.target as HTMLElement | null;
      const isInput = Boolean(
        target &&
          (target.closest('input, textarea, select, [contenteditable="true"], .search-box, [data-cursor-hide]') ||
            window.getComputedStyle(target).cursor === 'text')
      );
      setIsOverInput(isInput);

      if (!isVisible) setIsVisible(true);
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.matches('input, textarea, select, [contenteditable="true"]') ||
          target.closest('.search-box'))
      ) {
        setIsOverInput(true);
      }
    };

    const onFocusOut = () => {
      setIsOverInput(false);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    document.documentElement.addEventListener('mouseenter', onMouseEnter);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    // Smooth animation loop using linear interpolation (lerp)
    const render = () => {
      // Smooth lag for fluid ring
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;

      // Position outer trailing ring consistently without distortion
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      document.body.classList.remove('has-unseen-cursor');
      window.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      document.documentElement.removeEventListener('mouseenter', onMouseEnter);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, [isVisible]);

  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <div
      className={`unseen-cursor-container fixed inset-0 pointer-events-none z-[999999] transition-opacity duration-200 ${
        isVisible && !isOverInput ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden="true"
    >
      {/* Trailing fluid ring — constant size, zero blur, high-visibility contrast */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none flex items-center justify-center border-2 border-sky-600 dark:border-sky-400 bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.7),0_2px_6px_rgba(15,23,42,0.18)] dark:shadow-[0_0_10px_rgba(56,189,248,0.4)] transition-colors duration-150"
      />
    </div>
  );
}
