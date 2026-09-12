/**
 * Reading an equipment nameplate off recognised text.
 *
 * A nameplate is the densest source of truth on a factory floor: rating,
 * speed, efficiency class, make and year, stamped on the machine itself. It is
 * also the one document nobody files, which is why photographing it is worth
 * more than asking for it.
 *
 * Horsepower is converted to kilowatts here because the plate states one and
 * the engine wants the other - a unit conversion with a fixed factor, not a
 * carbon or financial calculation.
 */

import { PAIRED_PENALTY, expandLines } from './text';
import type { ExtractedField } from '../api/types';

export type AssetType =
  | 'motor'
  | 'pump'
  | 'compressor'
  | 'boiler'
  | 'chiller'
  | 'fan'
  | 'dg_set'
  | 'transformer'
  | 'furnace'
  | 'dryer'
  | 'other';

export type NameplateReading = {
  fields: ExtractedField[];
  assetType: { value: AssetType; label: string; confidence: number; evidence: string } | null;
  manufacturer: string | null;
  model: string | null;
  /** kW, whether the plate stated kW or HP. */
  ratedPowerKw: number | null;
  efficiencyPct: number | null;
  yearInstalled: number | null;
};

const HP_TO_KW = 0.745699872;

function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

const NUMBER = String.raw`([0-9][0-9,\s]*(?:\.[0-9]+)?)`;

/** Keyword to asset type. Ordered: the first match on a plate wins. */
const TYPE_RULES: { type: AssetType; label: string; patterns: RegExp[]; confidence: number }[] = [
  {
    type: 'dg_set',
    label: 'Diesel generator set',
    patterns: [/\b(?:d\.?g\.?\s*set|generating\s*set|genset|alternator|generator)\b/i],
    confidence: 0.85,
  },
  {
    type: 'transformer',
    label: 'Transformer',
    patterns: [/\btransformer\b/i, /\b(?:hv|lv)\s*winding\b/i],
    confidence: 0.9,
  },
  {
    type: 'compressor',
    label: 'Air compressor',
    patterns: [/\bcompressor\b/i, /\bscrew\s*air\b/i, /\b(?:cfm|f\.?a\.?d\.?)\b/i],
    confidence: 0.88,
  },
  {
    type: 'boiler',
    label: 'Boiler',
    patterns: [/\bboiler\b/i, /\b(?:steam\s*(?:generator|output)|tph|kg\/?cm2|ibr)\b/i],
    confidence: 0.88,
  },
  {
    type: 'chiller',
    label: 'Chiller',
    patterns: [
      /\bchill(?:er|ing)\b/i,
      /\b(?:tons?\s*of\s*refrigeration|refrigerant|r-?\d{2,3}[a-z]?)\b/i,
    ],
    confidence: 0.85,
  },
  {
    type: 'furnace',
    label: 'Furnace',
    patterns: [/\b(?:furnace|kiln|induction\s*melt)\b/i],
    confidence: 0.85,
  },
  {
    type: 'dryer',
    label: 'Dryer',
    patterns: [/\b(?:dryer|drier|stenter|oven)\b/i],
    confidence: 0.8,
  },
  {
    type: 'pump',
    label: 'Pump',
    patterns: [/\bpump\b/i, /\b(?:head|suction|discharge)\s*(?:m|mm|metre)\b/i],
    confidence: 0.85,
  },
  {
    type: 'fan',
    label: 'Fan or blower',
    patterns: [/\b(?:blower|fan|air\s*handling|ahu)\b/i],
    confidence: 0.8,
  },
  {
    type: 'motor',
    label: 'Electric motor',
    // Last: almost every plate mentions a motor somewhere, so it is the
    // fallback rather than the first guess.
    patterns: [/\b(?:induction\s*motor|motor|3\s*phase|ie[1-5]\b|squirrel\s*cage)\b/i],
    confidence: 0.75,
  },
];

/** Makes common on Indian industrial plates. */
const MANUFACTURERS = [
  'crompton',
  'kirloskar',
  'siemens',
  'abb',
  'bharat bijlee',
  'havells',
  'marathon',
  'weg',
  'hindustan',
  'baldor',
  'toshiba',
  'schneider',
  'l&t',
  'larsen',
  'atlas copco',
  'elgi',
  'ingersoll',
  'chicago pneumatic',
  'kaeser',
  'thermax',
  'forbes marshall',
  'voltas',
  'blue star',
  'carrier',
  'daikin',
  'grundfos',
  'ksb',
  'wilo',
  'cummins',
  'ashok leyland',
  'mahindra',
  'greaves',
  'bosch',
  'danfoss',
  'lakshmi',
  'trutzschler',
];

