import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { aggregateCombatBuffs, combatBuffById } from "../../utils/combatBuffs.js";
import {
  normalizeStructuredAttack,
  normalizeWeaponAttack,
  parseAttackText,
} from "../../utils/npcCombat.js";
import GmUnifiedTokenManagerV9 from "./GmUnifiedTokenManagerV9.jsx";
import "./gmUnifiedTokenManagerV10.css";

const COPY = {
  en: { buffs: "ACTIVE BUFFS", extraAction: "EXTRA ACTION", reroll: "REROLL", regen: "REGEN", spotting: "SPOT" },
  ru: { buffs: "АКТИВНЫЕ БАФЫ", extraAction: "ДОП. ДЕЙСТВИЕ", reroll: "ПЕРЕБРОС", regen: "РЕГЕН", spotting: "ОБНАРУЖЕНИЕ" },
  uk: { buffs: "АКТИВНІ БАФИ", extraAction: "ДОД. ДІЯ", reroll: "ПЕРЕКИД", regen: "РЕГЕН", spotting: "ВИЯВЛЕННЯ" },
  pl: { buffs: "AKTYWNE BUFFY", extraAction: "DOD. AKCJA", reroll: "PRZERZUT", regen: "REGEN", spotting: "WYKRYCIE" },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function norm(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function attackSignature(attack = {}) {
  const normalized = normalizeStructuredAttack(attack);
  const name = norm(normalized.name);
  if (name) return name;
  return [
    num(normalized.targetNumber, 0),
    num(normalized.damageDice, 0),
    norm(normalized.damageType),
    norm(normalized.skill),
    norm(normalized.attribute),
  ].join("|");
}

function uniqueBySignature(items, normalizer, seen) {
  const result = [];
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const normalized = normalizer(item, index);
    const key = attackSignature(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

function dedupeAttackSources(stats = {}) {
  const seen = new Set();
  const weapons = uniqueBySignature(stats.weapons, normalizeWeaponAttack, seen);
  const customAttacks = uniqueBySignature(stats.customAttacks, normalizeStructuredAttack, seen);
  const lines = String(stats.attacks || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const attacks = lines.filter((line) => {
    const parsed = parseAttackText(line)[0];
    if (!parsed) return true;
    const key = attackSignature(parsed);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("\n");

  return { ...stats, attacks, customAttacks, weapons };
}

function buffSummaryFor(stats = {}) {
  const ids = Array.isArray(stats.activeCombatBuffs) ? stats.activeCombatBuffs : [];
  if (!ids.length) return null;
  const summary = stats.combatBuffSummary && typeof stats.combatBuffSummary === "object"
    ? stats.combatBuffSummary
    : aggregateCombatBuffs(ids);
  const names = ids
    .map((id) => combatBuffById(id)?.name || String(id || ""))
    .filter(Boolean);
  return { ids, names, summary };
}

function effectParts(summary = {}, text) {
  const parts = [];
  if (num(summary.damageDiceBonus)) parts.push(`DMG +${num(summary.damageDiceBonus)} CD`);
  if (num(summary.meleeDamageDiceBonus)) parts.push(`MELEE +${num(summary.meleeDamageDiceBonus)} CD`);
  if (num(summary.defenseBonus)) parts.push(`DEF +${num(summary.defenseBonus)}`);
  if (num(summary.maxHpBonus)) parts.push(`HP +${num(summary.maxHpBonus)}`);
  const resistance = summary.resistance || {};
  if (num(resistance.physical)) parts.push(`PDR +${num(resistance.physical)}`);
  if (num(resistance.energy)) parts.push(`EDR +${num(resistance.energy)}`);
  if (num(resistance.radiation)) parts.push(`RAD +${num(resistance.radiation)}`);
  if (num(resistance.poison)) parts.push(`POISON +${num(resistance.poison)}`);
  if (num(summary.immediateAp)) parts.push(`AP +${num(summary.immediateAp)}`);
  if (num(summary.apPerTurn)) parts.push(`AP/T +${num(summary.apPerTurn)}`);
  if (num(summary.extraActionApReduction)) parts.push(`${text.extraAction} -${num(summary.extraActionApReduction)} AP`);
  if (num(summary.damageRerolls)) parts.push(`${text.reroll} ${num(summary.damageRerolls)}`);
  if (num(summary.hpRegenPerTurn)) parts.push(`${text.regen} +${num(summary.hpRegenPerTurn)} HP/T`);
  if (num(summary.spottingDifficultyBonus)) parts.push(`${text.spotting} +${num(summary.spottingDifficultyBonus)}`);
  if (Array.isArray(summary.attackEffects) && summary.attackEffects.length) parts.push(summary.attackEffects.join(", "));
  return parts;
}

function sameHosts(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return item.tokenId === other?.tokenId && item.compact === other?.compact && item.details === other?.details;
  });
}

export default function GmUnifiedTokenManagerV10({ session }) {
  const { i18n } = useTranslation();
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const rootRef = useRef(null);
  const [hosts, setHosts] = useState([]);

  const displaySession = useMemo(() => {
    if (!session?.tacticalScene) return session;
    const tokens = (Array.isArray(session.tacticalScene.tokens) ? session.tacticalScene.tokens : []).map((token) => {
      if (token?.kind === "player") return token;
      const stats = token?.stats && typeof token.stats === "object" ? token.stats : {};
      return { ...token, stats: dedupeAttackSources(stats) };
    });
    return {
      ...session,
      tacticalScene: { ...session.tacticalScene, tokens },
    };
  }, [session]);

  const npcTokens = useMemo(
    () => (Array.isArray(displaySession?.tacticalScene?.tokens) ? displaySession.tacticalScene.tokens : [])
      .filter((token) => token?.kind !== "player"),
    [displaySession?.tacticalScene?.tokens]
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let timer = 0;
    const sync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const cards = [...root.querySelectorAll(".gm-npc-v4-scene-card")];
        const next = cards.map((card, index) => ({
          tokenId: String(npcTokens[index]?.id || index),
          compact: card.querySelector(".gm-npc-v4-compact-main"),
          details: card.querySelector(".gm-npc-v4-full-card"),
        })).filter((item) => item.compact || item.details);
        setHosts((current) => sameHosts(current, next) ? current : next);
      }, 0);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [npcTokens]);

  const tokenById = useMemo(() => new Map(npcTokens.map((token) => [String(token.id), token])), [npcTokens]);

  return (
    <div className="gm-unified-token-manager-v10" ref={rootRef}>
      <GmUnifiedTokenManagerV9 session={displaySession} />

      {hosts.map((host) => {
        const token = tokenById.get(host.tokenId);
        const buffInfo = buffSummaryFor(token?.stats || {});
        if (!buffInfo) return null;
        const parts = effectParts(buffInfo.summary, text);
        return (
          <React.Fragment key={host.tokenId}>
            {host.compact ? createPortal(
              <div className="gm-token-v10-buff-strip">
                <strong>[ {text.buffs} ]</strong>
                <span>{buffInfo.names.join(" · ")}</span>
                {parts.length ? <span className="gm-token-v10-buff-effects">{parts.join(" · ")}</span> : null}
              </div>,
              host.compact
            ) : null}
            {host.details ? createPortal(
              <section className="gm-token-v10-buff-details">
                <strong>[ {text.buffs} ]</strong>
                <div className="gm-token-v10-buff-names">{buffInfo.names.join(" · ")}</div>
                {parts.length ? <div className="gm-token-v10-buff-effects">{parts.join(" · ")}</div> : null}
              </section>,
              host.details
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
