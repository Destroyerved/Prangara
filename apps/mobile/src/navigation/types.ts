/** Navigation parameter lists, shared so no screen guesses a route name. */

export type RootStackParams = {
  Tabs: undefined;
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

export type TabParams = {
  Factories: undefined;
  Capture: undefined;
  Alerts: undefined;
  Account: undefined;
};
