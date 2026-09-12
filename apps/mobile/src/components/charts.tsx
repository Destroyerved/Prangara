/**
 * Charts.
 *
 * Ports of the web app's chart geometry to `react-native-svg`: the same
 * scales, the same colours, the same rule that a negative cost per tonne is
 * drawn in the accent and a positive one in scope 1's peach. Geometry is
 * unchanged; only the canvas size is chosen for a phone.
 *
 * Every chart degrades to a labelled empty state rather than an empty box,
 * because a chart with no data still has to say why.
 */

import React, { useMemo, useState } from "react";
import { ScrollView, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import {
  colour,
  radius,
  scopeColour,
  space,
  type as typeScale,
} from "../theme/tokens";
import { money, number } from "../lib/format";
import type { MaccBar, SankeyPayload } from "../api/types";

/** Linear scale: the two lines of d3 these charts actually use. */
function scale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

function quantile(sorted: number[], q: number): number | undefined {
  if (!sorted.length) return undefined;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined
    ? sorted[base] + rest * (next - sorted[base])
    : sorted[base];
}

function useWidth(fallback = 320) {
  const [width, setWidth] = useState(fallback);
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - width) > 1) setWidth(next);
  };
  return { width, onLayout };
}

function ChartEmpty({ title, body }: { title: string; body: string }) {
  return (
    <View
      style={{
        paddingVertical: space.xl,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colour.border,
        backgroundColor: colour.surfaceInset,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          ...typeScale.heading,
          color: colour.text,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...typeScale.caption,
          color: colour.muted,
          textAlign: "center",
          marginTop: space.xs,
        }}
      >
        {body}
      </Text>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginRight: space.lg,
      }}
    >
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 2,
          backgroundColor: swatch,
          marginRight: 5,
        }}
      />
      <Text style={{ ...typeScale.caption, color: colour.muted }}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Marginal abatement cost curve
// ---------------------------------------------------------------------------

/**
 * Width is de-rated tonnes, height is rupees per tonne. A bar below the zero
 * line is cash positive. Extreme bars are clipped to the 8th-92nd percentile
 * band exactly as on the web, and a clipped bar says so when tapped.
 */
