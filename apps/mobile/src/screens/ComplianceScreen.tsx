/**
 * Compliance readiness. The web app's `/compliance`.
 *
 * Statutory screening for EU CBAM (Reg 2023/956), India CCTS (BEE 2025-2026)
 * and SEBI BRSR Core. Readiness is a state of evidence, never a legal
 * determination, and the caveat that says so travels with the screen.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { compliance as complianceApi } from '../api/endpoints';
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
import { Button, EmptyState, Loading, Note } from '../components/ui';
import { label as humanise, money, number } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RootStackParams } from '../navigation/types';

function readinessTone(status: string) {
  const value = status.toUpperCase();
  if (value === 'READY') return 'positive' as const;
  if (value === 'PARTIAL') return 'high' as const;
  if (value === 'NO DATA' || value === 'MISSING') return 'critical' as const;
  return 'neutral' as const;
}

export default function ComplianceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const result = workspace.assessment;
  const factoryId = workspace.source === 'live' ? workspace.factoryId : null;

  const readiness = useQuery({
    queryKey: ['compliance', factoryId],
    queryFn: () => complianceApi.readiness(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const cases = useQuery({
    queryKey: ['compliance-cases', factoryId],
    queryFn: () => complianceApi.cases(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const evaluate = useMutation({
    mutationFn: () => complianceApi.evaluate(factoryId as string, workspace.assessmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', factoryId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-cases', factoryId] });
    },
  });

  if (!result) {
    return (
      <ModuleScreen>
        <PageHeading
          eyebrow="REPORT / COMPLIANCE READINESS"
          title="Prepared, with statutory gaps visible."
          description="Screening for EU CBAM, India CCTS and SEBI BRSR Core."
        />
        <EmptyState
          title="Nothing to screen yet"
          body="Compliance screening reads an assessment. Add plant data and run one."
        />
      </ModuleScreen>
    );
  }

  const cbam = result.compliance.cbam;
  const ccts = result.compliance.ccts;
  const brsr = result.compliance.brsr;

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="REPORT / COMPLIANCE READINESS"
        title="Prepared, with statutory gaps visible."
        description="Statutory screening for EU CBAM (Reg 2023/956), India CCTS (BEE 2025-2026) and SEBI BRSR Core."
        meta={workspace.plantName}
      />

      {readiness.data ? (
        <Metrics
          items={[
            { label: 'Overall readiness', value: humanise(readiness.data.overall) },
            { label: 'Open cases', value: number(readiness.data.open_cases) },
            { label: 'Overdue', value: number(readiness.data.overdue_cases) },
            { label: 'Needs human review', value: number(readiness.data.human_review_required) },
          ]}
        />
      ) : null}

      <SectionHeading
        index="EU CBAM / REG 2023/956"
        title="The CBAM assessment boundary"
        description="Indicative screening on exported embedded emissions. Not a surrender calculation."
      />
      <GlassPanel tone={cbam.applicable ? 'warning' : 'default'}>
        <Badge tone={cbam.applicable ? 'high' : 'neutral'}>
          {cbam.applicable ? 'IN SCOPE (SCREENING)' : humanise(cbam.status ?? 'not indicated')}
        </Badge>
        <Text style={{ ...typeScale.title, color: colour.bright, marginTop: space.sm }}>
          {cbam.indicative_annual_cost_inr === null || cbam.indicative_annual_cost_inr === undefined
            ? cbam.status === 'phase_2_watchlist'
              ? 'Phase 2 watchlist, exempt today'
              : 'No indicative cost'
            : `${money(cbam.indicative_annual_cost_inr)} / yr`}
        </Text>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
          {cbam.applicability}
        </Text>
        <View style={{ marginTop: space.md }}>
          <DetailRows
            rows={[
              ['EU export share', `${number(cbam.eu_export_share_pct, 1)}%`],
              [
                'Embedded emissions exported',
                cbam.embedded_emissions_exported_tco2e === null ||
                cbam.embedded_emissions_exported_tco2e === undefined
                  ? 'Not applicable'
                  : `${number(cbam.embedded_emissions_exported_tco2e)} tCO2e`,
              ],
              [
                'EU benchmark',
                cbam.eu_benchmark_tco2e_per_t === null ||
                cbam.eu_benchmark_tco2e_per_t === undefined
                  ? 'Not applicable'
                  : `${number(cbam.eu_benchmark_tco2e_per_t, 3)} tCO2e/t`,
              ],
              [
                'Net surrender',
                cbam.net_surrender_tco2e === null || cbam.net_surrender_tco2e === undefined
                  ? 'Not applicable'
                  : `${number(cbam.net_surrender_tco2e)} tCO2e`,
              ],
              [
                'Reference price',
                cbam.reference_price_inr_per_tco2e === null ||
                cbam.reference_price_inr_per_tco2e === undefined
                  ? 'Not applicable'
                  : `${money(cbam.reference_price_inr_per_tco2e)} / tCO2e`,
              ],
            ]}
          />
        </View>
        {cbam.basis ? (
          <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: space.sm }}>
            Basis: {cbam.basis}
          </Text>
        ) : null}
        {cbam.caveat ? <Note tone="warning">{cbam.caveat}</Note> : null}
      </GlassPanel>

      {ccts ? (
        <>
          <SectionHeading
            index="INDIA CCTS / BEE 2025-2026"
            title="Carbon Credit Trading Scheme readiness"
            description="Bureau of Energy Efficiency and Ministry of Power, under the Energy Conservation (Amendment) Act."
          />
          <GlassPanel tone={ccts.is_designated_consumer ? 'warning' : 'default'}>
            <Badge tone={ccts.is_designated_consumer ? 'high' : 'accent'}>
              {ccts.is_designated_consumer ? 'OBLIGATED' : 'VOLUNTARY ELIGIBLE'}
            </Badge>
            <Text style={{ ...typeScale.title, color: colour.bright, marginTop: space.sm }}>
              {ccts.designated_consumer_status}
            </Text>
            <View style={{ marginTop: space.md }}>
              <DetailRows
                rows={[
                  ['Plant thermal energy', `${number(ccts.plant_thermal_gj)} GJ/yr`],
                  [
                    'Designated consumer threshold',
                    `${number(ccts.designated_consumer_threshold_gj)} GJ/yr`,
                  ],
                  [
                    'Voluntary CCC potential',
                    `${number(ccts.voluntary_ccc_potential_tco2e)} tCO2e`,
                  ],
                  ['Mechanism', ccts.mechanism],
                ]}
              />
            </View>
            {ccts.notes?.map((note) => (
              <Text key={note} style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
                {note}
              </Text>
            ))}
          </GlassPanel>
        </>
      ) : null}

      <SectionHeading
        index="BRSR / BRSR CORE"
        title="The readiness matrix"
        description="Working papers support disclosure under SEBI Circular 2023/122. Assurance remains external."
      />
      {brsr?.readiness?.length ? (
        <GlassPanel>
          {brsr.why ? (
            <Text style={{ ...typeScale.caption, color: colour.muted, marginBottom: space.md }}>
              {brsr.why}
            </Text>
          ) : null}
          {brsr.readiness.map((item, index) => (
            <View
              key={item.item}
              style={{
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colour.borderSecondary,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                  {item.item}
                </Text>
                <Badge tone={readinessTone(item.status)}>{item.status.toUpperCase()}</Badge>
              </View>
              {item.value_tco2e === null || item.value_tco2e === undefined ? null : (
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                  {number(item.value_tco2e)} tCO2e reported
                </Text>
              )}
              {item.note ? (
                <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
                  {item.note}
                </Text>
              ) : null}
            </View>
          ))}
          {brsr.total_disclosed_tco2e === null || brsr.total_disclosed_tco2e === undefined ? null : (
            <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: space.sm }}>
              Total disclosed: {number(brsr.total_disclosed_tco2e)} tCO2e
            </Text>
          )}
        </GlassPanel>
      ) : (
        <EmptyState
          title="Readiness data not supplied"
          body="The engine must return evidence-based statuses for this plant."
        />
      )}

      {factoryId ? (
        <>
          <SectionHeading
            index="RULE PACKS"
            title="What the versioned rule packs flagged"
            description="Each line says where its status came from, so nothing has to be guessed at."
          />
          {readiness.isLoading ? <Loading label="Reading readiness" /> : null}
          {readiness.data?.items?.length ? (
            <GlassPanel>
              {readiness.data.items.map((item, index) => (
                <View
                  key={item.key}
                  style={{
                    paddingVertical: space.md,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colour.borderSecondary,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                      {item.label}
                    </Text>
                    <Badge tone={readinessTone(item.status)}>{item.status.toUpperCase()}</Badge>
                  </View>
                  {item.detail ? (
                    <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
                      {item.detail}
                    </Text>
                  ) : null}
                  <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
                    Basis: {item.basis}
                    {item.open_case_count ? ` · ${item.open_case_count} open case(s)` : ''}
                  </Text>
                </View>
              ))}
            </GlassPanel>
          ) : null}
          <Button
            title="Re-evaluate the rule packs"
            variant="secondary"
            loading={evaluate.isPending}
            onPress={() => evaluate.mutate()}
          />
          {evaluate.isError ? <Note tone="warning">{describeError(evaluate.error)}</Note> : null}

          {cases.data?.length ? (
            <>
              <SectionHeading
                title="Open compliance cases"
                description="A case is a tracked gap with an owner, not a penalty."
              />
              {cases.data.map((item) => (
                <GlassPanel key={item.id} tone={item.is_overdue ? 'danger' : 'default'}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                      {item.title}
                    </Text>
                    <Badge tone={item.is_overdue ? 'critical' : 'accent'}>
                      {humanise(item.status)}
                    </Badge>
                  </View>
                  {item.reason ? (
                    <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
                      {item.reason}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: space.sm }}>
                    <DetailRows
                      rows={[
                        ['Rule', `${item.rule_pack} ${item.rule_pack_version} · ${item.rule_id}`],
                        ['Severity', humanise(item.severity)],
                        ['Evidence on file', number(item.evidence_count)],
                        ['Due', item.due_date ?? 'Not set'],
                      ]}
                    />
                  </View>
                  {item.required_evidence?.length ? (
                    <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 6 }}>
                      Needs: {item.required_evidence.join(', ')}
                    </Text>
                  ) : null}
                </GlassPanel>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {result.compliance.sector_flags?.length ? (
        <>
          <SectionHeading title="Sector considerations" />
          <GlassPanel tone="inset">
            {result.compliance.sector_flags.map((flag) => (
              <Text key={flag} style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
                · {flag}
              </Text>
            ))}
          </GlassPanel>
        </>
      ) : null}

      <Note tone="warning">
        {readiness.data?.caveat ??
          'Readiness and risk screening only. PRANGARA reports what evidence exists and what a versioned rule pack flagged. It does not determine legal compliance, provide assurance, or act as a regulator or verifier.'}
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
