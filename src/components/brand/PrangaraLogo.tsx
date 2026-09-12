import type { CSSProperties } from "react";

export function PrangaraLogoMark({
  className = "",
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`brand-mark ${className}`}
      style={{ "--brand-mark-size": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <img
        src="/logo-mark.png"
        alt="PRANGARA Logo"
        className="brand-logo-img logo-theme-dark"
        width={size}
        height={size}
      />
      <img
        src="/logo-mark-dark.png"
        alt="PRANGARA Logo"
        className="brand-logo-img logo-theme-light"
        width={size}
        height={size}
      />
    </span>
  );
}
