/**
 * Rebuilding printed rows from recogniser geometry.
 *
 * The fixture is the layout that defeated the reader on a real phone: a
 * two-column nameplate whose labels and values came back as separate lines in
 * separate blocks, so "kW" and "7.5" never met.
 */

import { expandLines, rowsFromGeometry, type PositionedLine } from './text';

const plate: PositionedLine[] = [
  { text: 'kW', x: 100, y: 250, height: 40 },
  { text: 'VOLTS', x: 100, y: 330, height: 40 },
  { text: 'RPM', x: 100, y: 410, height: 40 },
  { text: '7.5', x: 280, y: 252, height: 40 },
  { text: '415', x: 280, y: 332, height: 40 },
  { text: '1440', x: 280, y: 412, height: 40 },
  { text: 'HP', x: 700, y: 251, height: 40 },
  { text: '10', x: 880, y: 253, height: 40 },
];

describe('rowsFromGeometry', () => {
  it('reassembles a row from columns the recogniser reported separately', () => {
    expect(rowsFromGeometry(plate)).toEqual(['kW 7.5 HP 10', 'VOLTS 415', 'RPM 1440']);
  });

  it('keeps rows in printed order, top to bottom', () => {
    const rows = rowsFromGeometry(plate);
    expect(rows[0]).toContain('kW');
    expect(rows[rows.length - 1]).toContain('RPM');
  });

  it('does not merge rows that are a full line apart', () => {
    const rows = rowsFromGeometry(plate);
    expect(rows.some((row) => row.includes('415') && row.includes('1440'))).toBe(false);
  });

  it('falls back to the lines themselves when no geometry was supplied', () => {
    const noHeights: PositionedLine[] = [
      { text: 'kW 7.5', x: 0, y: 0, height: 0 },
      { text: 'RPM 1440', x: 0, y: 0, height: 0 },
    ];
    expect(rowsFromGeometry(noHeights)).toEqual(['kW 7.5', 'RPM 1440']);
  });

  it('handles a single line without inventing a row', () => {
    expect(rowsFromGeometry([{ text: 'ONLY', x: 0, y: 0, height: 10 }])).toEqual(['ONLY']);
  });

  it('ignores empty text rather than emitting blank rows', () => {
    const withBlank: PositionedLine[] = [
      { text: '  ', x: 0, y: 0, height: 30 },
      { text: 'kW 7.5', x: 0, y: 0, height: 30 },
    ];
    expect(rowsFromGeometry(withBlank)).toEqual(['kW 7.5']);
  });
});

describe('expandLines', () => {
  it('pairs a label with the numeric line after it', () => {
    const candidates = expandLines(['Units Consumed', '48,500 kWh']);
    expect(candidates.map((candidate) => candidate.text)).toContain('Units Consumed 48,500 kWh');
  });

  it('marks the pair as weaker than a line read as printed', () => {
    const candidates = expandLines(['Units Consumed', '48,500 kWh']);
    expect(candidates.find((candidate) => candidate.paired)).toBeTruthy();
    expect(candidates.filter((candidate) => !candidate.paired)).toHaveLength(2);
  });

  it('does not pair two lines that both carry numbers', () => {
    const candidates = expandLines(['SERIAL 22119', '48500']);
    expect(candidates.every((candidate) => !candidate.paired)).toBe(true);
  });
});
