/**
 * Home: the factories this account can reach.
 *
 * Matches web app dark space aesthetics with sovereign RAG assistant trigger,
 * cash-positive savings highlights, and decarbonization stats.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { factories as factoriesApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Eyebrow,
  Heading,
  Loading,
  Note,
} from '../components/ui';
import { AskAssistantModal } from '../components/AskAssistantModal';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import type { RootStackParams } from '../navigation/types';
import { formatInr, formatTonnes } from '../lib/format';

export default function FactoryListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { me } = useAuth();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const query = useQuery({
    queryKey: ['factories'],
    queryFn: factoriesApi.list,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colour.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
          tintColor={colour.primary}
        />
      }
    >
      <View style={{ marginBottom: space.md }}>
        <Eyebrow style={{ color: colour.primary }}>PRANGARA · DECARBONIZATION OS</Eyebrow>
        <Heading sub={me?.memberships[0]?.organization.name || 'Industrial Facility Portfolio'}>
          Your Factories
        </Heading>
      </View>

      {/* Sovereign AI Assistant Card */}
      <Card
        style={{
          backgroundColor: colour.selectedBg,
          borderColor: colour.borderHighlight,
          borderWidth: 1,
          marginBottom: space.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: space.md }}>
            <Eyebrow style={{ color: colour.primary }}>SOVEREIGN COPILOT</Eyebrow>
            <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginTop: 2 }}>
              Ask PRANGARA ✨
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2 }}>
              Statutory reasoning with BEE PAT, SEBI BRSR & CBAM citations.
            </Text>
          </View>
          <Button
            title="Ask ✨"
            onPress={() => setAssistantOpen(true)}
          />
        </View>
      </Card>

      {query.isLoading ? <Loading label="Loading factories" /> : null}

      {query.isError ? (
        <ErrorState message={describeError(query.error)} onRetry={query.refetch} />
      ) : null}

      {query.data?.length === 0 ? (
        <EmptyState
          title="No factories yet"
          body="Add your first factory, then describe it in your own words or scan a bill. It takes a couple of minutes."
          actionLabel="Add a factory"
          onAction={() => navigation.navigate('CreateFactory')}
        />
      ) : null}

      {query.data?.map((factory) => {
        const assessed = Boolean(factory.latest_assessment_id);
        return (
          <Card
            key={factory.id}
            onPress={() =>
              navigation.navigate('Factory', {
                factoryId: factory.id,
                factoryName: factory.name,
              })
            }
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typeScale.heading, color: colour.text }}>{factory.name}</Text>
                <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2 }}>
                  {[factory.district, factory.state].filter(Boolean).join(', ') || 'Location not set'}
                </Text>
              </View>
              {assessed ? (
                <View
                  style={{
                    backgroundColor: colour.positiveBg,
                    borderColor: colour.floatingBorder,
                    borderWidth: 1,
                    paddingHorizontal: space.sm,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                  }}
                >
                  <Text style={{ ...typeScale.micro, color: colour.ok, fontWeight: '700' }}>
                    ASSESSED
                  </Text>
                </View>
              ) : null}
            </View>

            {assessed ? (
              <View style={{ marginTop: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ ...typeScale.title, color: colour.text, fontWeight: '800' }}>
                    {formatTonnes(factory.total_tco2e ?? 0)}
                  </Text>
                  <Text style={{ ...typeScale.caption, color: colour.textMuted }}>
                    {'  '}tCO2e a year
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', marginTop: space.sm, flexWrap: 'wrap', gap: space.sm }}>
                  {factory.cash_positive_benefit_inr ? (
                    <Text
                      style={{
                        ...typeScale.caption,
                        color: colour.ok,
                        fontWeight: '600',
                      }}
                    >
                      💰 {formatInr(factory.cash_positive_benefit_inr)}/yr savings
                    </Text>
                  ) : null}
                  {factory.critical_leak_count ? (
                    <Text
                      style={{
                        ...typeScale.caption,
                        color: colour.critical,
                      }}
                    >
                      ⚠️ {factory.critical_leak_count} critical leak
                      {factory.critical_leak_count === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                  {factory.open_action_count ? (
                    <Text style={{ ...typeScale.caption, color: colour.textMuted }}>
                      ⚡ {factory.open_action_count} action
                      {factory.open_action_count === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text
                style={{ ...typeScale.caption, color: colour.primary, marginTop: space.md, fontWeight: '600' }}
              >
                Not assessed yet → tap to add plant data
              </Text>
            )}
          </Card>
        );
      })}

      {query.data && query.data.length > 0 ? (
        <Button
          title="+ Add another factory"
          variant="secondary"
          onPress={() => navigation.navigate('CreateFactory')}
          style={{ marginTop: space.sm }}
        />
      ) : null}

      <Note>
        Figures are screening estimates carried with an uncertainty band. Traceable to CEA, BEE & IPCC factors.
      </Note>

      <AskAssistantModal visible={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </ScrollView>
  );
}
