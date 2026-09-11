import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./gmZoomDrawerToggle.css";

const STORAGE_KEY = "pip2d20_gm_zoom_panel_open_v1";

function readInitialOpen() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function labelFor(open) {
  const lang = String(document?.documentElement?.lang || "en").toLowerCase().split("-")[0];
  if (lang === "ru") return open ? "СВЕРНУТЬ ЗУМ" : "ПОКАЗАТЬ ЗУМ";
  if (lang === "uk") return open ? "ЗГОРНУТИ ЗУМ" : "ПОКАЗАТИ ЗУМ";
  if (lang === "pl") return open ? "ZWIŃ ZOOM" : "POKAŻ ZOOM";
  return open ? "HIDE ZOOM" : "SHOW ZOOM";
}

export default function GmZoomDrawerToggle() {
  const [open, setOpen] = useState(readInitialOpen);
  const [container, setContainer] = useState(null);
  const [controls, setControls] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const sync = () => {
      const nextContainer = document.querySelector(
        ".gm-tactical-map-core .gm-session-map.tactical-map"
      );
      const nextControls = nextContainer?.querySelector?.(".battlemap-view-controls") || null;
      setContainer((current) => current === nextContainer ? current : nextContainer);
      setControls((current) => current === nextControls ? current : nextControls);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!controls) return undefined;
    controls.classList.add("is-zoom-drawer-managed");
    controls.classList.toggle("is-zoom-drawer-open", open);
    controls.classList.toggle("is-zoom-drawer-collapsed", !open);
    return () => {
      controls.classList.remove(
        "is-zoom-drawer-managed",
        "is-zoom-drawer-open",
        "is-zoom-drawer-collapsed"
      );
    };
  }, [controls, open]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [open]);

  if (!container) return null;

  const label = labelFor(open);
  return createPortal(
    <button
      type="button"
      className={`battlemap-zoom-drawer-toggle${open ? " is-open" : ""}`}
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      <b>ZOOM</b>
    </button>,
    container
  );
}
