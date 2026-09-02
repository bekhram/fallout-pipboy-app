import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";

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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);