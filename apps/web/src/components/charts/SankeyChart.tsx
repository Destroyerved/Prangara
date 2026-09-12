import { useMemo } from "react";
import {
  sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
  type SankeyNode,
  type SankeyLink,
} from "d3-sankey";
import { motion } from "motion/react";
import { useWorkspace } from "../../hooks/useWorkspace";
import { number, scopeColor } from "../../lib/format";
import { Empty } from "../ui/common";
import { useChartHover } from "./ChartTooltip";
type NodeData = {
  id: string;
  name: string;
  scope: string;
  stream_id: string | null;
};
type LinkData = { scope: string };
export default function SankeyChart({
  onScope,
}: {
  onScope: (scope: string) => void;
}) {
  const w = useWorkspace(),
    a = w.assessment!;
  const { hover, setHover, move } = useChartHover();
  const graph = useMemo(() => {
    if (!a.sankey.links.length) return null;
    return sankey<NodeData, LinkData>()
      .nodeId((n) => n.id)
      .nodeWidth(7)
      .nodePadding(33)
      .nodeAlign(sankeyJustify)
      .nodeSort(
        (a, b) =>
          a.scope.localeCompare(b.scope) || (b.value || 0) - (a.value || 0),
      )
      .extent([
        [238, 38],
        [875, 425],
      ])({
      nodes: a.sankey.nodes.map((n) => ({ ...n })),
      links: a.sankey.links.filter((l) => l.value > 0).map((l) => ({ ...l })),
    });
  }, [a.sankey]);
  if (!graph)
    return (
      <Empty
        title="Stream flow unavailable"
        description="A Sankey requires the engine’s complete stream-to-scope graph. This report snapshot does not include it."
      />
    );
  const hoverNode = graph.nodes.find((n) => n.id === hover?.id);
  const open = (n: SankeyNode<NodeData, LinkData>) => {
    if (n.stream_id) {
      const s = a.footprint.streams.find((s) => s.id === n.stream_id);
      if (s) w.setDrawer({ kind: "stream", data: s });
    } else if (n.scope !== "total") onScope(n.scope);
  };
  const connected = (l: SankeyLink<NodeData, LinkData>) => {
    if (!hoverNode) return true;
    const s = l.source as SankeyNode<NodeData, LinkData>,
      t = l.target as SankeyNode<NodeData, LinkData>;
    return (
      s.id === hoverNode.id ||
      t.id === hoverNode.id ||
      (!s.stream_id && s.scope === hoverNode.scope)
    );
  };
  return (
    <div className="chart-scroll">
      <div className="chart-canvas sankey-canvas">
        <svg
          viewBox="0 0 1060 480"
          aria-label="Carbon flow: streams to Scope 1, 2 and 3, then total annual footprint. Select a stream for details."
        >
          <text x="12" y="17" className="chart-axis-label">
            ACTIVITY STREAM
          </text>
          <text x="549" y="17" className="chart-axis-label">
            EMISSION SCOPE
          </text>
          <text x="886" y="17" className="chart-axis-label">
            TOTAL
          </text>
          {graph.links.map((l, i) => (
            <motion.path
              key={i}
              d={sankeyLinkHorizontal()(l) || ""}
              fill="none"
              stroke={scopeColor(l.scope)}
              strokeWidth={Math.max(1, l.width || 0)}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: connected(l) ? 0.24 : 0.035, pathLength: 1 }}
              transition={{ duration: 0.5, delay: i * 0.018 }}
              onMouseMove={(e) => move(e, (l.source as NodeData).id)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          {graph.nodes.map((n) => (
            <g
              key={n.id}
              role={n.scope === "total" ? "img" : "button"}
              tabIndex={n.scope === "total" ? -1 : 0}
              aria-label={n.name + ": " + number(n.value) + " tonnes"}
              className="sankey-node"
              onMouseMove={(e) => move(e, n.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() =>
                setHover({
                  id: n.id,
                  x: Math.min(750, n.x0 || 0),
                  y: Math.min(250, n.y0 || 0),
                })
              }
              onBlur={() => setHover(null)}
              onClick={() => open(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(n);
                }
              }}
            >
              <rect
                x={n.x0}
                y={n.y0}
                width={(n.x1 || 0) - (n.x0 || 0)}
                height={Math.max(2, (n.y1 || 0) - (n.y0 || 0))}
                fill={
                  n.scope === "total" ? "var(--accent)" : scopeColor(n.scope)
                }
                rx="1"
              />
              {n.stream_id ? (
                <>
                  <text
                    x="12"
                    y={((n.y0 || 0) + (n.y1 || 0)) / 2 - 2}
                    className="sankey-label"
                  >
                    {n.name}
                  </text>
                  <text
                    x="12"
                    y={((n.y0 || 0) + (n.y1 || 0)) / 2 + 16}
                    className="chart-tick"
                  >
                    {number(n.value)} tCO₂e
                  </text>
                </>
              ) : (
                <>
                  <text
                    x={(n.x1 || 0) + 14}
                    y={((n.y0 || 0) + (n.y1 || 0)) / 2 - 4}
                    className="sankey-label"
                  >
                    {n.name}
                  </text>
                  <text
                    x={(n.x1 || 0) + 14}
                    y={((n.y0 || 0) + (n.y1 || 0)) / 2 + 17}
                    className="sankey-value"
                  >
                    {number(n.value)}
                  </text>
                </>
              )}
            </g>
          ))}
          <text x="12" y="465" className="chart-tick">
            Ribbon width represents annual emissions. Biogenic CO₂ is reported
            separately.
          </text>
        </svg>
        {hover && hoverNode && (
          <div
            className="chart-tooltip"
            style={{ left: hover.x, top: hover.y }}
            role="tooltip"
          >
            <strong>{hoverNode.name}</strong>
            <b>
              {number(hoverNode.value)} <small>tCO₂e / yr</small>
            </b>
            <p>
              {number(
                ((hoverNode.value || 0) / a.footprint.total.base) * 100,
                1,
              )}
              % of footprint ·{" "}
              {hoverNode.scope === "total"
                ? "All scopes"
                : "Scope " + hoverNode.scope}
            </p>
            <small>
              {hoverNode.stream_id
                ? "Click to trace activity and factor"
                : "Select scope to filter streams"}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
