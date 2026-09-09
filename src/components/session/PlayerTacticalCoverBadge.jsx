import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const COPY = {
  en: "COVER",
  ru: "УКРЫТИЕ",
  uk: "УКРИТТЯ",
  pl: "OSŁONA",
};

function languageCode(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

export default function PlayerTacticalCoverBadge({ session }) {
  const { i18n } = useTranslation();
  const [target, setTarget] = useState(null);
  const scene = session?.tacticalScene || null;
  const proceduralActive = String(scene?.backgroundName || "").startsWith("PROC //");
  const ownedTokens = (Array.isArray(scene?.tokens) ? scene.tokens : []).filter(
    (token) => token?.kind === "player" && String(token?.ownerClientId || "") === String(session?.clientId || "")
  );

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const find = () => setTarget(document.querySelector(".session-tactical-player__actions"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene?.sceneId, scene?.active]);

  if (!target || !proceduralActive || !ownedTokens.length) return null;
  const label = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  return createPortal(
    <div className="player-tactical-cover-badges" aria-label={label}>
      {ownedTokens.map((token) => (
        <span key={token.id} className={`player-tactical-cover-badge rating-${Number(token?.stats?.tacticalCover || 0)}`}>
          {ownedTokens.length > 1 ? `${token.name}: ` : ""}{label} {Number(token?.stats?.tacticalCover || 0)}
        </span>
      ))}
    </div>,
    target
  );
}
