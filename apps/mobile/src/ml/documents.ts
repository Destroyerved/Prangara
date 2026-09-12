/**
 * Reading a utility bill or an invoice off recognised text.
 *
 * This is the "small model" that matters most in practice: OCR gives a wall of
 * text, and what a plant owner needs is the four numbers that go into an
 * activity record. The rules here are deterministic and explainable — every
 * field carries the exact line it was read from, so a wrong reading can be
 * seen and corrected rather than argued with.
 *
 * Two things it deliberately does not do:
 *
 *  - It never computes a carbon figure. That is the engine's job, on the
 *    server, from a confirmed record.
 *  - It never derives a number that the document does not print. A tariff is
 *    read only if the bill states a rate; it is not back-calculated from the
 *    amount, because a bill's total includes fixed charges, duty and arrears
 *    and the result would be a plausible-looking lie.
 */

import { PAIRED_PENALTY, expandLines } from './text';
import type { ActivityRecordIn, ExtractedField, StreamKind } from '../api/types';

export type DocumentKind =
  | 'electricity_bill'
  | 'fuel_invoice'
  | 'gas_bill'
  | 'material_invoice'
  | 'waste_certificate'
  | 'freight_invoice';

export type PeriodGuess = {
  /** 1 = the document covers a year, 12 = it covers a month. */
  multiplier: number;
  label: string;
  confidence: number;
  evidence: string;
};

export type DocumentReading = {
  kind: DocumentKind;
  fields: ExtractedField[];
  /** The record the confirm step would write, if the user accepts it. */
  suggested: ActivityRecordIn | null;
  period: PeriodGuess | null;
  /** Free text the reader may want to check, longest lines first. */
  notes: string[];
};

