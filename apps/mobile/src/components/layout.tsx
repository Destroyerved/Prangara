/**
 * Page furniture.
 *
 * These are the web app's shell pieces - page heading, numbered section
 * heading, metric strip, segmented control, trust bar - rebuilt for a phone so
 * a module screen is laid out the same way on both surfaces and no screen has
 * to invent its own spacing.
 */

import React, { type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  HIT_SLOP,
  MIN_TOUCH,
  colour,
  radius,
  shadow,
  space,
  type as typeScale,
} from '../theme/tokens';

/**
 * The scroll body every module screen sits in. Pull to refresh is wired here
 * rather than per screen so every module refreshes the same way.
 */
export function ModuleScreen({
  children,
  refreshing = false,
  onRefresh,
  style,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colour.bg }}
      contentContainerStyle={[
        { padding: space.page, paddingBottom: space.xxl * 3 },
        style,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colour.accent}
            colors={[colour.accent]}
            progressBackgroundColor={colour.surfaceHigh}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** `PageHeading` on the web: eyebrow, title, one line of description. */
export function PageHeading({
  eyebrow,
  title,
  description,
  meta,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      {eyebrow ? (
        <Text
          style={{
            ...typeScale.micro,
            color: colour.subtle,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text style={{ ...typeScale.hero, color: colour.bright }}>{title}</Text>
      {description ? (
        <Text style={{ ...typeScale.body, color: colour.muted, marginTop: 8 }}>{description}</Text>
      ) : null}
      {meta ? (
        <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 6 }}>{meta}</Text>
      ) : null}
    </View>
  );
}

/** `SectionHeading` on the web: a numbered step with an optional jump link. */
export function SectionHeading({
  index,
  title,
  description,
  actionLabel,
  onAction,
}: {
  index?: string;
  /** Optional: a group label on the hub is an index with nothing under it. */
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ marginTop: space.lg, marginBottom: space.md }}>
      {index ? (
        <Text
          style={{
            ...typeScale.micro,
            color: colour.accent,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {index}
        </Text>
      ) : null}
      {title ? (
        <Text style={{ ...typeScale.title, color: colour.bright }}>{title}</Text>
      ) : null}
      {description ? (
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 5 }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          style={{ marginTop: space.sm }}
        >
          <Text style={{ ...typeScale.captionStrong, color: colour.accent }}>
            {actionLabel} {'→'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export type MetricItem = {
  label: string;
  value: string;
  unit?: string;
  positive?: boolean;
  onPress?: () => void;
};

/** The web's metric strip, folded into two columns for a phone. */
export function Metrics({ items }: { items: MetricItem[] }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -space.xs,
        marginBottom: space.md,
      }}
    >
      {items.map((item) => {
        const body = (
          <View
            style={{
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colour.cardBorder,
              backgroundColor: colour.surface,
              padding: space.md,
              minHeight: 84,
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ ...typeScale.caption, color: colour.muted }} numberOfLines={2}>
              {item.label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
              <Text
                style={{
                  ...typeScale.numeric,
                  fontSize: 20,
                  color: item.positive ? colour.secondary : colour.bright,
                }}
              >
                {item.value}
              </Text>
              {item.unit ? (
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginLeft: 4 }}>
                  {item.unit}
                </Text>
              ) : null}
            </View>
          </View>
        );
        return (
          <View key={item.label} style={{ width: '50%', padding: space.xs }}>
            {item.onPress ? (
              <Pressable onPress={item.onPress} accessibilityRole="button">
                {body}
              </Pressable>
            ) : (
              body
            )}
          </View>
        );
      })}
    </View>
  );
}

/** `Segmented` on the web. Used for portfolio mode and scope filters. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colour.surfaceInset,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colour.border,
        padding: 3,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              minHeight: 34,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: active ? colour.selectedBg : 'transparent',
              borderWidth: 1,
              borderColor: active ? colour.borderHighlight : 'transparent',
            }}
          >
            <Text
              style={{
                ...typeScale.caption,
                color: active ? colour.accentStrong : colour.muted,
                fontFamily: active ? typeScale.captionStrong.fontFamily : typeScale.caption.fontFamily,
              }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A glass panel that carries the same border and shadow as a web card. */
export function GlassPanel({
  children,
  tone = 'default',
  style,
  onPress,
}: {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'positive' | 'warning' | 'danger' | 'inset';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const background =
    tone === 'accent'
      ? colour.selectedBg
      : tone === 'positive'
        ? colour.positiveBg
        : tone === 'warning'
          ? colour.warningBg
          : tone === 'danger'
            ? colour.dangerBg
            : tone === 'inset'
              ? colour.surfaceInset
              : colour.surface;
  const borderColor =
    tone === 'accent'
      ? colour.borderHighlight
      : tone === 'danger'
        ? 'rgba(248, 113, 113, 0.32)'
        : tone === 'warning'
          ? 'rgba(251, 191, 36, 0.3)'
          : tone === 'positive'
            ? colour.floatingBorder
            : colour.cardBorder;

  const body = (
    <View
      style={[
        {
          backgroundColor: background,
          borderColor,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: space.lg,
          marginBottom: space.md,
        },
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

/** Status chip. Never colour alone: the word is always present (PRD s30). */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'positive' | 'accent' | 'cost' | 'high' | 'critical' | 'watch';
}) {
  const palette: Record<string, { fg: string; bg: string; border: string }> = {
    neutral: { fg: colour.muted, bg: 'transparent', border: colour.border },
    positive: { fg: colour.secondary, bg: colour.positiveBg, border: 'transparent' },
    accent: { fg: colour.accentStrong, bg: colour.selectedBg, border: 'transparent' },
    cost: { fg: colour.scope1, bg: 'transparent', border: colour.border },
    high: { fg: colour.high, bg: colour.warningBg, border: 'transparent' },
    critical: { fg: colour.critical, bg: colour.dangerBg, border: 'transparent' },
    watch: { fg: colour.muted, bg: 'transparent', border: colour.border },
  };
  const chosen = palette[tone] ?? palette.neutral;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: chosen.bg,
        borderWidth: 1,
        borderColor: chosen.border,
      }}
    >
      <Text style={{ ...typeScale.micro, color: chosen.fg }}>{children}</Text>
    </View>
  );
}

/** `DetailRows` on the web: a label/value list inside a panel. */
export function DetailRows({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([label, value], index) => (
        <View
          key={`${label}-${index}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingVertical: 7,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colour.borderSecondary,
          }}
        >
          <Text
            style={{ ...typeScale.caption, color: colour.muted, flex: 1, paddingRight: space.md }}
          >
            {label}
          </Text>
          <Text style={{ ...typeScale.captionStrong, color: colour.text, flexShrink: 0, maxWidth: '55%', textAlign: 'right' }}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** The web's trust bar. Sits at the bottom of every analytical module. */
export function TrustBar({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colour.borderSecondary,
        paddingTop: space.md,
        marginTop: space.md,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: colour.outline,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: space.sm,
        }}
      >
        <Text style={{ ...typeScale.micro, color: colour.muted }}>i</Text>
      </View>
      <Text style={{ ...typeScale.caption, color: colour.subtle, flex: 1 }}>
        Source references available. Screening-grade accounting.
        {onPress ? ' Methodology and compliance.' : ''}
      </Text>
    </Pressable>
  );
}

/** A single tappable row in a hub list. */
export function NavRow({
  label,
  description,
  badge,
  onPress,
}: {
  label: string;
  description?: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: MIN_TOUCH + 8,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: colour.borderSecondary,
      }}
    >
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>{label}</Text>
        {description ? (
          <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {badge ? <Badge tone="accent">{badge}</Badge> : null}
      <Text style={{ ...typeScale.body, color: colour.subtle, marginLeft: space.sm }}>
        {'›'}
      </Text>
    </Pressable>
  );
}
