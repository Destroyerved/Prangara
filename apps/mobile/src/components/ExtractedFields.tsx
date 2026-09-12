/**
 * What a machine read, and where it read it.
 *
 * Every extracted value is shown with three things beside it: its confidence,
 * the exact printed line it came from, and the fact that it still needs
 * confirming. A reader who can see the source line can catch a misread digit
 * in a second; a reader shown only the number cannot.
 *
 * Shared by the bill scanner, the nameplate scanner and conversational intake,
 * so an extraction looks the same wherever it came from.
 */

import React from 'react';
import { Text, View } from 'react-native';

import { Badge } from './layout';
import { label as humanise, number } from '../lib/format';
import { colour, radius, space, type as typeScale } from '../theme/tokens';
import type { ExtractedField } from '../api/types';

function tone(confidence: number): 'positive' | 'accent' | 'high' {
  if (confidence >= 0.85) return 'positive';
  if (confidence >= 0.65) return 'accent';
  return 'high';
}

function describe(confidence: number): string {
  if (confidence >= 0.85) return 'CLEAR';
  if (confidence >= 0.65) return 'LIKELY';
  return 'UNSURE';
}

export default function ExtractedFields({
  fields,
  title = 'What this phone read',
  emptyBody,
}: {
  fields: ExtractedField[];
  title?: string;
  emptyBody?: string;
}) {
  if (!fields.length) {
    return emptyBody ? (
      <View
        style={{
          padding: space.md,
          borderRadius: radius.control,
          borderWidth: 1,
          borderColor: colour.border,
          backgroundColor: colour.surfaceInset,
          marginBottom: space.md,
        }}
      >
        <Text style={{ ...typeScale.caption, color: colour.muted }}>{emptyBody}</Text>
      </View>
    ) : null;
  }

  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={{ ...typeScale.micro, color: colour.subtle, marginBottom: space.sm }}>
        {title.toUpperCase()}
      </Text>
      {fields.map((field) => (
        <View
          key={field.field}
          style={{
            padding: space.md,
            borderRadius: radius.control,
            borderWidth: 1,
            borderColor: colour.border,
            backgroundColor: colour.surfaceInset,
            marginBottom: space.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...typeScale.caption, color: colour.muted, flex: 1 }}>
              {humanise(field.field)}
            </Text>
            <Badge tone={tone(field.confidence)}>
              {describe(field.confidence)} {Math.round(field.confidence * 100)}%
            </Badge>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={{ ...typeScale.numeric, color: colour.bright }}>
              {typeof field.value === 'number' ? number(field.value, 2) : String(field.value)}
            </Text>
            {field.unit ? (
              <Text style={{ ...typeScale.caption, color: colour.subtle, marginLeft: 5 }}>
                {field.unit}
              </Text>
            ) : null}
          </View>
          {field.evidence_text ? (
            <Text
              style={{ ...typeScale.caption, color: colour.subtle, marginTop: 6 }}
              numberOfLines={2}
            >
              Read from: &ldquo;{field.evidence_text}&rdquo;
            </Text>
          ) : null}
        </View>
      ))}
      <Text style={{ ...typeScale.caption, color: colour.muted }}>
        Nothing here is saved until you confirm it. Check each figure against the document.
      </Text>
    </View>
  );
}
