/**
 * Reading bills off recognised text.
 *
 * The fixtures below are the shape OCR actually returns for Indian utility
 * bills and invoices: one line per printed line, labels and values on the same
 * line, no punctuation guarantees.
 *
 * The important assertions are the refusals. A reader that confidently returns
 * the wrong number is worse than one that returns nothing, because the wrong
 * number becomes an activity record and then a footprint.
 */

import { guessDocumentKind, guessPeriod, readDocument } from './documents';

const ELECTRICITY_BILL = [
  'TORRENT POWER LIMITED',
  'ELECTRICITY BILL',
  'Consumer No 09876543',
  'Tariff Category HT-I Industrial',
  'Sanctioned Load 750 kVA',
  'Maximum Demand 612 kVA',
  'Billing Period 01/08/2026 to 31/08/2026',
  'Units Consumed 48,500 kWh',
  'Rate per unit Rs 8.45',
  'Net Amount Payable Rs 4,42,830.00',
];

const FUEL_INVOICE = [
  'TAX INVOICE',
  'Western Coal Traders',
  'GSTIN 24AABCU9603R1ZX',
  'Description Indian Steam Coal (B Grade)',
  'Quantity 42.5 MT',
  'Rate 6,200.00 per MT',
  'Invoice Date 12/08/2026',
];

const GAS_BILL = [
  'Gujarat Gas Limited',
  'PNG Industrial Connection',
  'Gas Consumed 12,400 SCM',
  'Billing month of August 2026',
];

const FREIGHT_INVOICE = [
  'Shree Roadlines Logistics',
  'Consignment Note LR No 44821',
  'Distance 460 km',
  'Payload 12 MT',
  '5520 tonne-km',
];

describe('guessDocumentKind', () => {
  it('recognises an electricity bill from its own vocabulary', () => {
    expect(guessDocumentKind(ELECTRICITY_BILL)?.kind).toBe('electricity_bill');
  });

  it('separates a gas bill from an electricity bill', () => {
    expect(guessDocumentKind(GAS_BILL)?.kind).toBe('gas_bill');
  });

  it('recognises a coal invoice', () => {
    expect(guessDocumentKind(FUEL_INVOICE)?.kind).toBe('fuel_invoice');
  });

  it('recognises a freight consignment', () => {
    expect(guessDocumentKind(FREIGHT_INVOICE)?.kind).toBe('freight_invoice');
  });

  it('declines to guess from an unrelated photograph', () => {
    expect(guessDocumentKind(['Canteen menu', 'Tea 10', 'Samosa 15'])).toBeNull();
  });
});

describe('guessPeriod', () => {
  it('reads a one-month billing period from the two printed dates', () => {
    const period = guessPeriod(ELECTRICITY_BILL);
    expect(period?.multiplier).toBe(12);
    expect(period?.label).toBe('One month');
    expect(period?.evidence).toContain('01/08/2026');
  });

  it('reads a full year when the bill says annual', () => {
    expect(guessPeriod(['Annual consumption statement F.Y. 2026'])?.multiplier).toBe(1);
  });

  it('reads a quarter', () => {
    expect(guessPeriod(['Quarterly statement Q2 2026'])?.multiplier).toBe(4);
  });

  it('falls back to a month name, at lower confidence', () => {
    const period = guessPeriod(GAS_BILL);
    expect(period?.multiplier).toBe(12);
    expect(period?.confidence).toBeLessThan(0.75);
  });

  it('returns nothing when the text says nothing about a period', () => {
    expect(guessPeriod(['Units Consumed 1200'])).toBeNull();
  });
});

describe('readDocument, electricity', () => {
  const reading = readDocument(ELECTRICITY_BILL, 'electricity_bill');

  it('reads the units with their lakh separators intact', () => {
    const units = reading.fields.find((field) => field.field === 'electricity_kwh');
    expect(units?.value).toBe(48500);
    expect(units?.unit).toBe('kWh');
  });

  it('quotes the line every value was read from', () => {
    reading.fields.forEach((field) => {
      expect(field.evidence_text).toBeTruthy();
      expect(ELECTRICITY_BILL.join('\n')).toContain(field.evidence_text as string);
    });
  });

  it('marks every field as needing confirmation', () => {
    expect(reading.fields.every((field) => field.needs_confirmation)).toBe(true);
  });

  it('reads the sanctioned load and the maximum demand separately', () => {
    expect(reading.fields.find((f) => f.field === 'sanctioned_load_kva')?.value).toBe(750);
    expect(reading.fields.find((f) => f.field === 'maximum_demand_kva')?.value).toBe(612);
  });

  it('reads the printed tariff but never divides the amount by the units', () => {
    const tariff = reading.fields.find((field) => field.field === 'tariff_inr_per_kwh');
    expect(tariff?.value).toBe(8.45);
    // 442830 / 48500 = 9.13, which is what a naive derivation would produce.
    expect(tariff?.value).not.toBeCloseTo(9.13, 1);
  });

  it('suggests an un-annualised record, leaving the period to the screen', () => {
    expect(reading.suggested).toMatchObject({
      stream_kind: 'electricity',
      quantity: 48500,
      unit: 'kWh',
      data_state: 'DOCUMENT-CONFIRMED',
      source_kind: 'document_ocr',
    });
  });
});

