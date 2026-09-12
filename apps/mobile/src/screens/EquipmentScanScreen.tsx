/**
 * Equipment nameplate capture. PRD FR-06.
 *
 * The point the PRD makes explicitly, and the one this screen is built around:
 * **a photograph of a nameplate does not reveal annual emissions.** It reveals
 * rated power. Annual energy needs operating hours and load, and those come from
 * the person standing in front of the machine.
 *
 * So the operating-hours questions are not optional extras after a clever scan.
 * They are the screen, and the photograph is supporting evidence.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { factories as factoriesApi, intake } from '../api/endpoints';
import { Button, Card, Chip, Field, Heading, Note, Screen } from '../components/ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import type { RootStackParams } from '../navigation/types';

const ASSET_TYPES = [
  { key: 'motor', label: 'Motor' },
  { key: 'compressor', label: 'Compressor' },
  { key: 'boiler', label: 'Boiler' },
  { key: 'furnace', label: 'Furnace' },
  { key: 'dg_set', label: 'DG set' },
  { key: 'pump', label: 'Pump' },
  { key: 'chiller', label: 'Chiller / HVAC' },
  { key: 'cnc', label: 'CNC / machine' },
  { key: 'transformer', label: 'Transformer' },
];

const SHIFT_PRESETS = [
  { label: 'One shift (~2,400 h)', hours: 2400 },
  { label: 'Two shifts (~4,800 h)', hours: 4800 },
  { label: 'Three shifts (~7,200 h)', hours: 7200 },
  { label: 'Standby only (~500 h)', hours: 500 },
];

const LOAD_PRESETS = [
  { label: 'Light (40%)', load: 0.4 },
  { label: 'Normal (70%)', load: 0.7 },
  { label: 'Heavy (90%)', load: 0.9 },
];

export default function EquipmentScanScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'EquipmentScan'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { factoryId, factoryName } = route.params;

  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [extractorNote, setExtractorNote] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);

  const [assetType, setAssetType] = useState(ASSET_TYPES[0]);
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [ratedKw, setRatedKw] = useState('');
  const [efficiency, setEfficiency] = useState('');
  const [hours, setHours] = useState<number | null>(null);
  const [load, setLoad] = useState<number | null>(null);
  const [energyType, setEnergyType] = useState<'electricity' | 'fuel'>('electricity');

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ basis: string; confidence: string } | null>(null);

  async function capture() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is off. Turn it on in Settings to photograph a nameplate.');
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true });
    if (!shot.canceled && shot.assets[0]) {
      setImage(shot.assets[0]);
      setResult(null);
    }
  }

  const scan = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error('Photograph the nameplate first.');
      const form = new FormData();
      form.append('file', {
        uri: image.uri,
        name: image.fileName ?? 'nameplate.jpg',
        type: image.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      form.append('factory_id', factoryId);
      return intake.scanEquipment(form);
    },
    onSuccess: (response) => {
      setExtractorNote(response.extractor_detail);
      setQuestions(response.required_questions);
      response.fields.forEach((field) => {
        if (field.field === 'rated_power_kw') setRatedKw(String(field.value));
        if (field.field === 'manufacturer') setManufacturer(String(field.value));
      });
    },
    onError: (ex) => setError(describeError(ex)),
  });

  const save = useMutation({
    mutationFn: () =>
      factoriesApi.addAsset(factoryId, {
        asset_type: assetType.key,
        name: name.trim() || assetType.label,
        manufacturer: manufacturer.trim() || null,
        rated_power_kw: ratedKw ? Number(ratedKw) : null,
        efficiency_pct: efficiency ? Number(efficiency) : null,
        energy_type: energyType === 'electricity' ? 'electricity' : null,
        operating_hours_per_year: hours,
        load_factor: load,
      }),
    onSuccess: (asset) =>
      setResult({ basis: asset.estimate_basis ?? '', confidence: asset.confidence }),
    onError: (ex) => setError(describeError(ex)),
  });

  const canSave = Boolean(ratedKw && Number(ratedKw) > 0);

  return (
    <Screen>
      <Heading sub={factoryName}>Add equipment</Heading>

      <Note>
        A nameplate photo gives the rated power, not how much the machine
        actually uses. The two questions below are what turn one into the other,
        so an estimate is only as good as your answers to them.
      </Note>

      <Card>
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={{
              width: '100%',
              height: 200,
              borderRadius: radius.md,
              marginBottom: space.md,
              backgroundColor: colour.surfaceRaised,
            }}
            resizeMode="contain"
          />
        ) : null}
        <Button
          title={image ? 'Retake nameplate photo' : 'Photograph the nameplate'}
          onPress={capture}
        />
        {image ? (
          <Button
            title="Read the nameplate"
            variant="secondary"
            onPress={() => {
              setError(null);
              scan.mutate();
            }}
            loading={scan.isPending}
            style={{ marginTop: space.sm }}
          />
        ) : null}
      </Card>

      {extractorNote ? <Note tone="warning">{extractorNote}</Note> : null}
      {error ? <Note tone="warning">{error}</Note> : null}

      <Card>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.sm }}>
          What kind of machine?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
          {ASSET_TYPES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={assetType.key === item.key}
              onPress={() => setAssetType(item)}
            />
          ))}
        </View>

        <Field
          label="Name it"
          hint="Something you will recognise on the floor."
          value={name}
          onChangeText={setName}
          placeholder={`${assetType.label} 1`}
        />
        <Field
          label="Make"
          value={manufacturer}
          onChangeText={setManufacturer}
          placeholder="Kirloskar"
        />
        <Field
          label="Rated power"
          hint="From the nameplate."
          value={ratedKw}
          onChangeText={setRatedKw}
          keyboardType="decimal-pad"
          placeholder="0"
          suffix="kW"
        />
        <Field
          label="Nameplate efficiency"
          hint="Optional. Raises confidence when you have it."
          value={efficiency}
          onChangeText={setEfficiency}
          keyboardType="decimal-pad"
          placeholder="92"
          suffix="%"
        />

        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.xs }}>
          Runs for how long a year?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
          {SHIFT_PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              selected={hours === preset.hours}
              onPress={() => setHours(preset.hours)}
            />
          ))}
        </View>

        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.xs }}>
          At what load?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
          {LOAD_PRESETS.map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              selected={load === preset.load}
              onPress={() => setLoad(preset.load)}
            />
          ))}
        </View>

        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.xs }}>
          Driven by
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
          <Chip
            label="Electricity"
            selected={energyType === 'electricity'}
            onPress={() => setEnergyType('electricity')}
          />
          <Chip
            label="Fuel"
            selected={energyType === 'fuel'}
            onPress={() => setEnergyType('fuel')}
          />
        </View>

        {hours === null || load === null ? (
          <Note tone="warning">
            Without run hours and load the estimate falls back to a sector default
            and is reported as low confidence.
          </Note>
        ) : null}

        <Button
          title="Add this machine"
          onPress={() => {
            setError(null);
            save.mutate();
          }}
          loading={save.isPending}
          disabled={!canSave}
        />
      </Card>

      {questions.length ? (
        <Card>
          <Text style={{ ...typeScale.heading, color: colour.text }}>
            Worth confirming
          </Text>
          {questions.map((question) => (
            <Text
              key={question}
              style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.sm }}
            >
              • {question}
            </Text>
          ))}
        </Card>
      ) : null}

      {result ? (
        <Card style={{ borderColor: colour.ok }}>
          <Text style={{ ...typeScale.heading, color: colour.ok }}>Machine added</Text>
          <Text
            style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.sm, lineHeight: 19 }}
          >
            {result.basis}
          </Text>
          <Text style={{ ...typeScale.caption, color: colour.textFaint, marginTop: space.sm }}>
            Confidence: {result.confidence}
          </Text>
          <Button
            title="Add another"
            variant="secondary"
            onPress={() => {
              setImage(null);
              setName('');
              setRatedKw('');
              setResult(null);
            }}
            style={{ marginTop: space.md }}
          />
          <Button
            title="Done"
            onPress={() => navigation.goBack()}
            style={{ marginTop: space.sm }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