export function guessAssetType(lines: string[]): NameplateReading['assetType'] {
  const text = lines.join(' \n ');
  for (const rule of TYPE_RULES) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          value: rule.type,
          label: rule.label,
          confidence: rule.confidence,
          evidence: match[0].trim(),
        };
      }
    }
  }
  return null;
}

function findManufacturer(lines: string[]): string | null {
  const haystack = lines.join(' \n ').toLowerCase();
  const hit = MANUFACTURERS.find((name) => haystack.includes(name));
  if (hit) {
    // Give back the line as printed, which carries the real capitalisation.
    const line = lines.find((candidate) => candidate.toLowerCase().includes(hit));
    return (line ?? hit).trim().slice(0, 60);
  }
  // A plate usually leads with the maker's name in the largest type, which OCR
  // returns among the first lines. Only trust it if it looks like a name rather
  // than a specification.
  const first = lines.find(
    (line) => line.trim().length >= 3 && line.trim().length <= 40 && !/\d/.test(line),
  );
  return first ? first.trim() : null;
}

function findModel(lines: string[]): string | null {
  for (const line of lines) {
    const labelled =
      /(?:model|type|frame|cat\.?\s*no\.?)\s*[:\-.]?\s*([A-Za-z0-9][A-Za-z0-9\-/.]{2,24})/i.exec(
        line,
      );
    if (labelled) return labelled[1].trim();
  }
  // An alphanumeric token carrying both letters and digits is usually a model.
  for (const line of lines) {
    const token = /\b([A-Z]{1,4}[-/]?\d{2,6}[A-Z0-9-]{0,6})\b/.exec(line);
    if (token && !/^\d+$/.test(token[1])) return token[1].trim();
  }
  return null;
}

/**
 * Find a number carrying a unit, in either printed order.
 *
 * Plates are inconsistent about this: "7.5 kW" and "kW 7.5" are both common,
 * sometimes on the same plate ("kW 7.5   HP 10"). Reading only one order is how
 * 7.5 kW ends up recorded as 7.5 horsepower.
 */
function matchUnit(
  line: string,
  spellings: string[],
  options: { labelFirst?: boolean; valueFirst?: boolean } = {},
): { value: number; text: string } | null {
  const { labelFirst = true, valueFirst = true } = options;
  const unit = spellings.join('|');

  if (labelFirst) {
    const source = String.raw`\b(?:@UNIT)\b\s*[:\-.=]?\s*@NUM`
      .replace('@UNIT', unit)
      .replace('@NUM', NUMBER);
    const match = new RegExp(source, 'i').exec(line);
    if (match) {
      const value = toNumber(match[1]);
      if (value !== null) return { value, text: match[0] };
    }
  }
  if (valueFirst) {
    const source = String.raw`@NUM\s*(?:@UNIT)\b`
      .replace('@NUM', NUMBER)
      .replace('@UNIT', unit);
    const match = new RegExp(source, 'i').exec(line);
    if (match) {
      const value = toNumber(match[1]);
      if (value !== null) return { value, text: match[0] };
    }
  }
  return null;
}

