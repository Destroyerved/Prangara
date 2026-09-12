import { scaleLinear } from "d3";
import { motion } from "motion/react";
import { number } from "../../lib/format";
export function BenchmarkStrip({
  percentile,
  share,
  structural = false,
}: {
  percentile: number | null;
  share?: number;
  structural?: boolean;
}) {
  const x = scaleLinear().domain([0, 100]).range([12, 448]);
  const point = structural ? share : percentile;
  if (point == null)
    return <div className="unavailable-strip">Peer position unavailable</div>;
  return (
    <svg
      className="benchmark-svg"
      viewBox="0 0 460 64"
      role="img"
      aria-label={
        structural
          ? number(share, 1) + " percent of footprint"
          : "Plant at percentile " +
            number(percentile) +
            ". Markers show p25, p50, and p75."
      }
    >
      <rect x="12" y="16" width="436" height="5" fill="var(--border)" rx="2" />
      {structural ? (
        <rect
          x="12"
          y="16"
          width={x(share || 0) - 12}
          height="5"
          fill="var(--critical)"
          rx="2"
        />
      ) : (
        <>
          {[0, 25, 50, 75].map((v, i) => (
            <rect
              key={v}
              x={x(v)}
              y="16"
              width={109}
              height="5"
              fill={
                [
                  "var(--accent)",
                  "var(--scope-3)",
                  "var(--moderate)",
                  "var(--scope-1)",
                ][i]
              }
              opacity=".65"
            />
          ))}
          {[25, 50, 75].map((p) => (
            <g key={p}>
              <line
                x1={x(p)}
                x2={x(p)}
                y1="12"
                y2="26"
                stroke="var(--subtle)"
              />
              <text x={x(p)} y="47" textAnchor="middle" className="chart-tick">
                p{p}
              </text>
            </g>
          ))}
        </>
      )}
      <motion.g
        initial={{ x: -x(point) }}
        animate={{ x: 0 }}
        transition={{ duration: 0.45 }}
      >
        <path
          d={
            "M " +
            (x(point) - 5) +
            " 3 L " +
            (x(point) + 5) +
            " 3 L " +
            x(point) +
            " 10 Z"
          }
          fill="var(--text)"
        />
        <line
          x1={x(point)}
          x2={x(point)}
          y1="12"
          y2="25"
          stroke="var(--text)"
          strokeWidth="2"
        />
      </motion.g>
      {structural && (
        <>
          <text x="12" y="47" className="chart-tick">
            0%
          </text>
          <text x="448" y="47" textAnchor="end" className="chart-tick">
            100% of footprint
          </text>
        </>
      )}
    </svg>
  );
}
