import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  COMBAT_BUFF_PRESETS,
  aggregateCombatBuffs,
  applyCombatBuffsToAttack,
  applyCombatBuffsToStats,
  combatBuffTierLabel,
} from "../../utils/combatBuffs.js";
import { parseAttackText } from "../../utils/npcCombat.js";
import GmUnifiedTokenManagerV8 from "./GmUnifiedTokenManagerV8.jsx";
import "./gmUnifiedTokenManagerV9.css";

const COPY = {
  en: { size: "TOKEN SIZE", buffs: "COMBAT BUFFS", clear: "CLEAR", selected: "SELECTED" },
  ru: { size: "РАЗМЕР ТОКЕНА", buffs: "БОЕВЫЕ БАФЫ", clear: "СБРОСИТЬ", selected: "ВЫБРАНО" },
  uk: { size: "РОЗМІР ТОКЕНА", buffs: "БОЙОВІ БАФИ", clear: "СКИНУТИ", selected: "ОБРАНО" },
  pl: { size: "ROZMIAR TOKENU", buffs: "BUFFY BOJOWE", clear: "WYCZYŚĆ", selected: "WYBRANO" },
};

const TIERS = ["light", "medium", "strong"];

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function normalizeSize(value) {
  return Number(value) === 2 ? 2 : 1;
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitEffects(value) {
  return String(value || "").split(/[,;•]/).map((item) => item.trim()).filter(Boolean);
}

function buffAttackText(value, buffIds) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const profile = parseAttackText(line)[0];
      if (!profile) return line;
      const buffed = applyCombatBuffsToAttack(profile, buffIds);
      let next = line.replace(/(\d+)\s*(CD|КУ|DC)\b/i, `${Math.max(0, num(buffed.damageDice, 0))} $2`);
      const lower = next.toLowerCase();
      const missingEffects = splitEffects(buffed.effects).filter((effect) => !lower.includes(effect.toLowerCase()));
      if (missingEffects.length) next = `${next}, ${missingEffects.join(", ")}`;
      return next;
    })
    .join("\n");
}

function applySelectedBuffs(stats = {}, selectedIds = []) {
  const existing = Array.isArray(stats.activeCombatBuffs) ? stats.activeCombatBuffs : [];
  const ids = [...new Set([...existing, ...selectedIds].map(String).filter(Boolean))];
  if (!ids.length) return { ...stats };

  const customAttacks = (Array.isArray(stats.customAttacks) ? stats.customAttacks : [])
    .map((attack) => applyCombatBuffsToAttack(attack, ids));
  const weapons = (Array.isArray(stats.weapons) ? stats.weapons : [])
    .map((weapon) => applyCombatBuffsToAttack(weapon, ids));
  const attacks = buffAttackText(stats.attacks, ids);

  return applyCombatBuffsToStats({ ...stats, attacks, customAttacks, weapons }, ids);
}

function bonusSummary(summary = {}) {
  const parts = [];
  const damage = num(summary.damageDiceBonus, 0);
  const melee = num(summary.meleeDamageDiceBonus, 0);
  if (damage) parts.push(`DMG +${damage} CD`);
  if (melee) parts.push(`MELEE +${melee} CD`);
  if (num(summary.defenseBonus, 0)) parts.push(`DEF +${summary.defenseBonus}`);
  if (num(summary.maxHpBonus, 0)) parts.push(`HP +${summary.maxHpBonus}`);
  const dr = summary.resistance || {};
  if (num(dr.physical, 0)) parts.push(`PDR +${dr.physical}`);
  if (num(dr.energy, 0)) parts.push(`EDR +${dr.energy}`);
  if (num(dr.radiation, 0)) parts.push(`RAD +${dr.radiation}`);
  if (num(summary.immediateAp, 0)) parts.push(`AP +${summary.immediateAp}`);
  if (num(summary.apPerTurn, 0)) parts.push(`AP/T +${summary.apPerTurn}`);
  if (Array.isArray(summary.attackEffects) && summary.attackEffects.length) parts.push(summary.attackEffects.join(", "));
  return parts.join(" · ");
}

export default function GmUnifiedTokenManagerV9({ session }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[language];
  const rootRef = useRef(null);
  const [sizeHost, setSizeHost] = useState(null);
  const [buffHost, setBuffHost] = useState(null);
  const [tokenSize, setTokenSize] = useState(1);
  const [buffTier, setBuffTier] = useState("light");
  const [selectedBuffIds, setSelectedBuffIds] = useState([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const sync = () => {
      const size = root.querySelector(".gm-token-v5-preview-head");
      const buffs = root.querySelector(".gm-token-v5-quick-preview");
      setSizeHost((current) => current === size ? current : size);
      setBuffHost((current) => current === buffs ? current : buffs);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const tierBuffs = useMemo(
    () => COMBAT_BUFF_PRESETS.filter((item) => item.tier === buffTier),
    [buffTier]
  );
  const selectedSummary = useMemo(() => aggregateCombatBuffs(selectedBuffIds), [selectedBuffIds]);

  const toggleBuff = (id) => {
    setSelectedBuffIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  };

  const tokenSession = useMemo(() => {
    if (!session) return session;
    return {
      ...session,
      createNpcToken: (payload = {}) => {
        const size = normalizeSize(tokenSize);
        const sourceStats = payload?.stats && typeof payload.stats === "object" ? payload.stats : {};
        const buffedStats = applySelectedBuffs(sourceStats, selectedBuffIds);
        const stats = {
          ...buffedStats,
          footprint: size,
          size,
          baseSize: size,
        };
        return session.createNpcToken?.({ ...payload, size, stats });
      },
    };
  }, [session, tokenSize, selectedBuffIds]);

  return (
    <div className="gm-unified-token-manager-v9" ref={rootRef}>
      <GmUnifiedTokenManagerV8 session={tokenSession} />

      {sizeHost ? createPortal(
        <div className="gm-token-v9-size-picker" aria-label={text.size}>
          <span>{text.size}</span>
          <div>
            {[1, 2].map((size) => (
              <button
                type="button"
                key={size}
                className={`pip-btn${tokenSize === size ? " is-primary" : ""}`}
                aria-pressed={tokenSize === size}
                onClick={() => setTokenSize(size)}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </div>,
        sizeHost
      ) : null}

      {buffHost ? createPortal(
        <section className="gm-token-v9-buffs" aria-label={text.buffs}>
          <div className="gm-token-v9-buff-head">
            <strong>[ {text.buffs} ]</strong>
            <span>{text.selected}: {selectedBuffIds.length}</span>
            {selectedBuffIds.length ? (
              <button type="button" className="pip-btn" onClick={() => setSelectedBuffIds([])}>{text.clear}</button>
            ) : null}
          </div>
          <div className="gm-token-v9-buff-tiers">
            {TIERS.map((tier) => (
              <button
                type="button"
                key={tier}
                className={`pip-btn${buffTier === tier ? " is-primary" : ""}`}
                onClick={() => setBuffTier(tier)}
              >
                {combatBuffTierLabel(tier, language)}
              </button>
            ))}
          </div>
          <div className="gm-token-v9-buff-list">
            {tierBuffs.map((item) => {
              const active = selectedBuffIds.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`pip-btn gm-token-v9-buff-chip${active ? " is-primary" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleBuff(item.id)}
                  title={bonusSummary(aggregateCombatBuffs([item.id]))}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
          {selectedBuffIds.length ? <small className="gm-token-v9-buff-summary">{bonusSummary(selectedSummary)}</small> : null}
        </section>,
        buffHost
      ) : null}
    </div>
  );
}
