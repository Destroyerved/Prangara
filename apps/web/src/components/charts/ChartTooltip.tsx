import { useState, type MouseEvent } from "react";
import { number, money, payback } from "../../lib/format";
import type { Action } from "../../types/domain";
export function useChartHover() {
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const move = (e: MouseEvent<SVGElement>, id: string) => {
    const r =
      e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
    if (r)
      setHover({
        id,
        x: Math.max(8, Math.min(r.width - 270, e.clientX - r.left + 18)),
        y: Math.max(8, Math.min(r.height - 170, e.clientY - r.top - 80)),
      });
  };
  return { hover, setHover, move };
}
export function ActionTooltip({
  action,
  x,
  y,
  abatement,
}: {
  action: Action;
  x: number;
  y: number;
  abatement: number;
}) {
  return (
    <div className="chart-tooltip" style={{ left: x, top: y }} role="tooltip">
      <strong>{action.name}</strong>
      <dl>
        <div>
          <dt>Abatement</dt>
          <dd>{number(abatement)} tCO₂e</dd>
        </div>
        <div>
          <dt>Cost per tonne</dt>
          <dd>{money(action.lcoa)}</dd>
        </div>
        <div>
          <dt>Annual benefit</dt>
          <dd>{money(action.net_benefit)}</dd>
        </div>
        <div>
          <dt>Investment</dt>
          <dd>{money(action.capex)}</dd>
        </div>
        <div>
          <dt>Payback</dt>
          <dd>{payback(action.payback_years)}</dd>
        </div>
      </dl>
      <small>Click to inspect the business case</small>
    </div>
  );
}