export function MaccChart({
  curve,
  height = 250,
  onSelect,
}: {
  curve: MaccBar[];
  height?: number;
  onSelect?: (bar: MaccBar) => void;
}) {
  const { width, onLayout } = useWidth();
  const [active, setActive] = useState<string | null>(null);

  const chart = useMemo(() => {
    const ordered = curve
      .filter((c) => c.width > 0)
      .sort((a, b) => a.height - b.height);
    let cumulative = 0;
    const bars = ordered.map((bar) => {
      const row = { ...bar, start: cumulative };
      cumulative += bar.width;
      return row;
    });
    const costs = [...ordered.map((c) => c.height)].sort((a, b) => a - b);
    let low = Math.min(0, quantile(costs, 0.08) ?? -1);
    let high = Math.max(0, quantile(costs, 0.92) ?? 1);
    if (low === high) {
      low = -1;
      high = 1;
    }
    const pad = (high - low) * 0.12;
    return { bars, low: low - pad, high: high + pad, total: cumulative };
  }, [curve]);

  if (!chart.bars.length) {
    return (
      <ChartEmpty
        title="Cost curve unavailable"
        body="The engine returned no priced interventions for this plant, so there is no curve to draw."
      />
    );
  }

  const padLeft = 52;
  const padRight = 8;
  const padTop = 20;
  const padBottom = 26;
  const plotRight = Math.max(padLeft + 40, width - padRight);
  const x = scale([0, chart.total || 1], [padLeft, plotRight]);
  const y = scale([chart.low, chart.high], [height - padBottom, padTop]);
  const zero = y(0);
  const ticks = [chart.low, (chart.low + chart.high) / 2, 0, chart.high].filter(
    (tick, index, all) => all.indexOf(tick) === index,
  );
  const selected = chart.bars.find((bar) => bar.id === active);

  return (
    <View onLayout={onLayout}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Marginal abatement cost curve. ${number(
          chart.bars.length,
        )} interventions covering ${number(
          chart.total,
        )} tonnes. Width is de-rated tonnes, height is rupees per tonne. A bar below the zero line is cash positive.`}
      >
        <Svg width={width} height={height}>
          <SvgText x={4} y={12} fill={colour.subtle} fontSize={10}>
            INR / tCO2e
          </SvgText>
          {ticks.map((tick) => (
            <G key={`tick-${tick}`}>
              <Line
                x1={padLeft}
                x2={plotRight}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? colour.zeroLine : colour.chartGrid}
              />
              <SvgText
                x={padLeft - 6}
                y={y(tick) + 3.5}
                fill={colour.subtle}
                fontSize={9.5}
                textAnchor="end"
              >
                {tick < 0 ? "-" : ""}
                {Math.abs(tick) >= 1000
                  ? `${number(Math.abs(tick) / 1000)}k`
                  : number(Math.abs(tick))}
              </SvgText>
            </G>
          ))}
          <Rect
            x={padLeft}
            y={zero}
            width={plotRight - padLeft}
            height={Math.max(0, height - padBottom - zero)}
            fill={colour.accent}
            opacity={0.04}
          />
          {chart.bars.map((bar) => {
            const value = Math.max(chart.low, Math.min(chart.high, bar.height));
            const top = Math.min(zero, y(value));
            const barHeight = Math.max(1.5, Math.abs(zero - y(value)));
            const left = x(bar.start) + 0.5;
            const barWidth = Math.max(
              1.4,
              x(bar.start + bar.width) - x(bar.start) - 1,
            );
            const dimmed = active !== null && active !== bar.id;
            return (
              <Rect
                key={bar.id}
                x={left}
                y={top}
                width={barWidth}
                height={barHeight}
                rx={1}
                fill={bar.height < 0 ? colour.accent : colour.scope1}
                opacity={dimmed ? 0.28 : 0.82}
                onPress={() => {
                  setActive(bar.id === active ? null : bar.id);
                  onSelect?.(bar);
                }}
              />
            );
          })}
          <Line
            x1={padLeft}
            x2={plotRight}
            y1={height - padBottom}
            y2={height - padBottom}
            stroke={colour.border}
          />
          <SvgText
            x={padLeft}
            y={height - 8}
            fill={colour.subtle}
            fontSize={9.5}
          >
            0
          </SvgText>
          <SvgText
            x={plotRight}
            y={height - 8}
            fill={colour.subtle}
            fontSize={9.5}
            textAnchor="end"
          >
            {number(chart.total)} tCO2e cumulative
          </SvgText>
        </Svg>
      </View>
      <View
        style={{
          marginTop: space.sm,
          padding: space.md,
          borderRadius: radius.control,
          backgroundColor: colour.surfaceInset,
          borderWidth: 1,
          borderColor: colour.border,
        }}
      >
        {selected ? (
          <>
            <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
              {selected.name}
            </Text>
            <Text
              style={{
                ...typeScale.caption,
                color: colour.muted,
                marginTop: 2,
              }}
            >
              {number(selected.width)} tCO2e de-rated | {money(selected.height)}{" "}
              per tonne |{" "}
              {selected.cash_positive ? "cash positive" : "net cost"}
            </Text>
            {selected.height < chart.low || selected.height > chart.high ? (
              <Text
                style={{
                  ...typeScale.caption,
                  color: colour.high,
                  marginTop: 2,
                }}
              >
                Bar clipped to keep the curve readable. The figure above is the
                real one.
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={{ ...typeScale.caption, color: colour.muted }}>
            Tap a bar for its name, tonnes and cost per tonne. Bars below the
            line pay for themselves.
          </Text>
        )}
      </View>
      <View style={{ flexDirection: "row", marginTop: space.sm }}>
        <Legend swatch={colour.accent} label="Cash positive" />
        <Legend swatch={colour.scope1} label="Net cost" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Scope band and uncertainty
// ---------------------------------------------------------------------------

export function ScopeBand({
  scopes,
  onPressScope,
  height = 10,
}: {
  scopes: { scope: string; total: number; share_pct: number }[];
  onPressScope?: (scope: string) => void;
  height?: number;
}) {
  const total =
    scopes.reduce((sum, s) => sum + Math.max(0, s.share_pct), 0) || 100;
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          height,
          borderRadius: radius.pill,
          overflow: "hidden",
          backgroundColor: colour.surfaceInset,
        }}
      >
        {scopes.map((s) => (
          <View
            key={s.scope}
            onTouchEnd={onPressScope ? () => onPressScope(s.scope) : undefined}
            style={{
              flex: Math.max(0.001, s.share_pct / total),
              backgroundColor: scopeColour(s.scope),
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", marginTop: space.md }}>
        {scopes.map((s) => (
          <View key={s.scope} style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: scopeColour(s.scope),
                  marginRight: 5,
                }}
              />
              <Text style={{ ...typeScale.caption, color: colour.muted }}>
                Scope {s.scope}
              </Text>
            </View>
            <Text
              style={{ ...typeScale.numeric, color: colour.text, marginTop: 2 }}
            >
              {number(s.share_pct)}%
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.subtle }}>
              {number(s.total)} t
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The engine's band, drawn. A point estimate is never shown without it. */
export function UncertaintyBar({
  low,
  base,
  high,
  unit = "tCO2e",
}: {
  low: number;
  base: number;
  high: number;
  unit?: string;
}) {
  const { width, onLayout } = useWidth();
  const height = 46;
  const pad = 10;
  const span = high - low || 1;
  const px = (value: number) =>
    pad + ((value - low) / span) * (width - pad * 2);
  return (
    <View onLayout={onLayout}>
      <Svg width={width} height={height}>
        <Rect
          x={pad}
          y={16}
          width={Math.max(1, width - pad * 2)}
          height={8}
          rx={4}
          fill={colour.accent}
          opacity={0.18}
        />
        <Circle cx={px(base)} cy={20} r={6} fill={colour.accent} />
        <SvgText x={pad} y={40} fill={colour.subtle} fontSize={9.5}>
          {number(low)}
        </SvgText>
        <SvgText
          x={width - pad}
          y={40}
          fill={colour.subtle}
          fontSize={9.5}
          textAnchor="end"
        >
          {number(high)} {unit}
        </SvgText>
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Peer benchmark strip
// ---------------------------------------------------------------------------

export function BenchmarkStrip({
  percentile,
  p25,
  p50,
  p75,
  actual,
  metricLabel,
}: {
  percentile: number;
  p25?: number | null;
  p50?: number | null;
  p75?: number | null;
  actual?: number | null;
  metricLabel?: string | null;
}) {
  const { width, onLayout } = useWidth();
  const height = 42;
  const clamped = Math.min(99, Math.max(1, percentile));
  const marker = (clamped / 100) * width;
  const quartiles = [
    colour.secondary,
    colour.accent,
    colour.moderate,
    colour.critical,
  ];
  return (
    <View onLayout={onLayout}>
      <Svg width={width} height={height}>
        {quartiles.map((fill, index) => (
          <Rect
            key={fill + index}
            x={(index * width) / 4}
            y={22}
            width={width / 4 - 2}
            height={10}
            rx={2}
            fill={fill}
            opacity={0.55}
          />
        ))}
        <Rect
          x={Math.max(0, marker - 1.5)}
          y={16}
          width={3}
          height={22}
          rx={1.5}
          fill={colour.bright}
        />
      </Svg>
      {/* The quartile scale in words, because the strip's own labels live
          inside the SVG where neither a screen reader nor a test can read
          them. */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ ...typeScale.micro, color: colour.subtle }}>
          BEST QUARTILE
        </Text>
        <Text style={{ ...typeScale.micro, color: colour.subtle }}>
          WORST QUARTILE
        </Text>
      </View>
      <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
        p25 {p25 === null || p25 === undefined ? "-" : number(p25, 2)} | p50{" "}
        {p50 === null || p50 === undefined ? "-" : number(p50, 2)} | p75{" "}
        {p75 === null || p75 === undefined ? "-" : number(p75, 2)}
      </Text>
      {actual === null || actual === undefined ? null : (
        <Text
          style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}
        >
          This plant: {number(actual, 2)}
          {metricLabel ? ` ${metricLabel}` : ""}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stream bars and the emission flow
// ---------------------------------------------------------------------------

export function StreamBars({
  streams,
  max = 6,
  onPress,
}: {
  streams: {
    key: string;
    label: string;
    scope: number;
    tco2e: number;
    share_pct: number;
  }[];
  max?: number;
  onPress?: (key: string) => void;
}) {
  const shown = [...streams].sort((a, b) => b.tco2e - a.tco2e).slice(0, max);
  const peak = shown[0]?.tco2e || 1;
  if (!shown.length) {
    return (
      <ChartEmpty
        title="No streams recorded"
        body="Add an electricity bill or a fuel purchase and the breakdown appears here."
      />
    );
  }
  return (
    <View>
      {shown.map((stream) => (
        <View
          key={stream.key}
          onTouchEnd={onPress ? () => onPress(stream.key) : undefined}
          style={{ marginBottom: space.md }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text
              style={{
                ...typeScale.caption,
                color: colour.text,
                flex: 1,
                paddingRight: space.sm,
              }}
              numberOfLines={1}
            >
              {stream.label}
            </Text>
            <Text style={{ ...typeScale.captionStrong, color: colour.text }}>
              {number(stream.tco2e)} t
            </Text>
          </View>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: colour.surfaceInset,
              marginTop: 5,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.max(1, (stream.tco2e / peak) * 100)}%`,
                height: "100%",
                backgroundColor: scopeColour(stream.scope),
                opacity: 0.85,
              }}
            />
          </View>
          <Text
            style={{ ...typeScale.caption, color: colour.subtle, marginTop: 3 }}
          >
            Scope {stream.scope} | {number(stream.share_pct, 1)}% of the
            footprint
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The engine's sankey, three columns wide: stream, scope, total. Bands are
 * proportional to tonnes and coloured by scope. Scrolls sideways so the stream
 * names stay readable instead of being truncated to nothing.
 */
