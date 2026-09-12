/**
 * Account and diagnostics.
 *
 * The health block is here on purpose. When a demo fails on a phone it is
 * almost always the API URL, and "cannot reach PRANGARA at http://10.0.0.4:8000"
 * is a fixable message where "something went wrong" is not.
 */

import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { API_BASE_URL, describeError } from '../api/client';
import { system } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Card,
  Divider,
  Heading,
  Loading,
  Note,
  Row,
  Screen,
} from '../components/ui';
import { colour, space, type as typeScale } from '../theme/tokens';

export default function AccountScreen() {
  const { me, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const health = useQuery({
    queryKey: ['health'],
    queryFn: system.health,
    retry: false,
  });

  return (
    <Screen>
      <Heading sub={me?.user.email}>{me?.user.full_name || 'Account'}</Heading>

      <Card>
        <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
          Organizations
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

      <Card>
        <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
          Connection
        </Text>
        <Row left="API" right={API_BASE_URL} />
        {health.isLoading ? <Loading label="Checking" /> : null}
        {health.isError ? (
          <Note tone="warning">
            {describeError(health.error)} Set EXPO_PUBLIC_API_URL to the LAN
            address of the machine running the API - on a physical phone,
            localhost is the phone.
          </Note>
        ) : null}
        {health.data ? (
          <>
            <Row left="Status" right={health.data.status} />
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
              Optional features on this deployment
            </Text>
            <Row
              left="PostgreSQL"
              right={health.data.features.postgres ? 'yes' : 'SQLite'}
            />
            <Row
              left="Object storage"
              right={health.data.features.object_storage ? 'MinIO' : 'local disk'}
            />
            <Row
              left="Language-model intake"
              right={health.data.features.llm_intake ? 'yes' : 'deterministic parser'}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <Text style={{ ...typeScale.heading, color: colour.text, marginBottom: space.sm }}>
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
    </Screen>
  );
}
