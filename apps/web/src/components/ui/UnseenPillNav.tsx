'use client';

import { cn } from '@/lib/utils';

export interface UnseenPillNavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface UnseenPillNavProps {
  items: UnseenPillNavItem[];
  activeId: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function UnseenPillNav({
  items,
  activeId,
  onChange,
  className,
}: UnseenPillNavProps) {
  return (
    <nav
      className={cn(
        'unseen-pill-nav inline-flex items-center gap-1.5 p-1 rounded-full',
        'bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-black/10 dark:border-white/15',
        'shadow-[0_4px_20px_rgba(0,0,0,0.08)] select-none',
        className
      )}
      aria-label="Editorial navigation"
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.onClick) item.onClick();
              if (onChange) onChange(item.id);
            }}
            className={cn(
              'px-4 py-1.5 text-sm transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-full',
              isActive
                ? 'border-[1.5px] border-slate-900 dark:border-white text-slate-900 dark:text-white font-serif italic text-[15px] font-semibold tracking-wide shadow-sm scale-[1.02]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-sans font-medium'
            )}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
