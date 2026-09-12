/**
 * Quick results. PRD FR-5.2 mobile scope and task.md FE-2 "Quick Results".
 *
 * Matches the web app's Executive Hero & Scope Breakdown aesthetics:
 * - Cash-positive opportunity hero card (Annual net savings, capex, blended payback, quick wins)
 * - Tri-color Scope 1/2/3 breakdown bar with precision tags
 * - Sovereign RAG Assistant integration ("Ask PRANGARA ✨")
 * - Peer quartile benchmark and actionable leak points
 * - Ranked cost-of-abatement interventions and blocked caveats
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
  Eyebrow,
  Heading,
  Loading,
  Note,
  Row,
  Screen,
  SeverityBadge,
  Stat,
} from '../components/ui';
import { AskAssistantModal } from '../components/AskAssistantModal';
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
  const [assistantOpen, setAssistantOpen] = useState(false);

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
    mutationFn: () => assessmentsApi.run(factoryId, 'From mobile companion'),
    onSuccess: (assessment: Assessment) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      queryClient.setQueryData(['assessment', assessment.id], assessment);
      navigation.setParams({ assessmentId: assessment.id });
    },
    onError: (ex) => setError(describeError(ex)),
  });

  if (list.isLoading) {
    return (
      <Screen>
        <Loading label="Loading assessment" />
      </Screen>
    );
  }

  const result = detail.data?.result;

  return (
    <Screen>
      <Heading sub={factoryName}>Assessment Results</Heading>

      {error ? <Note tone="warning">{error}</Note> : null}

      {!latestId ? (
        <EmptyState
          title="Not assessed yet"
          body="Once you have entered your electricity and fuel use, run the assessment. It takes a few seconds and delivers instant screening & savings roadmap."
          actionLabel="Run assessment"
          onAction={() => {
            setError(null);
            run.mutate();
          }}
        />
      ) : null}

      {detail.isLoading ? <Loading label="Evaluating thermodynamic engine..." /> : null}
      {detail.isError ? (
        <ErrorState message={describeError(detail.error)} onRetry={detail.refetch} />
      ) : null}

      {result ? (
        <>
          {/* 1. EXECUTIVE HERO CARD: Cash-Positive Opportunity (Matches Web App) */}
          <Card
            style={{
              borderColor: colour.ok,
              borderWidth: 1,
              backgroundColor: colour.positiveBg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colour.ok,
                  marginRight: 8,
                }}
              />
              <Eyebrow style={{ color: colour.ok }}>YOUR CASH-POSITIVE OPPORTUNITY</Eyebrow>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space.xs }}>
              <Text style={{ ...typeScale.display, color: colour.ok, fontWeight: '800' }}>
                {formatInr(result.headline.cash_positive_annual_benefit_inr)}
              </Text>
              <Text style={{ ...typeScale.body, color: colour.textMuted }}> / year</Text>
            </View>
            <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2 }}>
              Potential annual net recurring savings
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: space.md,
                backgroundColor: colour.surfaceRaised,
                padding: space.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colour.border,
              }}
            >
              <View>
                <Text style={{ ...typeScale.micro, color: colour.textFaint }}>INVESTMENT</Text>
                <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginTop: 2 }}>
                  {formatInr(result.headline.cash_positive_capex_inr)}
                </Text>
              </View>
              <View>
                <Text style={{ ...typeScale.micro, color: colour.textFaint }}>BLENDED PAYBACK</Text>
                <Text style={{ ...typeScale.bodyStrong, color: colour.ok, marginTop: 2 }}>
                  {result.headline.cash_positive_payback_months
                    ? `${result.headline.cash_positive_payback_months} mo`
                    : '-'}
                </Text>
              </View>
              <View>
                <Text style={{ ...typeScale.micro, color: colour.textFaint }}>QUICK WINS</Text>
                <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginTop: 2 }}>
                  {result.headline.quick_win_count} actions
                </Text>
              </View>
            </View>

            <View
              style={{
                marginTop: space.md,
                padding: space.sm,
                borderRadius: radius.sm,
                backgroundColor: colour.selectedBg,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ ...typeScale.caption, color: colour.primary, fontWeight: '600', flex: 1 }}>
                💡 {result.headline.cash_positive_abatement_pct}% of your footprint can be eliminated at no net cost.
              </Text>
            </View>
          </Card>

          {/* 2. ASK PRANGARA SOVEREIGN COPILOT PROMPT */}
          <Card
            style={{
              backgroundColor: colour.selectedBg,
              borderColor: colour.borderHighlight,
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: space.md }}>
                <Eyebrow style={{ color: colour.primary }}>SOVEREIGN COPILOT</Eyebrow>
                <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginTop: 2 }}>
                  Ask PRANGARA ✨
                </Text>
                <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2, lineHeight: 18 }}>
                  Statutory reasoning with verified citations (BEE PAT, SEBI BRSR, CEA, CBAM).
                </Text>
              </View>
              <Button
                title="Ask ✨"
                onPress={() => setAssistantOpen(true)}
              />
            </View>
          </Card>

          {/* 3. ANNUAL CARBON FOOTPRINT & TRI-COLOR SCOPE BREAKDOWN */}
          <Card>
            <Eyebrow>ANNUAL CARBON FOOTPRINT</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space.xs }}>
              <Text style={{ ...typeScale.display, color: colour.text, fontWeight: '800' }}>
                {formatTonnes(result.footprint.total_tco2e)}
              </Text>
              <Text style={{ ...typeScale.body, color: colour.textMuted }}> tCO2e / yr</Text>
            </View>
            <Text style={{ ...typeScale.caption, color: colour.textFaint, marginTop: 2 }}>
              Uncertainty range: {formatTonnes(result.footprint.total_range.low)} to {formatTonnes(result.footprint.total_range.high)} tCO2e (±{result.footprint.uncertainty_pct}%)
            </Text>

            {/* Tri-color segmented bar */}
            <View
              style={{
                flexDirection: 'row',
                height: 12,
                borderRadius: 6,
                overflow: 'hidden',
                marginTop: space.md,
                backgroundColor: colour.surfaceRaised,
              }}
            >
              <View
                style={{
                  flex: Math.max(1, result.footprint.scope_split_pct.scope1),
                  backgroundColor: colour.scope1,
                }}
              />
              <View
                style={{
                  flex: Math.max(1, result.footprint.scope_split_pct.scope2),
                  backgroundColor: colour.scope2,
                }}
              />
              <View
                style={{
                  flex: Math.max(1, result.footprint.scope_split_pct.scope3),
                  backgroundColor: colour.scope3,
                }}
              />
            </View>

            {/* Scope Breakdown Rows */}
            <View style={{ marginTop: space.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: space.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colour.scope1,
                      marginRight: space.xs,
                    }}
                  />
                  <Text style={{ ...typeScale.body, color: colour.text }}>Scope 1 (Direct)</Text>
                </View>
                <Text style={{ ...typeScale.bodyStrong, color: colour.scope1 }}>
                  {formatTonnes(result.footprint.scope1_tco2e)} t ({result.footprint.scope_split_pct.scope1}%)
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: space.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colour.scope2,
                      marginRight: space.xs,
                    }}
                  />
                  <Text style={{ ...typeScale.body, color: colour.text }}>Scope 2 (Electricity)</Text>
                </View>
                <Text style={{ ...typeScale.bodyStrong, color: colour.scope2 }}>
                  {formatTonnes(result.footprint.scope2_tco2e)} t ({result.footprint.scope_split_pct.scope2}%)
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: space.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colour.scope3,
                      marginRight: space.xs,
                    }}
                  />
                  <Text style={{ ...typeScale.body, color: colour.text }}>Scope 3 (Value chain)</Text>
                </View>
                <Text style={{ ...typeScale.bodyStrong, color: colour.scope3 }}>
                  {formatTonnes(result.footprint.scope3_tco2e)} t ({result.footprint.scope_split_pct.scope3}%)
                </Text>
              </View>
            </View>

            <Divider />
            <Text style={{ ...typeScale.caption, color: colour.textFaint }}>
              Grid factor: {result.footprint.grid_source}
            </Text>
          </Card>

          {/* 4. EXECUTIVE STATEMENT */}
          <Card>
            <Eyebrow>ENGINE DIAGNOSIS</Eyebrow>
            <Text style={{ ...typeScale.body, color: colour.text, lineHeight: 22, marginTop: space.xs }}>
              {result.headline.statement}
            </Text>
          </Card>

          {/* 5. PEER BENCHMARK */}
          {result.leaks.peer_position ? (
            <Card>
              <Eyebrow>INDUSTRY POSITION</Eyebrow>
              <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs, marginBottom: space.xs }}>
                Against your peers
              </Text>
              <Text style={{ ...typeScale.body, color: colour.text }}>
                {describePercentile(result.leaks.peer_position.percentile)}
              </Text>
              <PercentileBar percentile={result.leaks.peer_position.percentile} />
              <Row
                left={result.leaks.peer_position.metric_label}
                right={formatNumber(result.leaks.peer_position.actual, 2)}
                strong
              />
              <Row left="Sector median (p50)" right={formatNumber(result.leaks.peer_position.p50, 2)} />
              <Row left="Sector top quartile (p75)" right={formatNumber(result.leaks.peer_position.p75, 2)} />
              <Note>
                Basis: {result.leaks.benchmark_source}. {result.leaks.benchmark_caveat}
              </Note>
            </Card>
          ) : null}

          {/* 6. WORST LEAK POINTS */}
          {result.leaks.leaks.length ? (
            <Card>
              <Eyebrow>DIAGNOSE</Eyebrow>
              <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs, marginBottom: space.sm }}>
                Identified leak points
              </Text>
              {result.leaks.leaks.slice(0, 3).map((leak) => (
                <View
                  key={leak.stream_key}
                  style={{
                    marginBottom: space.md,
                    padding: space.md,
                    backgroundColor: colour.surfaceRaised,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colour.border,
                  }}
                >
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

          {/* 7. ACTIONS: DO THESE FIRST */}
          <Card>
            <Eyebrow>DECARBONIZATION ROADMAP</Eyebrow>
            <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs, marginBottom: space.xs }}>
              Recommended interventions
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.textMuted, marginBottom: space.md }}>
              Ranked by cost of abatement. Physical and technical feasibility verified.
            </Text>
            {result.recommendations.recommendations.slice(0, 4).map((rec) => (
              <View
                key={rec.id}
                style={{
                  backgroundColor: colour.surfaceRaised,
                  borderRadius: radius.md,
                  padding: space.md,
                  marginBottom: space.md,
                  borderWidth: 1,
                  borderColor: colour.border,
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
                    left="Abatement"
                    right={`${formatTonnes(rec.portfolio_abatement_tco2e)} tCO2e/yr`}
                  />
                  <Row left="Capex" right={formatInr(rec.capex_inr)} />
                  <Row left="Recurring benefit" right={`${formatInr(rec.net_annual_benefit_inr)}/yr`} />
                  <Row left="Payback" right={formatPayback(rec.payback_yrs)} strong />
                </View>
                {rec.substitution_capped && rec.restriction_note ? (
                  <Note tone="warning">{rec.restriction_note}</Note>
                ) : null}
              </View>
            ))}
          </Card>

          {/* 8. BLOCKED INTERVENTIONS */}
          {result.recommendations.blocked.length ? (
            <Card style={{ borderColor: colour.critical, borderWidth: 1 }}>
              <Eyebrow style={{ color: colour.critical }}>ENGINEERING SAFEGUARDS</Eyebrow>
              <Text style={{ ...typeScale.heading, color: colour.critical, marginTop: space.xs }}>
                PRANGARA said no
              </Text>
              <Text
                style={{
                  ...typeScale.caption,
                  color: colour.textMuted,
                  marginTop: space.xs,
                  marginBottom: space.md,
                }}
              >
                These options were analyzed but ruled inadmissible for your specific facility.
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

          {/* 9. DATA QUALITY & RE-RUN */}
          <Card>
            <Eyebrow>AUDIT READINESS</Eyebrow>
            <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs, marginBottom: space.sm }}>
              {result.data_quality
                ? `Data Quality: ${result.data_quality.score}/100 (${result.data_quality.band})`
                : 'Data quality: not supplied'}
            </Text>
            {result.data_quality?.gaps.length ? (
              <Text style={{ ...typeScale.caption, color: colour.textMuted, lineHeight: 19 }}>
                Identified data gaps: {result.data_quality.gaps.join(', ')}.
              </Text>
            ) : null}
            {(result.data_quality?.notes ?? []).map((note) => (
              <Note key={note} tone="warning">
                {note}
              </Note>
            ))}
            <Button
              title="Add more plant data"
              variant="secondary"
              onPress={() =>
                navigation.navigate('Onboarding', { factoryId, factoryName })
              }
              style={{ marginTop: space.sm }}
            />
          </Card>

          <Note>
            Engine v{result.versions.engine_version}, factors v{result.versions.factor_version} ({result.versions.factor_hash}). Screening and decision support only — not an accredited audit.
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
          style={{ marginTop: space.sm }}
        />
      ) : null}

      {/* Sovereign RAG Assistant Companion Modal */}
      <AskAssistantModal visible={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </Screen>
  );
}

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
