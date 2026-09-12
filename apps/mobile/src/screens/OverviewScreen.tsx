/**
 * Assessment overview. The web app's `/overview`, on a phone.
 *
 * Same order, same claims: the cash-positive hero first because it is the only
 * number that starts a conversation with a plant owner, then the footprint with
 * its band, then diagnose, act, invest and prepare as numbered sections.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { MaccChart, ScopeBand, UncertaintyBar } from '../components/charts';
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
import { AskAssistantModal } from '../components/AskAssistantModal';
import { Button, EmptyState, Loading, Note, SeverityBadge } from '../components/ui';
import { money, number, payback, portfolioLabels } from '../lib/format';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import { scopeRows, useWorkspace } from '../workspace/WorkspaceContext';
import type { PortfolioMode } from '../api/types';
import type { RootStackParams } from '../navigation/types';

export default function OverviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const result = workspace.assessment;
  const [mode, setMode] = useState<PortfolioMode>('cash_positive_only');
  const [askOpen, setAskOpen] = useState(false);

  if (workspace.loading && !result) {
    return <Loading label="Loading your workspace" />;
  }

  if (!result) {
    return (
      <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
        <PageHeading
          eyebrow="WORKSPACE / OVERVIEW"
          title="Assessment overview"
          description="A clearer footprint. A stronger business case."
        />
        <EmptyState
          title="This plant has not been assessed yet"
          body="Add your electricity and fuel use, then run the assessment. It takes a few seconds."
          actionLabel="Add plant data"
          onAction={() => navigation.navigate('Tabs')}
        />
      </ModuleScreen>
    );
  }

  const portfolios = result.recommendations.portfolio;
  const cash = portfolios.cash_positive_only;
  const quick = portfolios.quick_wins;
  const all = portfolios.all;
  const scopes = scopeRows(result);
  const quickWins = result.recommendations.recommendations
    .filter((rec) => rec.payback_yrs !== null && rec.payback_yrs <= 2 && rec.difficulty <= 2)
    .sort((a, b) => b.net_annual_benefit_inr - a.net_annual_benefit_inr)
    .slice(0, 4);
  const curve = result.recommendations.macc_curve ?? [];
  const filteredCurve =
    mode === 'all'
      ? curve
      : mode === 'cash_positive_only'
        ? curve.filter((bar) => bar.cash_positive)
        : curve.filter((bar) =>
            quickWins.some((rec) => rec.id === bar.id),
          );

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="WORKSPACE / OVERVIEW"
        title="Assessment overview"
        description="A clearer footprint. A stronger business case."
        meta={`${workspace.plantName} · Annual snapshot · Screening grade`}
      />

      {workspace.isDemo ? (
        <GlassPanel tone="warning" style={{ paddingVertical: space.md }}>
          <Badge tone="high">DEMONSTRATION DATA</Badge>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
            These are engine demonstration values for {workspace.sectorLabel}, not measurements
            from your plant. Sign in and run an assessment to see your own numbers.
          </Text>
        </GlassPanel>
      ) : null}

      {/* The financial hero. */}
      <GlassPanel tone="accent">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: colour.secondary,
              marginRight: 7,
            }}
          />
          <Text style={{ ...typeScale.micro, color: colour.secondary }}>
            YOUR CASH-POSITIVE OPPORTUNITY
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space.sm }}>
          <Text style={{ ...typeScale.hero, color: colour.bright }}>
            {money(cash?.net_annual_benefit_inr)}
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginLeft: 6 }}>/ yr</Text>
        </View>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
          Potential annual net benefit
        </Text>
        <View style={{ marginTop: space.md }}>
          <DetailRows
            rows={[
              ['Indicative investment', money(cash?.capex_inr)],
              ['Blended payback', payback(cash?.blended_payback_yrs ?? null)],
              ['Interventions', `${number(cash?.count)} cash positive`],
            ]}
          />
        </View>
        <Button
          title="Explore the cash-positive portfolio"
          onPress={() => navigation.navigate('Portfolio', { mode: 'cash_positive_only' })}
          style={{ marginTop: space.md }}
        />
      </GlassPanel>

      {/* The carbon hero. */}
      <GlassPanel onPress={() => navigation.navigate('Footprint', {})}>
        <Text style={{ ...typeScale.micro, color: colour.subtle }}>ANNUAL CARBON FOOTPRINT</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space.sm }}>
          <Text style={{ ...typeScale.hero, color: colour.bright }}>
            {number(result.footprint.total_tco2e)}
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginLeft: 6 }}>
            tCO2e / year
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ ...typeScale.caption, color: colour.muted, flex: 1 }}>
            {number(result.footprint.total_range.low)} to{' '}
            {number(result.footprint.total_range.high)} tCO2e
          </Text>
          <Badge tone="neutral">±{number(result.footprint.uncertainty_pct, 1)}%</Badge>
        </View>
        <View style={{ marginTop: space.md }}>
          <UncertaintyBar
            low={result.footprint.total_range.low}
            base={result.footprint.total_range.base}
            high={result.footprint.total_range.high}
          />
          <ScopeBand
            scopes={scopes}
            onPressScope={(scope) => navigation.navigate('Footprint', { scope })}
          />
        </View>
        <View
          style={{
            marginTop: space.lg,
            padding: space.md,
            borderRadius: radius.control,
            backgroundColor: colour.selectedBg,
            borderWidth: 1,
            borderColor: colour.borderHighlight,
          }}
        >
          <Text style={{ ...typeScale.numeric, fontSize: 22, color: colour.accentStrong }}>
            {number(cash?.abatement_pct, 1)}%
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}>
            of your footprint could be removed at no net cost.
          </Text>
        </View>
      </GlassPanel>

      {/* The sovereign assistant, same placement as the web rail. */}
      <GlassPanel tone="positive">
        <Text style={{ ...typeScale.micro, color: colour.secondary }}>SOVEREIGN COPILOT</Text>
        <Text style={{ ...typeScale.heading, color: colour.text, marginTop: 4 }}>
          Ask PRANGARA
        </Text>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}>
          Statutory reasoning with verified citations: BEE PAT, SEBI BRSR Core, CEA grid factors
          and EU CBAM.
        </Text>
        <Button
          title="Ask a question"
          variant="secondary"
          onPress={() => setAskOpen(true)}
          style={{ marginTop: space.md }}
        />
      </GlassPanel>

      <Metrics
        items={[
          {
            label: 'Cash-positive abatement',
            value: number(cash?.abatement_tco2e),
            unit: 'tCO2e',
            onPress: () => navigation.navigate('Portfolio', { mode: 'cash_positive_only' }),
          },
          { label: 'Total available abatement', value: number(all?.abatement_tco2e), unit: 'tCO2e' },
          { label: 'Quick wins to start with', value: number(quick?.count), unit: 'actions' },
          {
            label: 'Quick-win annual benefit',
            value: money(quick?.net_annual_benefit_inr),
            unit: '/ yr',
            positive: true,
          },
        ]}
      />

      <SectionHeading
        index="01 / DIAGNOSE"
        title="Where carbon is leaking"
        description="Sector performance gaps and concentrated carbon streams."
        actionLabel="View all leak points"
        onAction={() => navigation.navigate('LeakPoints')}
      />
      {result.leaks.leaks.length ? (
        result.leaks.leaks.slice(0, 3).map((leak) => (
          <GlassPanel key={`${leak.stream_key}-${leak.rule}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ ...typeScale.heading, color: colour.text, flex: 1 }}>
                {leak.label}
              </Text>
              <SeverityBadge severity={leak.severity} />
            </View>
            <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
              {leak.finding}
            </Text>
            <View style={{ marginTop: space.md }}>
              <DetailRows
                rows={[
                  ['Share of footprint', `${number(leak.share_pct, 1)}%`],
                  ['Stream emissions', `${number(leak.tco2e)} tCO2e`],
                  [
                    'Recoverable to median',
                    leak.gap_to_median_tco2e
                      ? `${number(leak.gap_to_median_tco2e)} tCO2e`
                      : 'Not applicable',
                  ],
                ]}
              />
            </View>
          </GlassPanel>
        ))
      ) : (
        <EmptyState
          title="No leak findings for this plant"
          body="The engine found no stream above its sector threshold. That is a good result, not a missing one."
        />
      )}

      <SectionHeading
        index="02 / ACT"
        title="Best moves right now"
        description="Low complexity. Short payback. A practical place to begin."
        actionLabel="Explore quick wins"
        onAction={() => navigation.navigate('CircularActions', { view: 'quick_wins' })}
      />
      {quickWins.length ? (
        <GlassPanel>
          {quickWins.map((rec, index) => (
            <View
              key={rec.id}
              style={{
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colour.borderSecondary,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                  {rec.name}
                </Text>
                <Badge tone={rec.cash_positive ? 'positive' : 'cost'}>
                  {rec.cash_positive ? 'CASH POSITIVE' : 'NET COST'}
                </Badge>
              </View>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                {number(rec.portfolio_abatement_tco2e)} tCO2e/yr · {money(rec.capex_inr)} capex ·{' '}
                {payback(rec.payback_yrs)} payback
              </Text>
            </View>
          ))}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: space.md,
              paddingTop: space.md,
              borderTopWidth: 1,
              borderTopColor: colour.borderSecondary,
            }}
          >
            <Text style={{ ...typeScale.caption, color: colour.muted }}>
              {money(quick?.capex_inr)} investment
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.muted }}>
              {payback(quick?.blended_payback_yrs ?? null)} blended
            </Text>
          </View>
        </GlassPanel>
      ) : (
        <EmptyState
          title="No quick wins in this portfolio"
          body="Every priced intervention here needs either capital or more than two years to pay back."
        />
      )}

      <SectionHeading
        index="03 / INVEST"
        title="The cost of cutting carbon"
        description="A negative cost per tonne identifies a cash-positive option."
        actionLabel="Open the portfolio"
        onAction={() => navigation.navigate('Portfolio', {})}
      />
      <GlassPanel>
        <Text style={{ ...typeScale.micro, color: colour.subtle, marginBottom: space.sm }}>
          MARGINAL ABATEMENT COST CURVE
        </Text>
        <Segmented
          value={mode}
          onChange={setMode}
          options={(Object.keys(portfolioLabels) as PortfolioMode[]).map((value) => ({
            value,
            label: portfolioLabels[value],
          }))}
        />
        <View style={{ marginTop: space.md }}>
          <MaccChart curve={filteredCurve} />
        </View>
      </GlassPanel>

      <SectionHeading
        index="04 / PREPARE"
        title="Confidence for the next conversation"
        description="Know what is ready, what is missing, and what needs external review."
        actionLabel="View compliance"
        onAction={() => navigation.navigate('Compliance')}
      />
      <GlassPanel onPress={() => navigation.navigate('Compliance')}>
        <Text style={{ ...typeScale.micro, color: colour.subtle }}>CBAM / INDICATIVE</Text>
        <Text style={{ ...typeScale.heading, color: colour.text, marginTop: 4 }}>
          {result.compliance.cbam.indicative_annual_cost_inr === null ||
          result.compliance.cbam.indicative_annual_cost_inr === undefined
            ? result.compliance.cbam.status === 'phase_2_watchlist'
              ? 'Phase 2 watchlist (exempt)'
              : 'Exempt in Phase 1'
            : money(result.compliance.cbam.indicative_annual_cost_inr)}
        </Text>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
          {result.compliance.cbam.applicable
            ? 'Confirm product CN codes and the net EU benchmark allowance.'
            : 'Sector is outside CBAM Phase 1 border tariffs on this screening.'}
        </Text>
      </GlassPanel>
      {result.compliance.ccts ? (
        <GlassPanel onPress={() => navigation.navigate('Compliance')}>
          <Text style={{ ...typeScale.micro, color: colour.subtle }}>INDIA CCTS / BEE</Text>
          <Text style={{ ...typeScale.heading, color: colour.text, marginTop: 4 }}>
            {result.compliance.ccts.status === 'obligated'
              ? 'Obligated designated consumer'
              : `Voluntary eligible · ${number(
                  result.compliance.ccts.voluntary_ccc_potential_tco2e,
                )} CCCs`}
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
            {result.compliance.ccts.mechanism}
          </Text>
        </GlassPanel>
      ) : null}

      <Note>
        {result.claim_boundary ??
          'Screening and decision support. Not a BEE-accredited audit, legal assurance service, regulator or carbon-credit verifier.'}
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />

      <AskAssistantModal visible={askOpen} onClose={() => setAskOpen(false)} />
    </ModuleScreen>
  );
}
