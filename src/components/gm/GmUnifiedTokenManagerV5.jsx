import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import {
  CUSTOM_CREATURES_CHANGED_EVENT,
  loadCustomCreatures,
} from "../../utils/gmCreatureLibrary.js";
import GmUnifiedTokenManagerV4 from "./GmUnifiedTokenManagerV4.jsx";
import "./gmUnifiedTokenManagerV5.css";

const GROUPS = ["all", "people", "mutatedPeople", "postNuclearPeople", "animals", "cryptids", "robots"];

const COPY = {
  en: {
    filter: "CREATURE GROUP",
    all: "ALL",
    people: "PEOPLE",
    mutatedPeople: "MUTATED PEOPLE",
    postNuclearPeople: "POST-NUCLEAR PEOPLE / GHOULS",
    animals: "ANIMALS / INSECTS",
    cryptids: "CRYPTIDS / ALIENS",
    robots: "ROBOTS / TURRETS",
    npc: "NPC",
    creature: "CREATURE",
    kind: "TYPE",
  },
  ru: {
    filter: "ГРУППА",
    all: "ВСЕ",
    people: "ЛЮДИ",
    mutatedPeople: "МУТИРОВАННЫЕ ЛЮДИ",
    postNuclearPeople: "ПОСТЯДЕРНЫЕ ЛЮДИ / ГУЛИ",
    animals: "ЖИВОТНЫЕ / НАСЕКОМЫЕ",
    cryptids: "КРИПТИДЫ / ИНОПЛАНЕТЯНЕ",
    robots: "РОБОТЫ / ТУРЕЛИ",
    npc: "NPC",
    creature: "СУЩЕСТВО",
    kind: "ТИП",
  },
  uk: {
    filter: "ГРУПА",
    all: "УСІ",
    people: "ЛЮДИ",
    mutatedPeople: "МУТОВАНІ ЛЮДИ",
    postNuclearPeople: "ПОСТЯДЕРНІ ЛЮДИ / ГУЛІ",
    animals: "ТВАРИНИ / КОМАХИ",
    cryptids: "КРИПТИДИ / ІНОПЛАНЕТЯНИ",
    robots: "РОБОТИ / ТУРЕЛІ",
    npc: "NPC",
    creature: "ІСТОТА",
    kind: "ТИП",
  },
  pl: {
    filter: "GRUPA",
    all: "WSZYSTKIE",
    people: "LUDZIE",
    mutatedPeople: "ZMUTOWANI LUDZIE",
    postNuclearPeople: "LUDZIE POSTNUKLEARNI / GHOULY",
    animals: "ZWIERZĘTA / OWADY",
    cryptids: "KRYPTYDY / OBCY",
    robots: "ROBOTY / WIEŻYCZKI",
    npc: "NPC",
    creature: "STWÓR",
    kind: "TYP",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function entryText(entry) {
  return normalizeSearch([
    entry?.name,
    entry?.creatureType,
    entry?.category,
    entry?.cardKind,
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
  ].filter(Boolean).join(" "));
}

function tokenGroup(entry) {
  const source = entryText(entry);

  if (/\b(robot|robotic|synth|turret|sentry bot|protectron|assaultron|eyebot|mister handy|mister gutsy|machine)\b/.test(source)) {
    return "robots";
  }

  if (/\b(ghoul|glowing one|post-nuclear|post nuclear)\b/.test(source)) {
    return "postNuclearPeople";
  }

  if (/\b(super mutant|mutated human|mutated-human|nightkin|mutant human)\b/.test(source)) {
    return "mutatedPeople";
  }

  if (/\b(cryptid|alien|extraterrestrial|mothman|flatwoods|snallygaster|grafton monster|wendigo|sheepsquatch)\b/.test(source)) {
    return "cryptids";
  }

  if (/\b(insect|arachnid|crustacean|mammal|reptile|animal|canine|dog|brahmin|deathclaw|mirelurk|radroach|radscorpion|radstag|stingwing|bloodbug|bloatfly|mole rat|mutant hound|yao guai)\b/.test(source)) {
    return "animals";
  }

  if (/\b(human|person|people|raider|settler|gunner|npc|ally|character)\b/.test(source)) {
    return "people";
  }

  if (String(entry?.cardKind || "").toLowerCase() === "npc") return "people";
  if (String(entry?.cardKind || "").toLowerCase() === "creature") return "animals";
  if (String(entry?.statKind || "").toLowerCase() === "character") return "people";
  return "animals";
}

function optionFallback(option) {
  return {
    name: option?.textContent || "",
    creatureType: option?.textContent || "",
    cardKind: String(option?.textContent || "").toLowerCase().includes("npc") ? "npc" : "creature",
  };
}

export default function GmUnifiedTokenManagerV5({ session }) {
  const { i18n } = useTranslation();
  const copy = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const rootRef = useRef(null);
  const [group, setGroup] = useState("all");
  const [customEntries, setCustomEntries] = useState([]);
  const [filterHost, setFilterHost] = useState(null);
  const [kindHost, setKindHost] = useState(null);
  const [editorKind, setEditorKind] = useState("npc");

  const bestiaryById = useMemo(
    () => new Map(BESTIARY_ENTRIES.map((entry) => [String(entry?.id || ""), entry])),
    []
  );
  const customById = useMemo(
    () => new Map(customEntries.map((entry) => [String(entry?.id || ""), entry])),
    [customEntries]
  );

  useEffect(() => {
    let active = true;
    const reload = () => loadCustomCreatures()
      .then((items) => { if (active) setCustomEntries(Array.isArray(items) ? items : []); })
      .catch(() => { if (active) setCustomEntries([]); });
    reload();
    window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const resolveHosts = () => {
      const nextFilterHost = root.querySelector(".gm-bestiary-filter-row");
      const nextKindHost = root.querySelector(".gm-npc-v4-kind-tabs");
      setFilterHost((current) => current === nextFilterHost ? current : nextFilterHost);
      setKindHost((current) => current === nextKindHost ? current : nextKindHost);

      if (nextKindHost) {
        const originalButtons = [...nextKindHost.querySelectorAll(":scope > button.pip-btn:not(.gm-npc-v5-kind-toggle)")];
        const activeIndex = originalButtons.findIndex((button) => button.classList.contains("is-primary"));
        if (activeIndex >= 0) setEditorKind(activeIndex === 1 ? "creature" : "npc");
      }
    };

    resolveHosts();
    const observer = new MutationObserver(resolveHosts);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = kindHost;
    if (!host) return undefined;
    const syncKind = () => {
      const originalButtons = [...host.querySelectorAll(":scope > button.pip-btn:not(.gm-npc-v5-kind-toggle)")];
      const activeIndex = originalButtons.findIndex((button) => button.classList.contains("is-primary"));
      if (activeIndex >= 0) setEditorKind(activeIndex === 1 ? "creature" : "npc");
    };
    syncKind();
    const observer = new MutationObserver(syncKind);
    observer.observe(host, { subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [kindHost]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const applyFilter = () => {
      const selects = [...root.querySelectorAll(".gm-bestiary-picker__controls > select.pip-input")];
      selects.forEach((select, selectIndex) => {
        const lookup = selectIndex === 0 ? bestiaryById : customById;
        [...select.options].forEach((option) => {
          if (!option.value) {
            option.hidden = false;
            option.disabled = false;
            option.style.display = "";
            return;
          }
          const entry = lookup.get(String(option.value)) || optionFallback(option);
          const hidden = group !== "all" && tokenGroup(entry) !== group;
          option.hidden = hidden;
          option.disabled = hidden;
          option.style.display = hidden ? "none" : "";
        });

        const selected = select.options[select.selectedIndex];
        if (selected?.value && selected.hidden) {
          select.value = "";
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    };

    applyFilter();
    const observer = new MutationObserver(applyFilter);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [group, bestiaryById, customById]);

  const toggleKind = () => {
    const host = kindHost;
    if (!host) return;
    const originalButtons = [...host.querySelectorAll(":scope > button.pip-btn:not(.gm-npc-v5-kind-toggle)")];
    if (originalButtons.length < 2) return;
    const nextIndex = editorKind === "npc" ? 1 : 0;
    originalButtons[nextIndex]?.click();
    setEditorKind(nextIndex === 1 ? "creature" : "npc");
  };

  return (
    <div className="gm-unified-token-manager-v5" ref={rootRef}>
      <GmUnifiedTokenManagerV4 session={session} />

      {filterHost ? createPortal(
        <label className="gm-token-group-filter-wrap">
          <span>{copy.filter}</span>
          <select
            className="pip-input gm-token-group-filter"
            value={group}
            onChange={(event) => setGroup(GROUPS.includes(event.target.value) ? event.target.value : "all")}
          >
            {GROUPS.map((value) => <option key={value} value={value}>{copy[value]}</option>)}
          </select>
        </label>,
        filterHost
      ) : null}

      {kindHost ? createPortal(
        <button
          type="button"
          className="pip-btn is-primary gm-npc-v5-kind-toggle"
          onClick={toggleKind}
          aria-label={`${copy.kind}: ${editorKind === "npc" ? copy.npc : copy.creature}`}
        >
          {copy.npc} ⇄ {copy.creature} · {editorKind === "npc" ? copy.npc : copy.creature}
        </button>,
        kindHost
      ) : null}
    </div>
  );
}
