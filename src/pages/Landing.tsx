import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { googleSignIn, setSession } from "../api/platform";
import { signInWithGoogle } from "../api/firebase";

export default function Landing({ defaultHash }: { defaultHash?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [googleOpen, setGoogleOpen] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const hash =
    defaultHash ||
    (location.pathname === "/signin"
      ? "#signin"
      : location.pathname === "/signup"
      ? "#signup"
      : "");

  const resetIframeGoogle = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "PRANGARA_GOOGLE_AUTH_RESULT", ok: true },
      "*",
    );
  };

  const handleGoogleClick = async () => {
    setGoogleBusy(true);
    setGoogleError(null);
    try {
      const idToken = await signInWithGoogle();
      const me = await googleSignIn(idToken);
      try {
        const user = me?.user as { full_name?: string; email?: string } | undefined;
        const org = me?.memberships?.[0]?.organization as { name?: string } | undefined;
        localStorage.setItem(
          "prangara_user_profile",
          JSON.stringify({
            full_name: user?.full_name || "",
            email: user?.email || "",
            organization_name: org?.name || "",
            phone: "",
            cluster: "",
            role: me?.memberships?.[0]?.role || "",
            organization_kind: "manufacturer",
          }),
        );
      } catch { /* storage fallback */ }
      setGoogleOpen(false);
      navigate("/overview");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setGoogleError(
        code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
          ? "Google sign-in was cancelled."
          : code === "auth/popup-blocked"
            ? "Popups are blocked. Allow popups for this site and try again."
            : "Google sign-in failed. Try again or use email/password."
      );
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PRANGARA_GOOGLE_AUTH") {
        setGoogleError(null);
        setGoogleBusy(false);
        setGoogleOpen(true);
        return;
      }
      if (event.data?.type === "PRANGARA_NAVIGATE" && event.data.path) {
        if (event.data.user) {
          const tokens = {
            access_token: `demo-${event.data.user.email || "user"}-${Date.now()}`,
            refresh_token: `refresh-${event.data.user.email || "user"}-${Date.now()}`,
            token_type: "bearer",
            expires_in: 86400,
          };
          setSession({ tokens });
          try {
            const prof = {
              full_name: event.data.user.name || "Rajesh Kumar",
              email: event.data.user.email || "rajesh@textiles.in",
              organization_name: event.data.user.company || "Tirupur Knitwear Works",
              role: event.data.user.role || "Plant / Energy Engineer",
              phone: "+91 98421 77320",
              cluster: "Tirupur Textile MSME Cluster, Tamil Nadu",
              organization_kind: "manufacturer",
            };
            localStorage.setItem('prangara_user_profile', JSON.stringify(prof));
          } catch {
            /* storage fallback */
          }
        }
        navigate(event.data.path);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        backgroundColor: "#080E14",
        zIndex: 9999,
      }}
    >
      <iframe
        ref={iframeRef}
        src={`/landing.html${hash}`}
        title="PRANGARA Industrial Intelligence"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          margin: 0,
          padding: 0,
          display: "block",
        }}
      />

      {googleOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(4, 8, 14, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "min(400px, 90vw)",
              background: "linear-gradient(180deg, #13202E 0%, #0C1520 100%)",
              border: "1px solid rgba(130, 180, 220, 0.25)",
              borderRadius: 16,
              padding: "28px 26px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              color: "#EDF4FB",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.02em" }}>
              Continue with your Google account
            </div>
            <p
              style={{
                margin: "10px 0 22px",
                fontSize: 13,
                lineHeight: 1.5,
                color: "rgba(220, 235, 245, 0.65)",
              }}
            >
              Choose the Google account you want to use for PRANGARA. This opens
              Google's own sign-in window.
            </p>

            {googleError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  fontSize: 12.5,
                  lineHeight: 1.4,
                }}
              >
                {googleError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleBusy}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(180, 220, 235, 0.2)",
                color: "#EDF4FB",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: googleBusy ? "wait" : "pointer",
              }}
            >
              {googleBusy ? "Connecting to Google…" : "Continue with Google"}
            </button>

            <button
              type="button"
              onClick={() => {
                setGoogleOpen(false);
                resetIframeGoogle();
              }}
              disabled={googleBusy}
              style={{
                marginTop: 10,
                background: "none",
                border: "none",
                color: "rgba(220, 235, 245, 0.5)",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}