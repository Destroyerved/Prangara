/**
 * Account and diagnostics.
 *
 * Shows the active organization, connection health diagnostics,
 * server URL switcher for LAN/cloud demoing, and clean sign-out.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';

import { describeError, getBaseUrl, setCustomBaseUrl } from '../api/client';
import { onDeviceStatus } from '../ml';
import { system } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Card,
  Divider,
  Eyebrow,
  Heading,
  Loading,
  Note,
  Row,
  Screen,
} from '../components/ui';
import { colour, radius, space, type as typeScale } from '../theme/tokens';

export default function AccountScreen() {
  const { me, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(getBaseUrl());
  const onDevice = onDeviceStatus();

  const health = useQuery({
    queryKey: ['health'],
    queryFn: system.health,
    retry: false,
  });

  return (
    <Screen>
      <Heading sub={me?.user.email}>{me?.user.full_name || 'Account'}</Heading>

      <Card>
        <Eyebrow>ORGANIZATION</Eyebrow>
        <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs, marginBottom: space.sm }}>
          Memberships
        </Text>
        {me?.memberships.map((membership) => (
          <Row
            key={membership.organization.id}
            left={membership.organization.name}
            right={membership.role.replace(/_/g, ' ')}
            strong={membership.organization.id === me.active_organization_id}
          />
        ))}
      </Card>

      {/* What the phone can do without a server, stated plainly: the first
          question on a factory floor with no signal. */}
      <Card>
        <Eyebrow>ON THIS PHONE</Eyebrow>
        <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs }}>
          On-device intelligence
        </Text>
        <Row
          left="Text recognition (OCR)"
          right={onDevice.ocr ? 'Available' : 'Unavailable'}
          strong
        />
        <Row left="Image labelling" right={onDevice.vision ? 'Available' : 'Unavailable'} />
        <Note>{onDevice.summary}</Note>
      </Card>

      <Card>
        <Eyebrow>CONNECTIVITY</Eyebrow>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xs, marginBottom: space.sm }}>
          <Text style={{ ...typeScale.heading, color: colour.text }}>
            FastAPI Backend
          </Text>
          <Button
            title="Switch"
            variant="secondary"
            onPress={() => {
              setTempUrl(getBaseUrl());
              setServerModalOpen(true);
            }}
          />
        </View>
        <Row left="Active URL" right={getBaseUrl()} strong />
        {health.isLoading ? <Loading label="Testing server connection..." /> : null}
        {health.isError ? (
          <Note tone="warning">
            {describeError(health.error)} If on a physical phone, ensure phone and laptop are on the same Wi-Fi and use your machine's LAN IP.
          </Note>
        ) : null}
        {health.data ? (
          <>
            <Row left="Status" right={health.data.status} strong />
            <Row left="Version" right={health.data.version} />
            <Row left="Engine" right={health.data.engine.engine_version} />
            <Divider />
            <Row
              left="Emission factors"
              right={String(health.data.engine.factors)}
            />
            <Row left="Sectors" right={String(health.data.engine.sectors)} />
            <Row
              left="Interventions"
              right={String(health.data.engine.interventions)}
            />
            <Divider />
            <Text
              style={{ ...typeScale.caption, color: colour.textMuted, marginBottom: space.xs }}
            >
              System capabilities
            </Text>
            <Row
              left="Database"
              right={health.data.features.postgres ? 'PostgreSQL' : 'SQLite'}
            />
            <Row
              left="Object storage"
              right={health.data.features.object_storage ? 'MinIO S3' : 'local disk'}
            />
            <Row
              left="LLM Intake Engine"
              right={health.data.features.llm_intake ? 'Active' : 'deterministic parser'}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <Eyebrow>GOVERNANCE</Eyebrow>
        <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs, marginBottom: space.sm }}>
          What PRANGARA is
        </Text>
        <Text style={{ ...typeScale.body, color: colour.textMuted, lineHeight: 21 }}>
          Screening, decision support, implementation support and evidence
          readiness. Every carbon and financial figure is a screening-grade
          estimate carried with an uncertainty band and traceable to a source.
        </Text>
        <Text
          style={{ ...typeScale.body, color: colour.textMuted, marginTop: space.md, lineHeight: 21 }}
        >
          It is not a BEE-accredited audit, a legal assurance service, a
          regulator or a carbon-credit verifier, and it does not replace a site
          engineering study or a vendor quotation.
        </Text>
      </Card>

      <Button
        title="Sign out"
        variant="danger"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await signOut();
          setBusy(false);
        }}
      />
      <View style={{ height: space.xl }} />

      {/* Backend Endpoint Switcher Modal */}
      <Modal visible={serverModalOpen} animationType="fade" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.75)',
            justifyContent: 'center',
            padding: space.lg,
          }}
        >
          <Card style={{ borderWidth: 1, borderColor: colour.border }}>
            <Eyebrow>SERVER CONFIGURATION</Eyebrow>
            <Text style={{ ...typeScale.heading, color: colour.text, marginTop: space.xs }}>
              Backend Endpoint URL
            </Text>
            <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: 4, marginBottom: space.md }}>
              Enter the HTTP address of your FastAPI server (e.g., https://prangara.vercel.app).
            </Text>

            <TextInput
              value={tempUrl}
              onChangeText={setTempUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://prangara.vercel.app"
              placeholderTextColor={colour.textFaint}
              style={{
                backgroundColor: colour.surfaceRaised,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colour.border,
                padding: space.md,
                color: colour.text,
                ...typeScale.body,
                marginBottom: space.md,
              }}
            />

            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setServerModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save & Connect"
                onPress={() => {
                  setCustomBaseUrl(tempUrl.trim());
                  setServerModalOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['health'] });
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
