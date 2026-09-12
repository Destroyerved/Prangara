/**
 * Reading equipment nameplates off recognised text.
 *
 * Nameplate fixtures are deliberately messy: real plates mix kW and HP, stamp
 * the year as a month/year pair, and put the make in the largest type where OCR
 * returns it first.
 */

import { guessAssetType, readNameplate } from './nameplate';

const MOTOR_PLATE = [
  'CROMPTON GREAVES LIMITED',
  '3 PHASE INDUCTION MOTOR',
  'TYPE NG 132M',
  'kW 7.5    HP 10',
  'VOLTS 415   AMPS 14.5',
  'RPM 1440   IE3',
  'EFF 89.4 %',
  'MFG 06/2019',
];

const HP_ONLY_PLATE = [
  'KIRLOSKAR BROTHERS',
  'CENTRIFUGAL PUMP',
  'MODEL DB-65/26',
  '20 HP',
  'HEAD 26 m',
  '2900 RPM',
];

const BOILER_PLATE = [
  'THERMAX LIMITED',
  'STEAM BOILER IBR 1950',
  'CAPACITY 4 TPH',
  'WORKING PRESSURE 10.54 kg/cm2',
  'YEAR OF MFG 2021',
];

const COMPRESSOR_PLATE = [
  'ELGI EQUIPMENTS LTD',
  'SCREW AIR COMPRESSOR',
  'MODEL EN-22',
  '22 kW',
  'FAD 130 CFM',
  '2018',
];

describe('guessAssetType', () => {
  it('reads a motor plate as a motor', () => {
    expect(guessAssetType(MOTOR_PLATE)?.value).toBe('motor');
  });

  it('reads a pump as a pump, not as the motor driving it', () => {
    expect(guessAssetType(HP_ONLY_PLATE)?.value).toBe('pump');
  });

  it('reads a boiler as a boiler', () => {
    expect(guessAssetType(BOILER_PLATE)?.value).toBe('boiler');
  });

  it('reads a compressor as a compressor', () => {
    expect(guessAssetType(COMPRESSOR_PLATE)?.value).toBe('compressor');
  });

  it('quotes the words it decided on', () => {
    expect(guessAssetType(BOILER_PLATE)?.evidence?.toLowerCase()).toContain('boiler');
  });

  it('guesses nothing from text with no equipment words', () => {
    expect(guessAssetType(['Plot 22', 'GIDC Vapi'])).toBeNull();
  });
});

describe('readNameplate', () => {
  it('prefers the stated kW over the stated HP', () => {
    const reading = readNameplate(MOTOR_PLATE);
    expect(reading.ratedPowerKw).toBe(7.5);
  });

  it('converts HP to kW when the plate states only HP', () => {
    const reading = readNameplate(HP_ONLY_PLATE);
    // 20 HP x 0.7457
    expect(reading.ratedPowerKw).toBeCloseTo(14.91, 1);
    const converted = reading.fields.find((field) => field.field === 'rated_power_kw');
    expect(converted?.evidence_text).toContain('converted');
  });

  it('reads speed, voltage, efficiency and efficiency class', () => {
    const reading = readNameplate(MOTOR_PLATE);
    const byField = Object.fromEntries(reading.fields.map((f) => [f.field, f.value]));
    expect(byField.rpm).toBe(1440);
    expect(byField.voltage_v).toBe(415);
    expect(byField.efficiency_pct).toBe(89.4);
    expect(byField.ie_class).toBe('IE3');
  });

  it('reads the year from a month/year stamp', () => {
    expect(readNameplate(MOTOR_PLATE).yearInstalled).toBe(2019);
    expect(readNameplate(BOILER_PLATE).yearInstalled).toBe(2021);
  });

  it('reads a known maker from anywhere on the plate', () => {
    expect(readNameplate(MOTOR_PLATE).manufacturer?.toLowerCase()).toContain('crompton');
    expect(readNameplate(COMPRESSOR_PLATE).manufacturer?.toLowerCase()).toContain('elgi');
  });

  it('reads a model code', () => {
    expect(readNameplate(HP_ONLY_PLATE).model).toBe('DB-65/26');
    expect(readNameplate(COMPRESSOR_PLATE).model).toBe('EN-22');
  });

  it('reads a boiler steam rating in TPH', () => {
    const reading = readNameplate(BOILER_PLATE);
    expect(reading.fields.find((field) => field.field === 'steam_tph')?.value).toBe(4);
  });

  it('marks everything as needing confirmation and quotes its source line', () => {
    const reading = readNameplate(MOTOR_PLATE);
    expect(reading.fields.length).toBeGreaterThan(4);
    reading.fields.forEach((field) => {
      expect(field.needs_confirmation).toBe(true);
      expect(field.evidence_text).toBeTruthy();
    });
  });

  it('rejects an efficiency that cannot be one', () => {
    const reading = readNameplate(['EFF 890 %']);
    expect(reading.efficiencyPct).toBeNull();
  });

  it('rejects a year before industrial motors carried IE classes', () => {
    expect(readNameplate(['YEAR 1947']).yearInstalled).toBeNull();
  });

  it('returns empty rather than inventing a rating', () => {
    const reading = readNameplate(['SERIAL PLATE UNREADABLE']);
    expect(reading.ratedPowerKw).toBeNull();
  });
});

describe('readNameplate with a two-column plate split by OCR', () => {
  // ML Kit returns a two-column plate as separate label and value lines when
  // the columns are far apart. This is the layout the parser used to miss
  // entirely.
  const SPLIT_PLATE = [
    'CROMPTON GREAVES LIMITED',
    '3 PHASE INDUCTION MOTOR',
    'TYPE',
    'NG 132M',
    'kW',
    '7.5',
    'VOLTS',
    '415',
    'RPM',
    '1440',
    'EFF',
    '89.4 %',
    'HP',
    '10',
    'MFG',
    '06/2019',
  ];

  it('pairs a label with the value on the next line', () => {
    const reading = readNameplate(SPLIT_PLATE);
    expect(reading.ratedPowerKw).toBe(7.5);
    const byField = Object.fromEntries(reading.fields.map((f) => [f.field, f.value]));
    expect(byField.rpm).toBe(1440);
    expect(byField.voltage_v).toBe(415);
    expect(byField.efficiency_pct).toBe(89.4);
    expect(reading.yearInstalled).toBe(2019);
  });

  it('scores a paired reading below the same value read on one line', () => {
    const paired = readNameplate(['kW', '7.5']);
    const single = readNameplate(['kW 7.5']);
    const pairedField = paired.fields.find((f) => f.field === 'rated_power_kw');
    const singleField = single.fields.find((f) => f.field === 'rated_power_kw');
    expect(pairedField?.value).toBe(7.5);
    expect(pairedField!.confidence).toBeLessThan(singleField!.confidence);
  });

  it('does not pair two unrelated lines that both carry numbers', () => {
    // "48500" is not the voltage of the line above it.
    const reading = readNameplate(['SERIAL 22119', '48500']);
    expect(reading.ratedPowerKw).toBeNull();
  });
});
