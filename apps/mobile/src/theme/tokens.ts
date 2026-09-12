/**
 * Mobile design tokens.
 *
 * Deliberately not a copy of the web dashboard's scale. PRD section 5.2 says the
 * mobile companion is for capture and quick decisions on a factory floor, not
 * for dense analytics, so this scale is larger, higher contrast and built around
 * one-handed use.
 */

export const colour = {
  // Surfaces
  bg: '#0B1220',
  surface: '#121B2E',
  surfaceRaised: '#1A2538',
  border: '#26344C',

  // Text
  text: '#F2F6FC',
  textMuted: '#9AA9C2',
  textFaint: '#6B7C99',

  // Brand
  primary: '#3DDC97',
  primaryPressed: '#2FB87C',
  onPrimary: '#06231A',

  // Severity. Never the only carrier of meaning - PRD section 30 requires
  // status not to be encoded by colour alone, so every severity chip also
  // carries a word.
  critical: '#FF6B6B',
  high: '#FFA94D',
  moderate: '#FFD43B',
  watch: '#74C0FC',
  ok: '#3DDC97',
  info: '#74C0FC',

  // Data-state badges
  verified: '#3DDC97',
  documentConfirmed: '#74C0FC',
  declared: '#FFD43B',
  estimated: '#FFA94D',
  missing: '#FF6B6B',
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
