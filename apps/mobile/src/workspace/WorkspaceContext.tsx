/**
 * The workspace.
 *
 * This is the mobile counterpart of the web app's `useWorkspace`: one place
 * that knows which plant is being looked at and which engine result the
 * analytical modules should read. Every module screen reads from here rather
 * than fetching its own assessment, so the whole app moves together when the
 * plant is switched.
 *
 * Two sources, same shape:
 *
 *  - `live`  - the signed-in plant's persisted assessment from the API.
 *  - `demo`  - a bundled engine result, the same fallback the web app ships in
 *              `src/data/assessments.json`. It is what makes the installed APK
 *              usable on a factory floor with no backend in reach, and it is
 *              always labelled as a demonstration, never as a measurement.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { assessments as assessmentsApi, factories as factoriesApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import type { Assessment, AssessmentResult, Factory } from '../api/types';
import demoAssessments from '../data/demo-assessments.json';

type DemoEntry = {
  profile: Record<string, unknown>;
  result: AssessmentResult;
  sector_label: string;
};

const DEMO = demoAssessments as unknown as Record<string, DemoEntry>;
export const DEMO_SECTORS = Object.keys(DEMO);
const HERO_SECTOR = 'textile_dyeing';

const ACTIVE_FACTORY_KEY = 'prangara.activeFactoryId';
const DEMO_SECTOR_KEY = 'prangara.demoSector';

export type WorkspaceSource = 'live' | 'demo';

function useWorkspaceState() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [demoSector, setDemoSector] = useState<string>(HERO_SECTOR);
  const [preferDemo, setPreferDemo] = useState(false);
  const [restored, setRestored] = useState(false);
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedFactory, storedSector] = await Promise.all([
          AsyncStorage.getItem(ACTIVE_FACTORY_KEY),
          AsyncStorage.getItem(DEMO_SECTOR_KEY),
        ]);
        if (cancelled) return;
        if (storedFactory) setFactoryId(storedFactory);
        if (storedSector && DEMO[storedSector]) setDemoSector(storedSector);
      } finally {
        if (!cancelled) setRestored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const factories = useQuery({
    queryKey: ['factories'],
    queryFn: () => factoriesApi.list(),
    enabled: Boolean(me),
  });

  // Fall back to the first plant the account can see rather than showing an
  // empty workspace to someone who has one.
  const activeFactory: Factory | null = useMemo(() => {
    const list = factories.data ?? [];
    if (!list.length) return null;
    return list.find((f) => f.id === factoryId) ?? list[0];
  }, [factories.data, factoryId]);

  const assessmentId = activeFactory?.latest_assessment_id ?? null;

  const detail = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => assessmentsApi.get(assessmentId as string),
    enabled: Boolean(assessmentId) && Boolean(me),
  });

  const liveResult = detail.data?.result ?? null;
  const source: WorkspaceSource = !preferDemo && liveResult ? 'live' : 'demo';
  const demoEntry = DEMO[demoSector] ?? DEMO[HERO_SECTOR];
  const assessment: AssessmentResult | null = source === 'live' ? liveResult : demoEntry.result;

  const selectFactory = useCallback((id: string | null) => {
    setFactoryId(id);
    setPreferDemo(false);
    AsyncStorage.setItem(ACTIVE_FACTORY_KEY, id ?? '').catch(() => undefined);
  }, []);

  const selectDemoSector = useCallback((key: string) => {
    if (!DEMO[key]) return;
    setDemoSector(key);
    setPreferDemo(true);
    AsyncStorage.setItem(DEMO_SECTOR_KEY, key).catch(() => undefined);
  }, []);

  const run = useMutation({
    mutationFn: () => {
      if (!activeFactory) throw new Error('Choose a factory before running an assessment.');
      return assessmentsApi.run(activeFactory.id, 'From the mobile companion');
    },
    onSuccess: (next: Assessment) => {
      queryClient.setQueryData(['assessment', next.id], next);
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setPreferDemo(false);
      setToast('Assessment complete. Your results are ready.');
    },
  });

  const refresh = useCallback(() => {
    factories.refetch();
    if (assessmentId) detail.refetch();
  }, [factories, detail, assessmentId]);

  /**
   * What the analytical modules title themselves with. In demo mode that is
   * the bundled plant's name, so no screen claims a real plant's numbers.
   */
  const plantName =
    source === 'live'
      ? (activeFactory?.name ?? 'Your plant')
      : (assessment?.profile?.name ?? demoEntry.sector_label);

  const sectorLabel =
    source === 'live'
      ? (assessment?.profile?.sector_label ?? activeFactory?.sector ?? '')
      : demoEntry.sector_label;

  return {
    ready: restored,
    source,
    isDemo: source === 'demo',
    factories,
    factory: activeFactory,
    factoryId: activeFactory?.id ?? null,
    selectFactory,
    demoSector,
    demoSectors: DEMO_SECTORS.map((key) => ({ key, label: DEMO[key].sector_label })),
    selectDemoSector,
    assessment,
    assessmentId: source === 'live' ? assessmentId : null,
    assessmentDetail: detail,
    plantName,
    sectorLabel,
    run,
    refresh,
    loading: factories.isLoading || detail.isLoading,
    refreshing: factories.isRefetching || detail.isRefetching,
    toast,
    setToast,
  };
}

export type WorkspaceValue = ReturnType<typeof useWorkspaceState>;

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceState();
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside a WorkspaceProvider.');
  return value;
}

/** Scope rows in the shape the charts want, derived once. */
export function scopeRows(result: AssessmentResult | null) {
  if (!result) return [];
  return [
    {
      scope: '1',
      total: result.footprint.scope1_tco2e,
      share_pct: result.footprint.scope_split_pct.scope1,
    },
    {
      scope: '2',
      total: result.footprint.scope2_tco2e,
      share_pct: result.footprint.scope_split_pct.scope2,
    },
    {
      scope: '3',
      total: result.footprint.scope3_tco2e,
      share_pct: result.footprint.scope_split_pct.scope3,
    },
  ];
}
