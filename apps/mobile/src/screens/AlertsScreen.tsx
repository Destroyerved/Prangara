/**
 * Notification centre. PRD FR-54, task.md FE-2 "notification center".
 *
 * The backend only writes a notification for events a person can act on, so
 * this list stays short enough to read. Tapping one navigates to what it is
 * about using the `deep_link` the backend returned - the routes are agreed in
 * `app/services/notify.py`, not invented here.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { factories as factoriesApi, notifications as notificationsApi } from '../api/endpoints';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Heading,
  Loading,
} from '../components/ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import { relativeTime } from '../lib/format';
import type { RootStackParams } from '../navigation/types';
import type { Notification } from '../api/types';

const SEVERITY_COLOUR: Record<string, string> = {
  critical: colour.critical,
  warning: colour.high,
  info: colour.info,
};

/** `factory/<id>/<section>` -> a screen. Anything else just opens the factory. */
const SECTION_ROUTE: Record<string, keyof RootStackParams> = {
  footprint: 'QuickResults',
  leaks: 'QuickResults',
  actions: 'QuickResults',
  data: 'Onboarding',
  evidence: 'EvidenceCapture',
};

export default function AlertsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(false),
  });
  const factories = useQuery({
    queryKey: ['factories'],
    queryFn: factoriesApi.list,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  function open(item: Notification) {
    if (!item.read_at) markRead.mutate(item.id);
    if (!item.factory_id) return;
    const factoryName =
      factories.data?.find((f) => f.id === item.factory_id)?.name ?? 'Factory';
    const section = item.deep_link?.split('/')[2] ?? '';
    const route = SECTION_ROUTE[section] ?? 'Factory';
    navigation.navigate(route as 'Factory', {
      factoryId: item.factory_id,
      factoryName,
    });
  }

  const unread = query.data?.filter((n) => !n.read_at).length ?? 0;

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
      <Heading sub={unread ? `${unread} unread` : 'Everything read'}>Alerts</Heading>

      {query.isLoading ? <Loading label="Loading alerts" /> : null}
      {query.isError ? (
        <ErrorState message={describeError(query.error)} onRetry={query.refetch} />
      ) : null}

      {query.data?.length === 0 ? (
        <EmptyState
          title="Nothing to report"
          body="Alerts appear here when an assessment finishes, a critical leak is found, evidence is about to expire or a provider quotes."
        />
      ) : null}

      {unread > 0 ? (
        <Button
          title="Mark all read"
          variant="ghost"
          onPress={() => markAll.mutate()}
          style={{ marginBottom: space.md }}
        />
      ) : null}

      {query.data?.map((item) => (
        <Card key={item.id} onPress={() => open(item)}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginTop: 6,
                marginRight: space.sm,
                backgroundColor: item.read_at
                  ? colour.border
                  : SEVERITY_COLOUR[item.severity] ?? colour.info,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...typeScale.bodyStrong,
                  color: item.read_at ? colour.textMuted : colour.text,
                }}
              >
                {item.title}
              </Text>
              {item.body ? (
                <Text
                  style={{
                    ...typeScale.caption,
                    color: colour.textMuted,
                    marginTop: 2,
                    lineHeight: 19,
                  }}
                >
                  {item.body}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: space.sm,
                }}
              >
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: SEVERITY_COLOUR[item.severity] ?? colour.info,
                    borderRadius: radius.pill,
                    paddingHorizontal: space.sm,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      ...typeScale.micro,
                      color: SEVERITY_COLOUR[item.severity] ?? colour.info,
                    }}
                  >
                    {item.severity.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={{
                    ...typeScale.caption,
                    color: colour.textFaint,
                    marginLeft: space.sm,
                  }}
                >
                  {relativeTime(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
