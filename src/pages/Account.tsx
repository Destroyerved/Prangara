import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { setSession, signIn, signOut, switchOrganization } from '../api/platform';
import { PageHeading, Note } from '../components/ui/common';
import { ActionButton, ErrorNotice, Panel, RecordForm } from '../components/platform/shared';

const DEMO_USERS = [
  { label: "Hitesh Patel (Manufacturer · Rajkot Metal)", email: "owner@demo.prangara.example", password: "prangara-demo-2026" },
  { label: "Anita Shah (Compliance · Shah & Associates)", email: "compliance@demo.prangara.example", password: "prangara-demo-2026" },
  { label: "Priya Admin (Platform Administrator)", email: "admin@demo.prangara.example", password: "prangara-demo-2026" },
];

export default function Account() {
  const [register, setRegister] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const { session, identity, me } = useSession();
  const client = useQueryClient();

  const handleDemoSignIn = async (user: (typeof DEMO_USERS)[0]) => {
    setAuthError(null);
    setLoadingDemo(true);
    try {
      await client.cancelQueries();
      client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
      await signIn({ email: user.email, password: user.password }, false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in";
      setAuthError(`${msg}. Note: If the local FastAPI backend (port 8000/8077) is not running, all frontend assessment, scenario, logistics, circular network, and RAG features remain fully active in client-side demonstration mode.`);
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="page-reveal platform-page">
      <PageHeading
        eyebrow="WORKSPACE / ACCOUNT"
        title="Your working space."
        description="Manage a connected organization and its factory records."
      />
      {session ? (
        <Panel title={identity?.user.full_name || 'Your account'}>
          <ErrorNotice error={me.error} />
          <p>{identity?.user.email}</p>
          <label className="form-field">
            Active organization
            <select
              value={identity?.active_organization_id || ''}
              onChange={async (e) => {
                await client.cancelQueries();
                await switchOrganization(e.target.value);
                client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
              }}
            >
              {identity?.memberships.map((m) => (
                <option value={m.organization.id} key={m.organization.id}>
                  {m.organization.name} · {m.role}
                </option>
              ))}
            </select>
          </label>
          <div className="platform-toolbar">
            <Link className="button workspace-open" to="/workspace">Open workspace</Link>
            <ActionButton
              className="sign-out"
              onClick={async () => {
                await client.cancelQueries();
                try {
                  await signOut();
                } finally {
                  setSession(null);
                  client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
                }
              }}
            >
              Sign out
            </ActionButton>
          </div>
        </Panel>
      ) : (
        <Panel title={register ? 'Create your account' : 'Sign in'}>
          {authError && (
            <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--critical)', fontSize: '0.85rem', lineHeight: '1.4' }}>
              {authError}
            </div>
          )}
          <RecordForm
            key={String(register)}
            schema={register ? 'RegisterRequest' : 'LoginRequest'}
            fields={{
              ...(register
                ? {
                    full_name: {},
                    organization_name: { required: true },
                    organization_kind: { options: ['manufacturer', 'provider'] },
                  }
                : {}),
              email: {},
              password: { type: 'password' },
            }}
            submit={register ? 'Create account' : 'Sign in'}
            onSubmit={async (values) => {
              setAuthError(null);
              await client.cancelQueries();
              client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
              try {
                await signIn(values, register);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Authentication failed";
                setAuthError(`${msg}. If the backend server is not running, frontend simulation mode is active.`);
              }
            }}
          />
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--subtle)', marginBottom: '0.5rem', fontWeight: 600 }}>
              Quick Demo Accounts (1-Click Test)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  disabled={loadingDemo}
                  onClick={() => handleDemoSignIn(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    cursor: loadingDemo ? 'wait' : 'pointer',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    color: 'var(--text)',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{u.label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontFamily: 'monospace' }}>Sign in →</span>
                </button>
              ))}
            </div>
          </div>
          <button className="text-button" style={{ marginTop: '0.75rem' }} onClick={() => { setAuthError(null); setRegister(!register); }}>
            {register ? 'Already registered? Sign in' : 'New here? Create an account'}
          </button>
        </Panel>
      )}
      <Note>
        The demonstration dashboard remains fully available without signing in. Connected records are stored by your configured PRANGARA service. Session credentials are kept in this tab’s session storage.
      </Note>
    </div>
  );
}
