import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import CraftingScreen from "./CraftingScreen.jsx";
import ArmorRepairPanel from "./ArmorRepairPanel.jsx";
import "./craftingHub.css";

const LABELS = {
  en: { craft: "CRAFT", repair: "REPAIR" },
  ru: { craft: "КРАФТ", repair: "РЕМОНТ" },
  uk: { craft: "КРАФТ", repair: "РЕМОНТ" },
  pl: { craft: "RZEMIOSŁO", repair: "NAPRAWA" },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return LABELS[code] ? code : "en";
}

function withRepairPerkBypass(character) {
  if (!character) return character;
  const perksAndTraits = Array.isArray(character.perksAndTraits)
    ? character.perksAndTraits
    : [];

  return {
    ...character,
    perksAndTraits: [
      ...perksAndTraits,
      {
        id: "armorer",
        name: "Armorer",
        rank: 4,
        repairRequirementBypass: true,
      },
    ],
  };
}

export default function CraftingHub({ character = null, setCharacter = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const labels = LABELS[language];
  const [mode, setMode] = useState("craft");
  const repairCharacter = useMemo(
    () => withRepairPerkBypass(character),
    [character]
  );

  return (
    <div className="crafting-hub">
      <section className="pip-panel crafting-hub__modebar" aria-label="Crafting mode">
        <button
          type="button"
          className={`pip-btn ${mode === "craft" ? "is-primary" : ""}`}
          onClick={() => setMode("craft")}
        >
          {labels.craft}
        </button>
        <button
          type="button"
          className={`pip-btn ${mode === "repair" ? "is-primary" : ""}`}
          onClick={() => setMode("repair")}
        >
          {labels.repair}
        </button>
      </section>

      {mode === "repair" ? (
        <div className="armor-repair-no-perks">
          <ArmorRepairPanel
            character={repairCharacter}
            setCharacter={setCharacter}
            language={language}
          />
        </div>
      ) : (
        <CraftingScreen
          character={character}
          setCharacter={setCharacter}
        />
      )}
    </div>
  );
}
