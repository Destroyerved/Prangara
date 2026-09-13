/**
 * Mobile design tokens.
 *
 * A direct port of the web app's `src/styles/tokens.css` dark theme, value for
 * value, so a screen looks like the same product whichever device it is on.
 * The web moved to a monochrome system - white accent on near-black glass,
 * with colour reserved for data: scopes, severities and the cash-positive /
 * net-cost split in charts. These values follow it.
 *
 * Where the web relies on `backdrop-filter` for its glass, React Native
 * composites the same rgba surface over the same ground, which lands in the
 * same place visually without a blur pass.
 *
 * Nothing here is invented. If a colour is needed that the web does not have,
 * the web token is added first.
 */

export const colour = {
  // Ground and glass
  bg: '#060708',
  bgSecondary: 'rgba(12, 13, 16, 0.85)',
  sidebar: 'rgba(10, 11, 13, 0.80)',
  surface: 'rgba(16, 17, 21, 0.82)',
  surfaceHover: 'rgba(26, 28, 34, 0.90)',
  surfaceInset: 'rgba(10, 11, 14, 0.85)',
  surfaceHigh: 'rgba(22, 24, 29, 0.92)',
  panel: 'rgba(16, 17, 21, 0.90)',
  glass: 'rgba(16, 17, 21, 0.82)',

  // Type
  text: '#e2e8f0',
  bright: '#ffffff',
  muted: '#94a3b8',
  subtle: '#64748b',

  // Lines
  border: 'rgba(255, 255, 255, 0.09)',
  borderSecondary: 'rgba(255, 255, 255, 0.05)',
  outline: '#383d47',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  floatingBorder: 'rgba(255, 255, 255, 0.16)',

  // Accent: monochrome
  accent: '#ffffff',
  accentStrong: '#f8fafc',
  accentSaturated: '#e2e8f0',
  accentContainer: 'rgba(255, 255, 255, 0.12)',
  accentInk: '#070809',
  secondary: '#94a3b8',
  secondaryBright: '#e2e8f0',

  // Charts: the only saturated colour outside scopes and severities
  chartPositive: '#10b981',
  chartCost: '#f43f5e',

  // GHG scopes
  scope1: '#fb923c',
  scope2: '#818cf8',
  scope3: '#38bdf8',

  // Status
  critical: '#f87171',
  high: '#fb923c',
  moderate: '#fbbf24',
  healthy: '#10b981',
  watch: '#94a3b8',

  // Tinted grounds
  dangerBg: 'rgba(248, 113, 113, 0.12)',
  positiveBg: 'rgba(255, 255, 255, 0.08)',
  warningBg: 'rgba(251, 191, 36, 0.12)',
  selectedBg: 'rgba(255, 255, 255, 0.08)',
  navActive: 'rgba(255, 255, 255, 0.08)',

  // Charts
  chartGrid: 'rgba(255, 255, 255, 0.04)',
  zeroLine: 'rgba(255, 255, 255, 0.25)',

  // Names the older screens use, mapped onto the tokens above.
  primary: '#ffffff',
  primaryPressed: '#e2e8f0',
  onPrimary: '#070809',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  surfaceCard: 'rgba(16, 17, 21, 0.82)',
  surfaceRaised: 'rgba(22, 24, 29, 0.92)',
  surfaceGlass: 'rgba(16, 17, 21, 0.82)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  borderHighlight: 'rgba(255, 255, 255, 0.22)',
  positive: '#10b981',
  ok: '#10b981',
  info: '#94a3b8',
  accentGlow: 'rgba(255, 255, 255, 0.12)',
  emerald: '#10b981',
  emeraldGlow: 'rgba(16, 185, 129, 0.12)',
  cyanGlow: 'rgba(56, 189, 248, 0.12)',
  violet: '#818cf8',
  violetGlow: 'rgba(129, 140, 248, 0.12)',
  verified: '#10b981',
  documentConfirmed: '#ffffff',
  declared: '#fbbf24',
  estimated: '#fb923c',
  missing: '#f87171',
} as const;

/** `--space-*` from the web, under the names the mobile screens already use. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** Gutter that keeps a card the same distance off the edge as web `main`. */
  page: 16,
} as const;

export const radius = {
  sm: 8,
  control: 10,
  md: 14,
  lg: 14,
  hero: 20,
  pill: 999,
} as const;

/**
 * The web's type ramp: Manrope for anything that carries a number or a title,
 * Inter for prose, both with the tight negative tracking the display sizes use.
 */
export const font = {
  heading: 'Manrope_600SemiBold',
  headingMedium: 'Manrope_500Medium',
  headingBold: 'Manrope_700Bold',
  headingExtra: 'Manrope_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const type = {
  /** Web h1 at phone width. */
  hero: { fontFamily: font.headingBold, fontSize: 34, letterSpacing: -1.4, lineHeight: 38 },
  display: { fontFamily: font.headingBold, fontSize: 30, letterSpacing: -1.1, lineHeight: 34 },
  title: { fontFamily: font.heading, fontSize: 22, letterSpacing: -0.7, lineHeight: 27 },
  heading: { fontFamily: font.heading, fontSize: 16, letterSpacing: -0.2, lineHeight: 21 },
  body: { fontFamily: font.body, fontSize: 14, lineHeight: 22 },
  bodyStrong: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 21 },
  caption: { fontFamily: font.body, fontSize: 12.5, lineHeight: 19 },
  captionStrong: { fontFamily: font.bodySemi, fontSize: 12.5, lineHeight: 19 },
  micro: { fontFamily: font.bodySemi, fontSize: 10.5, letterSpacing: 0.9 },
  /** Numbers in tables and metric tiles. */
  numeric: { fontFamily: font.headingMedium, fontSize: 17, letterSpacing: -0.4 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
} as const;

export const duration = { fast: 180, nav: 220, chart: 500 } as const;

/** Minimum touch target. Factory floors, gloves, sunlight. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH = 48;

export const severityColour = (severity?: string): string => {
  switch ((severity ?? '').toLowerCase()) {
    case 'critical':
      return colour.critical;
    case 'high':
      return colour.high;
    case 'moderate':
      return colour.moderate;
    case 'watch':
      return colour.watch;
    case 'ok':
    case 'healthy':
      return colour.healthy;
    default:
      return colour.muted;
  }
};

export const dataStateColour = (state?: string): string => {
  switch ((state ?? '').toUpperCase()) {
    case 'VERIFIED':
      return colour.healthy;
    case 'DOCUMENT-CONFIRMED':
      return colour.accent;
    case 'DECLARED':
      return colour.moderate;
    case 'ESTIMATED':
      return colour.high;
    case 'MISSING':
    case 'STALE':
      return colour.critical;
    default:
      return colour.muted;
  }
};

export const scopeColour = (scope: number | string): string =>
  String(scope) === '1' ? colour.scope1 : String(scope) === '2' ? colour.scope2 : colour.scope3;
