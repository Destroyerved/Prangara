/**
 * Bill and invoice capture. PRD FR-05.
 *
 *     capture -> read on the phone -> confirm -> activity record + evidence link
 *
 * The reading happens on the device: ML Kit text recognition, bundled in the
 * APK, so a bill can be read standing on the shop floor with no signal and
 * without the photograph leaving the phone. The figures it finds are shown with
 * their confidence and the exact printed line each came from, and nothing is
 * written until the reader confirms it.
 *
 * The photograph is still uploaded when there is a network, because a confirmed
 * reading needs its evidence filed against it - but the upload is no longer
 * what makes the reading possible.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { NetworkError, describeError } from '../api/client';
import { intake } from '../api/endpoints';
import * as queue from '../storage/queue';
import { Button, Card, Chip, Field, Heading, Note, Screen } from '../components/ui';
import { Badge } from '../components/layout';
import ExtractedFields from '../components/ExtractedFields';
import PendingBanner from '../components/PendingBanner';
import { LaserScan, ViewfinderTarget, PulseDot } from '../components/animations';
import { onDeviceStatus, scanDocumentOnDevice } from '../ml';
import type { DocumentKind, DocumentReading, ScanOutcome } from '../ml';
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
  const [queued, setQueued] = useState(false);
  const [reading, setReading] = useState<ScanOutcome<DocumentReading> | null>(null);
  const [readingNow, setReadingNow] = useState(false);
  const capability = onDeviceStatus();

  /**
   * Read the photograph on this phone. Runs the moment a photo exists, because
   * the alternative - waiting for an upload - is exactly what does not work on
   * a factory floor.
   */
  async function readOnDevice(uri: string, kind: DocumentKind) {
    setReadingNow(true);
    try {
      const outcome = await scanDocumentOnDevice(uri, kind);
      setReading(outcome);
      setExtractorNote(outcome.extractorDetail);
      const suggested = outcome.reading?.suggested;
      if (suggested && typeof suggested.quantity === 'number') {
        setQuantity(String(suggested.quantity));
      }
      const guessed = outcome.reading?.period;
      if (guessed) {
        const match = PERIODS.find((item) => item.multiplier === guessed.multiplier);
        if (match) setPeriod(match);
      }
    } catch (ex) {
      setError(describeError(ex));
    } finally {
      setReadingNow(false);
    }
  }

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
      const asset = result.assets[0];
      setImage(asset);
      setEvidenceId(null);
      setExtractorNote(null);
      setReading(null);
      setQuantity('');
      setSaved(false);
      if (capability.ocr) await readOnDevice(asset.uri, docType.key as DocumentKind);
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
      // The server only overrides the phone's reading when it actually found
      // something; an unconfigured OCR runtime must not blank a good reading.
      const suggested = result.suggested_activity_records[0];
      if (suggested) {
        setQuantity(String(suggested.quantity));
        setExtractorNote(result.extractor_detail);
      } else if (!reading?.reading?.fields.length) {
        setExtractorNote(result.extractor_detail);
      }
    },
    onError: (ex) => setError(describeError(ex)),
  });

  const annualised = Number(quantity.replace(/,/g, '')) * period.multiplier;

  const confirm = useMutation({
    mutationFn: async () => {
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
      const body = {
        activity_records: [record],
        evidence_id: evidenceId,
        source_kind: 'document_ocr' as const,
      };
      try {
        await intake.confirm(factoryId, body);
        return { queued: false };
      } catch (ex) {
        // Only a network failure is queued. If the server answered, the outcome
        // is known and replaying it later would duplicate or repeat a refusal.
        if (ex instanceof NetworkError) {
          await queue.enqueue({
            kind: 'confirm_intake',
            factoryId,
            factoryName,
            label: `${docType.label}: ${annualised.toLocaleString('en-IN')} ${docType.unit}`,
            body,
          });
          return { queued: true };
        }
        throw ex;
      }
    },
    onSuccess: (result) => {
      setSaved(true);
      setQueued(result.queued);
    },
    onError: (ex) => setError(describeError(ex)),
  });

  return (
    <Screen>
      <Heading sub={factoryName}>Scan a bill</Heading>

      <PendingBanner />

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
          <ViewfinderTarget style={{ marginBottom: space.md }}>
            <Image
              source={{ uri: image.uri }}
              style={{
                width: '100%',
                height: 240,
                borderRadius: radius.md,
                backgroundColor: colour.surfaceRaised,
              }}
              resizeMode="contain"
            />
            {readingNow ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' }}>
                <LaserScan active={true} height={240} />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    alignSelf: 'center',
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(8, 14, 26, 0.88)',
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colour.borderHighlight,
                  }}
                >
                  <PulseDot color={colour.primary} size={7} />
                  <Text style={{ ...typeScale.micro, color: colour.primary, marginLeft: 6 }}>
                    EXTRACTING UTILITY BILL...
                  </Text>
                </View>
              </View>
            ) : null}
          </ViewfinderTarget>
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
        {image && capability.ocr ? (
          <Button
            title={reading ? 'Read this photo again' : 'Read this photo'}
            variant="secondary"
            onPress={() => {
              setError(null);
              readOnDevice(image.uri, docType.key as DocumentKind);
            }}
            loading={readingNow}
            style={{ marginTop: space.sm }}
          />
        ) : null}
        {image && !evidenceId ? (
          <Button
            title="File this photo as evidence"
            onPress={() => {
              setError(null);
              upload.mutate();
            }}
            loading={upload.isPending}
            style={{ marginTop: space.sm }}
          />
        ) : null}
        <Text style={{ ...typeScale.caption, color: colour.subtle, marginTop: space.sm }}>
          {capability.summary}
        </Text>
      </Card>

      {error ? <Note tone="warning">{error}</Note> : null}
      {extractorNote ? <Note>{extractorNote}</Note> : null}

      {reading?.scene && reading.scene.kind === 'unclear' ? (
        <Note tone="warning">{reading.scene.summary}</Note>
      ) : null}

      {reading?.reading ? (
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: space.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ ...typeScale.heading, color: colour.text }}>
                Read on this phone
              </Text>
              <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 2 }}>
                Text recognition ran on the device. The photo did not leave it.
              </Text>
            </View>
            <Badge tone="positive">ON DEVICE</Badge>
          </View>
          <ExtractedFields
            fields={reading.reading.fields}
            emptyBody="Nothing on this photo matched a known bill layout. Enter the reading by hand below - the photograph is still filed as evidence."
          />
          {reading.reading.period ? (
            <Note>
              This looks like {reading.reading.period.label.toLowerCase()} of data, read from
              &ldquo;{reading.reading.period.evidence}&rdquo;. Check the period below before
              saving.
            </Note>
          ) : null}
          {reading.scene && reading.scene.kind !== 'unclear' ? (
            <Text style={{ ...typeScale.caption, color: colour.textFaint }}>
              {reading.scene.summary}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {image ? (
        <Card>
          <Text style={{ ...typeScale.heading, color: colour.text }}>
            Confirm what the bill says
          </Text>
          <Text
            style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.xs, marginBottom: space.md }}
          >
            {evidenceId
              ? 'The photo is stored and will be linked to this reading as evidence.'
              : 'The photo is on this phone. File it as evidence above when you have a signal.'}
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
        <Card style={{ borderColor: queued ? colour.high : colour.ok }}>
          <Text style={{ ...typeScale.heading, color: queued ? colour.high : colour.ok }}>
            {queued ? 'Saved on this phone' : 'Reading saved'}
          </Text>
          <Text style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.xs }}>
            {queued
              ? 'It will send on its own when you have a signal.'
              : 'The bill is filed as evidence against it.'}
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
