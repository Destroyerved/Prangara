/**
 * Mobile design tokens.
 *
 * These are a direct port of the web app's `src/styles/tokens.css`, value for
 * value, so a screen looks like the same product whichever device it is on.
 * Where the web relies on `backdrop-filter` for its glass, React Native
 * composites the same rgba surface over the same near-black ground, which
 * lands in the same place visually without a blur pass.
 *
 * Nothing here is invented. If a colour is needed that the web does not have,
 * the web token is added first.
 */

export const colour = {
  // Ground and glass
  bg: '#070708',
  bgSecondary: 'rgba(10, 10, 13, 0.75)',
  sidebar: 'rgba(13, 14, 16, 0.75)',
  surface: 'rgba(18, 19, 23, 0.68)',
  surfaceHover: 'rgba(28, 30, 36, 0.78)',
  surfaceInset: 'rgba(10, 11, 14, 0.55)',
  surfaceHigh: 'rgba(25, 27, 32, 0.78)',
  panel: 'rgba(16, 17, 21, 0.82)',
  glass: 'rgba(18, 19, 23, 0.72)',

  // Type
  text: '#e5e2e3',
  bright: '#f0f1f2',
  muted: '#9a9da3',
  subtle: '#92949c',

  // Lines
  border: '#232426',
  borderSecondary: '#1b1c1e',
  outline: '#454655',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  floatingBorder: 'rgba(255, 255, 255, 0.14)',

  // Accent: lavender primary, cyan secondary
  accent: '#bec2ff',
  accentStrong: '#d6d8ff',
  accentSaturated: '#5e6bff',
  accentContainer: '#7a85ff',
  accentInk: '#000469',
  secondary: '#50d8e9',
  secondaryBright: '#92f1ff',

  // GHG scopes
  scope1: '#ffb689',
  scope2: '#bec2ff',
  scope3: '#50d8e9',

  // Status
  critical: '#ffb4ab',
  high: '#ffb689',
  moderate: '#ffb689',
  healthy: '#e5fd17',
  watch: '#9a9da3',

  // Tinted grounds
  dangerBg: 'rgba(255, 180, 171, 0.09)',
  positiveBg: 'rgba(80, 216, 233, 0.08)',
  warningBg: 'rgba(255, 182, 137, 0.09)',
  selectedBg: 'rgba(190, 194, 255, 0.09)',
  navActive: 'rgba(255, 255, 255, 0.06)',

  // Charts
  chartGrid: 'rgba(255, 255, 255, 0.035)',
  zeroLine: 'rgba(255, 255, 255, 0.25)',

  // Names the older screens used. Kept so nothing has to be rewritten twice.
  primary: '#bec2ff',
  primaryPressed: '#7a85ff',
  onPrimary: '#000469',
  textMuted: '#9a9da3',
  textFaint: '#92949c',
  surfaceCard: 'rgba(18, 19, 23, 0.68)',
  surfaceRaised: 'rgba(25, 27, 32, 0.78)',
  surfaceGlass: 'rgba(18, 19, 23, 0.72)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  borderHighlight: 'rgba(190, 194, 255, 0.28)',
  positive: '#50d8e9',
  ok: '#50d8e9',
  info: '#50d8e9',
  accentGlow: 'rgba(190, 194, 255, 0.14)',
  emerald: '#50d8e9',
  emeraldGlow: 'rgba(80, 216, 233, 0.1)',
  cyanGlow: 'rgba(80, 216, 233, 0.1)',
  violet: '#bec2ff',
  violetGlow: 'rgba(190, 194, 255, 0.12)',
  verified: '#50d8e9',
  documentConfirmed: '#bec2ff',
  declared: '#ffb689',
  estimated: '#ffb689',
  missing: '#ffb4ab',
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
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.42,
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
      return colour.secondary;
    default:
      return colour.muted;
  }
};

export const dataStateColour = (state?: string): string => {
  switch ((state ?? '').toUpperCase()) {
    case 'VERIFIED':
      return colour.secondary;
    case 'DOCUMENT-CONFIRMED':
      return colour.accent;
    case 'DECLARED':
      return colour.high;
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
