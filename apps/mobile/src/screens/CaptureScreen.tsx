/**
 * Capture tab.
 *
 * Exists because the whole point of the mobile companion is that somebody is
 * standing next to the thing they want to record. Opening the app and hunting
 * through a factory list first defeats that, so this tab asks which factory once
 * and then goes straight to the camera.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { factories as factoriesApi } from '../api/endpoints';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Heading,
  Loading,
  Note,
  Screen,
} from '../components/ui';
import { onDeviceStatus } from '../ml';
import { colour, space, type as typeScale } from '../theme/tokens';
import type { RootStackParams } from '../navigation/types';

export default function CaptureScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const onDevice = onDeviceStatus();

  const query = useQuery({ queryKey: ['factories'], queryFn: factoriesApi.list });

  // One factory is the normal case for an SME; picking it for them removes a tap
  // from every capture.
  useEffect(() => {
    if (!selectedId && query.data?.length) setSelectedId(query.data[0].id);
  }, [query.data, selectedId]);

  const selected = query.data?.find((f) => f.id === selectedId);

  return (
    <Screen>
      <Heading sub="Record something while you are standing in front of it.">
        Capture
      </Heading>

      {/* Say up front whether reading works without a signal: it changes what
          somebody standing in a plant room decides to do next. */}
      <Note>{onDevice.summary}</Note>

      {query.isLoading ? <Loading label="Loading factories" /> : null}
      {query.isError ? (
        <ErrorState message={describeError(query.error)} onRetry={query.refetch} />
      ) : null}

      {query.data?.length === 0 ? (
        <EmptyState
          title="Add a factory first"
          body="Capture needs somewhere to file what you record."
          actionLabel="Add a factory"
          onAction={() => navigation.navigate('CreateFactory')}
        />
      ) : null}

      {query.data && query.data.length > 1 ? (
        <Card>
          <Text
            style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.sm }}
          >
            Which factory?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {query.data.map((factory) => (
              <Chip
                key={factory.id}
                label={factory.name}
                selected={selectedId === factory.id}
                onPress={() => setSelectedId(factory.id)}
              />
            ))}
          </View>
        </Card>
      ) : null}

      {selected ? (
        <>
          <Card>
            <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.md }}>
              {selected.name}
            </Text>
            <Button
              title="Scan a bill"
              onPress={() =>
                navigation.navigate('BillScan', {
                  factoryId: selected.id,
                  factoryName: selected.name,
                })
              }
            />
            <Button
              title="Photograph a nameplate"
              variant="secondary"
              onPress={() =>
                navigation.navigate('EquipmentScan', {
                  factoryId: selected.id,
                  factoryName: selected.name,
                })
              }
              style={{ marginTop: space.sm }}
            />
            <Button
              title="File a document"
              variant="secondary"
              onPress={() =>
                navigation.navigate('EvidenceCapture', {
                  factoryId: selected.id,
                  factoryName: selected.name,
                })
              }
              style={{ marginTop: space.sm }}
            />
            <Button
              title="Describe the plant in words"
              variant="ghost"
              onPress={() =>
                navigation.navigate('Onboarding', {
                  factoryId: selected.id,
                  factoryName: selected.name,
                  sector: selected.sector,
                })
              }
              style={{ marginTop: space.sm }}
            />
          </Card>

          <Note>
            Nothing you capture is saved to the factory until you confirm the
            values on the next screen.
          </Note>
        </>
      ) : null}
    </Screen>
  );
}
