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
import "./styles/landing.css";
import App from "./app/App";



ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
import "./styles/refinements.css";
import "./styles/visual-system.css";
