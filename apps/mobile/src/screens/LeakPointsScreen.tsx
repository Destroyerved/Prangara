/**
 * Leak points. The web app's `/leaks`.
 *
 * A leak is a stream whose intensity is above its sector threshold, or one
 * concentrated enough to dominate the footprint. Each card carries the rule
 * that fired, where the plant sits against its peers, and what closing the gap
 * to the median would be worth.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Text, View } from 'react-native';

import { BenchmarkStrip } from '../components/charts';
import {
  Badge,
  DetailRows,
  GlassPanel,
  Metrics,
  ModuleScreen,
  PageHeading,
  SectionHeading,
  TrustBar,
} from '../components/layout';
import { Button, EmptyState, Note, SeverityBadge } from '../components/ui';
import { describePercentile, label as humanise, number } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RootStackParams } from '../navigation/types';

export default function LeakPointsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const result = workspace.assessment;

  if (!result) {
    return (
      <ModuleScreen>
        <PageHeading
          eyebrow="ANALYZE / LEAK INTELLIGENCE"
          title="Where performance escapes"
          description="Detect operational gaps and structural carbon concentrations."
        />
        <EmptyState
          title="No assessment to diagnose"
          body="Leak detection runs on an assessment. Add plant data and run one."
        />
      </ModuleScreen>
    );
  }

  const leaks = result.leaks;
  const peer = leaks.peer_position;

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ANALYZE / LEAK INTELLIGENCE"
        title="Where performance escapes"
        description="Detect operational gaps and structural carbon concentrations."
        meta={workspace.plantName}
      />

      <Metrics
        items={[
          { label: 'Leak points found', value: number(leaks.leak_count) },
          { label: 'Critical severity', value: number(leaks.critical_count) },
          {
            label: 'Peer percentile',
            value: peer ? `${number(peer.percentile)}th` : 'Unavailable',
          },
          {
            label: 'Recoverable to median',
            value: number(
              leaks.leaks.reduce((sum, leak) => sum + (leak.gap_to_median_tco2e || 0), 0),
            ),
            unit: 'tCO2e',
          },
        ]}
      />

      {peer ? (
        <GlassPanel>
          <Text style={{ ...typeScale.micro, color: colour.subtle }}>INDUSTRY POSITION</Text>
          <Text style={{ ...typeScale.title, color: colour.bright, marginTop: 4 }}>
            {describePercentile(peer.percentile)}
          </Text>
          <View style={{ marginTop: space.md }}>
            <BenchmarkStrip
              percentile={peer.percentile}
              p25={peer.p25}
              p50={peer.p50}
              p75={peer.p75}
              actual={peer.actual}
              metricLabel={peer.metric_label}
            />
          </View>
          <Note>
            Basis: {leaks.benchmark_source}. {leaks.benchmark_caveat}
          </Note>
        </GlassPanel>
      ) : null}

      <SectionHeading
        index="FINDINGS"
        title="Every leak the engine flagged"
        description="Ordered by tonnes at stake. The rule that fired is named on each card."
      />

      {leaks.leaks.length ? (
        leaks.leaks
          .slice()
          .sort((a, b) => b.tco2e - a.tco2e)
          .map((leak) => (
            <GlassPanel key={`${leak.stream_key}-${leak.rule}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                  {leak.label}
                </Text>
                <SeverityBadge severity={leak.severity} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <Badge tone="neutral">{humanise(leak.rule)}</Badge>
              </View>
              <Text style={{ ...typeScale.body, color: colour.muted, marginTop: space.sm }}>
                {leak.finding}
              </Text>
              <View style={{ marginTop: space.md }}>
                <DetailRows
                  rows={[
                    ['Stream emissions', `${number(leak.tco2e)} tCO2e`],
                    ['Share of footprint', `${number(leak.share_pct, 1)}%`],
                    ...(leak.metric_label
                      ? ([
                          [
                            leak.metric_label,
                            `${number(leak.actual, 2)} ${leak.metric_unit ?? ''}`.trim(),
                          ],
                        ] as [string, string][])
                      : []),
                    ...(leak.p50 === null || leak.p50 === undefined
                      ? []
                      : ([['Sector median (p50)', number(leak.p50, 2)]] as [string, string][])),
                    ...(leak.percentile === null || leak.percentile === undefined
                      ? []
                      : ([['Percentile', `${number(leak.percentile)}th`]] as [string, string][])),
                    [
                      'Recoverable to median',
                      leak.gap_to_median_tco2e
                        ? `${number(leak.gap_to_median_tco2e)} tCO2e`
                        : 'Not applicable',
                    ],
                  ]}
                />
              </View>
              {peer && leak.percentile !== null && leak.percentile !== undefined ? (
                <View style={{ marginTop: space.md }}>
                  <BenchmarkStrip
                    percentile={leak.percentile}
                    p50={leak.p50}
                    p75={leak.p75}
                    actual={leak.actual}
                    metricLabel={leak.metric_unit}
                  />
                </View>
              ) : null}
              <Button
                title="See what fixes this"
                variant="secondary"
                onPress={() => navigation.navigate('CircularActions', { stream: leak.stream_key })}
                style={{ marginTop: space.md }}
              />
            </GlassPanel>
          ))
      ) : (
        <EmptyState
          title="No leak points flagged"
          body="No stream exceeded its sector threshold on this assessment. That is a result, not a gap."
        />
      )}

      <Note>
        A leak point is a screening signal from benchmark percentiles, not a measured loss. Confirm
        on the floor before committing capital.
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
