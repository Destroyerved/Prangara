import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, ArrowUpRight, X, Factory, Sparkles, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../../hooks/useWorkspace";
import { useSession } from "../../hooks/useSession";
import { useResource } from "../platform/shared";
import { openFactory } from "./openFactory";
import type { FactorySummary } from "../../api/contracts";
import { navigation } from "./navigation";
const itemKeywords: Record<string, string[]> = {
  "/marketplace": [
    "marketplace",
    "market",
    "rfqs",
    "rfq",
    "vendors",
    "vendor",
    "providers",
    "provider",
    "materials",
    "material",
    "quotes",
    "quote",
    "esco",
    "equipment",
    "procurement",
  ],
  "/assessment": ["plant data", "assessment", "bills", "meters", "energy", "input"],
  "/footprint": ["footprint", "emissions", "ghg", "scope 1", "scope 2", "scope 3"],
  "/leaks": ["leak points", "diagnostics", "waste", "benchmarks"],
  "/scenarios": ["simulator", "scenarios", "what-if", "macc"],
  "/actions": ["circular actions", "recommendations", "projects"],
  "/portfolio": ["abatement portfolio", "macc curve", "investments"],
  "/logistics": [
    "green logistics",
    "logistics",
    "corridors",
    "freight",
    "transport",
    "map",
    "maps",
    "gps",
    "fleet",
    "tracking",
    "telemetry",
    "route planner",
  ],
  "/circular-network": [
    "circular network",
    "byproducts",
    "industrial symbiosis",
    "cluster map",
    "clusters",
    "waste exchange",
  ],
  "/compliance": ["compliance", "brsr", "cbam", "iso", "reports"],
  "/methodology": ["methodology", "factors", "cea", "ipcc"],
};

export function CommandPalette() {
  const w = useWorkspace(),
    navigate = useNavigate();
  const { session } = useSession();
  const factories = useResource<FactorySummary[]>("/factories?limit=200");
  const [search, setSearch] = useState("");
  const close = () => {
    w.setCommandOpen(false);
    setSearch("");
  };
  const matches = (s: string) => s.toLowerCase().includes(search.toLowerCase());
  const actions =
    w.assessment?.recommendations.items
      .filter((a) => matches(a.name))
      .slice(0, 5) || [];
  const factors =
    w.reference.data?.filter((f) => matches(f.name)).slice(0, 4) || [];
  return (
    <Dialog.Root
      open={w.commandOpen}
      onOpenChange={(v) => {
        w.setCommandOpen(v);
        if (!v) setSearch("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="command-dialog" data-lenis-prevent="true">
          <Dialog.Title className="sr-only">Search PRANGARA</Dialog.Title>
          <Dialog.Description className="sr-only">
            Navigate modules, switch facilities, or inspect an intervention or
            emission factor.
          </Dialog.Description>
          <div className="command-input">
            <Search size={20} />
            <input
              aria-label="Search commands, actions and factors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commands, actions and factors…"
            />
            <Dialog.Close aria-label="Close search">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="command-results">
            <div className="eyebrow">NAVIGATE</div>
            {navigation
              .flatMap((g) => g.items)
              .filter((n) => {
                if (matches(n.label)) return true;
                const kw = itemKeywords[n.path];
                return kw ? kw.some((k) => matches(k)) : false;
              })
              .map((n) => (
                <button
                  key={n.path}
                  onClick={() => {
                    navigate(n.path);
                    close();
                  }}
                >
                  <n.icon size={17} />
                  <span>Go to {n.label}</span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            {matches("Run assessment") && (
              <button
                onClick={() => {
                  navigate("/assessment");
                  close();
                }}
              >
                Run assessment
                <ArrowUpRight size={14} />
              </button>
            )}
            {matches("Glassmorphism Animation Demo") && (
              <button
                onClick={() => {
                  navigate("/glass-demo");
                  close();
                }}
              >
                <Sparkles size={17} />
                <span>Glassmorphism Animation Demo</span>
                <ArrowUpRight size={14} />
              </button>
            )}
            {(matches("gps") || matches("map") || matches("fleet") || matches("tracking") || matches("corridor map")) && (
              <button
                onClick={() => {
                  navigate("/logistics");
                  close();
                }}
              >
                <Radio size={17} style={{ color: "var(--accent, #79D7E6)" }} />
                <span>Open Corridor GPS &amp; Fleet Map</span>
                <ArrowUpRight size={14} />
              </button>
            )}
            {(matches("cluster map") || matches("symbiosis map")) && (
              <button
                onClick={() => {
                  navigate("/circular-network");
                  close();
                }}
              >
                <Radio size={17} style={{ color: "#c084fc" }} />
                <span>Open Regional Cluster Symbiosis Map</span>
                <ArrowUpRight size={14} />
              </button>
            )}
            <div className="eyebrow">FACILITY PROFILES</div>
            {!session && (
              <p className="command-empty">
                Sign in to view factory records.
              </p>
            )}
            {(factories.data || [])
              .filter((f) =>
                matches(f.name + " " + f.sector + " " + (f.state || "")),
              )
              .slice(0, search ? 10 : 3)
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    openFactory(f, w.loadAssessment).then((opened) =>
                      navigate(opened ? "/overview" : "/workspace/" + f.id),
                    );
                    close();
                  }}
                >
                  <Factory size={17} />
                  <span>{f.name}</span>
                </button>
              ))}
            {search && (
              <>
                <div className="eyebrow">INTERVENTIONS</div>
                {actions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      w.setDrawer({ kind: "action", data: a });
                      close();
                    }}
                  >
                    {a.name}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
                <div className="eyebrow">EMISSION FACTORS</div>
                {factors.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      w.setDrawer({ kind: "factor", data: f });
                      close();
                    }}
                  >
                    {f.name}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
                {!actions.length && !factors.length && (
                  <p className="command-empty">
                    No matching action or factor. Try another term.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="command-footer">
            <span>Esc to close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
