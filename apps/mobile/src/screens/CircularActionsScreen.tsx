/**
 * Circular actions. The web app's `/actions`.
 *
 * Two halves, both necessary. The recommendations the engine priced, and the
 * ones it refused: a blocked intervention with its reason is as much of a
 * result as a cheap one, and hiding it would make the list look better than the
 * plant is.
 *
 * When the plant is live, the tracker at the top is writable: an action can be
 * moved along its status so the floor and the dashboard agree.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { actions as actionsApi } from '../api/endpoints';
import {
  Badge,
  DetailRows,
  GlassPanel,
  Metrics,
  ModuleScreen,
  PageHeading,
  SectionHeading,
  Segmented,
  TrustBar,
} from '../components/layout';
import { Button, EmptyState, Loading, Note } from '../components/ui';
import { label as humanise, money, number, payback } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { Recommendation } from '../api/types';
import type { RootStackParams } from '../navigation/types';

type ActionView = 'all' | 'cash_positive' | 'quick_wins';

/** The status ladder the backend accepts, in the order work actually moves. */
const STATUS_FLOW = [
  'IDENTIFIED',
  'SELECTED',
  'RFQ',
  'APPROVED',
  'IMPLEMENTING',
  'VERIFYING',
  'VERIFIED',
] as const;

