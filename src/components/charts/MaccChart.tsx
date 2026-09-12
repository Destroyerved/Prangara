import { useMemo, useState } from "react";
import { scaleLinear, quantileSorted } from "d3";
import { motion } from "motion/react";
import { useWorkspace } from "../../hooks/useWorkspace";
import type { PortfolioMode } from "../../types/domain";
import { number, money } from "../../lib/format";
import { Empty } from "../ui/common";
import { ActionTooltip, useChartHover } from "./ChartTooltip";
export default function MaccChart({
  mode = "all",
  compact = false,
}: {
  mode?: PortfolioMode;
  compact?: boolean;
}) {
  const w = useWorkspace(),
    a = w.assessment;
  const [selected, setSelected] = useState<string | null>(null);
  const { hover, setHover, move } = useChartHover();
  const curve = a?.recommendations.portfolios[mode]?.curve ?? [];
  const chart = useMemo(() => {
    const ordered = [...curve]
      .filter((v) => v.abatement_t > 0)
      .sort((a, b) => a.lcoa - b.lcoa);
    let cumulative = 0;
    const bars = ordered.map((v) => {
      const row = { ...v, start: cumulative };
      cumulative += v.abatement_t;
      return row;
    });
    const costs = ordered.map((v) => v.lcoa);
    let low = Math.min(0, quantileSorted(costs, 0.08) ?? -1),
      high = Math.max(0, quantileSorted(costs, 0.92) ?? 1);
    if (low === high) {
      low = -1;
      high = 1;
    }
    const pad = (high - low) * 0.12;
    low -= pad;
    high += pad;
    const x = scaleLinear()
      .domain([0, cumulative || 1])
      .range([80, 1050]);
    const y = scaleLinear().domain([low, high]).range([350, 55]);
    return { bars, x, y, low, high, total: cumulative };
  }, [curve]);
  if (!a || !chart.bars.length)
    return (
      <Empty
        title="MACC data unavailable"
        description="Marginal abatement cost curve is configured for primary industrial facilities."
        action={
          <button
            className="button"
            onClick={() => w.selectPlant("textile_dyeing")}
          >
            Switch to Tirupur Unit
          </button>
        }
      />
    );
  const active = hover?.id || selected;
  const activeAction = a.recommendations.items.find((x) => x.id === hover?.id);
  const clipped = chart.bars.filter(
    (v) => v.lcoa < chart.low || v.lcoa > chart.high,
  );
  return (
    <div className={"macc-container " + (compact ? "compact-chart" : "")}>
      <div className="chart-scroll">
        <div className="chart-canvas">
          <svg
            viewBox="0 0 1100 422"
            className="macc-svg"
            aria-label="Marginal abatement cost curve. Width is de-rated tonnes, height is rupees per tonne. Negative bars indicate a cash-positive option."
          >
            <text x="80" y="22" className="chart-axis-label">
              ₹ / tCO₂e
            </text>
            {chart.y
              .ticks(5)
              .filter((v) => v !== 0)
              .map((t) => (
                <g key={t}>
                  <line
                    x1="80"
                    x2="1050"
                    y1={chart.y(t)}
                    y2={chart.y(t)}
                    className="chart-grid"
                  />
                  <text
                    x="66"
                    y={chart.y(t) + 4}
                    textAnchor="end"
                    className="chart-tick"
                  >
                    {t < 0 ? "−" : ""}
                    {number(Math.abs(t))}
                  </text>
                </g>
              ))}
            <rect
              x="80"
              y={chart.y(0)}
              width="970"
              height={350 - chart.y(0)}
              fill="var(--accent)"
              opacity=".025"
            />
            {chart.bars.map((v, i) => {
              const value = Math.max(chart.low, Math.min(chart.high, v.lcoa)),
                y = Math.min(chart.y(0), chart.y(value)),
                height = Math.max(1, Math.abs(chart.y(0) - chart.y(value))),
                isClipped = v.lcoa < chart.low || v.lcoa > chart.high;
              const item = a.recommendations.items.find((a) => a.id === v.id);
              return (
                <g
                  key={v.id}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    (item?.name || v.id) +
                    ": " +
                    number(v.abatement_t) +
                    " tonnes at " +
                    money(v.lcoa) +
                    " per tonne" +
                    (isClipped
                      ? ". Bar clipped; tooltip shows actual value."
                      : "")
                  }
                  onMouseMove={(e) => move(e, v.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() =>
                    setHover({
                      id: v.id,
                      x: Math.min(810, chart.x(v.start)),
                      y: 70,
                    })
                  }
                  onBlur={() => setHover(null)}
                  onClick={() => {
                    setSelected(v.id);
                    if (item) w.setDrawer({ kind: "action", data: item });
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && item) {
                      e.preventDefault();
                      setSelected(v.id);
                      w.setDrawer({ kind: "action", data: item });
                    }
                  }}
                  className="chart-bar"
                  data-active={active === v.id}
                >
                  <motion.rect
                    x={chart.x(v.start) + 0.7}
                    width={Math.max(
                      0.8,
                      chart.x(v.start + v.abatement_t) - chart.x(v.start) - 1.4,
                    )}
                    y={y}
                    height={height}
                    rx="1"
                    fill={v.lcoa < 0 ? "var(--accent)" : "var(--scope-1)"}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{
                      opacity: active && active !== v.id ? 0.28 : 0.8,
                      scaleY: 1,
                    }}
                    transition={{
                      duration: 0.45,
                      delay: Math.min(i * 0.015, 0.2),
                    }}
                    style={{ transformOrigin: "center " + chart.y(0) + "px" }}
                    stroke={isClipped ? "var(--text)" : "none"}
                    strokeDasharray={isClipped ? "4 3" : undefined}
                  />
                  {isClipped && (
                    <text
                      x={chart.x(v.start + v.abatement_t / 2)}
                      y={v.lcoa < 0 ? 343 : 68}
                      className="clip-label"
                      textAnchor="middle"
                    >
                      ↕
                    </text>
                  )}
                </g>
              );
            })}
            <line
              x1="80"
              x2="1050"
              y1={chart.y(0)}
              y2={chart.y(0)}
              className="chart-zero"
            />
            <text
              x="66"
              y={chart.y(0) + 4}
              className="chart-zero-label"
              textAnchor="end"
            >
              ₹0
            </text>
            {chart.x.ticks(6).map((t) => (
              <g key={t}>
                <line
                  x1={chart.x(t)}
                  x2={chart.x(t)}
                  y1="357"
                  y2="363"
                  className="chart-grid"
                />
                <text
                  x={chart.x(t)}
                  y="383"
                  textAnchor="middle"
                  className="chart-tick"
                >
                  {number(t)}
                </text>
              </g>
            ))}
            <text
              x="1050"
              y="410"
              textAnchor="end"
              className="chart-axis-label"
            >
              Cumulative abatement · tCO₂e / yr
            </text>
          </svg>
          {hover && activeAction && (
            <ActionTooltip
              action={activeAction}
              abatement={
                chart.bars.find((b) => b.id === hover.id)?.abatement_t || 0
              }
              x={hover.x}
              y={hover.y}
            />
          )}
        </div>
      </div>
      <div className="chart-caption">
        <div>
          <span className="legend-square positive-fill" />
          Cash positive <span className="legend-square cost-fill" />
          Net cost
        </div>
        <span>
          {clipped.length
            ? clipped.length +
              " clipped " +
              (clipped.length === 1 ? "bar" : "bars") +
              " · dashed edges · true values in tooltip"
            : "All bar values shown on scale"}{" "}
          · Click a bar to inspect
        </span>
      </div>
    </div>
  );
}
