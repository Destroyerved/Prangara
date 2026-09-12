/**
 * Evidence capture. PRD FR-47, task.md FE-2 "Evidence Capture".
 *
 * A phone camera is the cheapest document scanner an SME owns, so this is the
 * screen that fills the evidence vault: photograph it, say what it is and what
 * period it covers, file it against the factory.
 *
 * Duplicate detection lives in the backend and is surfaced here rather than
 * swallowed - the same bill photographed twice is worth telling someone about,
 * because a genuine reissue of the same document also exists.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { ApiError, describeError } from '../api/client';
import { evidence as evidenceApi } from '../api/endpoints';
import {
  Button,
  Card,
  Chip,
  Field,
  Heading,
  Loading,
  Note,
  Screen,
} from '../components/ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import { relativeTime } from '../lib/format';
import type { RootStackParams } from '../navigation/types';

const EVIDENCE_TYPES = [
  { key: 'electricity_bill', label: 'Electricity bill' },
  { key: 'fuel_invoice', label: 'Fuel invoice' },
  { key: 'material_invoice', label: 'Material invoice' },
  { key: 'waste_certificate', label: 'Waste certificate' },
  { key: 'freight_invoice', label: 'Freight invoice' },
  { key: 'calibration_certificate', label: 'Calibration certificate' },
  { key: 'equipment_certificate', label: 'Equipment certificate' },
  { key: 'installation_photo', label: 'Installation photo' },
  { key: 'meter_photo', label: 'Meter reading' },
  { key: 'vendor_quote', label: 'Vendor quote' },
  { key: 'other', label: 'Something else' },
];

export default function EvidenceCaptureScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'EvidenceCapture'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const queryClient = useQueryClient();
  const { factoryId, factoryName, targetType, targetId } = route.params;

  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [evidenceType, setEvidenceType] = useState(EVIDENCE_TYPES[0]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const filed = useQuery({
    queryKey: ['evidence', factoryId],
    queryFn: () => evidenceApi.list(factoryId),
  });

  async function pick(from: 'camera' | 'library') {
    setError(null);
    setDuplicateOf(null);
    const permission =
      from === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        from === 'camera'
          ? 'Camera access is off. Turn it on in Settings to photograph a document.'
          : 'Photo access is off. Turn it on in Settings to pick a document.',
      );
      return;
    }
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsEditing: true,
            mediaTypes: ['images'],
          });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
      setSaved(false);
    }
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (!image) throw new Error('Photograph the document first.');
      const form = new FormData();
      form.append('file', {
        uri: image.uri,
        name: image.fileName ?? `${evidenceType.key}.jpg`,
        type: image.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      form.append('factory_id', factoryId);
      form.append('evidence_type', evidenceType.key);
      if (title.trim()) form.append('title', title.trim());

      const document = await evidenceApi.upload(form);
      if (targetType && targetId) {
        await evidenceApi.link(document.id, targetType, targetId);
      }
      return document;
    },
    onSuccess: () => {
      setSaved(true);
      setImage(null);
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['evidence', factoryId] });
    },
    onError: (ex) => {
      if (ex instanceof ApiError && ex.code === 'duplicate_evidence') {
        setDuplicateOf(String(ex.details.title ?? 'an existing document'));
        setError(null);
        return;
      }
      setError(describeError(ex));
    },
  });

  return (
    <Screen>
      <Heading sub={factoryName}>File a document</Heading>

      <Note>
        Evidence is what turns a declared number into a defensible one. A bill
        attached to a reading raises its data-quality state and is what a
        disclosure request will ask for.
      </Note>

      <Card>
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={{
              width: '100%',
              height: 220,
              borderRadius: radius.md,
              marginBottom: space.md,
              backgroundColor: colour.surfaceRaised,
            }}
            resizeMode="contain"
          />
        ) : null}
        <Button
          title={image ? 'Retake photo' : 'Photograph the document'}
          onPress={() => pick('camera')}
        />
        <Button
          title="Choose from gallery"
          variant="secondary"
          onPress={() => pick('library')}
          style={{ marginTop: space.sm }}
        />
      </Card>

      <Card>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text, marginBottom: space.sm }}>
          What is it?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
          {EVIDENCE_TYPES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={evidenceType.key === item.key}
              onPress={() => setEvidenceType(item)}
            />
          ))}
        </View>

        <Field
          label="Give it a name"
          hint="Optional. Helps you find it later."
          value={title}
          onChangeText={setTitle}
          placeholder={`${evidenceType.label} - March`}
        />

        {error ? <Note tone="warning">{error}</Note> : null}
        {duplicateOf ? (
          <Note tone="warning">
            This exact file is already filed as “{duplicateOf}”. If it is a
            reissue rather than the same document, photograph the reissued copy.
          </Note>
        ) : null}

        <Button
          title="File it"
          onPress={() => {
            setError(null);
            setDuplicateOf(null);
            upload.mutate();
          }}
          loading={upload.isPending}
          disabled={!image}
        />
      </Card>

      {saved ? (
        <Card style={{ borderColor: colour.ok }}>
          <Text style={{ ...typeScale.heading, color: colour.ok }}>Filed</Text>
          <Text style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.xs }}>
            Stored against {factoryName}
            {targetType ? ` and linked to this ${targetType.replace(/_/g, ' ')}` : ''}.
          </Text>
          <Button
            title="Done"
            onPress={() => navigation.goBack()}
            style={{ marginTop: space.md }}
          />
        </Card>
      ) : null}

      <Card>
        <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
          Already on file
        </Text>
        {filed.isLoading ? <Loading label="Loading documents" /> : null}
        {filed.data?.length === 0 ? (
          <Text style={{ ...typeScale.body, color: colour.textMuted }}>
            Nothing filed for this factory yet.
          </Text>
        ) : null}
        {filed.data?.slice(0, 12).map((document) => (
          <View key={document.id} style={{ paddingVertical: space.sm }}>
            <Text style={{ ...typeScale.bodyStrong, color: colour.text }}>
              {document.title}
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.textFaint, marginTop: 2 }}>
              {document.evidence_type.replace(/_/g, ' ')} ·{' '}
              {document.verification_status.replace(/_/g, ' ')} ·{' '}
              {relativeTime(document.created_at)}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
