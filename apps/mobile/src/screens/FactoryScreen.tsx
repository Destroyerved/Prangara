/**
 * Factory hub.
 *
 * The one screen an owner lands on from the factory list. It answers "what is
 * this plant at right now" in three lines and then offers the four things that
 * can be done from a phone: describe it, scan a bill, add a machine, file
 * evidence.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { actions as actionsApi, factories as factoriesApi } from '../api/endpoints';
import {
  Button,
  Card,
  DataStateBadge,
  Divider,
  ErrorState,
  Heading,
  Loading,
  Note,
  Row,
} from '../components/ui';
import { colour, space, type as typeScale } from '../theme/tokens';
import { formatInr, formatNumber, formatTonnes, relativeTime } from '../lib/format';
import type { RootStackParams } from '../navigation/types';

const STREAM_LABEL: Record<string, string> = {
  electricity: 'Electricity',
  fuel: 'Fuel',
  material: 'Materials',
  waste: 'Waste',
  freight: 'Freight',
};

export default function FactoryScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'Factory'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { factoryId, factoryName } = route.params;

  const factory = useQuery({
    queryKey: ['factory', factoryId],
    queryFn: () => factoriesApi.get(factoryId),
  });
  const activity = useQuery({
    queryKey: ['activity', factoryId],
    queryFn: () => factoriesApi.activity(factoryId),
  });
  const actions = useQuery({
    queryKey: ['actions', factoryId],
    queryFn: () => actionsApi.list(factoryId),
  });

  const refreshing =
    factory.isRefetching || activity.isRefetching || actions.isRefetching;

  function refreshAll() {
    factory.refetch();
    activity.refetch();
    actions.refetch();
  }

  const inProgress = actions.data?.filter((a) =>
    ['SELECTED', 'RFQ', 'APPROVED', 'IMPLEMENTING', 'VERIFYING'].includes(a.status),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colour.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshAll}
          tintColor={colour.primary}
        />
      }
    >
      <Heading
        sub={[factory.data?.district, factory.data?.state].filter(Boolean).join(', ')}
      >
        {factoryName}
      </Heading>

      {factory.isLoading ? <Loading /> : null}
      {factory.isError ? (
        <ErrorState message={describeError(factory.error)} onRetry={factory.refetch} />
      ) : null}

      {factory.data ? (
        <Card
          onPress={() =>
            navigation.navigate('QuickResults', { factoryId, factoryName })
          }
        >
          {factory.data.latest_assessment_id ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ ...typeScale.display, color: colour.text }}>
                  {formatTonnes(factory.data.total_tco2e ?? 0)}
                </Text>
                <Text style={{ ...typeScale.body, color: colour.textMuted }}>
                  {'  '}tCO2e a year
                </Text>
              </View>
              <Text
                style={{ ...typeScale.caption, color: colour.textFaint, marginTop: 2 }}
              >
                assessed {relativeTime(factory.data.latest_assessed_at)}
              </Text>
              <Divider />
              {factory.data.critical_leak_count ? (
                <Row
                  left="Critical leak points"
                  right={String(factory.data.critical_leak_count)}
                  strong
                />
              ) : null}
              {factory.data.cash_positive_benefit_inr ? (
                <Row
                  left="Available every year"
                  right={formatInr(factory.data.cash_positive_benefit_inr)}
                  strong
                />
              ) : null}
              {factory.data.data_quality_score !== null &&
              factory.data.data_quality_score !== undefined ? (
                <Row
                  left="Data quality"
                  right={`${formatNumber(factory.data.data_quality_score, 0)}/100`}
                />
              ) : null}
              <Text
                style={{ ...typeScale.caption, color: colour.primary, marginTop: space.md }}
              >
                Tap for the full result
              </Text>
            </>
          ) : (
            <>
              <Text style={{ ...typeScale.heading, color: colour.text }}>
                Not assessed yet
              </Text>
              <Text
                style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.xs }}
              >
                Add your electricity and fuel use, then run the assessment.
              </Text>
            </>
          )}
        </Card>
      ) : null}

      <Card>
        <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.md }}>
          Add data
        </Text>
        <Button
          title="Describe the plant"
          onPress={() =>
            navigation.navigate('Onboarding', {
              factoryId,
              factoryName,
              sector: factory.data?.sector,
            })
          }
        />
        <Button
          title="Scan a bill"
          variant="secondary"
          onPress={() => navigation.navigate('BillScan', { factoryId, factoryName })}
          style={{ marginTop: space.sm }}
        />
        <Button
          title="Add a machine"
          variant="secondary"
          onPress={() => navigation.navigate('EquipmentScan', { factoryId, factoryName })}
          style={{ marginTop: space.sm }}
        />
        <Button
          title="File a document"
          variant="secondary"
          onPress={() => navigation.navigate('EvidenceCapture', { factoryId, factoryName })}
          style={{ marginTop: space.sm }}
        />
      </Card>

      <Card>
        <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
          What is on record
        </Text>
        {activity.isLoading ? <Loading label="Loading activity" /> : null}
        {activity.data?.length === 0 ? (
          <Text style={{ ...typeScale.body, color: colour.textMuted }}>
            Nothing yet. Start with your electricity bill - it is usually the
            single biggest number.
          </Text>
        ) : null}
        {activity.data?.map((record) => (
          <View key={record.id} style={{ paddingVertical: space.sm }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                {record.label || STREAM_LABEL[record.stream_kind] || record.stream_kind}
              </Text>
              <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
                {formatNumber(record.quantity)} {record.unit}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: space.xs,
              }}
            >
              <DataStateBadge state={record.data_state ?? 'DECLARED'} />
              <Text
                style={{ ...typeScale.caption, color: colour.textFaint, marginLeft: space.sm }}
              >
                {STREAM_LABEL[record.stream_kind] ?? record.stream_kind}
                {record.factor_key ? ` · ${record.factor_key}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {inProgress?.length ? (
        <Card>
          <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
            In progress
          </Text>
          {inProgress.map((action) => (
            <View key={action.id} style={{ paddingVertical: space.sm }}>
              <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
                {action.name}
              </Text>
              <Text
                style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2 }}
              >
                {action.status.toLowerCase().replace(/_/g, ' ')} ·{' '}
                {formatTonnes(action.expected_abatement_tco2e ?? 0)} tCO2e/yr expected
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Note>
        PRANGARA is screening and decision support. It is not a BEE-accredited
        audit, a legal assurance service or a carbon-credit verifier.
      </Note>
    </ScrollView>
  );
}
