import { useLocation } from "react-router-dom";
import {
  createContext,
  useContext,
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
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from "motion/react";
import {
  Factory,
  ChevronDown,
  Command,
  Check,
  RefreshCw,
  X,
  Sparkles,
  Globe2,
} from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { navigation } from "./navigation";
import { SearchBox, Badge } from "../ui/common";
import { RecordDrawer } from "../drawers/RecordDrawer";
import { CommandPalette } from "./CommandPalette";
import { RagAssistant } from "../rag/RagAssistant";
import { PrangaraLogoMark } from "../brand/PrangaraLogo";
import { ShaderBackground } from "../ui/waves-shader";
import {
  MenuCloseIcon,
  ToggleIcon,
} from "@/components/ui/animated-state-icons";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { SpinningBorderButton } from "@/components/ui/spinning-border-button";
import { UnseenCursor } from "@/components/ui/UnseenCursor";
import { UnseenSmoothScroll } from "@/components/ui/UnseenSmoothScroll";
const pref = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const SidebarDockContext = createContext<{
  mouseY: MotionValue<number>;
  distance: number;
  spring: SpringOptions;
  collapsed: boolean;
} | null>(null);

const MotionNavLink = motion.create(NavLink);

function SidebarNavItem({
  path,
  label,
  icon: Icon,
  collapsed,
  count,
  isJustLanded,
  onExpand,
}: {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; active?: boolean; isHovered?: boolean }>;
  collapsed: boolean;
  count?: number;
  isJustLanded?: boolean;
  onExpand?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const dockContext = useContext(SidebarDockContext);
  const ref = useRef<HTMLAnchorElement>(null);

  const isItemActive =
    location.pathname === path ||
    (path !== "/" &&
      path !== "/overview" &&
      location.pathname.startsWith(path + "/"));

  const itemClassName = [
    "nav-item",
    isItemActive ? "active" : "",
    (isJustLanded && isItemActive) ? "just-landed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const fallbackMouseY = useMotionValue(Infinity);
  const mouseY = dockContext ? dockContext.mouseY : fallbackMouseY;
  const distance = dockContext?.distance ?? 110;
  const springConfig = dockContext?.spring ?? { mass: 0.1, stiffness: 180, damping: 14 };

  const mouseDistance = useTransform(mouseY, (val: number) => {
    if (!ref.current || val === Infinity) return 1000;
    const rect = ref.current.getBoundingClientRect();
    return val - rect.y - rect.height / 2;
  });

  const iconScaleTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [1, collapsed ? 1.35 : 1.18, 1]
  );
  const iconScale = useSpring(iconScaleTransform, springConfig);

  const rowTranslateXTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [0, collapsed ? 4 : 4, 0]
  );
  const rowTranslateX = useSpring(rowTranslateXTransform, springConfig);

  const rowScaleTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [1, collapsed ? 1.15 : 1.015, 1]
  );
  const rowScale = useSpring(rowScaleTransform, springConfig);

  const link = (
    <MotionNavLink
      ref={ref}
      className={itemClassName}
      to={path}
      aria-label={label}
      aria-current={isItemActive ? "page" : undefined}
      style={{
        scale: rowScale,
        x: rowTranslateX,
        transformOrigin: collapsed ? "center left" : "left center",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (collapsed && onExpand) {
          onExpand();
        }
      }}
    >
      <motion.span
        style={{
          scale: iconScale,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transformOrigin: "center center",
        }}
      >
        <Icon size={collapsed ? 19 : 22} active={isItemActive} isHovered={isHovered} />
      </motion.span>
      {!collapsed && <span className="nav-text">{label}</span>}
      {!collapsed && count ? <span className="count">{count}</span> : null}
    </MotionNavLink>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side="right" sideOffset={12}>
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
      320,
      Math.max(252, Number(pref("prangara-sidebar", "260")) || 260),
    ),
  );
  const [theme, setTheme] = useState(() => pref("prangara-theme", "dark"));
  const [plantOpen, setPlantOpen] = useState(false),
    [search, setSearch] = useState("");
  const [ragOpen, setRagOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const sidebarMouseY = useMotionValue(Infinity);

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

  // Background Blur & Lenis Scroll Pause when Facility Profiles Popover or RAG Assistant is open
  useEffect(() => {
    if (plantOpen) {
      document.body.classList.add("has-plant-popover-open");
    } else {
      document.body.classList.remove("has-plant-popover-open");
    }

    if (plantOpen || ragOpen) {
      window.__lenis?.stop();
    } else {
      window.__lenis?.start();
    }

    return () => {
      document.body.classList.remove("has-plant-popover-open");
      window.__lenis?.start();
    };
  }, [plantOpen, ragOpen]);

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
      <div className="waves-shader-container" aria-hidden="true">
        <ShaderBackground className="waves-shader-canvas" speed={1.8} />
        <div className="waves-shader-scrim" />
      </div>
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
            <span className="brand-text">PRANGARA</span>
          </Link>
          <div className="workspace-label">INDUSTRIAL INTELLIGENCE</div>
          <SidebarDockContext.Provider
            value={{
              mouseY: sidebarMouseY,
              distance: collapsed ? 80 : 95,
              spring: { mass: 0.1, stiffness: 180, damping: 14 },
              collapsed,
            }}
          >
            <nav
              aria-label="Main navigation"
              onMouseMove={(e) => {
                sidebarMouseY.set(e.clientY);
              }}
              onMouseLeave={() => {
                sidebarMouseY.set(Infinity);
              }}
            >
              {navigation.map((group) => (
                <div className="nav-group" key={group.group}>
                  {group.group ? <div className="nav-label">{group.group}</div> : null}
                  {group.items.map(({ path, label, icon: Icon }) => (
                    <SidebarNavItem
                      key={path}
                      path={path}
                      label={label}
                      icon={Icon}
                      collapsed={collapsed}
                      onExpand={() => setCollapsed(false)}
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
          </SidebarDockContext.Provider>
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
              <SpinningBorderButton
                onClick={() => setRagOpen(true)}
                aria-label="Ask PRANGARA"
                showArrow={false}
                icon={
                  <Sparkles
                    size={14}
                    className="shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12 text-white"
                  />
                }
                contentClassName="px-3.5 py-1.5 text-[0.78rem] tracking-wider font-semibold text-neutral-200 group-hover:text-white"
              >
                <span className="relative grid place-items-center select-none pointer-events-none leading-none">
                  <span className="col-start-1 row-start-1 font-semibold whitespace-nowrap transition-opacity duration-300 ease-out group-hover:opacity-0">
                    ASK PRANGARA
                  </span>
                  <span
                    aria-hidden="true"
                    className="col-start-1 row-start-1 italic font-semibold whitespace-nowrap transition-opacity duration-300 ease-out opacity-0 group-hover:opacity-100 text-white"
                    style={{
                      fontFamily: "var(--font-editorial)",
                      letterSpacing: "0.03em",
                      fontSize: "0.95em",
                    }}
                  >
                    ASK PRANGARA
                  </span>
                </span>
              </SpinningBorderButton>
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
                title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                <ToggleIcon
                  size={26}
                  active={theme === "dark"}
                  color={theme === "dark" ? "#ffffff" : "#09090b"}
                />
              </button>
              <Link
                to="/"
                className="icon-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0 12px",
                  width: "auto",
                  height: "36px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
                title="View 3D Storytelling Landing Page"
              >
                <Globe2 size={14} style={{ color: "var(--accent-blue, #61B8F5)" }} />
                <span>Story</span>
              </Link>
              <LiquidButton
                variant="blue"
                size="sm"
                text="Run assessment"
                onClick={() => navigate("/assessment")}
              />
            </div>
          </header>
          <main id="main" tabIndex={-1}>
            {w.factoryId && <div className="platform-context">Saved factory assessment · {w.assessment?.plant.name}<Link to={"/workspace/"+w.factoryId}>Factory records ↗</Link></div>}
            <Outlet />
          </main>
        </div>
      </div>
      <RecordDrawer />
      <RagAssistant isOpen={ragOpen} onClose={() => setRagOpen(false)} />
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
