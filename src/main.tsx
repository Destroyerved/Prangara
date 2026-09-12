import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/charts.css";
import "./styles/pages.css";
import App from "./app/App";

// On browser page refresh/reload, always land on /overview
try {
  const nav = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  const isReload =
    nav?.type === "reload" || window.performance.navigation?.type === 1;
  if (isReload && window.location.pathname !== "/overview") {
    window.history.replaceState(null, "", "/overview");
  }
} catch {
  /* Ignore */
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
import "./styles/refinements.css";

import "./styles/visual-system.css";
