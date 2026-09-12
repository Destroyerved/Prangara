/**
 * Conversational onboarding. PRD FR-04.
 *
 * The owner describes the plant in their own words; the backend proposes
 * structured values; **the owner confirms every one before anything is saved.**
 *
 * Three things this screen is careful about, all of them from PRD section 29:
 *
 *  - Nothing is written until "Save confirmed values" is pressed. Extraction and
 *    persistence are separate API calls for exactly this reason.
 *  - Every proposed value is editable, shows its confidence, and shows the words
 *    it was read from, so the owner can check it rather than trust it.
 *  - The screen says which extractor ran. When no language model is configured
 *    the backend uses a deterministic parser, and claiming otherwise would be a
 *    lie about how the number was produced.
 */

import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { intake } from '../api/endpoints';
import {
  Button,
  Card,
  Divider,
  Field,
  Heading,
  Note,
  Screen,
} from '../components/ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import type { RootStackParams } from '../navigation/types';
import type { ActivityRecordIn, ExtractedField, StreamKind } from '../api/types';

const EXAMPLE =
  'We run a textile dyeing unit in Surat, produce about 200 tonnes a month, ' +
  'use around 180,000 units of electricity monthly and about 25 tonnes of coal.';

/** How each extracted field maps onto what the API accepts. */
type Destination =
  | { kind: 'profile'; field: string }
  | { kind: 'activity'; stream: StreamKind; factorKey: string | null; unit: string };

const DESTINATIONS: Record<string, Destination> = {
  annual_output_t: { kind: 'profile', field: 'annual_output_t' },
  annual_revenue_cr: { kind: 'profile', field: 'annual_revenue_cr' },
  employees: { kind: 'profile', field: 'employees' },
  eu_export_share_pct: { kind: 'profile', field: 'eu_export_share_pct' },
  tariff_inr_per_kwh: { kind: 'profile', field: 'tariff_inr_per_kwh' },
  electricity_kwh: {
    kind: 'activity',
    stream: 'electricity',
    factorKey: null,
    unit: 'kWh',
  },
  fuel_COAL_INDIAN: { kind: 'activity', stream: 'fuel', factorKey: 'COAL_INDIAN', unit: 'tonne' },
  fuel_DIESEL: { kind: 'activity', stream: 'fuel', factorKey: 'DIESEL', unit: 'litre' },
  fuel_NATURAL_GAS: { kind: 'activity', stream: 'fuel', factorKey: 'NATURAL_GAS', unit: 'Sm3' },
  fuel_LPG: { kind: 'activity', stream: 'fuel', factorKey: 'LPG', unit: 'kg' },
  fuel_FURNACE_OIL: { kind: 'activity', stream: 'fuel', factorKey: 'FURNACE_OIL', unit: 'kg' },
  fuel_BIOMASS_BRIQUETTE: {
    kind: 'activity',
    stream: 'fuel',
    factorKey: 'BIOMASS_BRIQUETTE',
    unit: 'tonne',
  },
};

const LABELS: Record<string, string> = {
  annual_output_t: 'Annual output',
  annual_revenue_cr: 'Annual turnover',
  employees: 'Employees',
  eu_export_share_pct: 'Share exported to the EU',
  tariff_inr_per_kwh: 'Electricity tariff',
  electricity_kwh: 'Electricity used per year',
  fuel_COAL_INDIAN: 'Coal burned per year',
  fuel_DIESEL: 'Diesel used per year',
  fuel_NATURAL_GAS: 'Natural gas used per year',
  fuel_LPG: 'LPG used per year',
  fuel_FURNACE_OIL: 'Furnace oil used per year',
  fuel_BIOMASS_BRIQUETTE: 'Biomass briquette used per year',
};

interface Editable extends ExtractedField {
  draft: string;
  include: boolean;
}

