export const number = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "Unavailable"
    : new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }).format(
        value,
      );
export function money(value: number | null | undefined) {
  if (value == null) return "Unavailable";
  const abs = Math.abs(value),
    sign = value < 0 ? "−" : "";
  if (abs >= 1e7) return sign + "₹" + number(abs / 1e7, 2) + " Cr";
  if (abs >= 1e5) return sign + "₹" + number(abs / 1e5, 1) + " L";
  return sign + "₹" + number(abs);
}
export const payback = (years: number | null | undefined) =>
  years == null
    ? "Unavailable"
    : years <= 2
      ? number(years * 12) + " mo"
      : number(years, 1) + " yr";
export const label = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
export const scopeColor = (s: string) => "var(--scope-" + s + ")";
export const portfolioLabels = {
  all: "All interventions",
  cash_positive_only: "Cash positive",
  quick_wins: "Quick wins",
} as const;
export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
