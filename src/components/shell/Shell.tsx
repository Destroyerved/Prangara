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
  Sun,
  Moon,
  Store,
} from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { navigation } from "./navigation";
import { SearchBox, Badge } from "../ui/common";
import { RecordDrawer } from "../drawers/RecordDrawer";
import { CommandPalette } from "./CommandPalette";
import { RagAssistant } from "../rag/RagAssistant";
import { PrangaraLogoMark } from "../brand/PrangaraLogo";
import { MenuCloseIcon } from "@/components/ui/animated-state-icons";

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

  const isItemActive =
    location.pathname === path ||
    (path !== "/" &&
      path !== "/overview" &&
      location.pathname.startsWith(path + "/"));

  const itemClassName = [
    "nav-item",
    isItemActive ? "active" : "",
    isJustLanded && isItemActive ? "just-landed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const link = (
    <NavLink
      className={itemClassName}
      to={path}
      aria-label={label}
      aria-current={isItemActive ? "page" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (collapsed && onExpand) {
          onExpand();
        }
      }}
    >
      <span className="nav-icon-wrap">
        <Icon size={collapsed ? 20 : 18} active={isItemActive} isHovered={isHovered} />
      </span>
      {!collapsed && <span className="nav-text">{label}</span>}
      {!collapsed && count ? <span className="count">{count}</span> : null}
    </NavLink>
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
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (pref("prangara-theme", "dark") === "light" ? "light" : "dark"),
  );
  const [plantOpen, setPlantOpen] = useState(false),
    [search, setSearch] = useState("");
  const [ragOpen, setRagOpen] = useState(false);

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

    return () => {
      document.body.classList.remove("has-plant-popover-open");
    };
  }, [plantOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
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
          <nav aria-label="Main navigation">
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
          <header className="topbar">
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
                type="button"
                className="topbar-action-pill topbar-assistant-btn shrink-0"
                onClick={() => setRagOpen(true)}
                aria-label="Ask Sovereign Assistant"
              >
                <Sparkles size={14} />
                <span>Assistant</span>
              </button>
              <button
                type="button"
                className="topbar-action-pill command-trigger topbar-command-btn shrink-0"
                onClick={() => w.setCommandOpen(true)}
                aria-label="Search commands"
              >
                <Command size={14} />
                <kbd>⌘K</kbd>
              </button>
              {/* Dark / Light Theme Toggle */}
              <div className="theme-tri-switch shrink-0" role="group" aria-label="Theme Selection">
                <button
                  type="button"
                  className={`theme-tri-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => setTheme("dark")}
                  title="Dark Theme"
                  aria-pressed={theme === "dark"}
                >
                  <Moon size={13} />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  className={`theme-tri-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => setTheme("light")}
                  title="Light Theme"
                  aria-pressed={theme === "light"}
                >
                  <Sun size={13} />
                  <span>Light</span>
                </button>
              </div>
              <Link
                to="/marketplace"
                className={`topbar-action-pill topbar-marketplace-btn shrink-0 ${pathname === "/marketplace" ? "active" : ""}`}
                title="Vendor & Materials Marketplace"
              >
                <Store size={14} style={{ color: "var(--accent, #79D7E6)" }} />
                <span>Marketplace</span>
              </Link>
              <button
                type="button"
                className="topbar-run-btn shrink-0"
                onClick={() => navigate("/assessment")}
                aria-label="Run assessment"
              >
                <span>Run assessment</span>
              </button>
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
