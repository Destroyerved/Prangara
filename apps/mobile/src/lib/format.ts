/**
 * Number formatting for an Indian industrial audience.
 *
 * Rupees are written in lakh and crore because that is how the reader thinks
 * about them; "Rs 4,80,00,000" is not a number anyone reads at a glance.
 * Rounding is deliberately coarse - these are screening figures with an
 * uncertainty band, and printing them to the rupee would claim a precision the
 * engine does not have.
 */

export function formatInr(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}Rs ${(abs / 1_00_00_000).toFixed(2)} cr`;
  if (abs >= 1_00_000) return `${sign}Rs ${(abs / 1_00_000).toFixed(1)} lakh`;
  if (abs >= 1_000) return `${sign}Rs ${Math.round(abs / 1_000)}k`;
  return `${sign}Rs ${Math.round(abs)}`;
}

export function formatTonnes(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (Math.abs(value) >= 1000) return `${Math.round(value).toLocaleString('en-IN')}`;
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
