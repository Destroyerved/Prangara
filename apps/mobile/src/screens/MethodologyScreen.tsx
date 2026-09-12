/**
 * Methodology and trust. The web app's `/methodology`.
 *
 * Every number has a source. This screen carries the standard, the boundary,
 * the version stamp, the limitations that are not hidden, the data-quality
 * record for this assessment, and the factor registry behind it.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { reference as referenceApi } from '../api/endpoints';
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
import { EmptyState, Loading, Note } from '../components/ui';
import { label as humanise, number } from '../lib/format';
import { colour, scopeColour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { ReferenceFactor } from '../api/types';
import type { RootStackParams } from '../navigation/types';

type Tab = 'basis' | 'quality' | 'factors';

export default function MethodologyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const result = workspace.assessment;
  const [tab, setTab] = useState<Tab>('basis');

  const reference = useQuery({
    queryKey: ['reference'],
    queryFn: () => referenceApi.all(),
    staleTime: 60 * 60 * 1000,
  });

  const method = result?.methodology;
  const quality = result?.data_quality;
  const versions = result?.versions ?? {};

  const groups = reference.data?.groups ?? {};
  const factorRows: ReferenceFactor[] = Object.entries(groups).flatMap(([group, rows]) =>
    (rows as ReferenceFactor[]).map((row) => ({ ...row, label: row.label ?? group })),
  );

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="REPORT / METHODOLOGY & TRUST"
        title="Every number has a source."
        description="Understand the boundary, follow the calculation, and see what remains uncertain."
        meta={workspace.plantName}
      />

      <View style={{ marginBottom: space.md }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'basis', label: 'Basis' },
            { value: 'quality', label: 'Data quality' },
            { value: 'factors', label: 'Factors' },
          ]}
        />
      </View>

      {tab === 'basis' ? (
        <>
          <GlassPanel>
            <Text style={{ ...typeScale.micro, color: colour.subtle }}>ACCOUNTING STANDARD</Text>
            <Text style={{ ...typeScale.title, color: colour.bright, marginTop: 6 }}>
              {method?.standard ?? 'GHG Protocol Corporate Accounting and Reporting Standard'}
            </Text>
            <View style={{ marginTop: space.md }}>
              <DetailRows
                rows={[
                  ['Global warming potentials', method?.gwp ?? 'Not supplied'],
                  ['Boundary', 'Scope 1, Scope 2 and the collected Scope 3 categories'],
                  ['Grid factor', result?.footprint.grid_source ?? 'Not supplied'],
                  ['Reporting basis', 'Annual snapshot, screening grade'],
                ]}
              />
            </View>
          </GlassPanel>

          <SectionHeading
            title="Version stamp"
            description="The exact engine and reference data behind the figures on this device."
          />
          <GlassPanel tone="inset">
            <DetailRows
              rows={Object.entries(versions).map(([key, value]) => [
                humanise(key),
                String(value),
              ])}
            />
          </GlassPanel>

          <SectionHeading title="Limitations we are not hiding" />
          <GlassPanel tone="warning">
            {[
              method?.factor_note,
              method?.benchmark_note,
              method?.leak_rule,
              result?.recommendations.assumptions?.derating_note,
              result?.recommendations.assumptions?.capex_note,
            ]
              .filter((item): item is string => typeof item === 'string' && item.length > 0)
              .map((item, index) => (
                <Text
                  key={index}
                  style={{
                    ...typeScale.caption,
                    color: colour.muted,
                    marginTop: index === 0 ? 0 : space.sm,
                  }}
                >
                  · {item}
                </Text>
              ))}
          </GlassPanel>

          {method?.verification_status ? (
            <GlassPanel tone="danger">
              <Badge tone="critical">VERIFICATION STATUS</Badge>
              <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
                {method.verification_status}
              </Text>
            </GlassPanel>
          ) : null}

          <SectionHeading
            title="How the portfolio arithmetic works"
            description="Three rules, applied in this order, every time."
          />
          <GlassPanel>
            <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>Addition</Text>
            <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}>
              Scope totals add. The footprint is Scope 1 plus Scope 2 plus the modelled Scope 3
              categories.
            </Text>
            <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginTop: space.md }}>
              Positive scaling
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}>
              More activity means more emissions, at the factor's own uncertainty band.
            </Text>
            <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginTop: space.md }}>
              Negative scaling
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}>
              An intervention applies to the residual stream the previous one left behind, in cost
              order. That is why standalone and portfolio tonnes differ.
            </Text>
          </GlassPanel>
        </>
      ) : null}

      {tab === 'quality' ? (
        quality ? (
          <>
            <Metrics
              items={[
                { label: 'Data-quality score', value: `${number(quality.score)} / 100` },
                { label: 'Band', value: humanise(quality.band ?? 'unknown') },
                { label: 'Declared gaps', value: number(quality.gaps?.length ?? 0) },
                {
                  label: 'Plausibility flags',
                  value: number(quality.plausibility_flags?.length ?? 0),
                },
              ]}
            />
            {quality.gaps?.length ? (
              <GlassPanel tone="warning">
                <Badge tone="high">GAPS</Badge>
                {quality.gaps.map((gap) => (
                  <Text
                    key={gap}
                    style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}
                  >
                    · {gap}
                  </Text>
                ))}
              </GlassPanel>
            ) : null}
            {quality.notes?.length ? (
              <GlassPanel>
                <Badge tone="neutral">NOTES</Badge>
                {quality.notes.map((note) => (
                  <Text
                    key={note}
                    style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}
                  >
                    · {note}
                  </Text>
                ))}
              </GlassPanel>
            ) : null}
            {quality.plausibility_flags?.length ? (
              <GlassPanel tone="danger">
                <Badge tone="critical">PLAUSIBILITY</Badge>
                {quality.plausibility_flags.map((flag) => (
                  <Text
                    key={flag}
                    style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}
                  >
                    · {flag}
                  </Text>
                ))}
              </GlassPanel>
            ) : null}
            <Note>
              A calculated result does not establish that its inputs have been verified. Evidence
              status is recorded per activity record on the plant data screen.
            </Note>
          </>
        ) : (
          <EmptyState
            title="No data-quality record"
            body="This assessment did not return a data-quality panel."
          />
        )
      ) : null}

      {tab === 'factors' ? (
        <>
          <SectionHeading
            title="Emission factor registry"
            description="Every factor with its scope, band and published source."
          />
          {reference.isLoading ? <Loading label="Loading the factor registry" /> : null}
          {factorRows.length ? (
            factorRows.map((factor) => (
              <GlassPanel key={factor.key} style={{ paddingVertical: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 4,
                      height: 26,
                      borderRadius: 2,
                      backgroundColor: scopeColour(factor.scope),
                      marginRight: space.md,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
                      {factor.label}
                    </Text>
                    <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
                      {factor.key} · Scope {factor.scope}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ ...typeScale.numeric, color: colour.text }}>
                      {number(factor.value, 4)}
                    </Text>
                    <Text style={{ ...typeScale.caption, color: colour.subtle }}>
                      {factor.unit}
                    </Text>
                  </View>
                </View>
                <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: space.sm }}>
                  Band {number(factor.low, 4)} to {number(factor.high, 4)} · {factor.source}
                </Text>
              </GlassPanel>
            ))
          ) : reference.isLoading ? null : (
            <EmptyState
              title="Factor registry unavailable offline"
              body="The registry is served by the backend. Connect to the API and pull to refresh."
            />
          )}
        </>
      ) : null}

      <Note>
        {result?.claim_boundary ??
          'Screening and decision support. Not a BEE-accredited audit, legal assurance service, regulator or carbon-credit verifier.'}
      </Note>
      <TrustBar onPress={() => navigation.navigate('Compliance')} />
    </ModuleScreen>
  );
}
