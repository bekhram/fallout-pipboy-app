import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import GmUnifiedTokenManagerV5 from "./GmUnifiedTokenManagerV5.jsx";
import GmNpcCardEditorV8 from "./GmNpcCardEditorV8.jsx";
import "./gmUnifiedTokenManagerV8.css";

const COPY = {
  en: { source: "SOURCE", all: "ALL", bestiary: "BESTIARY", custom: "CUSTOM", choose: "— SELECT CREATURE / NPC —", standardMark: "BESTIARY", customMark: "CUSTOM" },
  ru: { source: "ИСТОЧНИК", all: "ВСЕ", bestiary: "БЕСТИАРИЙ", custom: "КАСТОМНЫЕ", choose: "— ВЫБРАТЬ СУЩЕСТВО / NPC —", standardMark: "БЕСТИАРИЙ", customMark: "КАСТОМ" },
  uk: { source: "ДЖЕРЕЛО", all: "УСІ", bestiary: "БЕСТІАРІЙ", custom: "КАСТОМНІ", choose: "— ОБРАТИ ІСТОТУ / NPC —", standardMark: "БЕСТІАРІЙ", customMark: "КАСТОМ" },
  pl: { source: "ŹRÓDŁO", all: "WSZYSTKIE", bestiary: "BESTIARIUSZ", custom: "WŁASNE", choose: "— WYBIERZ STWORA / NPC —", standardMark: "BESTIARIUSZ", customMark: "WŁASNY" },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function sameOptions(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return item.key === other?.key && item.label === other?.label && item.hidden === other?.hidden;
  });
}

export default function GmUnifiedTokenManagerV8({ session }) {
  const { i18n } = useTranslation();
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const rootRef = useRef(null);
  const [controlsHost, setControlsHost] = useState(null);
  const [filterHost, setFilterHost] = useState(null);
  const [options, setOptions] = useState([]);
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState("");

  const tokenSession = useMemo(() => {
    if (!session) return session;
    return {
      ...session,
      liveSceneId: session.liveSceneId || session.tacticalScene?.sceneId || "",
    };
  }, [session]);

  const getNativeSelects = () => {
    const root = rootRef.current;
    if (!root) return [];
    const controls = root.querySelector(".gm-bestiary-picker__controls");
    if (!controls) return [];
    return [...controls.querySelectorAll(":scope > select.pip-input:not(.gm-token-v8-combined-select)")].slice(0, 2);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let scheduled = 0;
    const sync = () => {
      window.clearTimeout(scheduled);
      scheduled = window.setTimeout(() => {
        const controls = root.querySelector(".gm-bestiary-picker__controls");
        const filters = root.querySelector(".gm-bestiary-filter-row");
        setControlsHost((current) => current === controls ? current : controls);
        setFilterHost((current) => current === filters ? current : filters);

        const selects = controls
          ? [...controls.querySelectorAll(":scope > select.pip-input:not(.gm-token-v8-combined-select)")].slice(0, 2)
          : [];
        const next = [];
        selects.forEach((select, index) => {
          const prefix = index === 0 ? "b" : "c";
          [...select.options].forEach((option) => {
            if (!option.value) return;
            next.push({
              key: `${prefix}:${option.value}`,
              source: index === 0 ? "bestiary" : "custom",
              label: String(option.textContent || option.value).trim(),
              hidden: Boolean(option.hidden || option.disabled || option.style.display === "none"),
            });
          });
        });
        setOptions((current) => sameOptions(current, next) ? current : next);

        const nextSelected = selects[0]?.value
          ? `b:${selects[0].value}`
          : selects[1]?.value
          ? `c:${selects[1].value}`
          : "";
        setSelected((current) => current === nextSelected ? current : nextSelected);
      }, 0);
    };

    sync();
    root.addEventListener("change", sync, true);
    root.addEventListener("input", sync, true);
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "disabled", "style"],
    });

    return () => {
      window.clearTimeout(scheduled);
      root.removeEventListener("change", sync, true);
      root.removeEventListener("input", sync, true);
      observer.disconnect();
    };
  }, []);

  const visibleOptions = useMemo(
    () => options.filter((item) => !item.hidden && (source === "all" || item.source === source)),
    [options, source]
  );

  const sourceCounts = useMemo(() => {
    const active = options.filter((item) => !item.hidden);
    return {
      all: active.length,
      bestiary: active.filter((item) => item.source === "bestiary").length,
      custom: active.filter((item) => item.source === "custom").length,
    };
  }, [options]);

  const choose = (value) => {
    const selects = getNativeSelects();
    if (selects.length < 2) return;
    const [bestiarySelect, customSelect] = selects;
    bestiarySelect.value = "";
    customSelect.value = "";

    if (!value) {
      bestiarySelect.dispatchEvent(new Event("change", { bubbles: true }));
      customSelect.dispatchEvent(new Event("change", { bubbles: true }));
      setSelected("");
      return;
    }

    const separator = value.indexOf(":");
    const prefix = value.slice(0, separator);
    const id = value.slice(separator + 1);
    const target = prefix === "c" ? customSelect : bestiarySelect;
    target.value = id;
    setSelected(value);
    target.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const changeSource = (nextSource) => {
    setSource(nextSource);
    if (!selected) return;
    const selectedSource = selected.startsWith("c:") ? "custom" : "bestiary";
    if (nextSource !== "all" && nextSource !== selectedSource) choose("");
  };

  return (
    <div className="gm-unified-token-manager-v8" ref={rootRef}>
      <GmUnifiedTokenManagerV5 session={tokenSession} />
      <GmNpcCardEditorV8 session={session} />

      {filterHost ? createPortal(
        <label className="gm-token-v8-source-filter">
          <span>{text.source}</span>
          <select className="pip-input" value={source} onChange={(event) => changeSource(event.target.value)}>
            <option value="all">{text.all} ({sourceCounts.all})</option>
            <option value="bestiary">{text.bestiary} ({sourceCounts.bestiary})</option>
            <option value="custom">{text.custom} ({sourceCounts.custom})</option>
          </select>
        </label>,
        filterHost
      ) : null}

      {controlsHost ? createPortal(
        <select
          className="pip-input gm-token-v8-combined-select"
          value={visibleOptions.some((item) => item.key === selected) ? selected : ""}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">{text.choose}</option>
          {visibleOptions.map((item) => (
            <option key={item.key} value={item.key}>
              [{item.source === "custom" ? text.customMark : text.standardMark}] {item.label}
            </option>
          ))}
        </select>,
        controlsHost
      ) : null}
    </div>
  );
}
