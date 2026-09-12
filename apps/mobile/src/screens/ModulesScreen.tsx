/**
 * Module hub.
 *
 * The web app's sidebar, in a form that works with a thumb: the same groups in
 * the same order with the same labels, so someone who has used the dashboard
 * knows where they are. The plant switcher lives here too, because on a phone
 * there is no room for a persistent one.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { AskAssistantModal } from '../components/AskAssistantModal';
import {
  Badge,
  GlassPanel,
  ModuleScreen,
  NavRow,
  PageHeading,
  SectionHeading,
} from '../components/layout';
import { Button, Chip, Loading } from '../components/ui';
import { number } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RootStackParams } from '../navigation/types';

type Target = keyof RootStackParams;

const GROUPS: { group: string; items: { label: string; target: Target; hint: string }[] }[] = [
  {
    group: 'ASSESS',
    items: [
      {
        label: 'Plant Data',
        target: 'PlantData',
        hint: 'Activity inventory, evidence and audit trail',
      },
    ],
  },
  {
    group: 'ANALYZE',
    items: [
      { label: 'Footprint', target: 'Footprint', hint: 'Scopes, streams and the emission flow' },
      { label: 'Leak Points', target: 'LeakPoints', hint: 'Where performance escapes' },
      { label: 'What-If Simulator', target: 'Scenarios', hint: 'Rerun the engine on a change' },
    ],
  },
  {
    group: 'ACT',
    items: [
      { label: 'Circular Actions', target: 'CircularActions', hint: 'Priced interventions and refusals' },
      { label: 'Abatement Portfolio', target: 'Portfolio', hint: 'The cost curve and de-rating' },
      { label: 'Marketplace & RFQs', target: 'Marketplace', hint: 'Providers, quotes and materials' },
      { label: 'Green Logistics', target: 'Logistics', hint: 'Routes, pooling and backhaul' },
      { label: 'Circular Network', target: 'CircularNetwork', hint: 'Symbiosis and shared capacity' },
    ],
  },
  {
    group: 'REPORT',
    items: [
      { label: 'Compliance', target: 'Compliance', hint: 'CBAM, CCTS and BRSR readiness' },
      { label: 'Methodology', target: 'Methodology', hint: 'Sources, versions and limitations' },
    ],
  },
];

export default function ModulesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const [askOpen, setAskOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const result = workspace.assessment;

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="WORKSPACE"
        title="PRANGARA"
        description="Industrial decarbonization, from the floor."
      />

      <GlassPanel onPress={() => setSwitcherOpen((open) => !open)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typeScale.micro, color: colour.subtle }}>ACTIVE PLANT</Text>
            <Text style={{ ...typeScale.title, color: colour.bright, marginTop: 4 }}>
              {workspace.plantName}
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 2 }}>
              {workspace.sectorLabel}
            </Text>
          </View>
          <Badge tone={workspace.isDemo ? 'high' : 'positive'}>
            {workspace.isDemo ? 'DEMO' : 'LIVE'}
          </Badge>
        </View>
        {result ? (
          <View style={{ flexDirection: 'row', marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typeScale.caption, color: colour.muted }}>Footprint</Text>
              <Text style={{ ...typeScale.numeric, color: colour.text }}>
                {number(result.footprint.total_tco2e)} t
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typeScale.caption, color: colour.muted }}>Leaks</Text>
              <Text style={{ ...typeScale.numeric, color: colour.text }}>
                {number(result.leaks.leak_count)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typeScale.caption, color: colour.muted }}>Available</Text>
              <Text style={{ ...typeScale.numeric, color: colour.secondary }}>
                {number(result.headline.cash_positive_abatement_pct, 1)}%
              </Text>
            </View>
          </View>
        ) : null}
        <Text style={{ ...typeScale.caption, color: colour.accent, marginTop: space.md }}>
          {switcherOpen ? 'Hide plants' : 'Switch plant'}
        </Text>
      </GlassPanel>

      {switcherOpen ? (
        <GlassPanel tone="inset">
          {workspace.factories.isLoading ? <Loading label="Loading your plants" /> : null}
          {workspace.factories.data?.length ? (
            <>
              <Text style={{ ...typeScale.micro, color: colour.subtle }}>YOUR PLANTS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm }}>
                {workspace.factories.data.map((factory) => (
                  <Chip
                    key={factory.id}
                    label={factory.name}
                    selected={!workspace.isDemo && workspace.factoryId === factory.id}
                    onPress={() => workspace.selectFactory(factory.id)}
                  />
                ))}
              </View>
            </>
          ) : null}
          <Text style={{ ...typeScale.micro, color: colour.subtle, marginTop: space.md }}>
            DEMONSTRATION SECTORS
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
            Bundled engine results. They work with no network at all.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm }}>
            {workspace.demoSectors.map((sector) => (
              <Chip
                key={sector.key}
                label={sector.label.split(',')[0]}
                selected={workspace.isDemo && workspace.demoSector === sector.key}
                onPress={() => workspace.selectDemoSector(sector.key)}
              />
            ))}
          </View>
        </GlassPanel>
      ) : null}

      <GlassPanel tone="accent">
        <Text style={{ ...typeScale.micro, color: colour.accentStrong }}>GUIDED WALKTHROUGH</Text>
        <Text style={{ ...typeScale.heading, color: colour.text, marginTop: 4 }}>
          The whole story, in order
        </Text>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
          Seventeen steps from sign-in to verified abatement, each one opening the module it
          belongs to.
        </Text>
        <Button
          title="Start the walkthrough"
          onPress={() => navigation.navigate('Story')}
          style={{ marginTop: space.md }}
        />
      </GlassPanel>

      <GlassPanel tone="positive">
        <Text style={{ ...typeScale.micro, color: colour.secondary }}>SOVEREIGN COPILOT</Text>
        <Text style={{ ...typeScale.heading, color: colour.text, marginTop: 4 }}>Ask PRANGARA</Text>
        <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 4 }}>
          Statutory answers with citations, wherever you are standing.
        </Text>
        <Button
          title="Ask a question"
          variant="secondary"
          onPress={() => setAskOpen(true)}
          style={{ marginTop: space.md }}
        />
      </GlassPanel>

      <SectionHeading index="CONNECTED" title="Your workspace" />
      <GlassPanel style={{ paddingVertical: space.xs }}>
        <NavRow
          label="Overview"
          description="The assessment at a glance"
          onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
        />
        <NavRow
          label="Your plants"
          description="Every factory this account can see, and add a new one"
          onPress={() => navigation.navigate('Factories')}
        />
        <NavRow
          label="Notifications"
          description="Alerts raised against your plants"
          onPress={() => navigation.navigate('Tabs', { screen: 'Alerts' })}
        />
        <NavRow
          label="Account"
          description="Session, organisation and API endpoint"
          onPress={() => navigation.navigate('Tabs', { screen: 'Account' })}
        />
      </GlassPanel>

      {GROUPS.map((group) => (
        <View key={group.group}>
          <SectionHeading index={group.group} />
          <GlassPanel style={{ paddingVertical: space.xs }}>
            {group.items.map((item) => (
              <NavRow
                key={item.target}
                label={item.label}
                description={item.hint}
                onPress={() => navigation.navigate(item.target as never)}
              />
            ))}
          </GlassPanel>
        </View>
      ))}

      <AskAssistantModal visible={askOpen} onClose={() => setAskOpen(false)} />
    </ModuleScreen>
  );
}
