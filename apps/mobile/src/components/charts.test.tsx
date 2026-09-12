/**
 * Chart behaviour.
 *
 * A chart with no data must say why rather than render an empty box, and the
 * MACC must keep the one rule the whole screen rests on: a bar below the zero
 * line is cash positive.
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import { BenchmarkStrip, MaccChart, ScopeBand, StreamBars } from './charts';
import type { MaccBar } from '../api/types';

const curve: MaccBar[] = [
  {
    id: 'GENSET_DISPLACEMENT',
    name: 'Diesel genset displacement with solar plus storage',
    category: 'energy',
    x_start: 0,
    width: 61.91,
    standalone: 61.91,
    height: -28088,
    cash_positive: true,
  },
  {
    id: 'HEAT_RECOVERY',
    name: 'Boiler economiser heat recovery',
    category: 'process',
    x_start: 61.91,
    width: 240.5,
    standalone: 240.5,
    height: 1450,
    cash_positive: false,
  },
];

describe('MaccChart', () => {
  it('explains itself when the engine priced nothing', async () => {
    const { getByText } = await render(<MaccChart curve={[]} />);
    expect(getByText('Cost curve unavailable')).toBeTruthy();
  });

  it('prompts the reader to tap a bar, and names both cost directions', async () => {
    const { getByText } = await render(<MaccChart curve={curve} />);
    expect(getByText(/Tap a bar/)).toBeTruthy();
    expect(getByText('Cash positive')).toBeTruthy();
    expect(getByText('Net cost')).toBeTruthy();
  });

  it('ignores a bar with no width, which would be a zero-tonne intervention', async () => {
    const withEmpty: MaccBar[] = [
      ...curve,
      { ...curve[0], id: 'EMPTY', width: 0, standalone: 0 },
    ];
    const { queryByText } = await render(<MaccChart curve={withEmpty} />);
    // Still a chart, not the empty state.
    expect(queryByText('Cost curve unavailable')).toBeNull();
  });
});

describe('ScopeBand', () => {
  it('shows every scope with its share and tonnes', async () => {
    const { getByText } = await render(
      <ScopeBand
        scopes={[
          { scope: '1', total: 6742, share_pct: 28 },
          { scope: '2', total: 1890, share_pct: 7.9 },
          { scope: '3', total: 15436, share_pct: 64.1 },
        ]}
      />,
    );
    expect(getByText('Scope 1')).toBeTruthy();
    expect(getByText('Scope 2')).toBeTruthy();
    expect(getByText('Scope 3')).toBeTruthy();
    expect(getByText('64%')).toBeTruthy();
  });
});

describe('StreamBars', () => {
  it('says what is missing when nothing is on record', async () => {
    const { getByText } = await render(<StreamBars streams={[]} />);
    expect(getByText('No streams recorded')).toBeTruthy();
  });

  it('orders the biggest stream first and keeps the scope visible', async () => {
    const { getByText } = await render(
      <StreamBars
        streams={[
          { key: 'electricity', label: 'Purchased electricity', scope: 2, tco2e: 1890, share_pct: 7.9 },
          { key: 'material_COTTON_CONV', label: 'Cotton yarn', scope: 3, tco2e: 14575, share_pct: 60.6 },
        ]}
      />,
    );
    expect(getByText('Cotton yarn')).toBeTruthy();
    expect(getByText(/Scope 3/)).toBeTruthy();
  });
});

describe('BenchmarkStrip', () => {
  it('labels both ends so a percentile cannot be read backwards', async () => {
    const { getByText } = await render(
      <BenchmarkStrip percentile={86} p25={2.1} p50={3.0} p75={4.4} actual={5.2} />,
    );
    expect(getByText('BEST QUARTILE')).toBeTruthy();
    expect(getByText('WORST QUARTILE')).toBeTruthy();
  });

  it('prints a dash rather than a zero for a quartile it was not given', async () => {
    const { getByText } = await render(<BenchmarkStrip percentile={50} />);
    expect(getByText(/p25 - \| p50 - \| p75 -/)).toBeTruthy();
  });
});