function nextStatus(current: string): string | null {
  const index = STATUS_FLOW.indexOf(current as (typeof STATUS_FLOW)[number]);
  if (index < 0 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

function isQuickWin(rec: Recommendation) {
  return rec.payback_yrs !== null && rec.payback_yrs <= 2 && rec.difficulty <= 2;
}

export default function CircularActionsScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'CircularActions'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const result = workspace.assessment;
  const factoryId = workspace.source === 'live' ? workspace.factoryId : null;
  const [view, setView] = useState<ActionView>(
    route.params?.view === 'quick_wins' ? 'quick_wins' : 'all',
  );
  const [error, setError] = useState<string | null>(null);

  const tracked = useQuery({
    queryKey: ['actions', factoryId],
    queryFn: () => actionsApi.list(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      actionsApi.update(id, { status }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['actions', factoryId] });
    },
    onError: (exception) => setError(describeError(exception)),
  });

  if (!result) {
    return (
      <ModuleScreen>
        <PageHeading
          eyebrow="ACT / CIRCULAR ACTION ENGINE"
          title="Good for the numbers."
          description="Compare interventions that reduce cost, carbon, or both."
        />
        <EmptyState
          title="No interventions yet"
          body="The action engine runs on an assessment. Add plant data and run one."
        />
      </ModuleScreen>
    );
  }

  const all = result.recommendations.recommendations;
  const streamFilter = route.params?.stream;
  const base = streamFilter
    ? all.filter(
        (rec) =>
          rec.target_stream_label?.toLowerCase().includes(streamFilter.toLowerCase()) ||
          rec.id.toLowerCase().includes(streamFilter.toLowerCase()),
      )
    : all;
  const shown =
    view === 'all'
      ? base
      : view === 'cash_positive'
        ? base.filter((rec) => rec.cash_positive)
        : base.filter(isQuickWin);
  const blocked = result.recommendations.blocked ?? [];
  const capped = all.filter((rec) => rec.substitution_capped && rec.restriction_note);

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ACT / CIRCULAR ACTION ENGINE"
        title="Good for the numbers."
        description="Compare interventions that reduce cost, carbon, or both."
        meta={
          streamFilter
            ? `${workspace.plantName} · filtered to ${streamFilter}`
            : workspace.plantName
        }
      />

      {error ? <Note tone="warning">{error}</Note> : null}

      <Metrics
        items={[
          { label: 'Interventions evaluated', value: number(result.recommendations.count) },
          { label: 'Cash positive', value: number(all.filter((r) => r.cash_positive).length) },
          { label: 'Quick wins', value: number(all.filter(isQuickWin).length) },
          { label: 'Ruled out', value: number(blocked.length) },
        ]}
      />

      {factoryId ? (
        <>
          <SectionHeading
            index="TRACKER"
            title="What is already moving"
            description="Advance an action as the work happens on the floor."
          />
          {tracked.isLoading ? <Loading label="Loading tracked actions" /> : null}
          {tracked.data?.length ? (
            tracked.data.map((action) => {
              const next = nextStatus(action.status);
              return (
                <GlassPanel key={action.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                      {action.name}
                    </Text>
                    <Badge tone={action.status === 'VERIFIED' ? 'positive' : 'accent'}>
                      {humanise(action.status)}
                    </Badge>
                  </View>
                  <View style={{ marginTop: space.sm }}>
                    <DetailRows
                      rows={[
                        [
                          'Expected abatement',
                          `${number(action.expected_abatement_tco2e)} tCO2e/yr`,
                        ],
                        ['Expected capex', money(action.expected_capex_inr)],
                        [
                          'Expected benefit',
                          `${money(action.expected_annual_benefit_inr)} / yr`,
                        ],
                      ]}
                    />
                  </View>
                  {action.was_capped && action.restriction_note ? (
                    <Note tone="warning">{action.restriction_note}</Note>
                  ) : null}
                  {next ? (
                    <Button
                      title={`Move to ${humanise(next)}`}
                      variant="secondary"
                      loading={advance.isPending && advance.variables?.id === action.id}
                      onPress={() => advance.mutate({ id: action.id, status: next })}
                      style={{ marginTop: space.md }}
                    />
                  ) : (
                    <Note>
                      Verified against a measured baseline. Nothing further to advance here.
                    </Note>
                  )}
                </GlassPanel>
              );
            })
          ) : tracked.isLoading ? null : (
            <EmptyState
              title="Nothing tracked yet"
              body="Running an assessment files every priced intervention here, ready to be selected."
            />
          )}
        </>
      ) : null}

      <SectionHeading
        index="RECOMMENDATIONS"
        title="What the engine would do next"
        description="Ranked by annual net benefit. Every figure is engine output."
      />
      <View style={{ marginBottom: space.md }}>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'all', label: 'All' },
            { value: 'cash_positive', label: 'Cash positive' },
            { value: 'quick_wins', label: 'Quick wins' },
          ]}
        />
      </View>

      {shown.length ? (
        shown
          .slice()
          .sort((a, b) => b.net_annual_benefit_inr - a.net_annual_benefit_inr)
          .map((rec) => (
            <GlassPanel key={rec.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                  {rec.name}
                </Text>
                <Badge tone={rec.cash_positive ? 'positive' : 'cost'}>
                  {rec.cash_positive ? 'CASH POSITIVE' : 'NET COST'}
                </Badge>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <Badge tone="neutral">{humanise(rec.category)}</Badge>
              </View>
              <Text style={{ ...typeScale.body, color: colour.muted, marginTop: space.sm }}>
                {rec.description}
              </Text>
              {rec.why ? (
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 6 }}>
                  Why here: {rec.why}
                </Text>
              ) : null}
              <View style={{ marginTop: space.md }}>
                <DetailRows
                  rows={[
                    ['Target stream', rec.target_stream_label || 'Not specified'],
                    ['Abatement', `${number(rec.portfolio_abatement_tco2e)} tCO2e/yr`],
                    ['Capex', money(rec.capex_inr)],
                    ['Annual net benefit', `${money(rec.net_annual_benefit_inr)} / yr`],
                    ['Payback', payback(rec.payback_yrs)],
                    ['Cost of abatement', `${money(rec.lcoa_inr_per_tco2e)} / tCO2e`],
                    ['Difficulty', `${number(rec.difficulty)} of 5`],
                    ['Disruption', `${number(rec.disruption_days)} days`],
                  ]}
                />
              </View>
              {rec.evidence ? (
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: space.sm }}>
                  Evidence: {rec.evidence}
                </Text>
              ) : null}
              {rec.caveats?.length ? (
                <Note tone="warning">{rec.caveats.join(' ')}</Note>
              ) : null}
              <Button
                title="Request quotes"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('Marketplace', { interventionId: rec.id, title: rec.name })
                }
                style={{ marginTop: space.md }}
              />
            </GlassPanel>
          ))
      ) : (
        <EmptyState
          title="Nothing matches this filter"
          body="Switch back to all interventions to see the full evaluated set."
        />
      )}

      {capped.length ? (
        <>
          <SectionHeading
            index="SUBSTITUTION CAPS"
            title="Capped, not cancelled"
            description="These work, but only up to a physical limit."
          />
          {capped.map((rec) => (
            <GlassPanel key={`capped-${rec.id}`} tone="warning">
              <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>{rec.name}</Text>
              <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
                {rec.restriction_note}
              </Text>
            </GlassPanel>
          ))}
        </>
      ) : null}

      <SectionHeading
        index="CONSTRAINT INTELLIGENCE"
        title="PRANGARA said no."
        description="Technical fit matters as much as financial return."
      />
      {blocked.length ? (
        blocked.map((item) => (
          <GlassPanel key={item.id} tone="danger">
            <Text style={{ ...typeScale.heading, color: colour.critical }}>{item.name}</Text>
            <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
              {item.reason}
            </Text>
          </GlassPanel>
        ))
      ) : (
        <EmptyState
          title="No evaluated intervention was rejected for this plant"
          body="Every option that passed the physical screen is priced in the list above."
        />
      )}

      <Note>
        Screening and decision support. Confirm feasibility on site before committing capital or
        signing a contract.
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