/** `1,23,456.78` and `1 234.56` both appear on Indian bills. */
function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  // A leading zero marks an identifier, not a measurement: consumer numbers,
  // account numbers and invoice serials are all printed that way, and one of
  // them sitting next to the words "Net Amount Payable" must not become an
  // amount. "0.85" is still a rate.
  if (/^0\d/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const NUMBER = '([0-9][0-9,\\s]*(?:\\.[0-9]+)?)';

type Rule = {
  field: string;
  unit: string | null;
  /** Confidence when this pattern matches, before adjustment. */
  confidence: number;
  patterns: RegExp[];
  /** Reject implausible readings rather than presenting them. */
  plausible?: (value: number) => boolean;
  /** Converts the matched number into the unit above. */
  scale?: (value: number, matched: string) => number;
};

const UNITS_RULES: Rule[] = [
  {
    field: 'electricity_kwh',
    unit: 'kWh',
    confidence: 0.92,
    patterns: [
      // "Units consumed 48,500" and "Total Consumption (kWh) 48500"
      new RegExp(`units?\\s*(?:consumed|consumption|billed)?\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
      new RegExp(`(?:total\\s+)?consumption\\s*(?:\\(?k\\.?w\\.?h\\.?\\)?)?\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
      new RegExp(`${NUMBER}\\s*k\\.?w\\.?h`, 'i'),
      new RegExp(`net\\s*units?\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
    ],
    plausible: (value) => value >= 1 && value <= 50_000_000,
  },
  {
    field: 'sanctioned_load_kva',
    unit: 'kVA',
    confidence: 0.75,
    patterns: [
      new RegExp(`(?:sanctioned|contract|connected)\\s*(?:load|demand)\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
      new RegExp(`${NUMBER}\\s*k\\.?v\\.?a`, 'i'),
    ],
    plausible: (value) => value >= 1 && value <= 100_000,
  },
  {
    field: 'maximum_demand_kva',
    unit: 'kVA',
    confidence: 0.7,
    patterns: [
      new RegExp(`(?:maximum|max\\.?|recorded)\\s*demand\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
      new RegExp(`\\bmd\\b\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
    ],
    plausible: (value) => value >= 1 && value <= 100_000,
  },
  {
    field: 'bill_amount_inr',
    unit: 'INR',
    confidence: 0.8,
    patterns: [
      // The currency token is required, not optional: it is the only thing
      // separating an amount from a reference number printed beside the same
      // label, and OCR puts those next to each other constantly.
      new RegExp(`(?:net\\s+)?(?:amount|total)\\s*(?:payable|due|bill)?\\s*[:\\-]?\\s*(?:rs\\.?|inr|₹)\\s*${NUMBER}`, 'i'),
      new RegExp(`(?:rs\\.?|inr|₹)\\s*${NUMBER}`, 'i'),
    ],
    plausible: (value) => value >= 1 && value <= 1_000_000_000,
  },
  {
    field: 'tariff_inr_per_kwh',
    unit: 'INR/kWh',
    confidence: 0.7,
    // Only a printed rate. Never amount divided by units.
    patterns: [
      new RegExp(`(?:rate|tariff)\\s*(?:per\\s*unit|\\/\\s*unit|\\/\\s*k\\.?w\\.?h)?\\s*[:\\-]?\\s*(?:rs\\.?|inr|₹)\\s*${NUMBER}`, 'i'),
      new RegExp(`${NUMBER}\\s*(?:rs\\.?|inr|₹)?\\s*(?:per|\\/)\\s*(?:unit|k\\.?w\\.?h)`, 'i'),
    ],
    plausible: (value) => value >= 0.5 && value <= 60,
  },
];

const FUEL_RULES: Rule[] = [
  {
    field: 'fuel_quantity_t',
    unit: 'tonne',
    confidence: 0.85,
    patterns: [
      new RegExp(`${NUMBER}\\s*(?:m\\.?t\\.?|metric\\s*ton(?:ne)?s?|tonnes?|tons?)\\b`, 'i'),
      new RegExp(`(?:quantity|qty|weight|net\\s*wt)\\s*[:\\-]?\\s*${NUMBER}\\s*(?:m\\.?t|tonnes?|tons?)`, 'i'),
    ],
    plausible: (value) => value > 0 && value <= 5_000_000,
  },
  {
    field: 'fuel_quantity_kg',
    unit: 'tonne',
    confidence: 0.8,
    patterns: [new RegExp(`${NUMBER}\\s*(?:kgs?|kilograms?)\\b`, 'i')],
    // Recorded in tonnes, because that is the unit the engine takes.
    scale: (value) => value / 1000,
    plausible: (value) => value > 0 && value <= 5_000_000,
  },
  {
    field: 'diesel_litres',
    unit: 'litre',
    confidence: 0.85,
    patterns: [
      new RegExp(`${NUMBER}\\s*(?:ltrs?|litres?|liters?|l\\b)`, 'i'),
      new RegExp(`(?:diesel|hsd|furnace\\s*oil)\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
    ],
    plausible: (value) => value > 0 && value <= 20_000_000,
  },
];

const GAS_RULES: Rule[] = [
  {
    field: 'gas_scm',
    unit: 'Sm3',
    confidence: 0.85,
    patterns: [
      new RegExp(`${NUMBER}\\s*(?:s\\.?c\\.?m|sm3|scm|standard\\s*cubic\\s*met(?:re|er)s?)`, 'i'),
      new RegExp(`(?:gas\\s*(?:consumed|consumption|quantity))\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
    ],
    plausible: (value) => value > 0 && value <= 50_000_000,
  },
];

const MASS_RULES: Rule[] = [
  {
    field: 'quantity_t',
    unit: 'tonne',
    confidence: 0.8,
    patterns: [
      new RegExp(`${NUMBER}\\s*(?:m\\.?t\\.?|metric\\s*ton(?:ne)?s?|tonnes?|tons?)\\b`, 'i'),
      new RegExp(`(?:quantity|qty|net\\s*wt|weight)\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
    ],
    plausible: (value) => value > 0 && value <= 5_000_000,
  },
];

const FREIGHT_RULES: Rule[] = [
  {
    field: 'tonne_km',
    unit: 'tonne-km',
    confidence: 0.8,
    patterns: [new RegExp(`${NUMBER}\\s*(?:t\\.?km|tonne[-\\s]?km|ton[-\\s]?km)`, 'i')],
    plausible: (value) => value > 0 && value <= 500_000_000,
  },
  {
    field: 'distance_km',
    unit: 'km',
    confidence: 0.7,
    patterns: [
      new RegExp(`(?:distance|km\\s*run|kilomet(?:re|er)s?)\\s*[:\\-]?\\s*${NUMBER}`, 'i'),
      new RegExp(`${NUMBER}\\s*k\\.?m\\b`, 'i'),
    ],
    plausible: (value) => value > 0 && value <= 100_000,
  },
  {
    field: 'payload_t',
    unit: 'tonne',
    confidence: 0.7,
    patterns: [new RegExp(`${NUMBER}\\s*(?:m\\.?t\\.?|tonnes?|tons?)\\b`, 'i')],
    plausible: (value) => value > 0 && value <= 100_000,
  },
];

const RULES: Record<DocumentKind, Rule[]> = {
  electricity_bill: UNITS_RULES,
  fuel_invoice: FUEL_RULES,
  gas_bill: GAS_RULES,
  material_invoice: MASS_RULES,
  waste_certificate: MASS_RULES,
  freight_invoice: FREIGHT_RULES,
};

/** How a reading becomes an activity record, per document kind. */
const TARGET: Record<
  DocumentKind,
  { field: string; stream: StreamKind; unit: string; factorKey: string | null; label: string }
> = {
  electricity_bill: {
    field: 'electricity_kwh',
    stream: 'electricity',
    unit: 'kWh',
    factorKey: null,
    label: 'Electricity bill',
  },
  fuel_invoice: {
    field: 'fuel_quantity_t',
    stream: 'fuel',
    unit: 'tonne',
    factorKey: 'COAL_INDIAN',
    label: 'Coal / fuel invoice',
  },
  gas_bill: {
    field: 'gas_scm',
    stream: 'fuel',
    unit: 'Sm3',
    factorKey: 'NATURAL_GAS',
    label: 'Gas bill',
  },
  material_invoice: {
    field: 'quantity_t',
    stream: 'material',
    unit: 'tonne',
    factorKey: 'STEEL_PRIMARY',
    label: 'Material invoice',
  },
  waste_certificate: {
    field: 'quantity_t',
    stream: 'waste',
    unit: 'tonne',
    factorKey: 'LANDFILL_INERT',
    label: 'Waste record',
  },
  freight_invoice: {
    field: 'tonne_km',
    stream: 'freight',
    unit: 'tonne-km',
    factorKey: 'ROAD_FREIGHT_HCV',
    label: 'Freight invoice',
  },
};

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/**
 * How long the document covers. Getting this wrong is a twelve-fold error, so
 * it is only ever a suggestion: the screen still asks.
 */
export function guessPeriod(lines: string[]): PeriodGuess | null {
  const text = lines.join(' \n ').toLowerCase();

  const annual = /(?:annual|yearly|per\s*annum|f\.?y\.?\s*20\d\d|financial\s*year)/.exec(text);
  if (annual) {
    return {
      multiplier: 1,
      label: 'A full year',
      confidence: 0.7,
      evidence: annual[0].trim(),
    };
  }

  const quarter = /(?:quarter(?:ly)?|q[1-4]\s*20\d\d|three\s*months)/.exec(text);
  if (quarter) {
    return {
      multiplier: 4,
      label: 'One quarter',
      confidence: 0.65,
      evidence: quarter[0].trim(),
    };
  }

  // Two dates about a month apart is the strongest signal a utility bill gives.
  const dates = [...text.matchAll(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/g)];
  if (dates.length >= 2) {
    const parse = (match: RegExpMatchArray) => {
      const [, d, m, y] = match;
      const year = Number(y.length === 2 ? `20${y}` : y);
      return new Date(year, Number(m) - 1, Number(d)).getTime();
    };
    const times = dates.map(parse).filter((value) => !Number.isNaN(value)).sort((a, b) => a - b);
    if (times.length >= 2) {
      const days = (times[times.length - 1] - times[0]) / 86_400_000;
      if (days >= 20 && days <= 45) {
        return {
          multiplier: 12,
          label: 'One month',
          confidence: 0.8,
          evidence: `${dates[0][0]} to ${dates[dates.length - 1][0]}`,
        };
      }
      if (days > 45 && days <= 135) {
        return { multiplier: 4, label: 'One quarter', confidence: 0.7, evidence: `${Math.round(days)} days` };
      }
      if (days > 300 && days <= 400) {
        return { multiplier: 1, label: 'A full year', confidence: 0.75, evidence: `${Math.round(days)} days` };
      }
    }
  }

  const monthly = /(?:billing\s*(?:month|period)|month\s*of|monthly)/.exec(text);
  if (monthly) {
    return { multiplier: 12, label: 'One month', confidence: 0.6, evidence: monthly[0].trim() };
  }

  // A single month name, as in "AUG 2026", is weak but better than nothing.
  const named = MONTHS.find((month) => new RegExp(`\\b${month}[a-z]*\\s*'?\\s*\\d{2,4}`, 'i').test(text));
  if (named) {
    return { multiplier: 12, label: 'One month', confidence: 0.5, evidence: named.toUpperCase() };
  }

  return null;
}

/** Which document this looks like, so the screen can preselect the type. */
export function guessDocumentKind(lines: string[]): { kind: DocumentKind; confidence: number } | null {
  const text = lines.join(' ').toLowerCase();
  const candidates: { kind: DocumentKind; score: number }[] = [
    {
      kind: 'electricity_bill',
      score:
        (/(?:electricity|energy)\s*bill/.test(text) ? 0.5 : 0) +
        (/\bk\.?w\.?h\b|units?\s*consumed/.test(text) ? 0.35 : 0) +
        (/\b(?:mseb|tneb|gebl?|pgvcl|dgvcl|torrent|adani\s*electricity|bescom|tangedco|discom)\b/.test(text)
          ? 0.2
          : 0),
    },
    {
      kind: 'gas_bill',
      score:
        (/\b(?:png|natural\s*gas|gas\s*bill|gail|gujarat\s*gas|mahanagar\s*gas)\b/.test(text) ? 0.5 : 0) +
        (/\bs\.?c\.?m\b|sm3/.test(text) ? 0.35 : 0),
    },
    {
      kind: 'fuel_invoice',
      score:
        (/\b(?:coal|lignite|furnace\s*oil|diesel|hsd|briquette|pet\s*coke|biomass)\b/.test(text) ? 0.5 : 0) +
        (/\b(?:m\.?t|tonnes?|litres?|ltrs?)\b/.test(text) ? 0.25 : 0),
    },
    {
      kind: 'freight_invoice',
      score:
        (/\b(?:lorry|transport|freight|consignment|lr\s*no|e-?way\s*bill|logistics)\b/.test(text) ? 0.5 : 0) +
        (/\bt\.?km\b|kilomet/.test(text) ? 0.2 : 0),
    },
    {
      kind: 'waste_certificate',
      score: /\b(?:waste|disposal|landfill|scrap\s*disposal|effluent|tsdf)\b/.test(text) ? 0.55 : 0,
    },
    {
      kind: 'material_invoice',
      score:
        (/\b(?:invoice|tax\s*invoice|purchase\s*order|gstin)\b/.test(text) ? 0.3 : 0) +
        (/\b(?:steel|cotton|yarn|resin|pet|aluminium|cement|paper|glass)\b/.test(text) ? 0.3 : 0),
    },
  ];
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score < 0.35) return null;
  return { kind: best.kind, confidence: Math.min(0.95, best.score) };
}

function applyRules(lines: string[], rules: Rule[]): ExtractedField[] {
  const found = new Map<string, ExtractedField>();
  const candidates = expandLines(lines);

  rules.forEach((rule) => {
    for (const candidate of candidates) {
      for (let index = 0; index < rule.patterns.length; index += 1) {
        const match = rule.patterns[index].exec(candidate.text);
        if (!match) continue;
        const raw = match[1];
        const parsed = raw === undefined ? null : toNumber(raw);
        if (parsed === null) continue;
        const value = rule.scale ? rule.scale(parsed, match[0]) : parsed;
        if (rule.plausible && !rule.plausible(value)) continue;

        // A later pattern in the list is a weaker signal than an earlier one,
        // and a value read across two lines is weaker than one read on a line.
        const confidence = Math.max(
          0.4,
          rule.confidence - index * 0.12 - (candidate.paired ? PAIRED_PENALTY : 0),
        );
        const existing = found.get(rule.field);
        if (existing && existing.confidence >= confidence) continue;

        found.set(rule.field, {
          field: rule.field,
          value,
          unit: rule.unit,
          confidence: Number(confidence.toFixed(2)),
          evidence_text: candidate.text.trim(),
          // Read by a machine from a photograph. It is always confirmed by a
          // person before it becomes a record.
          needs_confirmation: true,
        });
        break;
      }
    }
  });

  return [...found.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Read a document. `kind` is what the user selected; when it is not given the
 * text decides, and the caller is told which kind was chosen.
 */
export function readDocument(lines: string[], kind?: DocumentKind): DocumentReading {
  const detected = kind ?? guessDocumentKind(lines)?.kind ?? 'electricity_bill';
  const fields = applyRules(lines, RULES[detected]);
  const period = guessPeriod(lines);
  const target = TARGET[detected];

  // `fuel_quantity_kg` already arrives converted to tonnes, so either field can
  // satisfy a tonne-denominated target.
  const primary =
    fields.find((field) => field.field === target.field) ??
    (target.unit === 'tonne'
      ? fields.find((field) => field.unit === 'tonne')
      : undefined) ??
    (detected === 'fuel_invoice'
      ? fields.find((field) => field.field === 'diesel_litres')
      : undefined);

  let suggested: ActivityRecordIn | null = null;
  if (primary && typeof primary.value === 'number') {
    const unit = primary.field === 'diesel_litres' ? 'litre' : target.unit;
    const factorKey = primary.field === 'diesel_litres' ? 'DIESEL' : target.factorKey;
    suggested = {
      stream_kind: target.stream,
      factor_key: factorKey,
      label: target.label,
      // Annualised by the screen once the period is confirmed, not here: the
      // period is a guess and must be shown before it multiplies anything.
      quantity: primary.value,
      unit,
      data_state: 'DOCUMENT-CONFIRMED',
      source_kind: 'document_ocr',
      extraction_confidence: primary.confidence,
    };
  }

  const notes = lines
    .filter((line) => line.trim().length > 12)
    .sort((a, b) => b.length - a.length)
    .slice(0, 4);

  return { kind: detected, fields, suggested, period, notes };
}
