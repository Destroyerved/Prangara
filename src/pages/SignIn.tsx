import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PrangaraLogoMark } from "../components/brand/PrangaraLogo";
import { signIn, setSession } from "../api/platform";
import {
  ArrowRight,
  Sparkles,
  UserCheck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

const DEMO_USERS = [
  {
    role: "Plant Owner",
    name: "Hitesh Patel",
    org: "Rajkot Metal & Auto Components",
    email: "owner@demo.prangara.example",
    password: "prangara-demo-2026",
    badgeColor: "#fb923c",
  },
  {
    role: "Compliance Officer",
    name: "Anita Shah",
    org: "Shah & Associates Carbon Auditing",
    email: "compliance@demo.prangara.example",
    password: "prangara-demo-2026",
    badgeColor: "#38bdf8",
  },
  {
    role: "Platform Admin",
    name: "Priya Admin",
    org: "PRANGARA Decarbonization HQ",
    email: "admin@demo.prangara.example",
    password: "prangara-demo-2026",
    badgeColor: "#34d399",
  },
];

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1-Click Demo Login
  const handleDemoSignIn = async (user: (typeof DEMO_USERS)[0]) => {
    setError(null);
    setLoading(true);
    try {
      await queryClient.cancelQueries();
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === "private" });
      await signIn({ email: user.email, password: user.password }, false);
      navigate("/overview");
    } catch (err: unknown) {
      console.warn("Backend API auth fallback to demo mock session:", err);
      // Seamless fallback so demo accounts ALWAYS work even if backend is starting or offline
      const mockTokens = {
        access_token: `demo-${user.email}-${Date.now()}`,
        refresh_token: `refresh-${user.email}-${Date.now()}`,
        token_type: "bearer",
        expires_in: 86400,
      };
      setSession({ tokens: mockTokens });
      navigate("/overview");
    } finally {
      setLoading(false);
    }
  };

  // Instant Demo Bypass
  const handleInstantBypass = () => {
    const mockTokens = {
      access_token: `demo-guest-${Date.now()}`,
      refresh_token: `refresh-guest-${Date.now()}`,
      token_type: "bearer",
      expires_in: 86400,
    };
    setSession({ tokens: mockTokens });
    navigate("/overview");
  };

  // Custom Credentials Sign In
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await queryClient.cancelQueries();
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === "private" });
      await signIn({ email, password }, false);
      navigate("/overview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-root">
      {/* Background ambient lighting */}
      <div className="landing-noise-overlay" />

      {/* Top back navigation */}
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--l-text-muted)",
            transition: "color 0.2s",
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to 3D Story</span>
        </Link>

        <button
          onClick={handleInstantBypass}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--l-cyan)",
            fontSize: "12.5px",
            fontWeight: 500,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Sparkles size={13} />
          <span>Instant Demo Bypass</span>
        </button>
      </div>

      {/* Glassmorphic Auth Card */}
      <div className="auth-glass-card">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            <PrangaraLogoMark size={38} />
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "#ffffff",
            }}
          >
            Sign in to PRANGARA
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--l-text-muted)",
              marginTop: "6px",
              lineHeight: 1.5,
            }}
          >
            Industrial Decarbonization Intelligence OS
          </p>
        </div>

        {/* 1-Click Demo Logins Section */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--l-text-dim)",
              }}
            >
              1-Click Demo Accounts
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--l-teal)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <UserCheck size={12} /> Instant Access
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {DEMO_USERS.map((u) => (
              <button
                key={u.role}
                type="button"
                className="demo-account-pill"
                onClick={() => handleDemoSignIn(u)}
                disabled={loading}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#ffffff" }}>
                      {u.name}
                    </span>
                    <span
                      className="demo-role-tag"
                      style={{
                        background: `${u.badgeColor}18`,
                        color: u.badgeColor,
                      }}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--l-text-dim)" }}>
                    {u.org}
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  style={{ color: "var(--l-text-muted)", flexShrink: 0 }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            margin: "24px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255, 255, 255, 0.08)",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "var(--l-text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Or credentials
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              background: "rgba(255, 255, 255, 0.08)",
            }}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.25)",
              borderRadius: "10px",
              color: "var(--l-rose)",
              fontSize: "12.5px",
              marginBottom: "16px",
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit}>
          <div className="auth-form-field">
            <label className="auth-label" htmlFor="signin-email">
              Enterprise Work Email
            </label>
            <input
              id="signin-email"
              type="email"
              className="auth-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-field" style={{ marginBottom: "24px" }}>
            <label className="auth-label" htmlFor="signin-password">
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              className="auth-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-landing-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "12px",
              cursor: loading ? "wait" : "pointer",
            }}
            disabled={loading}
          >
            <span>{loading ? "Authenticating..." : "Sign in to Dashboard"}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Footer Links */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            textAlign: "center",
            fontSize: "12.5px",
            color: "var(--l-text-muted)",
          }}
        >
          Need to register your facility?{" "}
          <Link
            to="/signup"
            style={{
              color: "var(--l-cyan)",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