describe('readDocument, other kinds', () => {
  it('reads coal in tonnes', () => {
    const reading = readDocument(FUEL_INVOICE, 'fuel_invoice');
    expect(reading.suggested).toMatchObject({
      stream_kind: 'fuel',
      quantity: 42.5,
      unit: 'tonne',
      factor_key: 'COAL_INDIAN',
    });
  });

  it('converts a kilogram quantity to tonnes rather than reporting kg as tonnes', () => {
    const reading = readDocument(['Net Wt 2500 kgs'], 'fuel_invoice');
    expect(reading.fields.find((field) => field.field === 'fuel_quantity_kg')?.value).toBe(2.5);
  });

  it('reads gas in standard cubic metres', () => {
    const reading = readDocument(GAS_BILL, 'gas_bill');
    expect(reading.suggested).toMatchObject({ quantity: 12400, unit: 'Sm3' });
  });

  it('prefers printed tonne-km over multiplying distance by payload', () => {
    const reading = readDocument(FREIGHT_INVOICE, 'freight_invoice');
    expect(reading.suggested?.quantity).toBe(5520);
    expect(reading.suggested?.unit).toBe('tonne-km');
  });

  it('records diesel in litres with the diesel factor, not as coal', () => {
    const reading = readDocument(['HSD Diesel 4,500 ltrs', 'Tax Invoice'], 'fuel_invoice');
    expect(reading.suggested).toMatchObject({ unit: 'litre', factor_key: 'DIESEL' });
  });
});

describe('readDocument refusals', () => {
  it('suggests nothing from a photograph with no figures on it', () => {
    const reading = readDocument(['Shree Ganesh Textiles', 'Plot 44 GIDC'], 'electricity_bill');
    expect(reading.fields).toHaveLength(0);
    expect(reading.suggested).toBeNull();
  });

  it('rejects an implausible reading instead of presenting it', () => {
    // A consumer number is a number next to the word "units" only by accident.
    const reading = readDocument(['Units Consumed 999999999999 kWh'], 'electricity_bill');
    expect(reading.fields.find((field) => field.field === 'electricity_kwh')).toBeUndefined();
  });

  it('rejects a tariff outside any real Indian industrial range', () => {
    const reading = readDocument(['Rate per unit Rs 845.00'], 'electricity_bill');
    expect(reading.fields.find((field) => field.field === 'tariff_inr_per_kwh')).toBeUndefined();
  });

  it('scores a weaker pattern lower than an explicit label', () => {
    const labelled = readDocument(['Units Consumed 48500'], 'electricity_bill');
    const bare = readDocument(['48500 kWh'], 'electricity_bill');
    const labelledConfidence = labelled.fields[0].confidence;
    const bareConfidence = bare.fields[0].confidence;
    expect(labelledConfidence).toBeGreaterThan(bareConfidence);
  });
});

describe('readDocument with a bill split into label and value columns', () => {
  const SPLIT_BILL = [
    'TORRENT POWER LIMITED',
    'Sanctioned Load',
    '750 kVA',
    'Units Consumed',
    '48,500 kWh',
    'Rate per unit',
    'Rs 8.45',
    'Net Amount Payable',
    'Rs 4,42,830.00',
  ];

  it('still finds the units when the value is on the next line', () => {
    const reading = readDocument(SPLIT_BILL, 'electricity_bill');
    expect(reading.suggested?.quantity).toBe(48500);
  });

  it('still finds the load and the printed rate', () => {
    const reading = readDocument(SPLIT_BILL, 'electricity_bill');
    const byField = Object.fromEntries(reading.fields.map((f) => [f.field, f.value]));
    expect(byField.sanctioned_load_kva).toBe(750);
    expect(byField.tariff_inr_per_kwh).toBe(8.45);
  });
});

describe('readDocument against what OCR actually returned on a phone', () => {
  /**
   * These lines are the real recogniser output from the device test, in the
   * order it produced them. The label and value columns came back as separate
   * blocks, which put "Net Amount Payable" next to the consumer number - and
   * the reader turned an account number into a rupee amount.
   */
  const AS_RECOGNISED = [
    'TORRENT POWER LIMITED',
    'ELECTRICITY BILL - HT INDUSTRIAL',
    'Consumer No',
    'Net Amount Payable',
    '09876543',
    'SURAT DYEING AND PROCESSING',
    'Sanctioned Load',
    '750 kVA',
    'Units Consumed',
    '48,500 kWh',
    'Rate per unit',
    'Rs 8.45',
    'Net Amount Payable',
    'Rs 4,42,830.00',
  ];

  it('does not read a consumer number as a rupee amount', () => {
    const reading = readDocument(AS_RECOGNISED, 'electricity_bill');
    const amount = reading.fields.find((field) => field.field === 'bill_amount_inr');
    expect(amount?.value).not.toBe(9876543);
    expect(amount?.value).toBe(442830);
  });

  it('still reads the units and the load correctly from that layout', () => {
    const reading = readDocument(AS_RECOGNISED, 'electricity_bill');
    expect(reading.suggested?.quantity).toBe(48500);
    expect(reading.fields.find((f) => f.field === 'sanctioned_load_kva')?.value).toBe(750);
  });

  it('ignores a leading-zero identifier anywhere it appears', () => {
    const reading = readDocument(['Units Consumed 09876543'], 'electricity_bill');
    expect(reading.fields).toHaveLength(0);
  });

  it('requires a currency token before treating a number as money', () => {
    const withToken = readDocument(['Total Amount Rs 12,500'], 'electricity_bill');
    const without = readDocument(['Total Amount 12500'], 'electricity_bill');
    expect(withToken.fields.find((f) => f.field === 'bill_amount_inr')?.value).toBe(12500);
    expect(without.fields.find((f) => f.field === 'bill_amount_inr')).toBeUndefined();
  });
});
