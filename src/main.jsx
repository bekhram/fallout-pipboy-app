import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "./App.jsx";
import { initFullscreenEditorUx } from "./utils/fullscreenEditorUx.js";
import { initCloudCharacterSync } from "./cloud/cloudCharacterSync.js";

import "./styles/pipboy.css";
import "./i18n";
import "./styles/dice.css";

// Initialize dataLayer
window.dataLayer = window.dataLayer || [];

// Initialize Google Tag Manager
(function (w, d, s, l, i) {
  w[l] = w[l] || [];

  w[l].push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  const f = d.getElementsByTagName(s)[0];
  const j = d.createElement(s);
  const dl = l !== "dataLayer" ? "&l=" + l : "";

  j.async = true;
  j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;

  f.parentNode.insertBefore(j, f);
})(window, document, "script", "dataLayer", "GTM-KZF6HS2F");

initFullscreenEditorUx();
initCloudCharacterSync();

if ("serviceWorker" in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      void registration.update();
      window.setInterval(() => void registration.update(), 60 * 1000);
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
