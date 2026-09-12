/**
 * Formatting rules.
 *
 * These matter more than they look: a figure that reads differently on the
 * phone than on the dashboard makes a user doubt both, and "Unavailable" has to
 * stay visible rather than quietly becoming a zero.
 */

import {
  describePercentile,
  formatPayback,
  label,
  money,
  number,
  payback,
  percent,
} from './format';

describe('money', () => {
  it('writes crore and lakh the way an Indian plant owner reads them', () => {
    expect(money(46567700)).toBe('₹4.66 Cr');
    expect(money(250000)).toBe('₹2.5 L');
    expect(money(4200)).toBe('₹4,200');
  });

  it('keeps the sign on a cost', () => {
    expect(money(-28088)).toBe('−₹28,088');
  });

  it('says a missing figure is missing instead of showing zero', () => {
    expect(money(null)).toBe('Unavailable');
    expect(money(undefined)).toBe('Unavailable');
    expect(money(Number.NaN)).toBe('Unavailable');
  });

  it('shows a genuine zero as zero', () => {
    expect(money(0)).toBe('₹0');
  });
});

describe('number', () => {
  it('groups in the Indian system', () => {
    expect(number(2406861)).toBe('24,06,861');
  });

  it('respects the requested precision', () => {
    expect(number(20.94, 1)).toBe('20.9');
    expect(number(20.94)).toBe('21');
  });

  it('distinguishes zero from unavailable', () => {
    expect(number(0)).toBe('0');
    expect(number(null)).toBe('Unavailable');
  });
});

describe('payback', () => {
  it('uses months inside two years and years beyond', () => {
    expect(payback(0.98)).toBe('12 mo');
    expect(payback(3.26)).toBe('3.3 yr');
  });

  it('does not invent a payback that the engine did not supply', () => {
    expect(payback(null)).toBe('Unavailable');
  });

  it('is explicit in the long form that a net cost has no payback', () => {
    expect(formatPayback(null)).toBe('No payback - this costs money');
    expect(formatPayback(0)).toBe('Immediate');
  });
});

describe('percent', () => {
  it('keeps one decimal by default', () => {
    expect(percent(25)).toBe('25%');
    expect(percent(20.94)).toBe('20.9%');
    expect(percent(null)).toBe('Unavailable');
  });
});

describe('label', () => {
  it('turns an engine key into prose', () => {
    expect(label('cash_positive_only')).toBe('Cash Positive Only');
    expect(label('scope12_tco2e_per_t')).toBe('Scope12 Tco2e Per T');
  });
});

describe('describePercentile', () => {
  it('reads a low percentile as good, because lower intensity is better', () => {
    expect(describePercentile(12)).toContain('Best quartile');
    expect(describePercentile(40)).toContain('Better than the sector median');
    expect(describePercentile(60)).toContain('Worse than median');
    expect(describePercentile(86)).toContain('Worst quartile');
  });

  it('does not claim a comparison it does not have', () => {
    expect(describePercentile(null)).toBe('No peer comparison available');
  });
});
