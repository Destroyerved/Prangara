import { useLocation } from "react-router-dom";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "motion/react";
import {
  Factory,
  ChevronDown,
  Command,
  Check,
  RefreshCw,
  X,
  Sparkles,
} from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { navigation } from "./navigation";
import { SearchBox, Badge } from "../ui/common";
import { RecordDrawer } from "../drawers/RecordDrawer";
import { CommandPalette } from "./CommandPalette";
import { RagAssistant } from "../rag/RagAssistant";
import { PrangaraLogoMark } from "../brand/PrangaraLogo";
import { WavesShaderBackground } from "../ui/WavesShaderBackground";
import {
  MenuCloseIcon,
  ToggleIcon,
} from "@/components/ui/animated-state-icons";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { UnseenCursor } from "@/components/ui/UnseenCursor";
import { UnseenSmoothScroll } from "@/components/ui/UnseenSmoothScroll";
import { TextRoll } from "@/components/ui/text-roll";
const pref = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
function SidebarNavItem({
  path,
  label,
  icon: Icon,
  collapsed,
  count,
}: {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  collapsed: boolean;
  count?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Tooltip.Root open={collapsed ? undefined : false}>
      <Tooltip.Trigger asChild>
        <NavLink
          className="nav-item"
          to={path}
          aria-label={label}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Icon size={collapsed ? 24 : 22} />
          <span className="nav-text">
            <TextRoll isHovered={isHovered}>{label}</TextRoll>
          </span>
          {count ? <span className="count">{count}</span> : null}
        </NavLink>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side="right">
          {label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export default function Shell() {
  const w = useWorkspace(),
    navigate = useNavigate();
  const { setCommandOpen, toast, setToast } = w;
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => pref("prangara-compact", "false") === "true",
  );
  const [width, setWidth] = useState(() =>
    Math.min(
      300,
      Math.max(214, Number(pref("prangara-sidebar", "238")) || 238),
    ),
  );
  const [theme, setTheme] = useState(() => pref("prangara-theme", "dark"));
  const [plantOpen, setPlantOpen] = useState(false),
    [search, setSearch] = useState("");
  const [navVisible, setNavVisible] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const popoverContentRef = useRef<HTMLDivElement>(null);
  const plantOptionsRef = useRef<HTMLDivElement>(null);

  // Scroll Isolation: Ensure wheeling inside facility popover only scrolls items, not the dashboard
  useEffect(() => {
    if (!plantOpen) return;

    const optionsNode = plantOptionsRef.current;
    const contentNode = popoverContentRef.current;

    const handleOptionsWheel = (e: WheelEvent) => {
      e.stopPropagation();
      if (!optionsNode) return;

      const { scrollTop, scrollHeight, clientHeight } = optionsNode;
      const isScrollable = scrollHeight > clientHeight;

      if (!isScrollable) {
        e.preventDefault();
        return;
      }

      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Prevent scroll-chaining to dashboard at top or bottom boundaries
      if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
        e.preventDefault();
      }
    };

    const handleContentWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".plant-options")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    optionsNode?.addEventListener("wheel", handleOptionsWheel, {
      passive: false,
    });
    contentNode?.addEventListener("wheel", handleContentWheel, {
      passive: false,
    });

    return () => {
      optionsNode?.removeEventListener("wheel", handleOptionsWheel);
      contentNode?.removeEventListener("wheel", handleContentWheel);
    };
  }, [plantOpen]);

  // Background Blur & Lenis Scroll Pause when Facility Profiles Popover is open
  useEffect(() => {
    if (plantOpen) {
      document.body.classList.add("has-plant-popover-open");
      window.__lenis?.stop();
    } else {
      document.body.classList.remove("has-plant-popover-open");
      window.__lenis?.start();
    }
    return () => {
      document.body.classList.remove("has-plant-popover-open");
      window.__lenis?.start();
    };
  }, [plantOpen]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateNavBand = (scrollY: number) => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const scrollRatio = Math.min(1, Math.max(0, scrollY / maxScroll));
      const bandY = Math.round(160 + scrollRatio * 390);
      document.documentElement.style.setProperty("--nav-band-y", `${bandY}px`);
    };

    updateNavBand(window.scrollY);

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          updateNavBand(currentScrollY);
          if (currentScrollY <= 20) {
            setNavVisible(true);
          } else if (!plantOpen) {
            const delta = currentScrollY - lastScrollY;
            if (delta > 3) {
              // Rapid immediate slide up as user scrolls down
              setNavVisible(false);
            } else if (delta < -3) {
              // Slide back down immediately on scroll up
              setNavVisible(true);
            }
          }
          lastScrollY = Math.max(0, currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [plantOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setNavVisible(true);
    document.documentElement.style.setProperty("--nav-band-y", "160px");
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("prangara-theme", theme);
      localStorage.setItem("prangara-compact", String(collapsed));
      localStorage.setItem("prangara-sidebar", String(width));
    } catch {
      /* Preferences are optional. */
    }
  }, [theme, collapsed, width]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [setCommandOpen]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast, setToast]);
  const plant = w.assessment?.plant;
  return (
    <Tooltip.Provider delayDuration={250}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <WavesShaderBackground />
      <div className="unseen-grain" aria-hidden="true" />
      <UnseenCursor />
      <UnseenSmoothScroll />
      <div
        className={"app-shell " + (collapsed ? "compact" : "")}
        style={
          {
            "--sidebar-width": (collapsed ? 76 : width) + "px",
          } as CSSProperties
        }
      >
        <aside className="sidebar">
          <Link to="/overview" className="brand" aria-label="PRANGARA overview">
            <PrangaraLogoMark size={28} />
            <span className="brand-text">
              <TextRoll>PRANGARA</TextRoll>
            </span>
          </Link>
          <div className="workspace-label">INDUSTRIAL INTELLIGENCE</div>
          <nav aria-label="Main navigation">
            {navigation.map((group) => (
              <div className="nav-group" key={group.group}>
                <div className="nav-label">{group.group}</div>
                {group.items.map(({ path, label, icon: Icon }) => (
                  <SidebarNavItem
                    key={path}
                    path={path}
                    label={label}
                    icon={Icon}
                    collapsed={collapsed}
                    count={
                      path === "/leaks" && !!w.assessment?.leaks.findings.length
                        ? w.assessment.leaks.findings.length
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-foot">
              <span>PRANGARA</span>
              <button
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setCollapsed(!collapsed)}
              >
                <MenuCloseIcon size={20} />
              </button>
            </div>
          </div>
          <button
            className="compact-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            <MenuCloseIcon size={20} />
          </button>
          {!collapsed && (
            <div
              role="separator"
              aria-label="Resize sidebar"
              aria-orientation="vertical"
              aria-valuenow={width}
              aria-valuemin={214}
              aria-valuemax={300}
              tabIndex={0}
              className="sidebar-resize"
              onKeyDown={(e) => {
                if (e.key === "ArrowRight")
                  setWidth((x) => Math.min(300, x + 10));
                if (e.key === "ArrowLeft")
                  setWidth((x) => Math.max(214, x - 10));
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  setWidth(Math.min(300, Math.max(214, e.clientX)));
              }}
            />
          )}
        </aside>
        <div className="workspace">
          <header
            className={`topbar ${navVisible ? "nav-visible" : "nav-hidden"}`}
          >
            {plantOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  className="popover-backdrop"
                  onClick={() => setPlantOpen(false)}
                  aria-hidden="true"
                />,
                document.body,
              )}
            <Popover.Root open={plantOpen} onOpenChange={setPlantOpen}>
              <Popover.Trigger asChild>
                <button className="plant-switch" aria-label="Choose plant">
                  <span className="plant-icon">
                    <Factory size={18} />
                  </span>
                  <span>
                    <strong>
                      {plant?.name || "Select a plant assessment"}
                    </strong>
                    <small>
                      {w.assessment?.origin.kind === "development_fixture" &&
                        "Demo data · "}
                      {plant?.state || "India"} <span>·</span>{" "}
                      {w.sector.data?.name || "Industrial carbon intelligence"}
                    </small>
                  </span>
                  <ChevronDown size={14} />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  ref={popoverContentRef}
                  className="popover plant-popover"
                  align="start"
                  sideOffset={30}
                  alignOffset={-8}
                  data-lenis-prevent="true"
                >
                  <div className="popover-heading">
                    Demo facility profiles{" "}
                    <Badge>{w.sectors.data?.length ?? 0} facilities</Badge>
                  </div>
                  <SearchBox
                    value={search}
                    onChange={setSearch}
                    placeholder="Search plant or sector…"
                  />
                  <div
                    ref={plantOptionsRef}
                    className="plant-options"
                    data-lenis-prevent="true"
                  >
                    {(w.sectors.data || [])
                      .filter((s) =>
                        (s.demo_profile.name + s.name + s.cluster + s.state)
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((s) => (
                        <button
                          key={s.key}
                          onClick={() => {
                            w.selectPlant(s.key);
                            setPlantOpen(false);
                            setSearch("");
                            navigate("/overview");
                          }}
                        >
                          <Factory size={17} />
                          <span>
                            <strong>{s.demo_profile.name}</strong>
                            <small>
                              {s.state} · {s.name}
                            </small>
                          </span>
                          {w.sectorKey === s.key && <Check size={16} />}
                        </button>
                      ))}
                    {w.sectors.isError && (
                      <p>Unable to load plants. Check the API connection.</p>
                    )}
                  </div>
                  <div className="popover-foot">
                    Select a demonstration profile. These are not verified
                    factory records.
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <div className="top-actions">
              <button
                className="chip positive"
                onClick={() => setAssistantOpen(true)}
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.825rem",
                  padding: "0.35rem 0.75rem",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#10b981",
                  fontWeight: 600,
                  borderRadius: "999px",
                }}
                aria-label="Ask PRANGARA"
              >
                <Sparkles size={14} />
                <span>Ask PRANGARA ✨</span>
              </button>
              <button
                className="command-trigger"
                onClick={() => w.setCommandOpen(true)}
                aria-label="Search commands"
              >
                <Command size={15} />
                <kbd>K</kbd>
              </button>
              <button
                className="icon-button theme-top"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <ToggleIcon
                  size={26}
                  active={theme === "dark"}
                  color={theme === "dark" ? "#38bdf8" : "#94a3b8"}
                />
              </button>
              <LiquidButton
                variant="blue"
                size="sm"
                text="Run assessment"
                onClick={() => navigate("/assessment")}
              />
            </div>
          </header>
          <main id="main" tabIndex={-1}>
            <Outlet />
            <footer className="page-footer">
              <span>
                Screening and decision support · Planning-grade economics
              </span>
              <Link to="/methodology">Methodology & limitations ↗</Link>
            </footer>
          </main>
        </div>
      </div>
      <RecordDrawer />
      <RagAssistant
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
      <CommandPalette />
      <AnimatePresence>
        {w.toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <Check size={16} />
            {w.toast}
            <button
              aria-label="Dismiss notification"
              onClick={() => w.setToast("")}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {w.demo.isFetching && !w.demo.isPending && (
        <div className="refresh-indicator" role="status">
          <RefreshCw size={13} />
          Refreshing assessment
        </div>
      )}
    </Tooltip.Provider>
  );
}
