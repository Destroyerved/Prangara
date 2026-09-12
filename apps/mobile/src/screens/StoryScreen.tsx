/**
 * The guided walkthrough. PRD section 32, "Demo Story", made navigable.
 *
 * Seventeen steps in the order a plant owner actually meets them, each one
 * opening the module it belongs to and saying what to look at when it gets
 * there. Progress is kept on the device so a walkthrough survives the app being
 * closed halfway through - which on a factory floor it will be.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { AskAssistantModal } from '../components/AskAssistantModal';
import {
  Badge,
  GlassPanel,
  ModuleScreen,
  PageHeading,
  SectionHeading,
} from '../components/layout';
import { Button, Note } from '../components/ui';
import { number } from '../lib/format';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RootStackParams } from '../navigation/types';

const PROGRESS_KEY = 'prangara.storyProgress';

type Step = {
  chapter: string;
  title: string;
  narrative: string;
  look: string;
  action?: { label: string; go: (helpers: Helpers) => void };
};

type Helpers = {
  navigate: NativeStackNavigationProp<RootStackParams>['navigate'];
  factoryId: string | null;
  plantName: string;
  openAsk: () => void;
  runAssessment: () => void;
};

const STEPS: Step[] = [
  {
    chapter: '01 / ARRIVE',
    title: 'The owner signs in',
    narrative:
      'A mid-size plant owner opens PRANGARA on the phone that lives in their pocket on the shop floor. One account covers every plant their organisation runs.',
    look: 'The account screen shows the session, the organisation and which API endpoint this device is talking to.',
    action: {
      label: 'Open Account',
      go: ({ navigate }) => navigate('Tabs', { screen: 'Account' }),
    },
  },
  {
    chapter: '01 / ARRIVE',
    title: 'They load the plant',
    narrative:
      'Each plant is its own record: sector, district, and whatever has been measured so far. Switching plant moves the whole app.',
    look: 'The active plant card, and the switcher underneath it with your plants and the bundled demonstration sectors.',
    action: { label: 'Open the plant switcher', go: ({ navigate }) => navigate('Tabs', { screen: 'Hub' }) },
  },
  {
    chapter: '02 / INTAKE',
    title: 'They describe the plant in their own words',
    narrative:
      'No forms to start with. The owner types what they know - "we run two boilers on coal and about forty thousand units a month" - and the extractor turns it into candidate activity records.',
    look: 'Every extracted field arrives with a confidence and a needs-confirmation flag. Nothing is written until it is confirmed.',
    action: {
      label: 'Open conversational intake',
      go: ({ navigate, factoryId, plantName }) =>
        navigate('Onboarding', { factoryId: factoryId ?? '', factoryName: plantName }),
    },
  },
  {
    chapter: '02 / INTAKE',
    title: 'Or they photograph the bill',
    narrative:
      'An electricity bill is the single biggest number in most buildings. The camera captures it, the backend extracts the units and the period, and the photograph itself is filed as the evidence.',
    look: 'The extraction and the document are linked, so a figure can always be traced back to the paper it came from.',
    action: {
      label: 'Scan a bill',
      go: ({ navigate, factoryId, plantName }) =>
        navigate('BillScan', { factoryId: factoryId ?? '', factoryName: plantName }),
    },
  },
  {
    chapter: '02 / INTAKE',
    title: 'They confirm what was extracted',
    narrative:
      'Confirmation is the moment a machine reading becomes a plant record. Until then it is a suggestion with a confidence score.',
    look: 'Each record carries a data state: declared, document-confirmed, estimated or verified.',
    action: { label: 'Open Plant Data', go: ({ navigate }) => navigate('PlantData') },
  },
  {
    chapter: '03 / ASSESS',
    title: 'They run the assessment',
    narrative:
      'The deterministic engine runs on the server. Same inputs, same version stamp, same answer - every time, for anyone who checks.',
    look: 'It takes a few seconds and stamps the engine and factor versions onto the result.',
    action: { label: 'Run the assessment', go: ({ runAssessment }) => runAssessment() },
  },
  {
    chapter: '04 / DIAGNOSE',
    title: 'Scope 1, 2 and 3, with the uncertainty',
    narrative:
      'A footprint without a band is a guess wearing a suit. Every factor carries its own uncertainty and the engine propagates it to the total.',
    look: 'The scope split, the band around the total, and the flow from each stream into the scope that owns it.',
    action: { label: 'Open Footprint', go: ({ navigate }) => navigate('Footprint', {}) },
  },
  {
    chapter: '04 / DIAGNOSE',
    title: 'The worst leak, against the peers',
    narrative:
      'A number alone does not motivate anyone. The same number next to the sector median does.',
    look: 'The critical leak, the quartile strip, and how many tonnes closing the gap to the median is worth.',
    action: { label: 'Open Leak Points', go: ({ navigate }) => navigate('LeakPoints') },
  },
  {
    chapter: '05 / ACT',
    title: 'A recommendation, with its economics',
    narrative:
      'Every intervention arrives priced: capex, annual benefit, payback, cost per tonne, and the physical reasoning behind the saving.',
    look: 'The cost of abatement on each card. A negative one means the change pays for itself.',
    action: { label: 'Open Circular Actions', go: ({ navigate }) => navigate('CircularActions', {}) },
  },
  {
    chapter: '05 / ACT',
    title: 'And one the engine refused',
    narrative:
      'This is the part that earns trust. A blocked or capped intervention is shown with its reason, because a tool that only ever says yes is a brochure.',
    look: 'The "PRANGARA said no" section, and the substitution caps above it.',
    action: { label: 'See the refusals', go: ({ navigate }) => navigate('CircularActions', {}) },
  },
  {
    chapter: '06 / INVEST',
    title: 'The cost curve',
    narrative:
      'Width is tonnes, height is rupees per tonne. Everything below the line is free money the plant has not collected yet.',
    look: 'Tap a bar for its name and figures, then read the de-rating section: reductions do not simply add up.',
    action: { label: 'Open the Portfolio', go: ({ navigate }) => navigate('Portfolio', {}) },
  },
  {
    chapter: '07 / PROCURE',
    title: 'Find someone who can do it',
    narrative:
      'A recommendation nobody can implement is a wish. Provider matching scores the directory on category fit, service area and verification.',
    look: 'The match score with its reasons, and the invite that builds a quote request.',
    action: { label: 'Open Marketplace', go: ({ navigate }) => navigate('Marketplace', {}) },
  },
  {
    chapter: '07 / PROCURE',
    title: 'Compare what came back',
    narrative:
      'Quotes are repriced through the same payback and cost-per-tonne maths as the engine estimate, so a cheaper quote with worse opex does not win by looking cheaper.',
    look: 'Revised payback and revised cost of abatement on each quote, next to the engine estimate.',
    action: { label: 'Open the quote comparison', go: ({ navigate }) => navigate('Marketplace', {}) },
  },
  {
    chapter: '08 / MOVE',
    title: 'The lower-carbon route',
    narrative:
      'Freight is the part of the footprint a plant can change with a phone call. Four operating priorities on the same corridor, each with its own carbon figure.',
    look: 'The lowest-carbon route against the fastest one, and what pooling does to the truck count.',
    action: { label: 'Open Green Logistics', go: ({ navigate }) => navigate('Logistics') },
  },
  {
    chapter: '09 / PROVE',
    title: 'Implemented, with evidence',
    narrative:
      'The action moves along its status ladder as the work happens, and the commissioning document is filed against it from the floor.',
    look: 'The tracker at the top of Circular Actions, and the document that lands in Plant Data.',
    action: {
      label: 'File a document',
      go: ({ navigate, factoryId, plantName }) =>
        navigate('EvidenceCapture', { factoryId: factoryId ?? '', factoryName: plantName }),
    },
  },
  {
    chapter: '09 / PROVE',
    title: 'Readiness, and the gaps that remain',
    narrative:
      'CBAM, CCTS and BRSR Core screening, each line saying where its status came from. Readiness is a state of evidence, never a legal determination.',
    look: 'The readiness matrix, the open cases, and the caveat that travels with the screen.',
    action: { label: 'Open Compliance', go: ({ navigate }) => navigate('Compliance') },
  },
  {
    chapter: '10 / ASK',
    title: '"Why was this flagged?"',
    narrative:
      'The last question is always the same one. The assistant answers from an approved source set and cites it, or says plainly that it cannot.',
    look: 'The citation under the answer: publisher, clause, effective date.',
    action: { label: 'Ask PRANGARA', go: ({ openAsk }) => openAsk() },
  },
];

export default function StoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const [done, setDone] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          setDone(parsed);
          setCurrent(Math.min(STEPS.length - 1, parsed.length));
        }
      })
      .catch(() => undefined);
  }, []);

  const persist = (next: string[]) => {
    setDone(next);
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const helpers: Helpers = {
    navigate: navigation.navigate,
    factoryId: workspace.source === 'live' ? workspace.factoryId : null,
    plantName: workspace.plantName,
    openAsk: () => setAskOpen(true),
    runAssessment: () => {
      if (workspace.source === 'live') workspace.run.mutate();
      else navigation.navigate('PlantData');
    },
  };

  const step = STEPS[current];
  const completed = done.includes(String(current));
  const progress = Math.round((done.length / STEPS.length) * 100);

  const markDone = () => {
    if (!completed) persist([...done, String(current)]);
    if (current < STEPS.length - 1) setCurrent(current + 1);
  };

  return (
    <ModuleScreen>
      <PageHeading
        eyebrow="GUIDED WALKTHROUGH"
        title="One plant, start to finish."
        description="The whole product in the order a plant owner meets it. Each step opens the module it belongs to."
        meta={`${workspace.plantName} · step ${current + 1} of ${STEPS.length}`}
      />

      <GlassPanel tone="inset">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ ...typeScale.micro, color: colour.subtle, flex: 1 }}>PROGRESS</Text>
          <Text style={{ ...typeScale.captionStrong, color: colour.accentStrong }}>
            {number(done.length)} of {STEPS.length} ({progress}%)
          </Text>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: colour.surfaceInset,
            marginTop: space.sm,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colour.border,
          }}
        >
          <View
            style={{
              width: `${Math.max(1, progress)}%`,
              height: '100%',
              backgroundColor: colour.accent,
            }}
          />
        </View>
        {done.length ? (
          <Button
            title="Start over"
            variant="ghost"
            onPress={() => {
              persist([]);
              setCurrent(0);
            }}
            style={{ marginTop: space.md }}
          />
        ) : null}
      </GlassPanel>

      <GlassPanel tone="accent">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ ...typeScale.micro, color: colour.accentStrong, flex: 1 }}>
            {step.chapter}
          </Text>
          {completed ? <Badge tone="positive">DONE</Badge> : null}
        </View>
        <Text style={{ ...typeScale.title, color: colour.bright, marginTop: 6 }}>{step.title}</Text>
        <Text style={{ ...typeScale.body, color: colour.muted, marginTop: space.sm }}>
          {step.narrative}
        </Text>
        <View
          style={{
            marginTop: space.md,
            padding: space.md,
            borderRadius: radius.control,
            backgroundColor: colour.surfaceInset,
            borderWidth: 1,
            borderColor: colour.border,
          }}
        >
          <Text style={{ ...typeScale.micro, color: colour.subtle }}>WHAT TO LOOK AT</Text>
          <Text style={{ ...typeScale.caption, color: colour.text, marginTop: 4 }}>
            {step.look}
          </Text>
        </View>
        {step.action ? (
          <Button
            title={step.action.label}
            onPress={() => {
              step.action?.go(helpers);
              if (!completed) persist([...done, String(current)]);
            }}
            style={{ marginTop: space.md }}
          />
        ) : null}
        <View style={{ flexDirection: 'row', marginTop: space.sm }}>
          <Button
            title="Back"
            variant="ghost"
            onPress={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            style={{ flex: 1, marginRight: space.sm }}
          />
          <Button
            title={current === STEPS.length - 1 ? 'Finish' : 'Next step'}
            variant="secondary"
            onPress={markDone}
            style={{ flex: 1 }}
          />
        </View>
      </GlassPanel>

      <SectionHeading title="All seventeen steps" description="Jump to any of them." />
      <GlassPanel style={{ paddingVertical: space.xs }}>
        {STEPS.map((item, index) => (
          <View
            key={item.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: space.md,
              borderBottomWidth: index === STEPS.length - 1 ? 0 : 1,
              borderBottomColor: colour.borderSecondary,
            }}
            onTouchEnd={() => setCurrent(index)}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 1,
                borderColor: done.includes(String(index)) ? colour.secondary : colour.border,
                backgroundColor: done.includes(String(index))
                  ? colour.positiveBg
                  : index === current
                    ? colour.selectedBg
                    : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: space.md,
              }}
            >
              <Text
                style={{
                  ...typeScale.micro,
                  color: done.includes(String(index)) ? colour.secondary : colour.muted,
                }}
              >
                {done.includes(String(index)) ? '✓' : index + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...typeScale.captionStrong,
                  color: index === current ? colour.accentStrong : colour.text,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 1 }}>
                {item.chapter}
              </Text>
            </View>
          </View>
        ))}
      </GlassPanel>

      <Note>
        The walkthrough navigates the real app against whichever plant is active. On the bundled
        demonstration profile the capture and procurement steps are read-only.
      </Note>

      <AskAssistantModal visible={askOpen} onClose={() => setAskOpen(false)} />
    </ModuleScreen>
  );
}
