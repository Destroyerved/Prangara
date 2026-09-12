/**
 * Bill and invoice capture. PRD FR-05.
 *
 *     capture -> upload -> extract -> confirm -> activity record + evidence link
 *
 * When the backend reports that no OCR runtime is configured, the screen says so
 * plainly and drops into manual entry with the photograph already stored as
 * evidence. That is the honest failure mode: the owner still gets their bill
 * filed against the reading, and nobody is shown numbers that were never read.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { intake } from '../api/endpoints';
import { Button, Card, Chip, Field, Heading, Note, Screen } from '../components/ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import type { RootStackParams } from '../navigation/types';
import type { ActivityRecordIn, StreamKind } from '../api/types';

/** Document type -> what it becomes if the reading is confirmed. */
const DOC_TYPES: {
  key: string;
  label: string;
  stream: StreamKind;
  factorKey: string | null;
  unit: string;
  quantityLabel: string;
}[] = [
  {
    key: 'electricity_bill',
    label: 'Electricity bill',
    stream: 'electricity',
    factorKey: null,
    unit: 'kWh',
    quantityLabel: 'Units consumed on this bill',
  },
  {
    key: 'fuel_invoice',
    label: 'Coal / fuel invoice',
    stream: 'fuel',
    factorKey: 'COAL_INDIAN',
    unit: 'tonne',
    quantityLabel: 'Quantity on this invoice',
  },
  {
    key: 'gas_bill',
    label: 'Gas bill',
    stream: 'fuel',
    factorKey: 'NATURAL_GAS',
    unit: 'Sm3',
    quantityLabel: 'Gas consumed on this bill',
  },
  {
    key: 'material_invoice',
    label: 'Material invoice',
    stream: 'material',
    factorKey: 'STEEL_PRIMARY',
    unit: 'tonne',
    quantityLabel: 'Quantity on this invoice',
  },
  {
    key: 'waste_certificate',
    label: 'Waste record',
    stream: 'waste',
    factorKey: 'LANDFILL_INERT',
    unit: 'tonne',
    quantityLabel: 'Quantity disposed',
  },
  {
    key: 'freight_invoice',
    label: 'Freight invoice',
    stream: 'freight',
    factorKey: 'ROAD_FREIGHT_HCV',
    unit: 'tonne-km',
    quantityLabel: 'Tonne-kilometres on this invoice',
  },
];

const PERIODS = [
  { key: 'month', label: 'One month', multiplier: 12 },
  { key: 'quarter', label: 'One quarter', multiplier: 4 },
  { key: 'year', label: 'A full year', multiplier: 1 },
];

