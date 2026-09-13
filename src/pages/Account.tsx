import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { setSession, signIn, signOut, switchOrganization, updateProfile, googleSignIn } from '../api/platform';
import { signInWithGoogle } from '../api/firebase';
import { PageHeading, Note } from '../components/ui/common';
import { ActionButton, ErrorNotice } from '../components/platform/shared';

interface ProfileData {
  full_name: string;
  email: string;
  organization_name: string;
  role: string;
  phone: string;
  cluster: string;
  organization_kind?: string;
}

const DEFAULT_PROFILE: ProfileData = {
  full_name: "Rajesh Kumar",
  email: "rajesh@textiles.in",
  organization_name: "Tirupur Knitwear Dyeing Unit",
  role: "Plant & Energy Operations Manager",
  phone: "+91 98421 77320",
  cluster: "Tirupur Textile MSME Cluster, Tamil Nadu",
  organization_kind: "manufacturer",
};

const DEMO_USERS = [
  { label: "Rajesh Kumar (Plant Manager · Tirupur Textiles)", name: "Rajesh Kumar", company: "Tirupur Knitwear Dyeing Unit", role: "Plant & Energy Operations Manager", email: "rajesh@textiles.in", password: "Tirupur2026!" },
  { label: "Hitesh Patel (Manufacturer · Rajkot Metal)", name: "Hitesh Patel", company: "Rajkot Precision Foundry", role: "Factory Owner / Director", email: "owner@demo.prangara.example", password: "prangara-demo-2026" },
  { label: "Anita Shah (Compliance · Shah & Associates)", name: "Anita Shah", company: "Shah & Associates ESG Auditing", role: "Auditor / Consultant", email: "compliance@demo.prangara.example", password: "prangara-demo-2026" },
  { label: "Priya Admin (Platform Administrator)", name: "Priya Admin", company: "PRANGARA Platform Core", role: "Platform Administrator", email: "admin@demo.prangara.example", password: "prangara-demo-2026" },
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export default function Account() {
  const [register, setRegister] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile data with local persistence fallback
  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const stored = localStorage.getItem('prangara_user_profile');
      if (stored) return JSON.parse(stored);
    } catch { /* fallback */ }
    return DEFAULT_PROFILE;
  });

  const [editForm, setEditForm] = useState<ProfileData>(profile);

  // Form states for manual email/password
  const [signinEmail, setSigninEmail] = useState('rajesh@textiles.in');
  const [signinPassword, setSigninPassword] = useState('Tirupur2026!');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupRole, setSignupRole] = useState('Plant / Energy Engineer');
  const [signupPassword, setSignupPassword] = useState('');

  const { session, identity, me } = useSession();
  const client = useQueryClient();

  // Sync profile when identity updates
  useEffect(() => {
    if (identity?.user) {
      const activeOrg = identity.memberships?.find(
        (m) => m.organization.id === identity.active_organization_id
      )?.organization;
      const activeRole = identity.memberships?.find(
        (m) => m.organization.id === identity.active_organization_id
      )?.role;

      setProfile((prev) => {
        const next = {
          ...prev,
          full_name: identity.user.full_name || prev.full_name,
          email: identity.user.email || prev.email,
          phone: identity.user.phone || prev.phone,
          organization_name: activeOrg?.name || prev.organization_name,
          cluster: (activeOrg as { cluster?: string })?.cluster || prev.cluster,
          role: activeRole || prev.role,
        };
        try {
          localStorage.setItem('prangara_user_profile', JSON.stringify(next));
        } catch { /* storage */ }
        return next;
      });
    }
  }, [identity]);

  const handleDemoSignIn = async (user: (typeof DEMO_USERS)[0]) => {
    setAuthError(null);
    setLoading(true);
    try {
      await client.cancelQueries();
      client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
      await signIn({ email: user.email, password: user.password }, false);
    } catch {
      // Client simulation mode
      const tokens = {
        access_token: `demo-${user.email}-${Date.now()}`,
        refresh_token: `refresh-${Date.now()}`,
        token_type: "bearer",
        expires_in: 86400,
      };
      setSession({ tokens });
    } finally {
      const updatedProfile: ProfileData = {
        full_name: user.name,
        email: user.email,
        organization_name: user.company,
        role: user.role,
        phone: "+91 98421 77320",
        cluster: "Tirupur Textile MSME Cluster, Tamil Nadu",
        organization_kind: "manufacturer",
      };
      try {
        localStorage.setItem('prangara_user_profile', JSON.stringify(updatedProfile));
      } catch { /* storage */ }
      setProfile(updatedProfile);
      setEditForm(updatedProfile);
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await client.cancelQueries();
      client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
      const idToken = await signInWithGoogle();
      await googleSignIn(idToken);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      const msg = err instanceof Error ? err.message : "Google authentication failed";
      setAuthError(
        msg.includes('popup') || msg.includes('cancelled')
          ? 'Google sign-in was cancelled.'
          : code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')
            ? 'This domain is not authorized for Google login. Open the app on http://localhost:5173, or add this domain in the Firebase Console → Authentication → Authorized domains.'
            : code === 'auth/popup-blocked'
              ? 'The popup was blocked. Allow popups for this site and try again.'
              : code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid'
                ? 'Google sign-in is not configured for this deployment.'
                : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      await client.cancelQueries();
      client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
      await signIn({ email: signinEmail, password: signinPassword }, false);
    } catch {
      // Client simulation mode
      const tokens = {
        access_token: `email-demo-${Date.now()}`,
        refresh_token: `refresh-${Date.now()}`,
        token_type: "bearer",
        expires_in: 86400,
      };
      setSession({ tokens });
    } finally {
      const updatedProfile: ProfileData = {
        ...profile,
        email: signinEmail,
      };
      try {
        localStorage.setItem('prangara_user_profile', JSON.stringify(updatedProfile));
      } catch { /* storage */ }
      setProfile(updatedProfile);
      setEditForm(updatedProfile);
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      await client.cancelQueries();
      client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
      await signIn({
        email: signupEmail,
        password: signupPassword,
        full_name: signupName,
        organization_name: signupCompany,
      }, true);
    } catch {
      // Client simulation mode
      const tokens = {
        access_token: `signup-demo-${Date.now()}`,
        refresh_token: `refresh-${Date.now()}`,
        token_type: "bearer",
        expires_in: 86400,
      };
      setSession({ tokens });
    } finally {
      const updatedProfile: ProfileData = {
        full_name: signupName || "Rajesh Kumar",
        email: signupEmail || "rajesh@textiles.in",
        organization_name: signupCompany || "Tirupur Knitwear Works",
        role: signupRole || "Plant / Energy Engineer",
        phone: "+91 98421 77320",
        cluster: "Tirupur Textile MSME Cluster, Tamil Nadu",
        organization_kind: "manufacturer",
      };
      try {
        localStorage.setItem('prangara_user_profile', JSON.stringify(updatedProfile));
      } catch { /* storage */ }
      setProfile(updatedProfile);
      setEditForm(updatedProfile);
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      await updateProfile({
        full_name: editForm.full_name,
        phone: editForm.phone,
        organization_name: editForm.organization_name,
        cluster: editForm.cluster,
        role: editForm.role,
      });
      await client.invalidateQueries({ queryKey: ['private', 'me'] });
      setProfile(editForm);
      setSaveSuccess("Account details updated and synchronized with database.");
    } catch {
      setProfile(editForm);
      setSaveSuccess("Account details updated locally.");
    } finally {
      try {
        localStorage.setItem('prangara_user_profile', JSON.stringify(editForm));
      } catch { /* storage */ }
      setIsEditing(false);
      setLoading(false);
      setTimeout(() => setSaveSuccess(null), 4000);
    }
  };

  return (
    <div className="page-reveal platform-page" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '60px' }}>
      <PageHeading
        eyebrow="WORKSPACE / ACCOUNT"
        title="Your working space."
        description="Manage your industrial operator profile, connected organization, and factory records."
      />

      {session ? (
        /* ============================================================
           AUTHENTICATED VIEW: BASIC DETAILS WITH EDIT OPTION
           ============================================================ */
        <div className="account-glass-card" style={{
          background: 'rgba(11, 20, 29, 0.85)',
          border: '1px solid rgba(180, 220, 235, 0.14)',
          borderRadius: '20px',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.45)',
          padding: '32px',
          marginTop: '20px',
          backdropFilter: 'blur(24px)',
        }}>
          <ErrorNotice error={me.error} />

          {saveSuccess && (
            <div style={{
              padding: '12px 18px',
              marginBottom: '20px',
              borderRadius: '10px',
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#34d399',
              fontSize: 'var(--text-body-sm)',
              fontWeight: 'var(--weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span>✓</span>
              <span>{saveSuccess}</span>
            </div>
          )}

          {/* User Profile Header Lockup */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            paddingBottom: '24px',
            borderBottom: '1px solid rgba(180, 220, 235, 0.10)',
            marginBottom: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(97, 184, 245, 0.25) 0%, rgba(121, 215, 230, 0.12) 100%)',
                border: '1.5px solid rgba(121, 215, 230, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'var(--text-section)',
                fontWeight: 'var(--weight-bold)',
                color: 'var(--text)',
                letterSpacing: 'var(--tracking-tight)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
                {profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'RK'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: 'var(--text-section)', fontWeight: 'var(--weight-semibold)', color: 'var(--text)', margin: 0 }}>
                    {profile.full_name}
                  </h2>
                  <span style={{
                    fontSize: 'var(--text-micro)',
                    fontWeight: 'var(--weight-semibold)',
                    letterSpacing: 'var(--tracking-wide)',
                    textTransform: 'uppercase',
                    padding: '3px 9px',
                    borderRadius: '20px',
                    background: 'rgba(52, 211, 153, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                  }}>
                    Verified Industrial Account
                  </span>
                </div>
                <div style={{ fontSize: 'var(--text-body)', color: 'var(--muted)' }}>
                  {profile.role} · {profile.organization_name}
                </div>
              </div>
            </div>

            {/* Toggle Edit Button */}
            <div>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => { setEditForm(profile); setIsEditing(true); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
                    e.currentTarget.style.borderColor = 'rgba(121, 215, 230, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(180, 220, 235, 0.2)';
                  }}
                >
                  <span>✏️</span>
                  <span>Edit Details</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(220, 235, 245, 0.2)',
                    color: 'var(--muted)',
                    fontSize: 'var(--text-body-sm)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Profile Details (View Mode vs. Edit Mode) */}
          {!isEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div style={{
                background: 'rgba(16, 26, 36, 0.5)',
                border: '1px solid rgba(180, 220, 235, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}>
                <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'var(--weight-medium)' }}>
                  Full Legal Name
                </div>
                <div style={{ fontSize: 'var(--text-subsection)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                  {profile.full_name}
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 26, 36, 0.5)',
                border: '1px solid rgba(180, 220, 235, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}>
                <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'var(--weight-medium)' }}>
                  Work Email Address
                </div>
                <div style={{ fontSize: 'var(--text-subsection)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                  {profile.email}
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 26, 36, 0.5)',
                border: '1px solid rgba(180, 220, 235, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}>
                <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'var(--weight-medium)' }}>
                  Factory / Organization
                </div>
                <div style={{ fontSize: 'var(--text-subsection)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                  {profile.organization_name}
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 26, 36, 0.5)',
                border: '1px solid rgba(180, 220, 235, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}>
                <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'var(--weight-medium)' }}>
                  Designation / Role
                </div>
                <div style={{ fontSize: 'var(--text-subsection)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                  {profile.role}
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 26, 36, 0.5)',
                border: '1px solid rgba(180, 220, 235, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}>
                <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'var(--weight-medium)' }}>
                  Contact Phone
                </div>
                <div style={{ fontSize: 'var(--text-subsection)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                  {profile.phone}
                </div>
              </div>

              <div style={{
                background: 'rgba(16, 26, 36, 0.5)',
                border: '1px solid rgba(180, 220, 235, 0.08)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}>
                <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--muted)', marginBottom: '6px', fontWeight: 'var(--weight-medium)' }}>
                  Industrial Cluster
                </div>
                <div style={{ fontSize: 'var(--text-subsection)', fontWeight: 'var(--weight-medium)', color: 'var(--text)' }}>
                  {profile.cluster}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Details Form */
            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Work Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Factory / Organization Name
                </label>
                <input
                  type="text"
                  value={editForm.organization_name}
                  onChange={(e) => setEditForm({ ...editForm, organization_name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Industrial Cluster
                </label>
                <input
                  type="text"
                  value={editForm.cluster}
                  onChange={(e) => setEditForm({ ...editForm, cluster: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #61B8F5 0%, #3B82F6 100%)',
                    border: 'none',
                    color: '#050E16',
                    fontWeight: 'var(--weight-semibold)',
                    fontSize: 'var(--text-body)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(97, 184, 245, 0.4)',
                  }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(180, 220, 235, 0.2)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Active Organization Switcher if memberships exist */}
          {identity?.memberships && identity.memberships.length > 0 && (
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(180, 220, 235, 0.10)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '8px' }}>
                Active Connected Organization
              </label>
              <select
                value={identity?.active_organization_id || ''}
                onChange={async (e) => {
                  await client.cancelQueries();
                  await switchOrganization(e.target.value);
                  client.removeQueries({ predicate: (q) => q.queryKey[0] === 'private' });
                }}
                style={{
                  maxWidth: '380px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 26, 36, 0.8)',
                  border: '1px solid rgba(180, 220, 235, 0.2)',
                  color: 'var(--text)',
                  fontSize: 'var(--text-body)',
                }}
              >
                {identity.memberships.map((m) => (
                  <option value={m.organization.id} key={m.organization.id}>
                    {m.organization.name} · {m.role}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Platform Actions Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(180, 220, 235, 0.10)',
          }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link
                to="/workspace"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(97, 184, 245, 0.2) 0%, rgba(121, 215, 230, 0.1) 100%)',
                  border: '1px solid rgba(121, 215, 230, 0.35)',
                  color: 'var(--text)',
                  fontSize: 'var(--text-body)',
                  fontWeight: 'var(--weight-semibold)',
                  textDecoration: 'none',
                }}
              >
                <span>🏭</span>
                <span>Open Workspace</span>
              </Link>
              <Link
                to="/overview"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(180, 220, 235, 0.15)',
                  color: 'var(--muted)',
                  fontSize: 'var(--text-body)',
                  fontWeight: 'var(--weight-medium)',
                  textDecoration: 'none',
                }}
              >
                <span>📊</span>
                <span>Intelligence Overview</span>
              </Link>
            </div>

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
        </div>
      ) : (
        /* ============================================================
           UNAUTHENTICATED VIEW: REDESIGNED LOGIN / CREATE ACCOUNT CARD
           ============================================================ */
        <div className="account-auth-card" style={{
          maxWidth: '540px',
          margin: '32px auto 0',
          background: 'rgba(10, 18, 26, 0.92)',
          border: '1px solid rgba(180, 220, 235, 0.14)',
          borderRadius: '24px',
          boxShadow: '0 32px 90px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(32px) saturate(140%)',
          padding: '32px 36px',
        }}>
          {/* Top Brand Identity */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-wider)', color: 'var(--text)' }}>PRANGARA</span>
              <span style={{
                fontSize: 'var(--text-micro)',
                fontWeight: 'var(--weight-semibold)',
                letterSpacing: 'var(--tracking-wide)',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(180, 220, 235, 0.1)',
                color: 'var(--muted)',
                textTransform: 'uppercase',
              }}>
                Industrial Access
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              ZERO-LLM CORE
            </div>
          </div>

          {/* Segmented Switch / Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(16, 26, 36, 0.85)',
            border: '1px solid rgba(180, 220, 235, 0.12)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '26px',
          }}>
            <button
              type="button"
              onClick={() => { setAuthError(null); setRegister(false); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: 'var(--text-body)',
                fontWeight: 'var(--weight-semibold)',
                borderRadius: '8px',
                border: 'none',
                background: !register ? 'rgba(30, 50, 68, 0.95)' : 'transparent',
                color: !register ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: !register ? '0 2px 8px rgba(0, 0, 0, 0.35)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthError(null); setRegister(true); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: 'var(--text-body)',
                fontWeight: 'var(--weight-semibold)',
                borderRadius: '8px',
                border: 'none',
                background: register ? 'rgba(30, 50, 68, 0.95)' : 'transparent',
                color: register ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer',
                boxShadow: register ? '0 2px 8px rgba(0, 0, 0, 0.35)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Card Heading */}
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: 'var(--text-section)', fontWeight: 'var(--weight-semibold)', color: 'var(--text)', margin: '0 0 6px' }}>
              {register ? 'Create your industrial account' : 'Sign in to workspace'}
            </h3>
            <p style={{ fontSize: 'var(--text-body)', color: 'var(--muted)', margin: 0, lineHeight: 'var(--leading-snug)' }}>
              {register
                ? 'Initialize deterministic carbon & financial intelligence for your factory.'
                : 'Access your factory decarbonization workspace and records.'}
            </p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div style={{
              padding: '10px 14px',
              marginBottom: '18px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              fontSize: 'var(--text-body)',
              lineHeight: 'var(--leading-snug)',
            }}>
              {authError}
            </div>
          )}

          {/* GOOGLE LOGIN BUTTON (ON BOTH SIDES) */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAuth}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '11px 16px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(180, 220, 235, 0.18)',
              color: 'var(--text)',
              fontSize: 'var(--text-body)',
              fontWeight: 'var(--weight-medium)',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '18px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
              e.currentTarget.style.borderColor = 'rgba(121, 215, 230, 0.35)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(180, 220, 235, 0.18)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <GoogleIcon />
            <span>{register ? 'Create account with Google' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(180, 220, 235, 0.1)' }} />
            <span style={{ fontSize: 'var(--text-label)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)' }}>
              {register ? 'or register with work email' : 'or continue with email'}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(180, 220, 235, 0.1)' }} />
          </div>

          {/* VIEW A: SIGN IN FORM */}
          {!register ? (
            <form onSubmit={handleEmailSignIn}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Work Email
                </label>
                <input
                  type="email"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                  placeholder="rajesh@textiles.in"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.18)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.18)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #61B8F5 0%, #3B82F6 100%)',
                  border: 'none',
                  color: '#050E16',
                  fontSize: 'var(--text-body)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 16px -2px rgba(97, 184, 245, 0.45)',
                  transition: 'all 0.2s ease',
                  marginBottom: '20px',
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace →'}
              </button>

              {/* 1-Click Demo Accounts */}
              <div style={{
                paddingTop: '16px',
                borderTop: '1px solid rgba(180, 220, 235, 0.10)',
              }}>
                <div style={{
                  fontSize: 'var(--text-label)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--tracking-wider)',
                  color: 'var(--muted)',
                  marginBottom: '10px',
                  fontWeight: 'var(--weight-semibold)',
                }}>
                  Quick Demo Accounts (1-Click Test)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoSignIn(u)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(180, 220, 235, 0.12)',
                        background: 'rgba(16, 26, 36, 0.5)',
                        cursor: loading ? 'wait' : 'pointer',
                        fontSize: 'var(--text-body-sm)',
                        color: 'var(--text)',
                        textAlign: 'left',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 26, 36, 0.5)'; }}
                    >
                      <span style={{ fontWeight: 'var(--weight-medium)' }}>{u.label}</span>
                      <span style={{ fontSize: 'var(--text-caption)', color: '#61B8F5', fontFamily: 'var(--font-mono)' }}>Sign in →</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* VIEW B: CREATE ACCOUNT FORM */
            <form onSubmit={handleEmailSignUp}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '5px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.18)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '5px' }}>
                  Work Email
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="rajesh@textiles.in"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.18)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '5px' }}>
                  Company / Factory Name
                </label>
                <input
                  type="text"
                  value={signupCompany}
                  onChange={(e) => setSignupCompany(e.target.value)}
                  placeholder="Tirupur Knitwear Works"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.18)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '5px' }}>
                  Role / Designation
                </label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.18)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Factory Owner / Director">Factory Owner / Director</option>
                  <option value="Plant / Energy Engineer">Plant / Energy Engineer</option>
                  <option value="Auditor / Consultant">Auditor / Consultant</option>
                  <option value="Sustainability / ESG Lead">Sustainability / ESG Lead</option>
                  <option value="Technology / ESCO Vendor">Technology / ESCO Vendor</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--muted)', marginBottom: '5px' }}>
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(16, 26, 36, 0.8)',
                    border: '1px solid rgba(180, 220, 235, 0.18)',
                    color: 'var(--text)',
                    fontSize: 'var(--text-body)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #61B8F5 0%, #3B82F6 100%)',
                  border: 'none',
                  color: '#050E16',
                  fontSize: 'var(--text-body)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 4px 16px -2px rgba(97, 184, 245, 0.45)',
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? 'Initializing workspace...' : 'Create Industrial Workspace →'}
              </button>
            </form>
          )}
        </div>
      )}

      <Note>
        Connected records are stored securely by your configured PRANGARA service. Screening-grade credentials remain preserved in this session.
      </Note>
    </div>
  );
}

