import React, { useState } from "react";
import HpPanel from "./HpPanel.jsx";
import VitalsPanel from "./VitalsPanel.jsx";
import InjuryPanel from "./InjuryPanel.jsx";
import { useTranslation } from "react-i18next";
import OriginSelectionModal from "../shared/OriginSelectionModal.jsx";
import { ORIGINS } from "../data/origins.js";

const STEALTH_COPY = {
  en: { title: "STEALTH BOY", turns: "TURNS", next: "NEXT TURN", end: "END", spot: "SPOT DIFF" },
  ru: { title: "СТЕЛС-БОЙ", turns: "ХОДОВ", next: "СЛЕД. ХОД", end: "ЗАВЕРШИТЬ", spot: "СЛОЖН. ОБНАР." },
  uk: { title: "СТЕЛС-БОЙ", turns: "ХОДІВ", next: "НАСТ. ХІД", end: "ЗАВЕРШИТИ", spot: "СКЛАДН. ВИЯВЛ." },
  pl: { title: "STEALTH BOY", turns: "TURY", next: "NAST. TURA", end: "ZAKOŃCZ", spot: "TRUDN. WYKRYCIA" },
};

function formatSigned(value) {
  const num = Number(value) || 0;
  return num > 0 ? `+${num}` : `${num}`;
}