export function readNameplate(lines: string[]): NameplateReading {
  const fields: ExtractedField[] = [];
  const push = (
    field: string,
    value: number | string,
    unit: string | null,
    confidence: number,
    evidence: string,
  ) => {
    if (fields.some((existing) => existing.field === field)) return;
    fields.push({
      field,
      value,
      unit,
      confidence: Number(confidence.toFixed(2)),
      evidence_text: evidence.trim(),
      needs_confirmation: true,
    });
  };

  let ratedPowerKw: number | null = null;
  let efficiencyPct: number | null = null;
  let yearInstalled: number | null = null;

  // Single lines first, then label/value pairs across two lines: a plate
  // photographed in two columns often recognises as separate lines.
  const candidates = expandLines(lines);
  for (const candidate of candidates) {
    const line = candidate.text;
    const penalty = candidate.paired ? PAIRED_PENALTY : 0;
    // Rated power. A stated kW beats a stated HP, because the HP figure on a
    // plate is often the nominal frame size while the kW is the real rating.
    if (ratedPowerKw === null) {
      const kw = matchUnit(line, ['kw', String.raw`k\.w\.?`, 'kilowatts?']);
      if (kw && kw.value > 0 && kw.value <= 50_000) {
        ratedPowerKw = kw.value;
        push('rated_power_kw', kw.value, 'kW', 0.9 - penalty, line);
      }
    }
    if (ratedPowerKw === null) {
      const hp = matchUnit(line, ['hp', String.raw`h\.p\.?`, String.raw`horse\s*power`]);
      if (hp && hp.value > 0 && hp.value <= 60_000) {
        ratedPowerKw = Number((hp.value * HP_TO_KW).toFixed(2));
        push('rated_power_hp', hp.value, 'HP', 0.85 - penalty, line);
        push(
          'rated_power_kw',
          ratedPowerKw,
          'kW',
          0.82 - penalty,
          `${line} (converted at 0.7457 kW per HP)`,
        );
      }
    }
    // Record the HP the plate states even when kW was found, so a reader can
    // see both figures and spot a mismatched plate.
    const statedHp = matchUnit(line, ['hp', String.raw`h\.p\.?`, String.raw`horse\s*power`]);
    if (statedHp && statedHp.value > 0 && statedHp.value <= 60_000) {
      push('rated_power_hp', statedHp.value, 'HP', 0.85 - penalty, line);
    }

    if (efficiencyPct === null) {
      const labelledSource = String.raw`(?:eff(?:iciency)?)\s*[:\-.=]?\s*@NUM\s*%?`.replace(
        '@NUM',
        NUMBER,
      );
      const trailingSource = String.raw`@NUM\s*%\s*(?:eff(?:iciency)?)`.replace('@NUM', NUMBER);
      const efficiency =
        new RegExp(labelledSource, 'i').exec(line) ?? new RegExp(trailingSource, 'i').exec(line);
      if (efficiency) {
        const value = toNumber(efficiency[1]);
        if (value !== null && value >= 20 && value <= 100) {
          efficiencyPct = value;
          push('efficiency_pct', value, '%', 0.8 - penalty, line);
        }
      }
    }

    if (yearInstalled === null) {
      const labelledYear =
        /(?:year|mfg\.?|manufactured|month\s*\/?\s*year|date\s*of\s*mfg\.?)\s*[:\-.]?\s*(?:\d{1,2}\s*[/-]\s*)?((?:19|20)\d{2})/i.exec(
          line,
        );
      const bareYear = /\b((?:19[89]\d|20[0-4]\d))\b/.exec(line);
      const year = labelledYear ?? bareYear;
      if (year) {
        const value = Number(year[1]);
        const thisYear = new Date().getFullYear();
        if (value >= 1980 && value <= thisYear) {
          yearInstalled = value;
          push('year_installed', value, null, (labelledYear ? 0.75 : 0.6) - penalty, line);
        }
      }
    }

    const rpm = matchUnit(line, ['rpm', String.raw`r\.p\.m\.?`, 'r/min']);
    if (rpm && rpm.value > 0 && rpm.value <= 60_000) push('rpm', rpm.value, 'rpm', 0.85 - penalty, line);

    // "V" alone is only trusted after the number; "VOLTS" either way.
    const volts =
      matchUnit(line, ['volts?', 'voltage']) ?? matchUnit(line, ['v', 'kv'], { labelFirst: false });
    if (volts && volts.value >= 100 && volts.value <= 66_000) {
      push('voltage_v', volts.value, 'V', 0.75 - penalty, line);
    }

    // Same for "A": a bare letter before a number matches far too much.
    const amps =
      matchUnit(line, ['amps?', 'amperes?', 'current']) ??
      matchUnit(line, ['a'], { labelFirst: false });
    if (amps && amps.value > 0 && amps.value <= 10_000) {
      push('current_a', amps.value, 'A', 0.65 - penalty, line);
    }

    const ieClass = /\bIE\s*([1-5])\b/i.exec(line);
    if (ieClass) push('ie_class', `IE${ieClass[1]}`, null, 0.85 - penalty, line);

    const tph = matchUnit(line, ['tph', String.raw`t\.p\.h\.?`]);
    if (tph && tph.value > 0 && tph.value <= 2_000) push('steam_tph', tph.value, 'TPH', 0.85 - penalty, line);

    const cfm = matchUnit(line, ['cfm', 'fad']);
    if (cfm && cfm.value > 0 && cfm.value <= 100_000) push('air_cfm', cfm.value, 'CFM', 0.8 - penalty, line);
  }

  const assetType = guessAssetType(lines);
  const manufacturer = findManufacturer(lines);
  const model = findModel(lines);

  if (assetType) {
    push('asset_type', assetType.value, null, assetType.confidence, assetType.evidence);
  }
  if (manufacturer) push('manufacturer', manufacturer, null, 0.6, manufacturer);
  if (model) push('model', model, null, 0.65, model);

  return {
    fields: fields.sort((a, b) => b.confidence - a.confidence),
    assetType,
    manufacturer,
    model,
    ratedPowerKw,
    efficiencyPct,
    yearInstalled,
  };
}
