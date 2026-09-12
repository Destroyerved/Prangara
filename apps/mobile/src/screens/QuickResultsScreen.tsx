/**
 * Quick results. PRD FR-5.2 mobile scope and task.md FE-2 "Quick Results".
 *
 * The mobile companion deliberately does *not* reproduce the dashboard. It
 * answers four questions a factory owner can act on from the floor:
 *
 *   what am I emitting, where is the worst leak, what should I do first,
 *   and what is free money.
 *
 * Every figure shown carries its uncertainty band, and every recommendation
 * shows cost and carbon together, because PRD section 3.4 requires it and
 * because a payback without a capex is not a decision.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { assessments as assessmentsApi } from '../api/endpoints';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Heading,
  Loading,
  Note,
  Row,
  Screen,
  SeverityBadge,
  Stat,
} from '../components/ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import {
  describePercentile,
  formatInr,
  formatNumber,
  formatPayback,
  formatTonnes,
} from '../lib/format';
import type { RootStackParams } from '../navigation/types';
import type { Assessment } from '../api/types';

export default function QuickResultsScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'QuickResults'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const queryClient = useQueryClient();
  const { factoryId, factoryName } = route.params;
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['assessments', factoryId],
    queryFn: () => assessmentsApi.list(factoryId),
  });

  const latestId = route.params.assessmentId ?? list.data?.find((a) => a.is_baseline)?.id;

  const detail = useQuery({
    queryKey: ['assessment', latestId],
    queryFn: () => assessmentsApi.get(latestId as string),
    enabled: Boolean(latestId),
  });

  const run = useMutation({
    mutationFn: () => assessmentsApi.run(factoryId, 'From mobile'),
    onSuccess: (assessment: Assessment) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      queryClient.setQueryData(['assessment', assessment.id], assessment);
      navigation.setParams({ assessmentId: assessment.id });
    },
    onError: (ex) => setError(describeError(ex)),
  });

  if (list.isLoading) return <Screen><Loading label="Loading" /></Screen>;

  const result = detail.data?.result;

  return (
    <Screen>
      <Heading sub={factoryName}>Results</Heading>

      {error ? <Note tone="warning">{error}</Note> : null}

      {!latestId ? (
        <EmptyState
          title="Not assessed yet"
          body="Once you have entered your electricity and fuel use, run the assessment. It takes a moment and nothing leaves your account."
          actionLabel="Run assessment"
          onAction={() => {
            setError(null);
            run.mutate();
          }}
        />
      ) : null}

      {detail.isLoading ? <Loading label="Loading results" /> : null}
      {detail.isError ? (
        <ErrorState message={describeError(detail.error)} onRetry={detail.refetch} />
      ) : null}

      {result ? (
        <>
          <Card>
            <Stat
              label="Annual footprint"
              value={formatTonnes(result.footprint.total_tco2e)}
              unit="tCO2e"
              note={`range ${formatTonnes(result.footprint.total_range.low)} to ${formatTonnes(
                result.footprint.total_range.high,
              )} · ±${result.footprint.uncertainty_pct}%`}
            />
            <Divider />
            <Row left="Scope 1 — direct" right={`${formatTonnes(result.footprint.scope1_tco2e)} t (${result.footprint.scope_split_pct.scope1}%)`} />
            <Row left="Scope 2 — electricity" right={`${formatTonnes(result.footprint.scope2_tco2e)} t (${result.footprint.scope_split_pct.scope2}%)`} />
            <Row left="Scope 3 — value chain" right={`${formatTonnes(result.footprint.scope3_tco2e)} t (${result.footprint.scope_split_pct.scope3}%)`} />
            <Divider />
            <Text style={{ ...typeScale.caption, color: colour.textFaint }}>
              {result.footprint.grid_source}
            </Text>
          </Card>

          <Card>
            <Text style={{ ...typeScale.body, color: colour.text, lineHeight: 22 }}>
              {result.headline.statement}
            </Text>
          </Card>

          {result.leaks.peer_position ? (
            <Card>
              <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
                Against your peers
              </Text>
              <Text style={{ ...typeScale.body, color: colour.text }}>
                {describePercentile(result.leaks.peer_position.percentile)}
              </Text>
              <PercentileBar
                percentile={result.leaks.peer_position.percentile}
              />
              <Row
                left={result.leaks.peer_position.metric_label}
                right={formatNumber(result.leaks.peer_position.actual, 2)}
                strong
              />
              <Row left="Sector median" right={formatNumber(result.leaks.peer_position.p50, 2)} />
              <Row left="Sector 75th percentile" right={formatNumber(result.leaks.peer_position.p75, 2)} />
              <Note>
                Benchmark basis: {result.leaks.benchmark_source}. {result.leaks.benchmark_caveat}
              </Note>
            </Card>
          ) : null}

          {result.leaks.leaks.length ? (
            <Card>
              <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
                Worst leak point
              </Text>
              {result.leaks.leaks.slice(0, 2).map((leak) => (
                <View key={leak.stream_key} style={{ marginBottom: space.lg }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: space.xs,
                    }}
                  >
                    <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                      {leak.label}
                    </Text>
                    <SeverityBadge severity={leak.severity} />
                  </View>
                  <Text style={{ ...typeScale.caption, color: colour.textMuted, lineHeight: 19 }}>
                    {leak.finding}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          <Card>
            <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.xs }}>
              Do these first
            </Text>
            <Text
              style={{ ...typeScale.caption, color: colour.textMuted, marginBottom: space.md }}
            >
              Cheapest cost of abatement first. Figures are planning-grade
              estimates for ranking options, not quotations.
            </Text>
            {result.recommendations.recommendations.slice(0, 3).map((rec) => (
              <View
                key={rec.id}
                style={{
                  backgroundColor: colour.surfaceRaised,
                  borderRadius: radius.md,
                  padding: space.md,
                  marginBottom: space.md,
                }}
              >
                <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>{rec.name}</Text>
                <Text
                  style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2, lineHeight: 18 }}
                >
                  {rec.physical_note || rec.description}
                </Text>
                <View style={{ marginTop: space.sm }}>
                  <Row
                    left="Cuts"
                    right={`${formatTonnes(rec.portfolio_abatement_tco2e)} tCO2e/yr`}
                  />
                  <Row left="Costs" right={formatInr(rec.capex_inr)} />
                  <Row
                    left="Saves"
                    right={`${formatInr(rec.net_annual_benefit_inr)}/yr`}
                  />
                  <Row left="Pays back in" right={formatPayback(rec.payback_yrs)} strong />
                </View>
                {rec.substitution_capped && rec.restriction_note ? (
                  <Note tone="warning">{rec.restriction_note}</Note>
                ) : null}
              </View>
            ))}
          </Card>

          {result.recommendations.blocked.length ? (
            <Card style={{ borderColor: colour.critical }}>
              <Text style={{ ...typeScale.heading, color: colour.critical }}>
                PRANGARA said no
              </Text>
              <Text
                style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.xs, marginBottom: space.md }}
              >
                These are technically real options that are not admissible at this
                plant. The reason matters more than the recommendation.
              </Text>
              {result.recommendations.blocked.map((blocked) => (
                <View key={blocked.id} style={{ marginBottom: space.md }}>
                  <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
                    {blocked.name}
                  </Text>
                  <Text
                    style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2, lineHeight: 18 }}
                  >
                    {blocked.reason}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}

          <Card>
            <Stat
              label="Free money available"
              value={formatInr(result.headline.cash_positive_annual_benefit_inr)}
              unit="a year"
              tone="good"
              note={`${result.headline.quick_win_count} quick win${
                result.headline.quick_win_count === 1 ? '' : 's'
              } · removes ${result.headline.cash_positive_abatement_pct}% of the footprint`}
            />
            <Row
              left="Capital needed"
              right={formatInr(result.headline.cash_positive_capex_inr)}
            />
            <Row
              left="Blended payback"
              right={
                result.headline.cash_positive_payback_months
                  ? `${result.headline.cash_positive_payback_months} months`
                  : '-'
              }
              strong
            />
          </Card>

          <Card>
            <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
              Data quality {result.data_quality.score}/100 ({result.data_quality.band})
            </Text>
            {result.data_quality.gaps.length ? (
              <Text style={{ ...typeScale.caption, color: colour.textMuted, lineHeight: 19 }}>
                Still missing: {result.data_quality.gaps.join(', ')}.
              </Text>
            ) : null}
            {result.data_quality.notes.map((note) => (
              <Note key={note} tone="warning">
                {note}
              </Note>
            ))}
            <Button
              title="Add more data"
              variant="secondary"
              onPress={() =>
                navigation.navigate('Onboarding', { factoryId, factoryName })
              }
              style={{ marginTop: space.sm }}
            />
          </Card>

          <Note>
            Engine {result.versions.engine_version}, factors{' '}
            {result.versions.factor_version} ({result.versions.factor_hash}). This
            result is reproducible from those versions. Screening and decision
            support only — not an accredited audit.
          </Note>
        </>
      ) : null}

      {latestId ? (
        <Button
          title="Re-run assessment"
          variant="secondary"
          onPress={() => {
            setError(null);
            run.mutate();
          }}
          loading={run.isPending}
        />
      ) : null}
    </Screen>
  );
}

/**
 * Where the plant sits in its peer distribution.
 *
 * Lower intensity is better, so the marker moving left is good. The band is
 * quartile-shaded rather than a gradient, because a gradient implies a precision
 * the percentile does not have.
 */
function PercentileBar({ percentile }: { percentile: number }) {
  const clamped = Math.min(99, Math.max(1, percentile));
  return (
    <View style={{ marginVertical: space.md }}>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' }}>
        <View style={{ flex: 25, backgroundColor: colour.ok }} />
        <View style={{ flex: 25, backgroundColor: colour.watch }} />
        <View style={{ flex: 25, backgroundColor: colour.moderate }} />
        <View style={{ flex: 25, backgroundColor: colour.critical }} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: `${clamped}%`,
          top: -4,
          width: 3,
          height: 18,
          backgroundColor: colour.text,
          borderRadius: 2,
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
        <Text style={{ ...typeScale.micro, color: colour.textFaint }}>BEST QUARTILE</Text>
        <Text style={{ ...typeScale.micro, color: colour.textFaint }}>WORST QUARTILE</Text>
      </View>
    </View>
  );
}
