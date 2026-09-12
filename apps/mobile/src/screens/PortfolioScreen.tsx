/**
 * Abatement portfolio. The web app's `/portfolio`.
 *
 * The MACC plus the honest part: portfolio totals apply each intervention to
 * what the previous one leaves behind, so standalone and de-rated tonnes are
 * both shown and the difference is explained rather than hidden.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { MaccChart } from '../components/charts';
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
import { Button, EmptyState, Note } from '../components/ui';
import { money, number, payback, portfolioLabels } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { PortfolioMode, Recommendation } from '../api/types';
import type { RootStackParams } from '../navigation/types';

function isQuickWin(rec: Recommendation) {
  return rec.payback_yrs !== null && rec.payback_yrs <= 2 && rec.difficulty <= 2;
}

export default function PortfolioScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'Portfolio'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const result = workspace.assessment;
  const [mode, setMode] = useState<PortfolioMode>(
    (route.params?.mode as PortfolioMode) ?? 'cash_positive_only',
  );

  if (!result) {
    return (
      <ModuleScreen>
        <PageHeading
          eyebrow="ACT / ABATEMENT PORTFOLIO"
          title="Put capital where it counts."
          description="A costed view of the opportunities across your plant."
        />
        <EmptyState
          title="No costed portfolio yet"
          body="The cost curve is built from an assessment. Run one and it appears here."
        />
      </ModuleScreen>
    );
  }

  const stats = result.recommendations.portfolio[mode];
  const curve = result.recommendations.macc_curve ?? [];
  const items = result.recommendations.recommendations;
  const selected =
    mode === 'all'
      ? items
      : mode === 'cash_positive_only'
        ? items.filter((rec) => rec.cash_positive)
        : items.filter(isQuickWin);
  const selectedIds = new Set(selected.map((rec) => rec.id));
  const shownCurve = mode === 'all' ? curve : curve.filter((bar) => selectedIds.has(bar.id));
  const deRated = selected.filter(
    (rec) => rec.portfolio_abatement_tco2e < rec.abatement_tco2e - 0.05,
  );

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ACT / ABATEMENT PORTFOLIO"
        title="Put capital where it counts."
        description="A costed view of the opportunities across your plant."
        meta={workspace.plantName}
      />

      <View style={{ marginBottom: space.md }}>
        <Segmented
          value={mode}
          onChange={setMode}
          options={(Object.keys(portfolioLabels) as PortfolioMode[]).map((value) => ({
            value,
            label: portfolioLabels[value],
          }))}
        />
      </View>

      <Metrics
        items={[
          { label: 'Interventions', value: number(stats?.count) },
          { label: 'Abatement', value: number(stats?.abatement_tco2e), unit: 'tCO2e' },
          { label: 'Capital required', value: money(stats?.capex_inr) },
          {
            label: 'Annual net benefit',
            value: money(stats?.net_annual_benefit_inr),
            unit: '/ yr',
            positive: (stats?.net_annual_benefit_inr ?? 0) > 0,
          },
        ]}
      />
      <GlassPanel tone="inset">
        <DetailRows
          rows={[
            ['Share of footprint', `${number(stats?.abatement_pct, 1)}%`],
            ['Blended payback', payback(stats?.blended_payback_yrs ?? null)],
            ['Portfolio NPV', money(stats?.npv_inr)],
          ]}
        />
      </GlassPanel>

      <SectionHeading
        title="Marginal Abatement Cost Curve"
        description="Width is tonnes removed. Height is the levelised cost of each tonne."
      />
      <GlassPanel>
        <MaccChart curve={shownCurve} height={260} />
      </GlassPanel>

      <SectionHeading
        index="INTERACTION DE-RATING"
        title="Reductions do not simply add up."
        description="Each intervention applies to what the previous one leaves behind."
      />
      {deRated.length ? (
        <GlassPanel>
          {deRated.map((rec, index) => (
            <View
              key={rec.id}
              style={{
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colour.borderSecondary,
              }}
            >
              <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>{rec.name}</Text>
              <View style={{ marginTop: 6 }}>
                <DetailRows
                  rows={[
                    ['Standalone', `${number(rec.abatement_tco2e)} tCO2e`],
                    ['In this portfolio', `${number(rec.portfolio_abatement_tco2e)} tCO2e`],
                    [
                      'De-rated by',
                      `${number(rec.abatement_tco2e - rec.portfolio_abatement_tco2e)} tCO2e`,
                    ],
                  ]}
                />
              </View>
            </View>
          ))}
        </GlassPanel>
      ) : (
        <EmptyState
          title="Nothing in this portfolio overlaps"
          body="Each selected intervention targets a different stream, so standalone and portfolio tonnes agree."
        />
      )}

      <SectionHeading
        title="Ranked interventions"
        description="Ordered by cost of abatement, cheapest tonne first."
      />
      {selected.length ? (
        selected
          .slice()
          .sort((a, b) => a.lcoa_inr_per_tco2e - b.lcoa_inr_per_tco2e)
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
              <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
                {rec.physical_note || rec.description}
              </Text>
              <View style={{ marginTop: space.md }}>
                <DetailRows
                  rows={[
                    ['Cost of abatement', `${money(rec.lcoa_inr_per_tco2e)} / tCO2e`],
                    ['Abatement in portfolio', `${number(rec.portfolio_abatement_tco2e)} tCO2e`],
                    ['Capex', money(rec.capex_inr)],
                    ['Annual net benefit', `${money(rec.net_annual_benefit_inr)} / yr`],
                    ['Payback', payback(rec.payback_yrs)],
                    ['NPV', money(rec.npv_inr)],
                    ['Confidence', rec.confidence],
                  ]}
                />
              </View>
              {rec.substitution_capped && rec.restriction_note ? (
                <Note tone="warning">{rec.restriction_note}</Note>
              ) : null}
              <Button
                title="Find a provider for this"
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
          title="This portfolio is empty"
          body="No intervention met the filter. Switch to all interventions to see the full set."
        />
      )}

      <Note>
        {String(
          result.recommendations.assumptions?.derating_note ??
            'Portfolio totals apply each intervention to the residual stream in cost order, not to the original baseline.',
        )}
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
