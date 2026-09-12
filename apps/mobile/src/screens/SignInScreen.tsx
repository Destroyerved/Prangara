/**
 * Sign in and register.
 *
 * One screen for both, because a factory owner opening this app for the first
 * time should not have to work out which of two buttons they need.
 */

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { describeError } from '../api/client';
import { Button, Card, Field, Heading, Note, Screen } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { colour, space, type as typeScale } from '../theme/tokens';

type Mode = 'signin' | 'register';

export default function SignInScreen() {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colour.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <View style={{ marginTop: space.xxl, marginBottom: space.xl }}>
          <Text style={{ ...typeScale.display, color: colour.primary }}>PRANGARA</Text>
          <Text style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.xs }}>
            Industrial Carbon Intelligence Network
          </Text>
        </View>

        <Heading sub={
          registering
            ? 'Create an account for your factory. You can add sites and people later.'
            : 'Sign in to your factory account.'
        }>
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

          {error ? (
            <Note tone="warning">{error}</Note>
          ) : null}

          <Button
            title={registering ? 'Create account' : 'Sign in'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
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
        </Card>

        <Note>
          PRANGARA is screening and decision support. It is not a BEE-accredited
          audit, a legal assurance service or a carbon-credit verifier.
        </Note>
      </Screen>
    </KeyboardAvoidingView>
  );
}
