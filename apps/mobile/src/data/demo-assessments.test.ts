/**
 * The bundled demonstration payload.
 *
 * This is what the installed APK falls back to when no backend is in reach, so
 * every analytical module reads it directly. If a key the modules depend on is
 * missing, the app shows an empty panel on a factory floor with no way to
 * diagnose it - so the shape is asserted here instead.
 */

import demoAssessments from './demo-assessments.json';
import type { AssessmentResult } from '../api/types';

type Entry = { profile: Record<string, unknown>; result: AssessmentResult; sector_label: string };
const DEMO = demoAssessments as unknown as Record<string, Entry>;
const sectors = Object.keys(DEMO);

describe('bundled demonstration assessments', () => {
  it('ships more than one sector, including the hero plant', () => {
    expect(sectors.length).toBeGreaterThan(1);
    expect(sectors).toContain('textile_dyeing');
  });

  it.each(sectors)('%s carries every panel the modules read', (key) => {
    const { result, sector_label: sectorLabel } = DEMO[key];
    expect(typeof sectorLabel).toBe('string');
    expect(result.headline).toBeDefined();
    expect(result.footprint).toBeDefined();
    expect(result.leaks).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.compliance).toBeDefined();
    expect(result.versions).toBeDefined();
  });

  it.each(sectors)('%s scope split adds up to the total', (key) => {
    const { footprint } = DEMO[key].result;
    const summed =
      footprint.scope1_tco2e + footprint.scope2_tco2e + footprint.scope3_tco2e;
    // The engine rounds each scope, so agreement is to within a tonne.
    expect(Math.abs(summed - footprint.total_tco2e)).toBeLessThan(1);
    const shares =
      footprint.scope_split_pct.scope1 +
      footprint.scope_split_pct.scope2 +
      footprint.scope_split_pct.scope3;
    expect(Math.abs(shares - 100)).toBeLessThan(1.5);
  });

  it.each(sectors)('%s never shows a point estimate without its band', (key) => {
    const { footprint } = DEMO[key].result;
    expect(footprint.total_range.low).toBeLessThanOrEqual(footprint.total_range.base);
    expect(footprint.total_range.high).toBeGreaterThanOrEqual(footprint.total_range.base);
    expect(footprint.uncertainty_pct).toBeGreaterThan(0);
  });

  it.each(sectors)('%s carries a cost curve the MACC chart can draw', (key) => {
    const { recommendations } = DEMO[key].result;
    expect(Array.isArray(recommendations.macc_curve)).toBe(true);
    expect(recommendations.macc_curve.length).toBeGreaterThan(0);
    recommendations.macc_curve.forEach((bar) => {
      expect(typeof bar.id).toBe('string');
      expect(typeof bar.width).toBe('number');
      expect(typeof bar.height).toBe('number');
      expect(bar.cash_positive).toBe(bar.height < 0);
    });
  });

  it.each(sectors)('%s portfolio modes are all present', (key) => {
    const { portfolio } = DEMO[key].result.recommendations;
    ['all', 'cash_positive_only', 'quick_wins'].forEach((mode) => {
      expect(portfolio[mode]).toBeDefined();
    });
    // A cash-positive portfolio can never be bigger than the full one.
    expect(portfolio.cash_positive_only.abatement_tco2e).toBeLessThanOrEqual(
      portfolio.all.abatement_tco2e + 0.01,
    );
  });

  it.each(sectors)('%s flow links point at nodes that exist', (key) => {
    const { sankey } = DEMO[key].result;
    expect(sankey).toBeDefined();
    sankey?.links.forEach((link) => {
      expect(sankey.nodes[link.source]).toBeDefined();
      expect(sankey.nodes[link.target]).toBeDefined();
      expect(link.value).toBeGreaterThan(0);
    });
  });

  it.each(sectors)('%s is labelled as a demonstration, not a measurement', (key) => {
    expect(DEMO[key].result.is_demo).toBe(true);
  });

  /**
   * A data-quality score needs the stored profile and activity records, which
   * an unpersisted engine run does not have. The modules must therefore print
   * "Not supplied" rather than reading through to a score - this asserts the
   * absence deliberately, so nobody later assumes the panel is there.
   */
  it.each(sectors)('%s supplies no data-quality panel, by design', (key) => {
    expect(DEMO[key].result.data_quality).toBeUndefined();
  });

  it('gives every blocked intervention a reason', () => {
    sectors.forEach((key) => {
      DEMO[key].result.recommendations.blocked.forEach((item) => {
        expect(item.reason.length).toBeGreaterThan(0);
      });
    });
  });

  it('never prices a recommendation without an abatement figure', () => {
    sectors.forEach((key) => {
      DEMO[key].result.recommendations.recommendations.forEach((rec) => {
        expect(typeof rec.abatement_tco2e).toBe('number');
        expect(typeof rec.lcoa_inr_per_tco2e).toBe('number');
        expect(rec.cash_positive).toBe(rec.lcoa_inr_per_tco2e < 0);
      });
    });
  });
});
