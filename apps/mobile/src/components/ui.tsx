/**
 * Shared UI primitives.
 *
 * Every one of these exists because PRD section 36 makes loading, error and
 * empty states part of the definition of done, and a screen that has to invent
 * its own will skip one.
 *
 * Status is never carried by colour alone (PRD section 30): every badge and
 * severity chip shows a word as well.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  HIT_SLOP,
  MIN_TOUCH,
  colour,
  dataStateColour,
  radius,
  severityColour,
  space,
  type as typeScale,
} from '../theme/tokens';

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (!scroll) {
    return <View style={[styles.screen, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Heading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        pressed && !inactive && styles.buttonPressed,
        inactive && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colour.onPrimary : colour.text} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'primary' && { color: colour.onPrimary },
            variant === 'danger' && { color: colour.critical },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  multiline = false,
  suffix,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'decimal-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  suffix?: string;
  error?: string | null;
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colour.textFaint}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <View style={[styles.badge, { borderColor: severityColour(severity) }]}>
      <View style={[styles.dot, { backgroundColor: severityColour(severity) }]} />
      <Text style={[styles.badgeLabel, { color: severityColour(severity) }]}>
        {severity.toUpperCase()}
      </Text>
    </View>
  );
}

export function DataStateBadge({ state }: { state: string }) {
  return (
    <View style={[styles.badge, { borderColor: dataStateColour(state) }]}>
      <Text style={[styles.badgeLabel, { color: dataStateColour(state) }]}>{state}</Text>
    </View>
  );
}

export function Stat({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: 'default' | 'good' | 'bad';
}) {
  const valueColour =
    tone === 'good' ? colour.ok : tone === 'bad' ? colour.critical : colour.text;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={[styles.statValue, { color: valueColour }]}>{value}</Text>
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </View>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.centred}>
      <ActivityIndicator color={colour.primary} size="large" />
      <Text style={styles.centredText}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card style={{ borderColor: colour.critical }}>
      <Text style={styles.errorTitle}>That did not work</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <Button title="Try again" variant="secondary" onPress={onRetry} style={{ marginTop: space.md }} />
      ) : null}
    </Card>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: space.lg }} />
      ) : null}
    </Card>
  );
}

export function Note({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warning' }) {
  const accent = tone === 'warning' ? colour.high : colour.info;
  return (
    <View style={[styles.note, { borderLeftColor: accent }]}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Row({
  left,
  right,
  strong = false,
}: {
  left: string;
  right: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLeft, strong && { color: colour.text, fontWeight: '600' }]}>
        {left}
      </Text>
      <Text style={[styles.rowRight, strong && { fontWeight: '700' }]}>{right}</Text>
    </View>
  );
}

export const text: Record<string, StyleProp<TextStyle>> = {
  body: { ...typeScale.body, color: colour.textMuted },
  heading: { ...typeScale.heading, color: colour.text },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colour.bg },
  screenContent: { padding: space.lg, paddingBottom: space.xxl * 2 },

  title: { ...typeScale.title, color: colour.text },
  sub: { ...typeScale.body, color: colour.textMuted, marginTop: space.xs },
  body: { ...typeScale.body, color: colour.textMuted, lineHeight: 21 },

  card: {
    backgroundColor: colour.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colour.border,
    padding: space.lg,
    marginBottom: space.md,
  },
  cardPressed: { backgroundColor: colour.surfaceRaised },

  button: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonPrimary: { backgroundColor: colour.primary },
  buttonSecondary: { backgroundColor: colour.surfaceRaised, borderColor: colour.border },
  buttonGhost: { backgroundColor: 'transparent', borderColor: colour.border },
  buttonDanger: { backgroundColor: 'transparent', borderColor: colour.critical },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { ...typeScale.bodyStrong, color: colour.text },

  label: { ...typeScale.bodyStrong, color: colour.text, marginBottom: space.xs },
  hint: { ...typeScale.caption, color: colour.textFaint, marginBottom: space.sm },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colour.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colour.border,
    paddingHorizontal: space.md,
    minHeight: MIN_TOUCH,
  },
  inputWrapError: { borderColor: colour.critical },
  input: { flex: 1, ...typeScale.body, color: colour.text, paddingVertical: space.md },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  suffix: { ...typeScale.caption, color: colour.textFaint, marginLeft: space.sm },
  error: { ...typeScale.caption, color: colour.critical, marginTop: space.xs },

  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colour.border,
    backgroundColor: colour.surface,
    marginRight: space.sm,
    marginBottom: space.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colour.primary, borderColor: colour.primary },
  chipLabel: { ...typeScale.caption, color: colour.textMuted },
  chipLabelSelected: { color: colour.onPrimary, fontWeight: '700' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeLabel: { ...typeScale.micro },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },

  stat: { marginBottom: space.lg },
  statLabel: { ...typeScale.caption, color: colour.textMuted, marginBottom: 2 },
  statValue: { ...typeScale.display, color: colour.text },
  statUnit: { ...typeScale.body, color: colour.textMuted },
  statNote: { ...typeScale.caption, color: colour.textFaint, marginTop: 2 },

  centred: { paddingVertical: space.xxl, alignItems: 'center' },
  centredText: { ...typeScale.caption, color: colour.textMuted, marginTop: space.md },

  errorTitle: { ...typeScale.heading, color: colour.critical, marginBottom: space.xs },
  emptyTitle: { ...typeScale.heading, color: colour.text, marginBottom: space.xs },

  note: {
    borderLeftWidth: 3,
    paddingLeft: space.md,
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  noteText: { ...typeScale.caption, color: colour.textMuted, lineHeight: 19 },

  divider: { height: 1, backgroundColor: colour.border, marginVertical: space.md },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  rowLeft: { ...typeScale.body, color: colour.textMuted, flex: 1, paddingRight: space.md },
  rowRight: { ...typeScale.bodyStrong, color: colour.text },
});
