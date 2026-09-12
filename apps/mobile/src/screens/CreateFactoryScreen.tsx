/**
 * Create a factory.
 *
 * Deliberately three fields. Sector is the only one the engine truly cannot
 * proceed without, because it selects the benchmark cohort and the applicable
 * intervention set, so it is a picker rather than free text - a typo here would
 * silently benchmark a foundry against a dairy.
 */

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { describeError } from '../api/client';
import { factories as factoriesApi, system } from '../api/endpoints';
import { Button, Card, Chip, Field, Heading, Loading, Note, Screen } from '../components/ui';
import { colour, space, type as typeScale } from '../theme/tokens';
import type { RootStackParams } from '../navigation/types';

// The states the grid-factor registry distinguishes. Getting this right matters
// more than most inputs: West Bengal runs roughly 1.8x Kerala per unit consumed.
const STATES = [
  'Gujarat',
  'Maharashtra',
  'Tamil Nadu',
  'Karnataka',
  'Rajasthan',
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'West Bengal',
  'Telangana',
  'Andhra Pradesh',
  'Kerala',
  'Odisha',
];

export default function CreateFactoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [district, setDistrict] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sectors = useQuery({ queryKey: ['sectors'], queryFn: system.sectors });

  const create = useMutation({
    mutationFn: () =>
      factoriesApi.create({
        name: name.trim(),
        sector: sector as string,
        state: state ?? undefined,
        district: district.trim() || undefined,
      }),
    onSuccess: (factory) => {
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      navigation.replace('Onboarding', {
        factoryId: factory.id,
        factoryName: factory.name,
        sector: factory.sector,
      });
    },
    onError: (ex) => setError(describeError(ex)),
  });

  return (
    <Screen>
      <Heading sub="Three things to start. Everything else comes from your bills and your own description.">
        Add a factory
      </Heading>

      <Card>
        <Field
          label="Factory name"
          value={name}
          onChangeText={setName}
          placeholder="Rajkot Metal Works"
          autoCapitalize="words"
        />

        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.xs }}>
          Sector
        </Text>
        <Text style={{ ...typeScale.caption, color: colour.textFaint, marginBottom: space.sm }}>
          This picks the peer group you are benchmarked against and which
          interventions apply. It cannot be changed later.
        </Text>
        {sectors.isLoading ? <Loading label="Loading sectors" /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.lg }}>
          {sectors.data?.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={sector === item.key}
              onPress={() => setSector(item.key)}
            />
          ))}
        </View>

        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.xs }}>
          State
        </Text>
        <Text style={{ ...typeScale.caption, color: colour.textFaint, marginBottom: space.sm }}>
          The grid emission factor varies a lot between states, so this changes
          your Scope 2 result materially.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.lg }}>
          {STATES.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={state === item}
              onPress={() => setState(item)}
            />
          ))}
        </View>

        <Field
          label="District"
          hint="Optional. Used to find nearby providers."
          value={district}
          onChangeText={setDistrict}
          placeholder="Rajkot"
          autoCapitalize="words"
        />

        {error ? <Note tone="warning">{error}</Note> : null}

        <Button
          title="Create and continue"
          onPress={() => {
            setError(null);
            create.mutate();
          }}
          loading={create.isPending}
          disabled={!name.trim() || !sector}
        />
      </Card>
    </Screen>
  );
}
