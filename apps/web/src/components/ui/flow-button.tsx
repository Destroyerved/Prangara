'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface FlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: React.ReactNode;
  children?: React.ReactNode;
  to?: string;
  variant?: 'blue' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FlowButton({
  text,
  children,
  to,
  variant = 'blue',
  size = 'md',
  className,
  onClick,
  type = 'button',
  disabled,
  style,
  ...props
}: FlowButtonProps) {
  const label = text || children || 'Modern Button';

  const sizeClasses = {
    sm: 'px-6 py-2 text-xs min-h-[36px]',
    md: 'px-8 py-2.5 text-sm min-h-[44px]',
    lg: 'px-10 py-3.5 text-base min-h-[48px]',
  }[size];

  const arrowSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  }[size];

  const baseClasses = cn(
    'flow-button group relative inline-flex items-center justify-center gap-2 overflow-hidden cursor-pointer select-none',
    'rounded-[100px] border-[1.5px] leading-none',
    'transition-all duration-300',
    sizeClasses,
    variant === 'blue'
      ? 'flow-button-blue border-[#38bdf8]/70 bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] !text-white text-white shadow-[0_4px_18px_rgba(2,132,199,0.48)] hover:shadow-[0_6px_28px_rgba(56,189,248,0.68)] hover:border-[#38bdf8]'
      : 'border-[#333333]/40 bg-transparent text-white hover:border-white/30 hover:text-white',
    disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
    className
  );

  const defaultBlueStyle: React.CSSProperties =
    variant === 'blue'
      ? {
          background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          borderColor: 'rgba(56, 189, 248, 0.75)',
          boxShadow: '0 4px 18px rgba(2, 132, 199, 0.45)',
        }
      : {};

  const mergedStyle = { ...defaultBlueStyle, ...style };

  const innerContent = (
    <>
      {/* Zero layout shift text container using shared grid cell */}
      <span className="relative z-[2] grid place-items-center select-none pointer-events-none leading-none">
        {/* Normal state: Standard bold sans-serif */}
        <span
          className="col-start-1 row-start-1 font-bold whitespace-nowrap transition-opacity duration-300 ease-out group-hover:opacity-0"
          style={variant === 'blue' ? { color: '#ffffff' } : undefined}
        >
          {label}
        </span>

        {/* Hover state: Editorial italic serif text — exactly in place with 0px box size change */}
        <span
          aria-hidden="true"
          className="col-start-1 row-start-1 italic font-medium whitespace-nowrap transition-opacity duration-300 ease-out opacity-0 group-hover:opacity-100"
          style={{
            fontFamily: 'var(--font-editorial)',
            color: variant === 'blue' ? '#ffffff' : undefined,
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
      </span>

      {/* Right arrow — stable position with subtle responsive micro-nudge */}
      <ArrowRight
        className={cn(
          'relative z-[2] shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1',
          arrowSize,
          variant === 'blue' ? '!stroke-white stroke-white' : 'stroke-current'
        )}
        strokeWidth={2.2}
      />
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={baseClasses}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
        style={mergedStyle}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled}
      style={mergedStyle}
      {...props}
    >
      {innerContent}
    </button>
  );
}