export default function BillScanScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'BillScan'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { factoryId, factoryName } = route.params;

  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [extractorNote, setExtractorNote] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [period, setPeriod] = useState(PERIODS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function pick(from: 'camera' | 'library') {
    setError(null);
    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        from === 'camera'
          ? 'Camera access is off. Turn it on in Settings to photograph a bill.'
          : 'Photo access is off. Turn it on in Settings to pick a bill.',
      );
      return;
    }
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsEditing: true,
            mediaTypes: ['images'],
          });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
      setEvidenceId(null);
      setExtractorNote(null);
      setSaved(false);
    }
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error('Take a photo of the bill first.');
      const form = new FormData();
      // React Native's FormData takes {uri, name, type}; the cast is the
      // standard RN idiom, not a shortcut.
      form.append('file', {
        uri: image.uri,
        name: image.fileName ?? `${docType.key}.jpg`,
        type: image.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      form.append('factory_id', factoryId);
      form.append('evidence_type', docType.key);
      return intake.scanDocument(form);
    },
    onSuccess: (result) => {
      setEvidenceId(result.evidence_id);
      setExtractorNote(result.extractor_detail);
      const suggested = result.suggested_activity_records[0];
      if (suggested) setQuantity(String(suggested.quantity));
    },
    onError: (ex) => setError(describeError(ex)),
  });

  const annualised = Number(quantity.replace(/,/g, '')) * period.multiplier;

  const confirm = useMutation({
    mutationFn: () => {
      const record: ActivityRecordIn = {
        stream_kind: docType.stream,
        factor_key: docType.factorKey,
        label: docType.label,
        quantity: annualised,
        unit: docType.unit,
        // The value came off a document the user read themselves, which is a
        // stronger state than a typed-in guess.
        data_state: 'DOCUMENT-CONFIRMED',
        source_kind: 'document_ocr',
      };
      return intake.confirm(factoryId, {
        activity_records: [record],
        evidence_id: evidenceId,
        source_kind: 'document_ocr',
      });
    },
    onSuccess: () => setSaved(true),
    onError: (ex) => setError(describeError(ex)),
  });

  return (
    <Screen>
      <Heading sub={factoryName}>Scan a bill</Heading>

      <Card>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.sm }}>
          What is this document?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DOC_TYPES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={docType.key === item.key}
              onPress={() => setDocType(item)}
            />
          ))}
        </View>
      </Card>

      <Card>
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={{
              width: '100%',
              height: 240,
              borderRadius: radius.md,
              marginBottom: space.md,
              backgroundColor: colour.surfaceRaised,
            }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={{
              height: 160,
              borderRadius: radius.md,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colour.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: space.md,
            }}
          >
            <Text style={{ ...typeScale.caption, color: colour.textFaint }}>
              No photo yet
            </Text>
          </View>
        )}

        <Button title={image ? 'Retake photo' : 'Take a photo'} onPress={() => pick('camera')} />
        <Button
          title="Choose from gallery"
          variant="secondary"
          onPress={() => pick('library')}
          style={{ marginTop: space.sm }}
        />
        {image && !evidenceId ? (
          <Button
            title="Upload and read"
            onPress={() => {
              setError(null);
              upload.mutate();
            }}
            loading={upload.isPending}
            style={{ marginTop: space.sm }}
          />
        ) : null}
      </Card>

      {error ? <Note tone="warning">{error}</Note> : null}
      {extractorNote ? <Note tone="warning">{extractorNote}</Note> : null}

      {evidenceId ? (
        <Card>
          <Text style={{ ...typeScale.heading, color: colour.text }}>
            Enter what the bill says
          </Text>
          <Text
            style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.xs, marginBottom: space.md }}
          >
            The photo is stored and will be linked to this reading as evidence.
          </Text>

          <Field
            label={docType.quantityLabel}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix={docType.unit}
          />

          <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.xs }}>
            What period does it cover?
          </Text>
          <Text
            style={{ ...typeScale.caption, color: colour.textFaint, marginBottom: space.sm }}
          >
            The assessment works on annual figures. Getting this wrong is a
            twelve-fold error, so it is asked rather than assumed.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
            {PERIODS.map((item) => (
              <Chip
                key={item.key}
                label={item.label}
                selected={period.key === item.key}
                onPress={() => setPeriod(item)}
              />
            ))}
          </View>

          {Number.isFinite(annualised) && annualised > 0 ? (
            <Note>
              Saved as {annualised.toLocaleString('en-IN')} {docType.unit} per year
              {period.multiplier > 1 ? ` (${quantity} x ${period.multiplier})` : ''}.
            </Note>
          ) : null}

          <Button
            title="Save this reading"
            onPress={() => {
              setError(null);
              confirm.mutate();
            }}
            loading={confirm.isPending}
            disabled={!(annualised > 0)}
          />
        </Card>
      ) : null}

      {saved ? (
        <Card style={{ borderColor: colour.ok }}>
          <Text style={{ ...typeScale.heading, color: colour.ok }}>Reading saved</Text>
          <Text style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.xs }}>
            The bill is filed as evidence against it.
          </Text>
          <Button
            title="Scan another"
            variant="secondary"
            onPress={() => {
              setImage(null);
              setEvidenceId(null);
              setQuantity('');
              setSaved(false);
            }}
            style={{ marginTop: space.md }}
          />
          <Button
            title="See results"
            onPress={() => navigation.navigate('QuickResults', { factoryId, factoryName })}
            style={{ marginTop: space.sm }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
