/**
 * Sign in and register.
 *
 * One screen for both, with quick demo fill buttons and dynamic server endpoint switcher.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { describeError, getBaseUrl, setCustomBaseUrl } from '../api/client';
import { Button, Card, Eyebrow, Field, Heading, Note, Screen } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { colour, radius, space, type as typeScale } from '../theme/tokens';

type Mode = 'signin' | 'register';

export default function SignInScreen() {
  const { signIn, register, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server Endpoint Switcher Modal State
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getBaseUrl());
  const [activeServerUrl, setActiveServerUrl] = useState(getBaseUrl());

  const registering = mode === 'register';
  const canSubmit =
    email.includes('@') &&
    password.length >= 8 &&
    (!registering || (fullName.trim().length > 0 && orgName.trim().length > 0));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (registering) {
        await register({
          email,
          password,
          full_name: fullName.trim(),
          organization_name: orgName.trim(),
        });
      } else {
        await signIn(email, password);
      }
    } catch (ex) {
      setError(describeError(ex));
    } finally {
      setBusy(false);
    }
  }

  function fillDemoAccount(demoEmail: string, demoName: string, demoCompany: string) {
    setEmail(demoEmail);
    setPassword('prangara-demo-2026');
    setFullName(demoName);
    setOrgName(demoCompany);
    setError(null);
  }

  function saveServerUrl() {
    const formatted = serverUrlInput.trim().replace(/\/$/, '');
    if (formatted) {
      setCustomBaseUrl(formatted);
      setActiveServerUrl(formatted);
    }
    setServerModalOpen(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colour.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        {/* Brand Header */}
        <View style={{ marginTop: space.xl, marginBottom: space.lg }}>
          <Eyebrow dotColour={colour.primary}>INDUSTRIAL CARBON NETWORK</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: colour.selectedBg,
                borderWidth: 1,
                borderColor: colour.borderHighlight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, color: colour.primary, fontWeight: '800' }}>P</Text>
            </View>
            <Text style={{ ...typeScale.display, color: colour.text, letterSpacing: 0.5 }}>
              PRANGARA
            </Text>
          </View>
          <Text style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.xs }}>
            Decarbonization Platform & Audited Ledger
          </Text>
        </View>

        {/* Active Backend Connection Bar */}
        <Pressable
          onPress={() => {
            setServerUrlInput(activeServerUrl);
            setServerModalOpen(true);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colour.panel,
            borderWidth: 1,
            borderColor: colour.borderHighlight,
            borderRadius: radius.md,
            paddingVertical: 8,
            paddingHorizontal: space.md,
            marginBottom: space.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colour.emerald,
                marginRight: 8,
              }}
            />
            <Text style={{ ...typeScale.micro, color: colour.textMuted }}>API:</Text>
            <Text
              style={{
                ...typeScale.micro,
                color: colour.primary,
                marginLeft: 4,
                fontWeight: '700',
              }}
              numberOfLines={1}
            >
              {activeServerUrl}
            </Text>
          </View>
          <Text style={{ ...typeScale.micro, color: colour.textMuted, opacity: 0.8 }}>Change ⚙</Text>
        </Pressable>

        <Heading
          sub={
            registering
              ? 'Create an account for your factory. You can add sites and people later.'
              : 'Sign in to access your factory carbon ledger.'
          }
        >
          {registering ? 'Create account' : 'Sign in'}
        </Heading>

        <Card>
          {registering ? (
            <>
              <Field
                label="Your name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Hitesh Patel"
                autoCapitalize="words"
              />
              <Field
                label="Company name"
                hint="The business that owns the factory."
                value={orgName}
                onChangeText={setOrgName}
                placeholder="Rajkot Metal Works"
                autoCapitalize="words"
              />
            </>
          ) : null}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Password"
            hint={registering ? 'At least 8 characters.' : undefined}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            error={
              registering && password.length > 0 && password.length < 8
                ? 'Too short - use at least 8 characters.'
                : null
            }
          />

          {error ? <Note tone="warning">{error}</Note> : null}

          <Button
            title={registering ? 'Create account' : 'Sign in'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            style={{ marginTop: space.sm }}
          />

          <Button
            title={registering ? 'I already have an account' : 'Create a new account'}
            variant="ghost"
            onPress={() => {
              setMode(registering ? 'signin' : 'register');
              setError(null);
            }}
            style={{ marginTop: space.sm }}
          />

          {/* 1-Tap Demo Credentials Pill Tray */}
          {!registering ? (
            <View style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colour.border }}>
              <Text style={{ ...typeScale.micro, color: colour.textFaint, marginBottom: space.sm }}>
                FAST DEMO ACCESS:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                <Pressable
                  onPress={() =>
                    fillDemoAccount(
                      'owner@demo.prangara.example',
                      'Hitesh Patel',
                      'Rajkot Metal Works',
                    )
                  }
                  style={{
                    backgroundColor: colour.selectedBg,
                    borderColor: colour.borderHighlight,
                    borderWidth: 1,
                    borderRadius: radius.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ ...typeScale.caption, color: colour.primary, fontWeight: '600' }}>
                    🏭 Foundry Owner
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    fillDemoAccount(
                      'admin@demo.prangara.example',
                      'Priya Admin',
                      'PRANGARA Platform',
                    )
                  }
                  style={{
                    backgroundColor: colour.positiveBg,
                    borderColor: colour.floatingBorder,
                    borderWidth: 1,
                    borderRadius: radius.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ ...typeScale.caption, color: colour.emerald, fontWeight: '600' }}>
                    🛡️ Platform Admin
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </Card>

        {/* No server in reach, or nothing to sign in to yet. The bundled
            engine demonstration is the same fallback the web app ships. */}
        <Card>
          <Eyebrow>NO ACCOUNT YET</Eyebrow>
          <Text style={{ ...typeScale.heading, color: colour.text, marginTop: 4 }}>
            Explore the demonstration
          </Text>
          <Text
            style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 4, lineHeight: 19 }}
          >
            Ten sectors of bundled engine results, with every analytical module working offline.
            Capture and procurement stay read-only until you sign in.
          </Text>
          <Button
            title="Open the demonstration"
            variant="secondary"
            onPress={() => {
              setError(null);
              continueAsGuest().catch((ex) => setError(describeError(ex)));
            }}
            style={{ marginTop: space.md }}
          />
        </Card>

        <Note>
          PRANGARA is screening and decision support. It is not a BEE-accredited
          audit, a legal assurance service or a carbon-credit verifier.
        </Note>
      </Screen>

      {/* Server Endpoint Switcher Modal */}
      <Modal visible={serverModalOpen} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: space.lg,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: colour.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colour.borderStrong,
              padding: space.xl,
            }}
          >
            <Eyebrow dotColour={colour.primary}>NETWORK CONFIGURATION</Eyebrow>
            <Text style={{ ...typeScale.title, color: colour.text, marginBottom: space.xs }}>
              Backend Server URL
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.textMuted, marginBottom: space.md }}>
              Set the host FastAPI address (e.g. your computer's Wi-Fi IP or tunnel URL).
            </Text>

            <TextInput
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                backgroundColor: colour.surfaceRaised,
                borderColor: colour.borderStrong,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: space.md,
                paddingVertical: space.md,
                color: colour.text,
                fontSize: 14,
                marginBottom: space.lg,
              }}
            />

            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setServerModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button title="Save & Apply" onPress={saveServerUrl} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
