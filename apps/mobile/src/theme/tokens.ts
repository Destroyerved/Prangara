/**
 * Mobile design tokens.
 *
 * Deliberately not a copy of the web dashboard's scale. PRD section 5.2 says the
 * mobile companion is for capture and quick decisions on a factory floor, not
 * for dense analytics, so this scale is larger, higher contrast and built around
 * one-handed use.
 */

export const colour = {
  // Surfaces aligned with Web Glassmorphic palette
  bg: '#080E1A',
  surface: '#0E1726',
  surfaceRaised: '#142036',
  surfaceCard: '#0D1525',
  border: '#1E2D45',
  borderHighlight: 'rgba(16, 185, 129, 0.25)',

  // Text
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textFaint: '#64748B',

  // Brand (Emerald & Sky Cyan)
  primary: '#10B981',
  primaryPressed: '#059669',
  onPrimary: '#022C22',
  accent: '#38BDF8',
  accentGlow: 'rgba(56, 189, 248, 0.2)',
  positive: '#34D399',

  // GHG Scope Colors (matching web footprint & charts)
  scope1: '#F59E0B',
  scope2: '#38BDF8',
  scope3: '#A855F7',

  // Severity. Never the only carrier of meaning - PRD section 30
  critical: '#EF4444',
  high: '#F97316',
  moderate: '#FBBF24',
  watch: '#38BDF8',
  ok: '#10B981',
  info: '#38BDF8',

  // Data-state badges
  verified: '#10B981',
  documentConfirmed: '#38BDF8',
  declared: '#FBBF24',
  estimated: '#F97316',
  missing: '#EF4444',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const },
  heading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

/** Minimum touch target. Factory floors, gloves, sunlight. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH = 48;

export const severityColour = (severity?: string): string => {
  switch (severity) {
    case 'critical':
      return colour.critical;
    case 'high':
      return colour.high;
    case 'moderate':
      return colour.moderate;
    case 'watch':
      return colour.watch;
    default:
      return colour.textMuted;
  }
};

export const dataStateColour = (state?: string): string => {
  switch (state) {
    case 'VERIFIED':
      return colour.verified;
    case 'DOCUMENT-CONFIRMED':
      return colour.documentConfirmed;
    case 'DECLARED':
      return colour.declared;
    case 'ESTIMATED':
      return colour.estimated;
    case 'MISSING':
    case 'STALE':
      return colour.missing;
    default:
      return colour.textMuted;
  }
};
