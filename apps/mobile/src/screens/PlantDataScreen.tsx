/**
 * Plant data. The web app's `/assessment`.
 *
 * What is on record for this plant and where each figure came from: the
 * activity inventory with its data state, the documents filed against it, the
 * audit trail, and the four ways to add something from a phone.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import {
  evidence as evidenceApi,
  factories as factoriesApi,
  governance as governanceApi,
} from '../api/endpoints';
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
import {
  Button,
  DataStateBadge,
  EmptyState,
  ErrorState,
  Loading,
  Note,
} from '../components/ui';
import { label as humanise, number, relativeTime } from '../lib/format';
import { colour, space, type as typeScale } from '../theme/tokens';
import { useWorkspace } from '../workspace/WorkspaceContext';
import type { RootStackParams } from '../navigation/types';

const STREAM_LABEL: Record<string, string> = {
  electricity: 'Electricity',
  fuel: 'Fuel',
  material: 'Materials',
  waste: 'Waste',
  freight: 'Freight',
};

export default function PlantDataScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const workspace = useWorkspace();
  const factory = workspace.factory;
  const factoryId = workspace.source === 'live' ? workspace.factoryId : null;
  const result = workspace.assessment;

  const activity = useQuery({
    queryKey: ['activity', factoryId],
    queryFn: () => factoriesApi.activity(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const documents = useQuery({
    queryKey: ['evidence', factoryId],
    queryFn: () => evidenceApi.list(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const audit = useQuery({
    queryKey: ['audit', factoryId],
    queryFn: () => governanceApi.audit(factoryId as string),
    enabled: Boolean(factoryId),
  });

  const name = factory?.name ?? workspace.plantName;

  return (
    <ModuleScreen refreshing={workspace.refreshing} onRefresh={workspace.refresh}>
      <PageHeading
        eyebrow="ASSESS / PLANT DATA"
        title="What the engine is working from."
        description="Every activity figure, its data state, and the document behind it."
        meta={[factory?.district, factory?.state].filter(Boolean).join(', ') || workspace.sectorLabel}
      />

      {workspace.isDemo ? (
        <GlassPanel tone="warning">
          <Badge tone="high">DEMONSTRATION DATA</Badge>
          <Text style={{ ...typeScale.caption, color: colour.muted, marginTop: 6 }}>
            The inventory below belongs to the bundled {workspace.sectorLabel} demonstration
            profile. Sign in to see and edit your own plant's records.
          </Text>
        </GlassPanel>
      ) : null}

      {result?.profile ? (
        <GlassPanel>
          <Text style={{ ...typeScale.micro, color: colour.subtle }}>PLANT PROFILE</Text>
          <Text style={{ ...typeScale.title, color: colour.bright, marginTop: 6 }}>{name}</Text>
          <View style={{ marginTop: space.md }}>
            <DetailRows
              rows={[
                ['Sector', result.profile.sector_label ?? humanise(result.profile.sector ?? '')],
                ['State', result.profile.state ?? 'Not supplied'],
                [
                  'Annual output',
                  result.profile.annual_output_t
                    ? `${number(result.profile.annual_output_t)} t`
                    : 'Not supplied',
                ],
                [
                  'Annual revenue',
                  result.profile.annual_revenue_cr
                    ? `₹${number(result.profile.annual_revenue_cr, 2)} Cr`
                    : 'Not supplied',
                ],
                [
                  'Employees',
                  result.profile.employees ? number(result.profile.employees) : 'Not supplied',
                ],
              ]}
            />
          </View>
        </GlassPanel>
      ) : null}

      {result ? (
        <Metrics
          items={[
            {
              label: 'Data-quality score',
              value: result.data_quality
                ? `${number(result.data_quality.score)} / 100`
                : 'Not supplied',
            },
            {
              label: 'Quality band',
              value: result.data_quality
                ? humanise(result.data_quality.band ?? 'unknown')
                : 'Not supplied',
            },
            {
              label: 'Declared gaps',
              value: result.data_quality
                ? number(result.data_quality.gaps?.length ?? 0)
                : 'Not supplied',
            },
            {
              label: 'Streams on record',
              value: number(result.footprint.streams.length),
            },
          ]}
        />
      ) : null}

      <SectionHeading
        index="ADD DATA"
        title="Four ways to tell PRANGARA something"
        description="Each one lands as an activity record with its own data state."
      />
      <GlassPanel>
        <Button
          title="Describe the plant in your own words"
          onPress={() =>
            navigation.navigate('Onboarding', {
              factoryId: factoryId ?? '',
              factoryName: name,
              sector: factory?.sector,
            })
          }
          disabled={!factoryId}
        />
        <Button
          title="Scan a bill"
          variant="secondary"
          onPress={() =>
            navigation.navigate('BillScan', { factoryId: factoryId ?? '', factoryName: name })
          }
          disabled={!factoryId}
          style={{ marginTop: space.sm }}
        />
        <Button
          title="Add a machine from its nameplate"
          variant="secondary"
          onPress={() =>
            navigation.navigate('EquipmentScan', { factoryId: factoryId ?? '', factoryName: name })
          }
          disabled={!factoryId}
          style={{ marginTop: space.sm }}
        />
        <Button
          title="File a document"
          variant="secondary"
          onPress={() =>
            navigation.navigate('EvidenceCapture', {
              factoryId: factoryId ?? '',
              factoryName: name,
            })
          }
          disabled={!factoryId}
          style={{ marginTop: space.sm }}
        />
        {!factoryId ? (
          <Note tone="warning">
            Capture writes to a plant's record, so it needs a signed-in plant.
          </Note>
        ) : null}
      </GlassPanel>

      <SectionHeading
        index="INVENTORY"
        title="What is on record"
        description="A data state is a claim about provenance, not about accuracy."
      />
      {activity.isLoading ? <Loading label="Loading the inventory" /> : null}
      {activity.isError ? (
        <ErrorState message={describeError(activity.error)} onRetry={activity.refetch} />
      ) : null}
      {factoryId && activity.data?.length ? (
        activity.data.map((record) => (
          <GlassPanel key={record.id} style={{ paddingVertical: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                {record.label || STREAM_LABEL[record.stream_kind] || record.stream_kind}
              </Text>
              <Text style={{ ...typeScale.numeric, color: colour.text }}>
                {number(record.quantity, 2)}
              </Text>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginLeft: 4 }}>
                {record.unit}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <DataStateBadge state={record.data_state ?? 'DECLARED'} />
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginLeft: space.sm }}>
                {STREAM_LABEL[record.stream_kind] ?? record.stream_kind}
                {record.factor_key ? ` · ${record.factor_key}` : ''}
                {record.source_kind ? ` · ${humanise(record.source_kind)}` : ''}
              </Text>
            </View>
            {record.period_start || record.period_end ? (
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                Period {record.period_start ?? '?'} to {record.period_end ?? '?'}
              </Text>
            ) : null}
          </GlassPanel>
        ))
      ) : factoryId && !activity.isLoading ? (
        <EmptyState
          title="Nothing on record yet"
          body="Start with the electricity bill. It is usually the single biggest number in the building."
        />
      ) : null}

      {!factoryId && result ? (
        <GlassPanel>
          {result.footprint.streams.map((stream, index) => (
            <View
              key={stream.key}
              style={{
                paddingVertical: space.md,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colour.borderSecondary,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                  {stream.label}
                </Text>
                <Text style={{ ...typeScale.numeric, color: colour.text }}>
                  {number(stream.activity_qty, 2)}
                </Text>
              </View>
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                {stream.activity_unit} · Scope {stream.scope} ·{' '}
                {stream.factor_keys?.join(', ') ?? 'factor not supplied'}
              </Text>
            </View>
          ))}
        </GlassPanel>
      ) : null}

      {factoryId ? (
        <>
          <SectionHeading
            index="EVIDENCE"
            title="Documents on file"
            description="A document is what turns a declared figure into a confirmed one."
          />
          {documents.isLoading ? <Loading label="Loading documents" /> : null}
          {documents.data?.length ? (
            documents.data.map((document) => (
              <GlassPanel key={document.id} style={{ paddingVertical: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                    {document.title || document.filename}
                  </Text>
                  <Badge
                    tone={document.verification_status === 'verified' ? 'positive' : 'neutral'}
                  >
                    {humanise(document.verification_status)}
                  </Badge>
                </View>
                <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 4 }}>
                  {humanise(document.evidence_type)} · {Math.round(document.size_bytes / 1024)} KB ·{' '}
                  {relativeTime(document.created_at)}
                </Text>
              </GlassPanel>
            ))
          ) : documents.isLoading ? null : (
            <EmptyState
              title="No documents filed"
              body="Photograph a bill or a certificate and it is stored against this plant with its extraction."
            />
          )}

          <SectionHeading
            index="AUDIT"
            title="Who changed what"
            description="Every write is recorded with its actor and correlation id."
          />
          {audit.data?.length ? (
            <GlassPanel>
              {audit.data.slice(0, 12).map((entry, index) => (
                <View
                  key={entry.id}
                  style={{
                    paddingVertical: space.sm,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colour.borderSecondary,
                  }}
                >
                  <Text style={{ ...typeScale.captionStrong, color: colour.text }}>
                    {humanise(entry.action)}
                  </Text>
                  <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: 2 }}>
                    {entry.actor_label ?? 'System'} · {relativeTime(entry.created_at)}
                    {entry.object_type ? ` · ${humanise(entry.object_type)}` : ''}
                  </Text>
                </View>
              ))}
            </GlassPanel>
          ) : null}
        </>
      ) : null}

      <Button
        title={result ? 'Re-run the assessment' : 'Run the assessment'}
        onPress={() => workspace.run.mutate()}
        loading={workspace.run.isPending}
        disabled={!factoryId}
        style={{ marginTop: space.md }}
      />
      {workspace.run.isError ? (
        <Note tone="warning">{describeError(workspace.run.error)}</Note>
      ) : null}

      <Note>
        A data state records where a figure came from: declared by a person, confirmed by a
        document, or estimated by the engine. It does not certify the figure is right.
      </Note>
      <TrustBar onPress={() => navigation.navigate('Methodology')} />
    </ModuleScreen>
  );
}
