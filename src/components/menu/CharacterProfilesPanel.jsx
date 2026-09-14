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

const COPY = {
  en: { title: "CHARACTERS", local: "LOCAL PROFILES", active: "ACTIVE", use: "OPEN", copy: "COPY", remove: "DELETE", create: "NEW CHARACTER", empty: "No local characters yet.", confirm: "Delete this character?", level: "LVL" },
  ru: { title: "ПЕРСОНАЖИ", local: "ЛОКАЛЬНЫЕ ПРОФИЛИ", active: "АКТИВЕН", use: "ОТКРЫТЬ", copy: "КОПИЯ", remove: "УДАЛИТЬ", create: "НОВЫЙ ПЕРСОНАЖ", empty: "Локальных персонажей пока нет.", confirm: "Удалить этого персонажа?", level: "УР" },
  uk: { title: "ПЕРСОНАЖІ", local: "ЛОКАЛЬНІ ПРОФІЛІ", active: "АКТИВНИЙ", use: "ВІДКРИТИ", copy: "КОПІЯ", remove: "ВИДАЛИТИ", create: "НОВИЙ ПЕРСОНАЖ", empty: "Локальних персонажів поки немає.", confirm: "Видалити цього персонажа?", level: "РІВ" },
  pl: { title: "POSTACIE", local: "PROFILE LOKALNE", active: "AKTYWNA", use: "OTWÓRZ", copy: "KOPIA", remove: "USUŃ", create: "NOWA POSTAĆ", empty: "Brak lokalnych postaci.", confirm: "Usunąć tę postać?", level: "POZ" },
};

function lang(value) {
  const key = String(value || "en").toLowerCase().split("-")[0];
  return COPY[key] ? key : "en";
}

export default function CharacterProfilesPanel({ onCreateCharacter }) {
  const { i18n } = useTranslation();
  const copy = COPY[lang(i18n.resolvedLanguage || i18n.language)];
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("pipboy:character-profiles-changed", refresh);
    return () => window.removeEventListener("pipboy:character-profiles-changed", refresh);
  }, []);

  const profiles = useMemo(() => listCharacterProfiles(), [revision]);
  const activeId = getActiveCharacterId();

  const openProfile = (id) => {
    if (!setActiveCharacter(id)) return;
    window.location.reload();
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
      <div className="pip-head">
        <h2>[ {copy.title} ]</h2>
        <span>{copy.local}</span>
      </div>

      <div className="character-profiles-list">
        {profiles.length ? profiles.map((profile) => (
          <article key={profile.id} className={`character-profile-card${profile.id === activeId ? " is-active" : ""}`}>
            <div className="character-profile-card__main">
              <strong>{profile.name}</strong>
              <span>{profile.origin || "—"} · {copy.level} {profile.level || "1"}</span>
              <small>{profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : ""}</small>
            </div>
            <div className="character-profile-card__actions">
              {profile.id === activeId ? <span className="character-profile-active">{copy.active}</span> : (
                <button type="button" className="pip-btn" onClick={() => openProfile(profile.id)}>{copy.use}</button>
              )}
              <button type="button" className="pip-btn" onClick={() => cloneProfile(profile.id)}>{copy.copy}</button>
              <button type="button" className="pip-btn" onClick={() => removeProfile(profile.id)}>{copy.remove}</button>
            </div>
          </article>
        )) : <div className="pip-logbox">{copy.empty}</div>}
      </div>

      <div className="pip-actions-inline push-top">
        <button type="button" className="pip-btn is-primary" onClick={onCreateCharacter}>{copy.create}</button>
      </div>
    </section>
  );
}
