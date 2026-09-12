/** Navigation parameter lists, shared so no screen guesses a route name. */

import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParams = {
  /** The assessment overview: the web app's landing module. */
  Home: undefined;
  /** The module hub: the web app's sidebar, thumb-sized. */
  Hub: undefined;
  Capture: undefined;
  Alerts: undefined;
  Account: undefined;
};

export type RootStackParams = {
  Tabs: NavigatorScreenParams<TabParams> | undefined;

  // Analytical modules, one per web route.
  PlantData: undefined;
  Footprint: { scope?: string } | undefined;
  LeakPoints: undefined;
  Scenarios: undefined;
  CircularActions: { view?: string; stream?: string } | undefined;
  Portfolio: { mode?: string } | undefined;
  Marketplace: { interventionId?: string; title?: string } | undefined;
  Logistics: undefined;
  CircularNetwork: undefined;
  Compliance: undefined;
  Methodology: undefined;
  Story: undefined;

  // Capture and plant management.
  Factories: undefined;
  CreateFactory: undefined;
  Factory: { factoryId: string; factoryName: string };
  Onboarding: { factoryId: string; factoryName: string; sector?: string };
  BillScan: { factoryId: string; factoryName: string };
  EquipmentScan: { factoryId: string; factoryName: string };
  EvidenceCapture: {
    factoryId: string;
    factoryName: string;
    targetType?: string;
    targetId?: string;
  };
  QuickResults: { factoryId: string; factoryName: string; assessmentId?: string };
};
