/**
 * Number formatting for an Indian industrial audience.
 *
 * These are the web app's `src/lib/format.ts` rules, so the same figure reads
 * identically on both surfaces: rupees in lakh and crore because that is how
 * the reader thinks about them, and coarse rounding because these are
 * screening figures carrying an uncertainty band. Printing them to the rupee
 * would claim a precision the engine does not have.
 */

/** `null` is a real state: the engine did not supply the figure. Say so. */
export const number = (value: number | null | undefined, digits = 0): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? 'Unavailable'
    : new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(value);

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Unavailable';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${number(abs / 1e7, 2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${number(abs / 1e5, 1)} L`;
  return `${sign}₹${number(abs)}`;
}

export const payback = (years: number | null | undefined): string =>
  years === null || years === undefined
    ? 'Unavailable'
    : years <= 2
      ? `${number(years * 12)} mo`
      : `${number(years, 1)} yr`;

export const label = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const portfolioLabels = {
  all: 'All interventions',
  cash_positive_only: 'Cash positive',
  quick_wins: 'Quick wins',
} as const;

export const percent = (value: number | null | undefined, digits = 1): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? 'Unavailable'
    : `${number(value, digits)}%`;

// --- names the earlier screens use, kept so nothing has to be rewritten ----

export const formatInr = money;

export function formatTonnes(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (Math.abs(value) >= 1000) return number(Math.round(value));
  if (Math.abs(value) >= 10) return value.toFixed(0);
  return value.toFixed(1);
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPayback(years: number | null | undefined): string {
  if (years === null || years === undefined) return 'No payback - this costs money';
  if (years <= 0) return 'Immediate';
  const months = Math.round(years * 12);
  if (months < 24) return `${months} months`;
  return `${years.toFixed(1)} years`;
}

export function formatRange(low: number, base: number, high: number): string {
  return `${formatTonnes(base)} (range ${formatTonnes(low)} to ${formatTonnes(high)})`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** A percentile where lower intensity is better, said in words. */
export function describePercentile(percentile: number | null | undefined): string {
  if (percentile === null || percentile === undefined) return 'No peer comparison available';
  if (percentile <= 25) return `Best quartile of your sector (${percentile}th percentile)`;
  if (percentile <= 50) return `Better than the sector median (${percentile}th percentile)`;
  if (percentile <= 75) return `Worse than median (${percentile}th percentile)`;
  return `Worst quartile of your sector (${percentile}th percentile)`;
}
