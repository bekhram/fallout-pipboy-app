import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  cloneCharacterProfile,
  deleteCharacterProfile,
  getActiveCharacterId,
  listCharacterProfiles,
  setActiveCharacter,
} from "../../utils/characterProfiles.js";
import "./characterProfiles.css";
import SheetIcon from "../layout/SheetIcon.jsx";
import {menuCopy} from "./menuCopy.js";
import portraitFallback from "../../assets/injuries/vaultboy_healthy.png";

const COPY = {
  en: { title: "CHARACTERS", local: "LOCAL PROFILES", active: "ACTIVE", use: "OPEN", copy: "COPY", remove: "DELETE", create: "NEW CHARACTER", empty: "No local characters yet.", confirm: "Delete this character?", level: "LVL" },
  ru: { title: "ПЕРСОНАЖИ", local: "ЛОКАЛЬНЫЕ ПРОФИЛИ", active: "АКТИВЕН", use: "ОТКРЫТЬ", copy: "КОПИЯ", remove: "УДАЛИТЬ", create: "НОВЫЙ ПЕРСОНАЖ", empty: "Локальных персонажей пока нет.", confirm: "Удалить этого персонажа?", level: "УР" },
  uk: { title: "ПЕРСОНАЖІ", local: "ЛОКАЛЬНІ ПРОФІЛІ", active: "АКТИВНИЙ", use: "ВІДКРИТИ", copy: "КОПІЯ", remove: "ВИДАЛИТИ", create: "НОВИЙ ПЕРСОНАЖ", empty: "Локальних персонажів поки немає.", confirm: "Видалити цього персонажа?", level: "РІВ" },
  pl: { title: "POSTACIE", local: "PROFILE LOKALNE", active: "AKTYWNA", use: "OTWÓRZ", copy: "KOPIA", remove: "USUŃ", create: "NOWA POSTAĆ", empty: "Brak lokalnych postaci.", confirm: "Usunąć tę postać?", level: "POZ" },
};

function readPortrait(id) {
  try { return localStorage.getItem(`fallout_pipboy_v5_portrait_${id}`) || portraitFallback; } catch { return portraitFallback; }
}

function lang(value) {
  const key = String(value || "en").toLowerCase().split("-")[0];
  return COPY[key] ? key : "en";
}

export default function CharacterProfilesPanel({ onCreateCharacter, onOpenCharacter, onImportClick }) {
  const { i18n } = useTranslation();
  const copy = COPY[lang(i18n.resolvedLanguage || i18n.language)];
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("pipboy:character-profiles-changed", refresh);
    return () => window.removeEventListener("pipboy:character-profiles-changed", refresh);
  }, []);

  const profiles = useMemo(() => listCharacterProfiles(), [revision]);
  const c = menuCopy(i18n.resolvedLanguage);
  const [expandedId,setExpandedId] = useState(null);
  const activeId = getActiveCharacterId();

  const openProfile = (id) => {
    if (!setActiveCharacter(id)) return;
    if(onOpenCharacter) onOpenCharacter(); else window.location.reload();
  };

  const cloneProfile = (id) => {
    cloneCharacterProfile(id);
    setRevision((value) => value + 1);
  };

  const removeProfile = (id) => {
    if (!window.confirm(copy.confirm)) return;
    const wasActive = id === activeId;
    if (!deleteCharacterProfile(id)) return;
    if (wasActive) window.location.reload();
    else setRevision((value) => value + 1);
  };

  return (
    <section className="pip-panel pip-block character-profiles-panel">
      <div className="home-profiles-heading"><h2>{c.characters}</h2><button type="button" className="pip-btn" onClick={onCreateCharacter} aria-label={copy.create}><SheetIcon name="plus"/><span>{copy.create}</span></button></div>

      <div className="character-profiles-list">
        {profiles.length ? profiles.map((profile) => (
          <article key={profile.id} className={`character-profile-card${profile.id === activeId ? " is-active" : ""}`}>
            <button type="button" className="home-profile-open" onClick={()=>openProfile(profile.id)} aria-label={`${copy.use}: ${profile.name}`}>
            <img src={readPortrait(profile.id)} alt=""/>
            <div className="character-profile-card__main">
              <strong>{profile.data?.characterName || i18n.t("menuScreen.unnamed")}</strong>
              <span>{profile.origin || "—"} · {copy.level} {profile.level || "1"}</span>
              {profile.id === activeId && <span className="character-profile-active">● {copy.active}</span>}
            </div>
            </button>
            <button type="button" className="home-icon" aria-label={`${c.more}: ${profile.name}`} aria-expanded={expandedId===profile.id} onClick={()=>setExpandedId(expandedId===profile.id?null:profile.id)}><SheetIcon name="more"/></button>
            {expandedId===profile.id && <div className="character-profile-card__actions">
              <button type="button" className="pip-btn" onClick={() => cloneProfile(profile.id)}>{copy.copy}</button>
              <button type="button" className="pip-btn" onClick={() => removeProfile(profile.id)}>{copy.remove}</button>
            </div>}
          </article>
        )) : <div className="pip-logbox">{copy.empty}</div>}
      </div>

      <div className="pip-actions-inline push-top">
        <button type="button" className="pip-btn home-import" onClick={onImportClick}><SheetIcon name="upload"/> {i18n.t("menuScreen.importJson")}</button>
      </div>
    </section>
  );
}