export default function OnboardingChatScreen() {
  const route = useRoute<RouteProp<RootStackParams, 'Onboarding'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { factoryId, factoryName, sector } = route.params;

  const [message, setMessage] = useState('');
  const [fields, setFields] = useState<Editable[]>([]);
  const [meta, setMeta] = useState<{
    extractor: string;
    detail: string;
    questions: string[];
    warnings: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);

  const extract = useMutation({
    mutationFn: () =>
      intake.extractConversation({ message: message.trim(), factory_id: factoryId, sector }),
    onSuccess: (result) => {
      setFields(
        result.fields
          // Anything with no destination cannot be written, so it is not shown
          // as though it will be. Unknown field names are surfaced in warnings.
          .filter((field) => DESTINATIONS[field.field])
          .map((field) => ({ ...field, draft: String(field.value), include: true })),
      );
      setMeta({
        extractor: result.extractor,
        detail: result.extractor_detail,
        questions: result.follow_up_questions,
        warnings: [
          ...result.warnings,
          ...result.fields
            .filter((field) => !DESTINATIONS[field.field])
            .map((field) => `Read "${field.field}" but this app cannot save it yet.`),
        ],
      });
      setSaved(null);
    },
    onError: (ex) => setError(describeError(ex)),
  });

  const payload = useMemo(() => {
    const profile_updates: Record<string, number> = {};
    const activity_records: ActivityRecordIn[] = [];

    fields.forEach((field) => {
      if (!field.include) return;
      const value = Number(field.draft.replace(/,/g, ''));
      if (!Number.isFinite(value) || value < 0) return;
      const destination = DESTINATIONS[field.field];
      if (!destination) return;

      if (destination.kind === 'profile') {
        profile_updates[destination.field] = value;
      } else {
        activity_records.push({
          stream_kind: destination.stream,
          factor_key: destination.factorKey,
          label: LABELS[field.field] ?? field.field,
          quantity: value,
          unit: destination.unit,
          data_state: 'DECLARED',
          source_kind: 'conversation',
          extraction_confidence: field.confidence,
        });
      }
    });

    return { profile_updates, activity_records };
  }, [fields]);

  const confirm = useMutation({
    mutationFn: () =>
      intake.confirm(factoryId, { ...payload, source_kind: 'conversation' }),
    onSuccess: (result) => {
      setSaved(result.created_activity_record_ids.length);
      setFields([]);
    },
    onError: (ex) => setError(describeError(ex)),
  });

  const anythingToSave =
    Object.keys(payload.profile_updates).length > 0 || payload.activity_records.length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colour.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <Heading sub={factoryName}>Describe your plant</Heading>

        <Card>
          <Field
            label="In your own words"
            hint="Sector, how much you make, your electricity units, and any fuel you burn. Say whether the figures are monthly or yearly."
            value={message}
            onChangeText={setMessage}
            placeholder={EXAMPLE}
            multiline
          />
          <Button
            title="Read this"
            onPress={() => {
              setError(null);
              extract.mutate();
            }}
            loading={extract.isPending}
            disabled={message.trim().length < 12}
          />
          {message.length === 0 ? (
            <Button
              title="Use the example"
              variant="ghost"
              onPress={() => setMessage(EXAMPLE)}
              style={{ marginTop: space.sm }}
            />
          ) : null}
        </Card>

        {error ? <Note tone="warning">{error}</Note> : null}

        {saved !== null ? (
          <Card style={{ borderColor: colour.ok }}>
            <Text style={{ ...typeScale.heading, color: colour.ok }}>Saved</Text>
            <Text style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.xs }}>
              {saved} activity record{saved === 1 ? '' : 's'} added. Add more detail,
              scan a bill, or run the assessment now.
            </Text>
            <Button
              title="Run assessment"
              onPress={() =>
                navigation.navigate('QuickResults', { factoryId, factoryName })
              }
              style={{ marginTop: space.md }}
            />
            <Button
              title="Scan a bill instead"
              variant="secondary"
              onPress={() => navigation.navigate('BillScan', { factoryId, factoryName })}
              style={{ marginTop: space.sm }}
            />
          </Card>
        ) : null}

        {meta ? (
          <Note tone={meta.extractor === 'rule_based' ? 'warning' : 'info'}>
            {meta.detail}
          </Note>
        ) : null}

        {meta?.warnings.map((warning) => (
          <Note key={warning} tone="warning">
            {warning}
          </Note>
        ))}

        {fields.length > 0 ? (
          <Card>
            <Text style={{ ...typeScale.heading, color: colour.text }}>
              Check these before saving
            </Text>
            <Text
              style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.xs }}
            >
              Nothing is saved until you confirm. Edit anything that is wrong, or
              switch it off.
            </Text>
            <Divider />

            {fields.map((field, index) => (
              <View key={field.field} style={{ marginBottom: space.lg }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: space.xs,
                  }}
                >
                  <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
                    {LABELS[field.field] ?? field.field}
                  </Text>
                  <ConfidenceChip confidence={field.confidence} />
                </View>

                {field.evidence_text ? (
                  <Text
                    style={{
                      ...typeScale.caption,
                      color: colour.textFaint,
                      fontStyle: 'italic',
                      marginBottom: space.sm,
                    }}
                  >
                    read from: “{field.evidence_text}”
                  </Text>
                ) : null}

                <Field
                  label=""
                  value={field.draft}
                  onChangeText={(next) =>
                    setFields((current) =>
                      current.map((item, i) => (i === index ? { ...item, draft: next } : item)),
                    )
                  }
                  keyboardType="decimal-pad"
                  suffix={DESTINATIONS[field.field]?.kind === 'activity'
                    ? (DESTINATIONS[field.field] as { unit: string }).unit
                    : undefined}
                />

                <Button
                  title={field.include ? 'Do not save this one' : 'Include this one'}
                  variant="ghost"
                  onPress={() =>
                    setFields((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, include: !item.include } : item,
                      ),
                    )
                  }
                />
              </View>
            ))}

            <Button
              title="Save confirmed values"
              onPress={() => {
                setError(null);
                confirm.mutate();
              }}
              loading={confirm.isPending}
              disabled={!anythingToSave}
            />
          </Card>
        ) : null}

        {meta?.questions.length ? (
          <Card>
            <Text style={{ ...typeScale.heading, color: colour.text }}>Still missing</Text>
            <Text
              style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.xs }}
            >
              Answer these in another message, or add them from a bill.
            </Text>
            {meta.questions.map((question) => (
              <View
                key={question}
                style={{
                  marginTop: space.md,
                  padding: space.md,
                  backgroundColor: colour.surfaceRaised,
                  borderRadius: radius.md,
                }}
              >
                <Text style={{ ...typeScale.body, color: colour.text }}>{question}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function ConfidenceChip({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone = confidence >= 0.75 ? colour.ok : confidence >= 0.5 ? colour.declared : colour.high;
  const word = confidence >= 0.75 ? 'likely' : confidence >= 0.5 ? 'check' : 'unsure';
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tone,
        borderRadius: radius.pill,
        paddingHorizontal: space.sm,
        paddingVertical: 2,
      }}
    >
      <Text style={{ ...typeScale.micro, color: tone }}>
        {word.toUpperCase()} {pct}%
      </Text>
    </View>
  );
}