export function EmissionFlow({
  sankey,
  height = 300,
}: {
  sankey?: SankeyPayload;
  height?: number;
}) {
  if (!sankey?.links?.length) {
    return (
      <ChartEmpty
        title="Flow unavailable"
        body="The engine did not return a stream-to-scope flow for this assessment."
      />
    );
  }
  const width = 580;
  const nodes = sankey.nodes;
  const streamLinks = sankey.links.filter(
    (link) => nodes[link.source]?.kind === "stream",
  );
  const scopeLinks = sankey.links.filter(
    (link) => nodes[link.source]?.kind === "scope",
  );
  const total = scopeLinks.reduce((sum, link) => sum + link.value, 0) || 1;

  const colX = [200, 310, 440];
  const bandWidth = 18;
  const top = 16;
  const gap = 5;
  const usable = height - top - 26;

  const ordered = [...streamLinks].sort(
    (a, b) => a.scope - b.scope || b.value - a.value,
  );
  let cursor = top;
  const streamBands = ordered.map((link) => {
    const bandHeight = Math.max(
      3,
      (link.value / total) * (usable - gap * ordered.length),
    );
    const band = { link, y: cursor, height: bandHeight };
    cursor += bandHeight + gap;
    return band;
  });

  let scopeCursor = top;
  const scopeBands = [...scopeLinks]
    .sort((a, b) => a.scope - b.scope)
    .map((link) => {
      const bandHeight = Math.max(
        4,
        (link.value / total) * (usable - gap * scopeLinks.length),
      );
      const band = { link, y: scopeCursor, height: bandHeight };
      scopeCursor += bandHeight + gap;
      return band;
    });

  // Where each scope band has already been fed from, so inbound ribbons stack
  // instead of overlapping.
  const inbound: Record<number, number> = {};

  const ribbon = (
    x1: number,
    y1: number,
    h1: number,
    x2: number,
    y2: number,
    h2: number,
  ) => {
    const mid = (x1 + x2) / 2;
    return [
      `M ${x1} ${y1}`,
      `C ${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`,
      `L ${x2} ${y2 + h2}`,
      `C ${mid} ${y2 + h2} ${mid} ${y1 + h1} ${x1} ${y1 + h1}`,
      "Z",
    ].join(" ");
  };

  const totalHeight = Math.max(
    8,
    scopeBands.reduce((sum, band) => sum + band.height + gap, 0) - gap,
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={width} height={height}>
        {streamBands.map((band, index) => {
          const scopeBand = scopeBands.find(
            (s) => s.link.source === band.link.target,
          );
          if (!scopeBand) return null;
          const offset = inbound[scopeBand.link.source] ?? 0;
          const ribbonHeight = Math.max(
            2,
            (band.link.value / scopeBand.link.value) * scopeBand.height,
          );
          inbound[scopeBand.link.source] = offset + ribbonHeight;
          return (
            <G key={`stream-${index}`}>
              <Path
                d={ribbon(
                  colX[0] + bandWidth,
                  band.y,
                  band.height,
                  colX[1],
                  scopeBand.y + offset,
                  ribbonHeight,
                )}
                fill={scopeColour(band.link.scope)}
                opacity={0.22}
              />
              <Rect
                x={colX[0]}
                y={band.y}
                width={bandWidth}
                height={band.height}
                rx={2}
                fill={scopeColour(band.link.scope)}
                opacity={0.85}
              />
              <SvgText
                x={colX[0] - 8}
                y={band.y + band.height / 2 + 3.5}
                fill={colour.muted}
                fontSize={10}
                textAnchor="end"
              >
                {(nodes[band.link.source]?.name ?? "").slice(0, 30)}
              </SvgText>
            </G>
          );
        })}
        {scopeBands.map((band, index) => (
          <G key={`scope-${index}`}>
            <Path
              d={ribbon(
                colX[1] + bandWidth,
                band.y,
                band.height,
                colX[2],
                top +
                  scopeBands
                    .slice(0, index)
                    .reduce((sum, b) => sum + b.height + gap, 0),
                band.height,
              )}
              fill={scopeColour(band.link.scope)}
              opacity={0.22}
            />
            <Rect
              x={colX[1]}
              y={band.y}
              width={bandWidth}
              height={band.height}
              rx={2}
              fill={scopeColour(band.link.scope)}
            />
            <SvgText
              x={colX[1] + bandWidth + 6}
              y={band.y + band.height / 2 + 3.5}
              fill={colour.text}
              fontSize={10}
            >
              S{band.link.scope} {number(band.link.value)} t
            </SvgText>
          </G>
        ))}
        <Rect
          x={colX[2]}
          y={top}
          width={bandWidth + 6}
          height={totalHeight}
          rx={3}
          fill={colour.bright}
          opacity={0.9}
        />
        <SvgText
          x={colX[2] + bandWidth + 14}
          y={top + 12}
          fill={colour.text}
          fontSize={10}
        >
          Total
        </SvgText>
        <SvgText
          x={colX[2] + bandWidth + 14}
          y={top + 26}
          fill={colour.muted}
          fontSize={10}
        >
          {number(total)} tCO2e
        </SvgText>
      </Svg>
    </ScrollView>
  );
}

/** Compact before/after comparison used by the what-if simulator. */
export function DeltaBars({
  baseline,
  scenario,
  unit = "tCO2e",
}: {
  baseline: number;
  scenario: number;
  unit?: string;
}) {
  const peak = Math.max(baseline, scenario) || 1;
  const rows = [
    { label: "Baseline", value: baseline, fill: colour.muted },
    {
      label: "Scenario",
      value: scenario,
      fill: scenario <= baseline ? colour.secondary : colour.critical,
    },
  ];
  return (
    <View>
      {rows.map((row) => (
        <View key={row.label} style={{ marginBottom: space.sm }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ ...typeScale.caption, color: colour.muted }}>
              {row.label}
            </Text>
            <Text style={{ ...typeScale.captionStrong, color: colour.text }}>
              {number(row.value)} {unit}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colour.surfaceInset,
              marginTop: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.max(1, (row.value / peak) * 100)}%`,
                height: "100%",
                backgroundColor: row.fill,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
