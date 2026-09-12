/**
 * What-if simulator. The web app's `/scenarios` (PRD FR-34).
 *
 * A scenario modifies the *engine input* and reruns the same engine on the
 * server. Nothing here calculates an emission: the phone sends a named,
 * closed-set modification and displays what the engine returns, including any
 * modification the engine could not express - a scenario that silently does
 * nothing is worse than one that says it cannot.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { scenarios as scenariosApi } from '../api/endpoints';
import { DeltaBars } from '../components/charts';
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
import { Button, Chip, EmptyState, Loading, Note } from '../components/ui';
import { label as humanise, number } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { ScenarioComparison, ScenarioModification } from '../api/types';
import type { RootStackParams } from '../navigation/types';

const STEPS = [0, 10, 20, 30, 50];

/** Fuels the engine's registry can switch to. Anything else is declared unsupported. */
const FUEL_TARGETS: { key: string; label: string }[] = [
  { key: 'BIOMASS_BRIQUETTE', label: 'Biomass briquette' },
  { key: 'PNG_NATURAL_GAS', label: 'Piped natural gas' },
];

export default function ScenariosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const result = workspace.assessment;
  const factoryId = workspace.source === 'live' ? workspace.factoryId : null;

  const [efficiency, setEfficiency] = useState(0);
  const [solar, setSolar] = useState(30);
  const [recycled, setRecycled] = useState(0);
  const [recycledTarget, setRecycledTarget] = useState<string | null>(null);
  const [fuelFrom, setFuelFrom] = useState<string | null>(null);
  const [fuelTo, setFuelTo] = useState<string | null>(null);
  const [waste, setWaste] = useState(0);
  const [output, setOutput] = useState(0);
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  const materialTargets = useMemo(() => {
    const streams = result?.footprint.streams ?? [];
    return streams
      .filter((stream) => stream.key.startsWith('material_'))
      .map((stream) => ({
        key: stream.key.replace('material_', ''),
        label: stream.label.replace('Purchased ', ''),
      }));
  }, [result]);

  const fuelSources = useMemo(() => {
    const streams = result?.footprint.streams ?? [];
    return streams
      .filter((stream) => stream.scope === 1 && stream.factor_keys?.length)
      .map((stream) => ({ key: stream.factor_keys?.[0] as string, label: stream.label }));
  }, [result]);

  const saved = useQuery({
    queryKey: ['scenarios', factoryId],
    queryFn: () => scenariosApi.list(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const modifications = useMemo<ScenarioModification[]>(() => {
    const items: ScenarioModification[] = [];
    if (efficiency > 0) items.push({ kind: 'electricity_efficiency_pct', value: efficiency });
    if (solar > 0) items.push({ kind: 'solar_share_pct', value: solar });
    if (recycled > 0 && recycledTarget) {
      items.push({ kind: 'recycled_material_pct', value: recycled, target_key: recycledTarget });
    }
    if (fuelFrom && fuelTo) {
      items.push({
        kind: 'fuel_switch',
        value: 100,
        target_key: fuelFrom,
        replacement_key: fuelTo,
      });
    }
    if (waste > 0) items.push({ kind: 'waste_recovery_pct', value: waste });
    if (output !== 0) items.push({ kind: 'output_change_pct', value: output });
    return items;
  }, [efficiency, solar, recycled, recycledTarget, fuelFrom, fuelTo, waste, output]);

  const run = useMutation({
    mutationFn: async () => {
      if (!factoryId) throw new Error('Sign in and select a plant to run a scenario.');
      if (!modifications.length) throw new Error('Choose at least one change to simulate.');
      const scenario = await scenariosApi.create(factoryId, {
        name: `Mobile scenario ${new Date().toLocaleDateString('en-IN')}`,
        description: 'Created from the mobile companion',
        baseline_assessment_id: workspace.assessmentId,
        modifications,
      });
      return scenariosApi.run(scenario.id);
    },
    onSuccess: (data) => {
      setError(null);
      setComparison(data);
      queryClient.invalidateQueries({ queryKey: ['scenarios', factoryId] });
    },
    onError: (exception) => setError(describeError(exception)),
  });

  const reset = () => {
    setEfficiency(0);
    setSolar(0);
    setRecycled(0);
    setRecycledTarget(null);
    setFuelFrom(null);
    setFuelTo(null);
    setWaste(0);
    setOutput(0);
    setComparison(null);
    setError(null);
  };

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ANALYZE / WHAT-IF SIMULATOR"
        title="Test operational shifts before capital allocation."
        description="Solar offset, fuel switching, recycled feedstock and output scaling, run against your baseline by the same engine."
        meta={workspace.plantName}
      />

      {!factoryId ? (
        <GlassPanel tone="warning">
          <Badge tone="high">SIGN IN REQUIRED</Badge>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
            A scenario reruns the deterministic engine against your stored plant data on the
            server. The app will not approximate one locally, so this module needs a signed-in
            plant with a baseline assessment.
          </Text>
          <Button
            title="Go to sign in"
            variant="secondary"
            onPress={() => navigation.navigate('Tabs', { screen: 'Account' })}
            style={{ marginTop: space.md }}
          />
        </GlassPanel>
      ) : null}

      {error ? <Note tone="warning">{error}</Note> : null}

      <SectionHeading
        index="CONTROLS"
        title="Choose what changes"
        description="Each control maps to one named engine input transformation."
      />

      <GlassPanel>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
          Electricity efficiency saving
        </Text>
        <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
          Motors, drives and idle-load elimination. Reduces purchased kWh.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md }}>
          {STEPS.map((step) => (
            <Chip
              key={step}
              label={`${step}%`}
              selected={efficiency === step}
              onPress={() => setEfficiency(step)}
            />
          ))}
        </View>
      </GlassPanel>

      <GlassPanel>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>Rooftop solar share</Text>
        <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
          Self-generation displaces grid units, so the Scope 2 activity falls.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md }}>
          {[0, 15, 30, 45, 60].map((step) => (
            <Chip
              key={step}
              label={`${step}%`}
              selected={solar === step}
              onPress={() => setSolar(step)}
            />
          ))}
        </View>
      </GlassPanel>

      {materialTargets.length ? (
        <GlassPanel>
          <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
            Recycled feedstock substitution
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
            Only pairs the factor registry actually holds can be modelled.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md }}>
            {materialTargets.map((target) => (
              <Chip
                key={target.key}
                label={target.label}
                selected={recycledTarget === target.key}
                onPress={() => setRecycledTarget(target.key)}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm }}>
            {STEPS.map((step) => (
              <Chip
                key={step}
                label={`${step}%`}
                selected={recycled === step}
                onPress={() => setRecycled(step)}
              />
            ))}
          </View>
        </GlassPanel>
      ) : null}

      {fuelSources.length ? (
        <GlassPanel>
          <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>Fuel switch</Text>
          <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
            Replace a burnt fuel with a lower-carbon one at the same delivered energy.
          </Text>
          <Text style={{ ...typeScale.micro, color: colour.subtle, marginTop: space.md }}>
            FROM
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {fuelSources.map((fuel) => (
              <Chip
                key={fuel.key}
                label={fuel.label}
                selected={fuelFrom === fuel.key}
                onPress={() => setFuelFrom(fuel.key)}
              />
            ))}
          </View>
          <Text style={{ ...typeScale.micro, color: colour.subtle, marginTop: space.sm }}>TO</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {FUEL_TARGETS.map((fuel) => (
              <Chip
                key={fuel.key}
                label={fuel.label}
                selected={fuelTo === fuel.key}
                onPress={() => setFuelTo(fuel.key)}
              />
            ))}
          </View>
        </GlassPanel>
      ) : null}

      <GlassPanel>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>Waste recovery</Text>
        <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
          Diversion of landfilled waste into recovery.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md }}>
          {STEPS.map((step) => (
            <Chip
              key={step}
              label={`${step}%`}
              selected={waste === step}
              onPress={() => setWaste(step)}
            />
          ))}
        </View>
      </GlassPanel>

      <GlassPanel>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>Output change</Text>
        <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
          Output alone moves intensity, not absolute emissions. Deliberately so.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.md }}>
          {[-20, -10, 0, 10, 20].map((step) => (
            <Chip
              key={step}
              label={`${step > 0 ? '+' : ''}${step}%`}
              selected={output === step}
              onPress={() => setOutput(step)}
            />
          ))}
        </View>
      </GlassPanel>

      <Button
        title={`Run this scenario (${modifications.length} change${
          modifications.length === 1 ? '' : 's'
        })`}
        onPress={() => run.mutate()}
        loading={run.isPending}
        disabled={!factoryId || !modifications.length}
      />
      <Button
        title="Reset to baseline"
        variant="ghost"
        onPress={reset}
        style={{ marginTop: space.sm }}
      />

      {run.isPending ? <Loading label="Rerunning the engine" /> : null}

      {comparison ? (
        <>
          <SectionHeading
            index="RESULT"
            title="Baseline against scenario"
            description="Both numbers are engine output. The baseline is untouched."
          />
          <GlassPanel tone={(comparison.delta_tco2e ?? 0) < 0 ? 'positive' : 'default'}>
            <Text style={{ ...typeScale.micro, color: colour.subtle }}>CHANGE IN FOOTPRINT</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
              <Text
                style={{
                  ...typeScale.display,
                  color: (comparison.delta_tco2e ?? 0) < 0 ? colour.secondary : colour.critical,
                }}
              >
                {(comparison.delta_tco2e ?? 0) > 0 ? '+' : ''}
                {number(comparison.delta_tco2e)}
              </Text>
              <Text style={{ ...typeScale.caption, color: colour.muted, marginLeft: 6 }}>
                tCO2e / yr ({number(comparison.delta_pct, 1)}%)
              </Text>
            </View>
            <View style={{ marginTop: space.md }}>
              <DeltaBars
                baseline={comparison.baseline?.total_tco2e ?? result?.footprint.total_tco2e ?? 0}
                scenario={comparison.result.total_tco2e ?? 0}
              />
            </View>
            <DetailRows
              rows={[
                ['Scenario Scope 1', `${number(comparison.result.scope1_tco2e)} tCO2e`],
                ['Scenario Scope 2', `${number(comparison.result.scope2_tco2e)} tCO2e`],
                ['Scenario Scope 3', `${number(comparison.result.scope3_tco2e)} tCO2e`],
                ['Leak points', number(comparison.result.leak_count)],
                ['Data quality', `${number(comparison.result.data_quality_score)} / 100`],
              ]}
            />
          </GlassPanel>
          {comparison.unsupported.length ? (
            <GlassPanel tone="warning">
              <Badge tone="high">NOT MODELLED</Badge>
              {comparison.unsupported.map((item) => (
                <Text
                  key={item}
                  style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}
                >
                  {item}
                </Text>
              ))}
            </GlassPanel>
          ) : null}
        </>
      ) : null}

      {saved.data?.length ? (
        <>
          <SectionHeading
            title="Saved scenarios"
            description="Every run is kept against the baseline it was measured from."
          />
          {saved.data.map((scenario) => (
            <GlassPanel key={scenario.id}>
              <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>{scenario.name}</Text>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
                {(scenario.modifications?.items ?? [])
                  .map((item) => `${humanise(item.kind)} ${item.value}`)
                  .join(' · ') || 'No modifications recorded'}
              </Text>
              <Button
                title="Run again"
                variant="ghost"
                onPress={() =>
                  scenariosApi
                    .run(scenario.id)
                    .then((data) => {
                      setComparison(data);
                      setError(null);
                    })
                    .catch((exception) => setError(describeError(exception)))
                }
                style={{ marginTop: space.sm }}
              />
            </GlassPanel>
          ))}
        </>
      ) : null}

      {!comparison && factoryId ? (
        <EmptyState
          title="No scenario run yet"
          body="Pick one or more changes above and run it. The baseline assessment is never overwritten."
        />
      ) : null}

      <Note>
        A scenario run is stored separately and is excluded from the peer benchmark corpus, so a
        hypothetical never moves your sector's percentiles.
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
