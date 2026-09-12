/**
 * Carbon footprint. The web app's `/footprint`.
 *
 * Follow every tonne back to an activity stream: the scope split, the flow from
 * source to scope, the intensities, then the stream inventory with each
 * stream's activity quantity, factor source and band.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { EmissionFlow, ScopeBand, StreamBars, UncertaintyBar } from '../components/charts';
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
import { EmptyState, Note } from '../components/ui';
import { label as humanise, number } from '../lib/format';
import { colour, scopeColour, space, type as typeScale } from '../theme/tokens';
import { scopeRows, useWorkspace } from '../workspace/WorkspaceContext';
import type { RootStackParams } from '../navigation/types';

type ScopeFilter = 'all' | '1' | '2' | '3';

export default function FootprintScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'Footprint'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const result = workspace.assessment;
  const [scope, setScope] = useState<ScopeFilter>((route.params?.scope as ScopeFilter) ?? 'all');
  const [openStream, setOpenStream] = useState<string | null>(null);

  if (!result) {
    return (
      <ModuleScreen>
        <PageHeading
          eyebrow="ANALYZE / FOOTPRINT"
          title="Carbon footprint"
          description="Follow every tonne back to an activity stream."
        />
        <EmptyState
          title="No assessment to break down"
          body="Run an assessment and every stream, factor and band appears here."
        />
      </ModuleScreen>
    );
  }

  const footprint = result.footprint;
  const streams =
    scope === 'all'
      ? footprint.streams
      : footprint.streams.filter((stream) => String(stream.scope) === scope);
  const intensities = Object.entries(footprint.intensities ?? {});

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ANALYZE / FOOTPRINT"
        title="Carbon footprint"
        description="Follow every tonne back to an activity stream."
        meta={`${workspace.plantName} · grid factor ${footprint.grid_source}`}
      />

      <GlassPanel>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ ...typeScale.hero, color: colour.bright }}>
            {number(footprint.total_tco2e)}
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginLeft: 6 }}>
            tCO2e / year
          </Text>
        </View>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
          Engine band {number(footprint.total_range.low)} to {number(footprint.total_range.high)}{' '}
          tCO2e at ±{number(footprint.uncertainty_pct, 1)}%
        </Text>
        <View style={{ marginTop: space.md }}>
          <UncertaintyBar
            low={footprint.total_range.low}
            base={footprint.total_range.base}
            high={footprint.total_range.high}
          />
          <ScopeBand scopes={scopeRows(result)} onPressScope={(next) => setScope(next as ScopeFilter)} />
        </View>
      </GlassPanel>

      {intensities.length ? (
        <Metrics
          items={intensities.slice(0, 4).map(([key, value]) => ({
            label: humanise(key),
            value: number(value, 3),
          }))}
        />
      ) : null}

      <SectionHeading
        title="From source to scope"
        description="Width is tonnes. Every ribbon lands in the scope that owns it."
      />
      <GlassPanel>
        <EmissionFlow sankey={result.sankey} />
        <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: space.sm }}>
          Scroll sideways to read the full stream names.
        </Text>
      </GlassPanel>

      <SectionHeading
        title="Stream inventory"
        description="Tap a stream to inspect its activity, factor and uncertainty."
      />
      <View style={{ marginBottom: space.md }}>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'All' },
            { value: '1', label: 'Scope 1' },
            { value: '2', label: 'Scope 2' },
            { value: '3', label: 'Scope 3' },
          ]}
        />
      </View>

      {streams.length ? (
        <>
          <GlassPanel>
            <StreamBars streams={footprint.streams} max={6} onPress={setOpenStream} />
          </GlassPanel>
          {streams
            .slice()
            .sort((a, b) => b.tco2e - a.tco2e)
            .map((stream) => {
              const open = openStream === stream.key;
              return (
                <GlassPanel
                  key={stream.key}
                  onPress={() => setOpenStream(open ? null : stream.key)}
                  style={{ paddingVertical: space.md }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 4,
                        height: 28,
                        borderRadius: 2,
                        backgroundColor: scopeColour(stream.scope),
                        marginRight: space.md,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
                        {stream.label}
                      </Text>
                      <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
                        Scope {stream.scope} · {number(stream.share_pct, 1)}% of total
                      </Text>
                    </View>
                    <Text style={{ ...typeScale.numeric, color: colour.text }}>
                      {number(stream.tco2e)}
                    </Text>
                  </View>
                  {open ? (
                    <View style={{ marginTop: space.md }}>
                      <DetailRows
                        rows={[
                          [
                            'Activity',
                            `${number(stream.activity_qty, 2)} ${stream.activity_unit ?? ''}`.trim(),
                          ],
                          ['Emissions', `${number(stream.tco2e)} tCO2e`],
                          [
                            'Band',
                            `${number(stream.range.low)} to ${number(stream.range.high)} tCO2e`,
                          ],
                          ['Working', stream.source ?? 'Not supplied'],
                        ]}
                      />
                    </View>
                  ) : null}
                </GlassPanel>
              );
            })}
        </>
      ) : (
        <EmptyState
          title={`No Scope ${scope} streams`}
          body="Nothing on record falls in this scope for this reporting period."
        />
      )}

      <GlassPanel tone="inset">
        <Badge tone="neutral">BOUNDARY</Badge>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
          Scope 1, Scope 2 and the Scope 3 categories collected for this plant. Biogenic CO2 is
          excluded from the total and disclosed separately.
        </Text>
      </GlassPanel>

      <Note>
        Every factor carries a source and an uncertainty band, and the engine propagates the band
        to every result shown above.
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