export default function StatusScreen({
  form,
  derived,
  armor,
  currentLuckPoints = 0,
  onSpendLuck,
  portraitPreview,
  onPickPortrait,
  onRemovePortrait,
  onTopLevelChange,
  onChangeOrigin,
  onStatusToggle,
  onStealthBoyAdvance,
  onStealthBoyEnd,
  onInjuryToggle,
  onArmorChange,
  hpMax,
  hpCurrent,
  radiationHp,
  onHpSliderChange,
  onRadiationSliderChange,
  onHpDecrease,
  onHpIncrease,
  onOpenConditions,
  onOpenDerived,
}) {
  const { t, i18n } = useTranslation();
  const stealthCopy = STEALTH_COPY[i18n.resolvedLanguage?.split("-")[0] || "en"] || STEALTH_COPY.en;
  const [isOriginModalOpen, setIsOriginModalOpen] = useState(false);

  const survivalConditions = [
    Number(form.satiety || 0) === 0
      ? {
          key: "starving",
          group: "negative",
          nameKey: "statuses.starving.name",
          descriptionKey: "statuses.starving.description",
          durationKey: "statuses.duration.whileZero",
        }
      : null,
    Number(form.thirst || 0) === 0
      ? {
          key: "dehydrated",
          group: "negative",
          nameKey: "statuses.dehydrated.name",
          descriptionKey: "statuses.dehydrated.description",
          durationKey: "statuses.duration.whileZero",
        }
      : null,
    Number(form.vigor || 0) === 0
      ? {
          key: "exhausted",
          group: "negative",
          nameKey: "statuses.exhausted.name",
          descriptionKey: "statuses.exhausted.description",
          durationKey: "statuses.duration.whileZero",
        }
      : null,
  ].filter(Boolean);

  const effectDerivedBonuses = derived?.effectDerivedBonuses || {};
  const combatModifiers = derived?.combatModifiers || {};
  const effectBadges = [];

  if (form.statuses?.invisible) {
    effectBadges.push({
      key: "invisible",
      tone: "positive",
      label: "◉ INVISIBLE",
    });
  }

if (derived?.immunities?.includes("radiation")) {
    effectBadges.push({
      key: "immune-rad",
      tone: "positive",
      label: `☢ RADIATION IMMUNE`,
    });
  }

  if (derived?.immunities?.includes("poison")) {
    effectBadges.push({
      key: "immune-poison",
      tone: "positive",
      label: `☠ POISON IMMUNE`,
    });
  }

  if (Number(effectDerivedBonuses.defenseBonus || 0) !== 0) {
    effectBadges.push({
      key: "defense",
      tone: effectDerivedBonuses.defenseBonus > 0 ? "positive" : "negative",
      label: `${t("main.defense")} ${formatSigned(
        effectDerivedBonuses.defenseBonus
      )}`,
    });
  }

  if (Number(effectDerivedBonuses.maxHpBonus || 0) !== 0) {
    effectBadges.push({
      key: "maxhp",
      tone: effectDerivedBonuses.maxHpBonus > 0 ? "positive" : "negative",
      label: `HP ${formatSigned(effectDerivedBonuses.maxHpBonus)}`,
    });
  }

  if (Number(derived?.physicalResistBonus || 0) !== 0) {
    effectBadges.push({
      key: "physres",
      tone: derived.physicalResistBonus > 0 ? "positive" : "negative",
      label: `${t("armorPanel.physical")} RES ${formatSigned(
        derived.physicalResistBonus
      )}`,
    });
  }

  if (Number(derived?.energyResistBonus || 0) !== 0) {
    effectBadges.push({
      key: "energyres",
      tone: derived.energyResistBonus > 0 ? "positive" : "negative",
      label: `${t("armorPanel.energy")} RES ${formatSigned(
        derived.energyResistBonus
      )}`,
    });
  }

  if (Number(derived?.radiationResistBonus || 0) !== 0) {
    effectBadges.push({
      key: "radres",
      tone: derived.radiationResistBonus > 0 ? "positive" : "negative",
      label: `${t("armorPanel.radiation")} RES ${formatSigned(
        derived.radiationResistBonus
      )}`,
    });
  }

  if (Number(derived?.poisonResistBonus || 0) !== 0) {
    effectBadges.push({
      key: "poisonres",
      tone: derived.poisonResistBonus > 0 ? "positive" : "negative",
      label: `${t("armorPanel.poison")} RES ${formatSigned(
        derived.poisonResistBonus
      )}`,
    });
  }

  if (Number(combatModifiers.apNowBonus || 0) !== 0) {
    effectBadges.push({
      key: "apnow",
      tone: combatModifiers.apNowBonus > 0 ? "positive" : "negative",
      label: `AP ${formatSigned(combatModifiers.apNowBonus)}`,
    });
  }

  if (Number(combatModifiers.bonusDamageCd || 0) !== 0) {
    effectBadges.push({
      key: "bonusdmg",
      tone: combatModifiers.bonusDamageCd > 0 ? "positive" : "negative",
      label: `${t("weapons.damageShort")} +${combatModifiers.bonusDamageCd}CD`,
    });
  }

  if (Number(combatModifiers.sneakAttackBonusCd || 0) !== 0) {
    effectBadges.push({
      key: "sneakdmg",
      tone: combatModifiers.sneakAttackBonusCd > 0 ? "positive" : "negative",
      label: `SNEAK +${combatModifiers.sneakAttackBonusCd}CD`,
    });
  }

  if (combatModifiers.loseNormalActions) {
    effectBadges.push({
      key: "loseactions",
      tone: "negative",
      label: "NO ACTIONS",
    });
  }

  if (combatModifiers.movementBlocked) {
    effectBadges.push({
      key: "nomove",
      tone: "negative",
      label: "NO MOVE",
    });
  }

  if (combatModifiers.canSprint === false) {
    effectBadges.push({
      key: "nosprint",
      tone: "negative",
      label: "NO SPRINT",
    });
  }

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-hero">
        <div className="pip-head">
          <h2>[ {t("main.title")} ]</h2>
          <span className="pip-cursor">{t("main.dataReady")}</span>
        </div>

        <div className="pip-hero-grid">
          <div className="pip-hero-left">
            <div className="pip-portrait-card">
              <button
                type="button"
                className="pip-portrait"
                onClick={onPickPortrait}
              >
                {portraitPreview ? (
                  <img
                    src={portraitPreview}
                    alt="Character portrait"
                    className="pip-portrait-image"
                  />
                ) : (
                  <span>{t("main.addPortrait")}</span>
                )}
              </button>

              {portraitPreview && (
                <button
                  type="button"
                  className="pip-portrait-remove"
                  onClick={onRemovePortrait}
                >
                  ×
                </button>
              )}
            </div>

            <div className="pip-portrait-actions">
              <button
                type="button"
                className="pip-action-btn"
                onClick={onOpenDerived}
              >
                <span className="pip-action-icon">★</span>
                <small>{t("main.statsAction")}</small>
              </button>

              <button
                type="button"
                className="pip-action-btn"
                onClick={onSpendLuck}
                disabled={currentLuckPoints <= 0}
              >
                <span className="pip-action-icon">✤{currentLuckPoints}</span>
                <small>{t("main.luckAction")}</small>
              </button>

              <button
                type="button"
                className="pip-action-btn"
                onClick={onOpenConditions}
              >
                <span className="pip-action-icon">➙</span>
                <small>{t("main.statusesAction")}</small>
              </button>
            </div>
          </div>

          <div className="pip-hero-meta">
            <div className="pip-identity-card">
              <label>{t("main.name")}</label>
              <input
                value={form.characterName}
                onChange={(e) =>
                  onTopLevelChange("characterName", e.target.value)
                }
                className="pip-input pip-character-name"
              />
            </div>

            <div className="pip-identity-card">
              <label>{t("main.origin")}</label>
              <button
                type="button"
                className="pip-input"
                style={{ textAlign: 'left', cursor: 'pointer' }}
                onClick={() => setIsOriginModalOpen(true)}
              >
                {form.origin && ORIGINS[form.origin]
                  ? t(ORIGINS[form.origin].translationKey)
                  : form.origin || t("characterCreation.selectOriginTitle")}
              </button>
            </div>

            <div className="pip-progression-grid">
              <div>
                <label>{t("main.level")}</label>
                <input
                  type="number"
                  min="1"
                  value={form.level}
                  onChange={(e) => onTopLevelChange("level", e.target.value)}
                  className="pip-input"
                />
              </div>

              <div>
                <label>{t("main.xp")}</label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.xp ?? "0"}
                  onChange={(e) =>
                    onTopLevelChange("xp", String(Math.max(0, Number(e.target.value) || 0)))
                  }
                  className="pip-input"
                />
              </div>
            </div>

          </div>
        </div>

        <div className="pip-hero-dashboard">
          <div className="pip-combat-summary">
            <div className="pip-summary-title">[ {t("main.combatData")} ]</div>
            <div className="pip-combat-grid">
              <div className="pip-combat-stat"><small>{t("main.defense")}</small><strong>{derived.defense}</strong></div>
              <div className="pip-combat-stat"><small>{t("main.initiative")}</small><strong>{derived.initiative}</strong></div>
              <div className="pip-combat-stat"><small>{t("main.melee")}</small><strong>{derived.md}</strong></div>
              <div className="pip-combat-stat"><small>{t("main.luck")}</small><strong>{currentLuckPoints}</strong></div>
            </div>
          </div>

          {form.stealthBoyState?.active && (
            <div className="pip-survival-summary">
              <div className="pip-summary-title">[ {stealthCopy.title} ]</div>
              <div className="pip-inline-stats">
                <span>{form.stealthBoyState.remainingTurns} {stealthCopy.turns}</span>
                <span>{t("main.defense")} +{form.stealthBoyState.defenseBonus || 2}</span>
                <span>{stealthCopy.spot} +{form.stealthBoyState.spotDifficultyBonus || 2}</span>
              </div>
              <div className="pip-tagrow push-top">
                <button type="button" className="pip-btn is-primary" onClick={onStealthBoyAdvance}>{stealthCopy.next}</button>
                <button type="button" className="pip-btn" onClick={onStealthBoyEnd}>{stealthCopy.end}</button>
              </div>
            </div>
          )}

          <div className="pip-survival-summary">
            <div className="pip-summary-title">[ {t("vitals.title")} ]</div>
            <div className="pip-status-vitals-inline">
              <VitalsPanel
                form={form}
                onTopLevelChange={onTopLevelChange}
                compact
              />
            </div>
          </div>
        </div>
      </section>

      <HpPanel
        maxHp={hpMax}
        currentHp={hpCurrent}
        radiationHp={radiationHp}
        onHpSliderChange={onHpSliderChange}
        onRadiationSliderChange={onRadiationSliderChange}
        onHpDecrease={onHpDecrease}
        onHpIncrease={onHpIncrease}
      />

      <InjuryPanel
        injuries={form.injuries}
        statuses={form.statuses}
        armor={armor}
        derived={derived}
        onToggle={onInjuryToggle}
        onArmorChange={onArmorChange}
        survivalConditions={survivalConditions}
      />

      <OriginSelectionModal
        open={isOriginModalOpen}
        onSelectOrigin={(id, traits, selectedPack) => {
          onChangeOrigin(id, traits, selectedPack, t);
          setIsOriginModalOpen(false);
        }}
        onCancel={() => setIsOriginModalOpen(false)}
      />
    </div>
  );
}
