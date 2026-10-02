import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check, type LucideIcon } from "lucide-react";

export interface GlassDropdownOption {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  accentColor?: string;
}

interface GlassDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassDropdownOption[];
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
}

export function GlassDropdown({
  value,
  onChange,
  options,
  ariaLabel = "Select option",
  className = "",
  placeholder = "Select an option",
}: GlassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const currentIndex = options.findIndex((o) => o.value === value);
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(options[nextIndex].value);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = options.findIndex((o) => o.value === value);
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex].value);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, options, value, onChange]);

  const IconComponent = selectedOption?.icon;

  return (
    <div
      ref={containerRef}
      className={`glass-dropdown-wrapper relative inline-block text-left ${className}`}
      style={{ minWidth: "230px" }}
      onMouseLeave={() => setHoveredValue(null)}
    >
      {/* Trigger Button */}
      <motion.button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{
          scale: 1.01,
          borderColor: "rgba(255, 255, 255, 0.22)",
        }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        className="glass-dropdown-trigger flex items-center justify-between w-full gap-3 px-3.5 py-2 text-xs font-medium rounded-xl cursor-pointer select-none outline-none group"
        style={{
          background: isOpen
            ? "linear-gradient(135deg, rgba(35, 38, 50, 0.92) 0%, rgba(20, 22, 30, 0.95) 100%)"
            : "linear-gradient(135deg, rgba(28, 30, 40, 0.75) 0%, rgba(16, 17, 24, 0.82) 100%)",
          backdropFilter: "blur(24px) saturate(190%)",
          WebkitBackdropFilter: "blur(24px) saturate(190%)",
          border: isOpen
            ? "1px solid rgba(190, 194, 255, 0.45)"
            : "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: isOpen
            ? "0 0 0 2px rgba(190, 194, 255, 0.18), 0 8px 24px -4px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
            : "0 4px 16px -2px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
          color: "var(--text, #e5e2e3)",
          minHeight: "40px",
        }}
      >
        <div className="flex items-center gap-2.5 overflow-hidden text-left">
          {IconComponent && (
            <span
              className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105"
              style={{
                background: selectedOption.accentColor
                  ? `${selectedOption.accentColor}20`
                  : "rgba(255, 255, 255, 0.08)",
                color: selectedOption.accentColor || "var(--accent, #bec2ff)",
                border: selectedOption.accentColor
                  ? `1px solid ${selectedOption.accentColor}40`
                  : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: selectedOption.accentColor
                  ? `0 0 12px ${selectedOption.accentColor}25`
                  : "none",
              }}
            >
              <IconComponent size={13} strokeWidth={2.2} />
            </span>
          )}
          <span className="truncate tracking-wide font-medium text-[12.5px] text-zinc-100">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 450, damping: 24 }}
          className="shrink-0 flex items-center justify-center"
        >
          <ChevronDown
            size={14}
            className="transition-colors duration-200"
            style={{
              color: isOpen ? "var(--accent, #bec2ff)" : "rgba(255, 255, 255, 0.55)",
            }}
          />
        </motion.div>
      </motion.button>

      {/* Glass Popover Menu with Fluid Sliding Hover Pill */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 480, damping: 30, mass: 0.8 }}
            className="glass-dropdown-popover absolute z-50 left-0 right-0 mt-2 p-1.5 overflow-hidden rounded-2xl shadow-2xl"
            style={{
              minWidth: "275px",
              background: "linear-gradient(160deg, rgba(22, 24, 34, 0.94) 0%, rgba(12, 13, 18, 0.96) 100%)",
              backdropFilter: "blur(36px) saturate(210%)",
              WebkitBackdropFilter: "blur(36px) saturate(210%)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow:
                "0 24px 60px -10px rgba(0, 0, 0, 0.85), 0 8px 24px -4px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Top specular reflection shimmer */}
            <div
              className="absolute top-0 inset-x-0 h-[1px] pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 40%, rgba(190, 194, 255, 0.4) 60%, transparent 100%)",
              }}
            />

            <div className="relative space-y-1 max-h-[340px] overflow-y-auto custom-glass-scrollbar pr-0.5">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                const isHovered = hoveredValue === opt.value;
                const OptionIcon = opt.icon;

                return (
                  <div
                    key={opt.value}
                    className="relative"
                    onMouseEnter={() => setHoveredValue(opt.value)}
                  >
                    {/* Fluid Sliding Glass Hover Pill */}
                    {isHovered && (
                      <motion.div
                        layoutId="glass-dropdown-hover-indicator"
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.03) 100%)",
                          border: "1px solid rgba(255, 255, 255, 0.14)",
                          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.25)",
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 34,
                        }}
                      />
                    )}

                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                        triggerRef.current?.focus();
                      }}
                      className={`relative z-10 group/opt w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-xs transition-colors duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-white/[0.06] text-white"
                          : "text-zinc-300 hover:text-white"
                      }`}
                      style={{
                        border: isSelected && !isHovered
                          ? "1px solid rgba(255, 255, 255, 0.1)"
                          : "1px solid transparent",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {OptionIcon && (
                          <span
                            className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-all duration-200 ${
                              isHovered ? "scale-105" : ""
                            }`}
                            style={{
                              background: opt.accentColor
                                ? `${opt.accentColor}22`
                                : "rgba(255, 255, 255, 0.07)",
                              color: opt.accentColor || "var(--accent, #bec2ff)",
                              border: opt.accentColor
                                ? `1px solid ${opt.accentColor}45`
                                : "1px solid rgba(255, 255, 255, 0.1)",
                              boxShadow: isSelected && opt.accentColor
                                ? `0 0 10px ${opt.accentColor}30`
                                : "none",
                            }}
                          >
                            <OptionIcon size={14} strokeWidth={2.2} />
                          </span>
                        )}

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`truncate text-[12.5px] font-medium tracking-tight ${
                                isSelected ? "text-white" : "text-zinc-200 group-hover/opt:text-white"
                              }`}
                            >
                              {opt.label}
                            </span>
                            {opt.badge && (
                              <span
                                className="px-1.5 py-0.5 text-[9px] font-mono font-medium tracking-wider uppercase rounded-md"
                                style={{
                                  background: opt.accentColor
                                    ? `${opt.accentColor}18`
                                    : "rgba(255, 255, 255, 0.08)",
                                  color: opt.accentColor || "rgba(255, 255, 255, 0.7)",
                                  border: opt.accentColor
                                    ? `1px solid ${opt.accentColor}35`
                                    : "1px solid rgba(255, 255, 255, 0.12)",
                                }}
                              >
                                {opt.badge}
                              </span>
                            )}
                          </div>

                          {opt.description && (
                            <span
                              className="truncate text-[11px] mt-0.5 tracking-tight"
                              style={{
                                color: isSelected
                                  ? "rgba(255, 255, 255, 0.65)"
                                  : "rgba(255, 255, 255, 0.45)",
                              }}
                            >
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection Check with micro spring entrance */}
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 ml-2"
                          style={{
                            background: opt.accentColor
                              ? `${opt.accentColor}30`
                              : "rgba(190, 194, 255, 0.3)",
                            color: opt.accentColor || "var(--accent, #bec2ff)",
                            border: opt.accentColor
                              ? `1px solid ${opt.accentColor}60`
                              : "1px solid rgba(190, 194, 255, 0.4)",
                            boxShadow: opt.accentColor
                              ? `0 0 10px ${opt.accentColor}40`
                              : "0 0 10px rgba(190, 194, 255, 0.3)",
                          }}
                        >
                          <Check size={11} strokeWidth={3} />
                        </motion.span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
