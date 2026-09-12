import * as React from "react";

export interface SpinningBorderButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showArrow?: boolean;
  icon?: React.ReactNode;
  contentClassName?: string;
  beamClassName?: string;
}

export const SpinningBorderButton = React.forwardRef<
  HTMLButtonElement,
  SpinningBorderButtonProps
>(function SpinningBorderButton(
  {
    children = "Request Demo",
    className,
    showArrow = true,
    icon,
    contentClassName,
    beamClassName,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={
        "group inline-flex overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] rounded-full p-[1px] relative items-center justify-center cursor-pointer border-0 bg-transparent" +
        (className ? " " + className : "")
      }
      {...props}
    >
      {/* Spinning Border Beam (Visible on Hover) */}
      <span
        className={
          "absolute inset-[-150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_70%,#ffffff_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" +
          (beamClassName ? " " + beamClassName : "")
        }
      />

      {/* Default Static Border */}
      <span className="absolute inset-0 rounded-full bg-neutral-700/60 dark:bg-zinc-800/80 transition-opacity duration-300 group-hover:opacity-0 pointer-events-none" />

      {/* Button Surface & Content */}
      <span
        className={
          "flex items-center justify-center gap-2 uppercase transition-colors duration-300 group-hover:text-white text-xs font-medium text-neutral-300 dark:text-zinc-300 tracking-wider bg-gradient-to-b from-neutral-800/90 to-neutral-950/95 dark:from-zinc-800/90 dark:to-zinc-950/95 backdrop-blur-md w-full h-full rounded-full px-4 py-2 relative shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" +
          (contentClassName ? " " + contentClassName : "")
        }
      >
        {icon && <span className="relative z-10 shrink-0">{icon}</span>}
        <span className="relative z-10">{children}</span>
        {showArrow && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="relative z-10 transition-transform duration-300 group-hover:translate-x-0.5"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </span>
    </button>
  );
});

export default SpinningBorderButton;
