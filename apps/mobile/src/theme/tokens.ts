/**
 * Mobile design tokens.
 *
 * Deliberately not a copy of the web dashboard's scale. PRD section 5.2 says the
 * mobile companion is for capture and quick decisions on a factory floor, not
 * for dense analytics, so this scale is larger, higher contrast and built around
 * one-handed use.
 */

export const colour = {
  // Surfaces - Matching Web App Deep Onyx & Navy Glass
  bg: '#080B11',
  surface: '#0F1626',
  surfaceRaised: '#172239',
  surfaceGlass: 'rgba(15, 22, 38, 0.85)',
  border: 'rgba(255, 255, 255, 0.09)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  // Text - High Legibility Slate White & Muted Accents
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textFaint: '#64748B',

  // Brand - Web App Electric Cyan & Vivid Emerald
  primary: '#38BDF8',
  primaryPressed: '#0284C7',
  onPrimary: '#081018',

  // Accent Tones
  emerald: '#10B981',
  emeraldGlow: 'rgba(16, 185, 129, 0.12)',
  cyanGlow: 'rgba(56, 189, 248, 0.12)',
  violet: '#C084FC',
  violetGlow: 'rgba(192, 132, 252, 0.12)',

  // GHG Scope Colors (Exact Match to Web MACC & Footprint)
  scope1: '#FFB689', // Peach / Direct Combustion
  scope2: '#BEC2FF', // Lavender / Electricity Grid
  scope3: '#38BDF8', // Cyan / Value Chain

  // Severity Chips
  critical: '#FF7676',
  high: '#FFA94D',
  moderate: '#FFD43B',
  watch: '#38BDF8',
  ok: '#10B981',
  info: '#38BDF8',

  // Data-state badges
  verified: '#10B981',
  documentConfirmed: '#38BDF8',
  declared: '#FFD43B',
  estimated: '#FFA94D',
  missing: '#FF7676',
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
