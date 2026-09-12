/**
 * The overview, rendered against the payload the APK actually ships.
 *
 * This is the test that would have caught a module reading a panel the
 * unpersisted engine result does not carry: it mounts the real screen over the
 * real bundled fixture, with only navigation and the workspace plumbing
 * stubbed.
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import demoAssessments from '../data/demo-assessments.json';
import OverviewScreen from './OverviewScreen';
import { scopeRows } from '../workspace/WorkspaceContext';
import type { AssessmentResult } from '../api/types';

const DEMO = demoAssessments as unknown as Record<
  string,
  { result: AssessmentResult; sector_label: string }
>;
const hero = DEMO.textile_dyeing;

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: {} }),
}));

const mockWorkspace = {
  ready: true,
  source: 'demo' as const,
  isDemo: true,
  factories: { data: [], isLoading: false } as never,
  factory: null,
  factoryId: null,
  selectFactory: jest.fn(),
  demoSector: 'textile_dyeing',
  demoSectors: [],
  selectDemoSector: jest.fn(),
  assessment: hero.result,
  assessmentId: null,
  assessmentDetail: {} as never,
  plantName: 'Tirupur Knitwear Dyeing Unit',
  sectorLabel: hero.sector_label,
  run: { mutate: jest.fn(), isPending: false, isError: false } as never,
  refresh: jest.fn(),
  loading: false,
  refreshing: false,
  toast: '',
  setToast: jest.fn(),
};

jest.mock('../workspace/WorkspaceContext', () => {
  const actual = jest.requireActual('../workspace/WorkspaceContext');
  return {
    ...actual,
    useWorkspace: () => mockWorkspace,
  };
});

describe('OverviewScreen on the bundled demonstration', () => {
  it('renders the whole module without a missing panel', async () => {
    const { getByText } = await render(<OverviewScreen />);
    expect(getByText('Assessment overview')).toBeTruthy();
    expect(getByText('YOUR CASH-POSITIVE OPPORTUNITY')).toBeTruthy();
    expect(getByText('ANNUAL CARBON FOOTPRINT')).toBeTruthy();
  });

  it('says plainly that the figures are a demonstration', async () => {
    const { getByText } = await render(<OverviewScreen />);
    expect(getByText('DEMONSTRATION DATA')).toBeTruthy();
    expect(getByText(/not measurements from your plant/)).toBeTruthy();
  });

  it('shows the engine footprint, not a rounded-off zero', async () => {
    const { getByText } = await render(<OverviewScreen />);
    const total = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
      hero.result.footprint.total_tco2e,
    );
    expect(getByText(total)).toBeTruthy();
  });

  it('carries the claim boundary that must travel with every result', async () => {
    const { getByText } = await render(<OverviewScreen />);
    expect(getByText(/not a BEE-accredited audit|Screening and decision support/i)).toBeTruthy();
  });

  it('offers the numbered sections in the order the web app uses', async () => {
    const { getByText } = await render(<OverviewScreen />);
    expect(getByText('01 / DIAGNOSE')).toBeTruthy();
    expect(getByText('02 / ACT')).toBeTruthy();
    expect(getByText('03 / INVEST')).toBeTruthy();
    expect(getByText('04 / PREPARE')).toBeTruthy();
  });
});

describe('scopeRows', () => {
  it('returns the three scopes with their shares', () => {
    const rows = scopeRows(hero.result);
    expect(rows.map((row) => row.scope)).toEqual(['1', '2', '3']);
    expect(rows[0].total).toBe(hero.result.footprint.scope1_tco2e);
  });

  it('returns nothing when there is no assessment, rather than throwing', () => {
    expect(scopeRows(null)).toEqual([]);
  });
});
