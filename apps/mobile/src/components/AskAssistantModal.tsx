/**
 * Ask PRANGARA - Mobile Sovereign RAG Assistant Modal.
 *
 * Provides factory engineers on the floor with instant statutory reasoning
 * and verified citations (BEE PAT, SEBI BRSR Core, EU CBAM, CEA Grid).
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { request } from '../api/client';
import { Button, Card, Eyebrow } from './ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';

interface Citation {
  source?: string;
  title?: string;
  ref?: string;
  refId?: string;
  grade?: string;
  text?: string;
  excerpt?: string;
}

interface AssistantResponse {
  answer: string;
  confidence?: string;
  citations?: Citation[];
  limitations?: string[];
}

const POPULAR_QUESTIONS = [
  'Why was boiler economizer capped?',
  'What is the CEA grid emission factor for our plant?',
  'What does SEBI BRSR Core require for Scope 1?',
  'How does EU CBAM embedded emissions calculation work?',
];

export function AskAssistantModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      question: string;
      answer: string;
      confidence?: string;
      citations?: Citation[];
    }>
  >([
    {
      question: 'What statutory standards apply to Indian industrial facilities?',
      answer:
        'Industrial facilities in India face three primary regulatory vectors: 1) BEE PAT specific energy consumption targets, 2) SEBI BRSR Core value-chain ESG disclosure for suppliers of top 1,000 listed entities, and 3) EU CBAM embedded emissions charges on exported metals and chemicals.',
      confidence: 'high',
      citations: [
        {
          title: 'BEE Energy Conservation Act (PAT Scheme)',
          refId: 'BEE-BOOK-2-SEC-4',
          grade: 'Grade A (Regulatory Standard)',
          excerpt: 'Designated consumers must maintain specific energy consumption limits.',
        },
        {
          title: 'SEBI BRSR Core Framework',
          refId: 'CIR/CFD/2023/122',
          grade: 'Mandatory Disclosure',
          excerpt: 'Value chain ESG assurance required for top listed entities.',
        },
      ],
    },
  ]);

  async function handleAsk(questionToAsk?: string) {
    const q = (questionToAsk || query).trim();
    if (!q || loading) return;
    setLoading(true);
    if (!questionToAsk) setQuery('');

    try {
      const res = await request<AssistantResponse>('/api/assistant/ask', {
        method: 'POST',
        body: { question: q },
      });

      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: res.answer || 'No response recorded.',
          confidence: res.confidence || 'medium',
          citations: res.citations || [],
        },
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer:
            'PRANGARA RAG Assistant queries statutory regulatory corpora. Check backend connection to receive grounded citations.',
          confidence: 'low',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            height: '88%',
            backgroundColor: colour.surface,
            borderTopLeftRadius: radius.lg * 1.5,
            borderTopRightRadius: radius.lg * 1.5,
            borderWidth: 1,
            borderColor: colour.borderStrong,
            padding: space.lg,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: space.md,
              borderBottomWidth: 1,
              borderBottomColor: colour.border,
              marginBottom: space.md,
            }}
          >
            <View>
              <Eyebrow dotColour={colour.emerald}>SOVEREIGN RAG INTELLIGENCE</Eyebrow>
              <Text style={{ ...typeScale.title, color: colour.text }}>Ask PRANGARA ✨</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colour.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, color: colour.textMuted }}>✕</Text>
            </Pressable>
          </View>

          {/* Chat Messages */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: space.xl }}
            keyboardShouldPersistTaps="handled"
          >
            {history.map((item, idx) => (
              <View key={idx} style={{ marginBottom: space.lg }}>
                {/* User Bubble */}
                <View
                  style={{
                    alignSelf: 'flex-end',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderWidth: 1,
                    borderRadius: radius.md,
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm,
                    maxWidth: '85%',
                    marginBottom: space.sm,
                  }}
                >
                  <Text style={{ ...typeScale.bodyStrong, color: colour.primary }}>
                    {item.question}
                  </Text>
                </View>

                {/* Assistant Bubble */}
                <Card style={{ alignSelf: 'flex-start', maxWidth: '96%' }}>
                  <Text style={{ ...typeScale.body, color: colour.text, lineHeight: 22 }}>
                    {item.answer}
                  </Text>

                  {/* Citations */}
                  {item.citations && item.citations.length > 0 ? (
                    <View
                      style={{
                        marginTop: space.md,
                        paddingTop: space.sm,
                        borderTopWidth: 1,
                        borderTopColor: colour.border,
                      }}
                    >
                      <Text
                        style={{
                          ...typeScale.micro,
                          color: colour.emerald,
                          marginBottom: space.xs,
                        }}
                      >
                        VERIFIED STATUTORY SOURCES:
                      </Text>
                      {item.citations.map((c, cIdx) => (
                        <View
                          key={cIdx}
                          style={{
                            backgroundColor: colour.surfaceRaised,
                            borderRadius: radius.sm,
                            padding: space.sm,
                            marginBottom: space.xs,
                          }}
                        >
                          <Text
                            style={{ ...typeScale.caption, color: colour.text, fontWeight: '600' }}
                          >
                            {c.title || c.source}
                          </Text>
                          {c.excerpt || c.text ? (
                            <Text
                              style={{
                                ...typeScale.micro,
                                color: colour.textMuted,
                                fontStyle: 'italic',
                                marginTop: 2,
                              }}
                            >
                              "{c.excerpt || c.text}"
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              </View>
            ))}

            {loading ? (
              <View style={{ alignItems: 'center', marginVertical: space.md }}>
                <ActivityIndicator color={colour.primary} />
                <Text
                  style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.xs }}
                >
                  Retrieving statutory chunks…
                </Text>
              </View>
            ) : null}

            {/* Quick suggestion pills */}
            <View style={{ marginTop: space.sm }}>
              <Text style={{ ...typeScale.micro, color: colour.textFaint, marginBottom: space.sm }}>
                SUGGESTED REGULATORY QUERIES:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {POPULAR_QUESTIONS.map((pq, pIdx) => (
                  <Pressable
                    key={pIdx}
                    onPress={() => handleAsk(pq)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ ...typeScale.caption, color: colour.textMuted }}>{pq}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Input Box */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colour.surfaceRaised,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colour.borderStrong,
              paddingHorizontal: space.md,
              marginTop: space.sm,
            }}
          >
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Ask about CBAM, BRSR, CEA factors…"
              placeholderTextColor={colour.textFaint}
              style={{ flex: 1, color: colour.text, paddingVertical: space.md, fontSize: 14 }}
              onSubmitEditing={() => handleAsk()}
              returnKeyType="send"
            />
            <Button
              title="Ask"
              onPress={() => handleAsk()}
              disabled={!query.trim() || loading}
              style={{ minHeight: 36, paddingHorizontal: 16 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
