/**
 * Home: the factories this account can reach.
 *
 * Each card shows the last headline figure rather than making the owner open
 * the factory to find out whether it has been assessed at all.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { factories as factoriesApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Loading,
  Note,
} from '../components/ui';
import { colour, space, type as typeScale } from '../theme/tokens';
import type { RootStackParams } from '../navigation/types';
import { formatInr, formatTonnes } from '../lib/format';

export default function FactoryListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { me } = useAuth();

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
      <Heading sub={me?.memberships[0]?.organization.name}>Your factories</Heading>

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
            <Text style={{ ...typeScale.heading, color: colour.text }}>{factory.name}</Text>
            <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2 }}>
              {[factory.district, factory.state].filter(Boolean).join(', ') || 'Location not set'}
            </Text>

            {assessed ? (
              <View style={{ marginTop: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ ...typeScale.title, color: colour.text }}>
                    {formatTonnes(factory.total_tco2e ?? 0)}
                  </Text>
                  <Text style={{ ...typeScale.caption, color: colour.textMuted }}>
                    {'  '}tCO2e a year
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', marginTop: space.sm, flexWrap: 'wrap' }}>
                  {factory.critical_leak_count ? (
                    <Text
                      style={{
                        ...typeScale.caption,
                        color: colour.critical,
                        marginRight: space.lg,
                      }}
                    >
                      {factory.critical_leak_count} critical leak
                      {factory.critical_leak_count === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                  {factory.cash_positive_benefit_inr ? (
                    <Text
                      style={{ ...typeScale.caption, color: colour.ok, marginRight: space.lg }}
                    >
                      {formatInr(factory.cash_positive_benefit_inr)}/yr available
                    </Text>
                  ) : null}
                  {factory.open_action_count ? (
                    <Text style={{ ...typeScale.caption, color: colour.textMuted }}>
                      {factory.open_action_count} action
                      {factory.open_action_count === 1 ? '' : 's'} in progress
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text
                style={{ ...typeScale.caption, color: colour.declared, marginTop: space.md }}
              >
                Not assessed yet - tap to add data
              </Text>
            )}
          </Card>
        );
      })}

      {query.data && query.data.length > 0 ? (
        <Button
          title="Add another factory"
          variant="secondary"
          onPress={() => navigation.navigate('CreateFactory')}
          style={{ marginTop: space.sm }}
        />
      ) : null}

      <Note>
        Figures are screening estimates carried with a low/base/high range. They
        are decision support, not an accredited audit.
      </Note>
    </ScrollView>
  );
}
