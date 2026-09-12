import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setSession } from "../api/platform";

export default function Landing({ defaultHash }: { defaultHash?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const hash =
    defaultHash ||
    (location.pathname === "/signin"
      ? "#signin"
      : location.pathname === "/signup"
      ? "#signup"
      : "");

  useEffect(() => {
    window.scrollTo(0, 0);

    const handleMessage = (event: MessageEvent) => {
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
    </div>
  );
}
