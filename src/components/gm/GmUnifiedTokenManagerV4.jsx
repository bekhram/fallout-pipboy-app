import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import DiceRollModal from "../dice/DiceRollModal.jsx";
import {
  CUSTOM_CREATURES_CHANGED_EVENT,
  blankCreature,
  deleteCustomCreature,
  loadCustomCreatures,
  saveCustomCreature,
} from "../../utils/gmCreatureLibrary.js";
import {
  NPC_RANKS,
  applyNpcRank,
  buildNpcAttackRollConfig,
  effectiveAttackProfile,
  normalizeStructuredAttack,
  normalizeWeaponAttack,
  parseAttackText,
  rankLabel,
} from "../../utils/npcCombat.js";
import {
  SPECIAL_CREATURE_FEATURES,
  legendaryAbilitiesFor,
  legendaryAbilityById,
  specialFeatureById,
} from "../../utils/npcFeaturePresets.js";
import { loadNpcWeaponDatabase } from "../../utils/npcWeaponDatabase.js";
import { findFreePlacement } from "../../utils/gmSessionModel.js";
import { gmMenuText, interpolateGmText } from "./gmMenuI18n.js";
import "./gmUnifiedTokenManager.css";
import "./gmNpcCombat.css";
import "./gmNpcCombatV4.css";

const MAX_AVATAR_BYTES = 500 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function txt(value) {
  return String(value ?? "").trim();
}
function tokenStats(token) {
  return token?.stats && typeof token.stats === "object" ? token.stats : {};
}
function tokenSize(token) {
  const value = Number(token?.stats?.footprint || token?.size);
  return value === 3 ? 3 : value === 2 ? 2 : 1;
}
function cardKind(value) {
  return String(value || "").toLowerCase() === "creature" ? "creature" : "npc";
}
function kindLabel(value, text) {
  return cardKind(value) === "creature"
    ? text?.creature || "CREATURE"
    : text?.npc || "NPC";
}
function localizedRank(value, text) {
  return (
    text?.ranks?.[String(value || "standard").toLowerCase()] || rankLabel(value)
  );
}
function primaryType(value, fallback = "Other") {
  return txt(value).split("•")[0].trim() || fallback;
}
function isBestiaryCreature(entry) {
  return (
    entry &&
    entry.statKind !== "rule" &&
    !["trap", "hazard", "obstacle"].includes(
      String(entry.category || "").toLowerCase()
    )
  );
}
function defaultSize(entry) {
  const source = `${entry?.abilities || ""} ${(entry?.tags || []).join(
    " "
  )}`.toLowerCase();
  return source.includes("big") || source.includes("massive") ? 2 : 1;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function bestiaryBase(entry) {
  const hp = Math.max(1, num(entry?.maxHp ?? entry?.hp ?? entry?.health, 1));
  const defense = Math.max(0, num(entry?.defense ?? entry?.def, 0));
  const xp = Math.max(0, num(entry?.xp, 0));
  const size = defaultSize(entry);
  return {
    cardKind: "creature",
    category: "creature",
    hp,
    maxHp: hp,
    baseMaxHp: hp,
    defense,
    baseDefense: defense,
    xp,
    baseXp: xp,
    size,
    baseSize: size,
    initiative: Math.max(0, num(entry?.initiative ?? entry?.init, 0)),
    level: Math.max(0, num(entry?.level, 0)),
    body: txt(entry?.body),
    mind: txt(entry?.mind),
    melee: txt(entry?.melee),
    guns: txt(entry?.guns),
    other: txt(entry?.other),
    attacks: txt(entry?.attacks ?? entry?.attack ?? entry?.weapons),
    customAttacks: [],
    weapons: [],
    abilities: txt(entry?.abilities),
    tactics: txt(entry?.tactics),
    loot: txt(entry?.loot),
    summary: txt(entry?.summary),
    drBlock: txt(entry?.drBlock ?? entry?.dr ?? entry?.resistance),
    creatureType: txt(entry?.creatureType),
    source: txt(entry?.source),
    special:
      entry?.special && typeof entry.special === "object"
        ? { ...entry.special }
        : null,
    skills: Array.isArray(entry?.skills) ? entry.skills : [],
  };
}

function customBase(item) {
  return {
    ...item,
    cardKind: cardKind(item?.cardKind),
    baseMaxHp: Math.max(1, num(item?.baseMaxHp ?? item?.maxHp ?? item?.hp, 1)),
    baseDefense: Math.max(0, num(item?.baseDefense ?? item?.defense, 0)),
    baseXp: Math.max(0, num(item?.baseXp ?? item?.xp, 0)),
    baseSize: Number(item?.baseSize ?? item?.size) === 2 ? 2 : 1,
    customCreatureId: String(item?.id || ""),
  };
}

function applyFeatureFields(base, options = {}) {
  const special = specialFeatureById(
    options.specialFeatureId ?? base.specialFeatureId
  );
  const legendary = legendaryAbilityById(
    options.legendaryAbilityId ?? base.legendaryAbilityId
  );
  return {
    ...base,
    specialFeatureId: special?.id || "",
    specialFeature: special ? `${special.name} — ${special.summary}` : "",
    legendaryAbilityId: legendary?.id || "",
    legendaryAbility: legendary
      ? `${legendary.name} — ${legendary.summary}`
      : "",
    legendaryRewardType: String(
      options.legendaryRewardType ?? base.legendaryRewardType ?? ""
    ),
    legendaryReward: String(
      options.legendaryReward ?? base.legendaryReward ?? ""
    ),
  };
}

function buildSpawnStats(base, options = {}) {
  const featured = applyFeatureFields(base, options);
  return {
    ...applyNpcRank(featured, { ...featured, ...options }),
    visibleToPlayers: false,
    controlledByClientId: "",
  };
}

function bestiaryEntryFor(token) {
  const id = String(token?.npcId || "");
  return (
    BESTIARY_ENTRIES.find((entry) => String(entry?.id || "") === id) || null
  );
}

function attacksFor(stats, linkedEntry) {
  const parsed = parseAttackText(stats.attacks || linkedEntry?.attacks || "");
  const custom = (
    Array.isArray(stats.customAttacks) ? stats.customAttacks : []
  ).map(normalizeStructuredAttack);
  const weapons = (Array.isArray(stats.weapons) ? stats.weapons : []).map(
    normalizeWeaponAttack
  );
  return [...parsed, ...custom, ...weapons];
}

function DetailLine({ label, value }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length))
    return null;
  const rendered = Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join(" · ")
    : typeof value === "object"
    ? Object.entries(value)
        .filter(([, item]) => item !== "" && item != null)
        .map(([key, item]) => `${key} ${item}`)
        .join(" · ")
    : String(value);
  if (!rendered) return null;
  return (
    <div className="gm-npc-detail-line">
      <strong>{label}</strong>
      <span>{rendered}</span>
    </div>
  );
}

function ModifierSummary({ stats }) {
  return (
    <div className="gm-npc-effective-stats">
      <span>
        HP{" "}
        <b>
          {num(stats.hp)}/{num(stats.maxHp)}
        </b>
      </span>
      <span>
        DEF <b>{num(stats.defense)}</b>
      </span>
      <span>
        XP <b>{num(stats.xp)}</b>
      </span>
      <span>
        DR <b>+{num(stats.resistanceBonus)}</b>
      </span>
      <span>
        DMG <b>×{num(stats.damageMultiplier, 1)}</b>
      </span>
      <span>
        SIZE{" "}
        <b>
          {num(stats.footprint, 1)}×{num(stats.footprint, 1)}
        </b>
      </span>
    </div>
  );
}

function AttackButtons({ attacks, stats, actorName, onRoll }) {
  if (!attacks.length) return null;
  return (
    <div className="gm-npc-v4-attack-strip">
      {attacks.map((attack, index) => {
        const profile = effectiveAttackProfile(attack, stats);
        return (
          <button
            type="button"
            className="gm-npc-v4-attack-chip"
            key={`${attack.id || attack.name}-${index}`}
            onClick={(event) => {
              event.stopPropagation();
              onRoll(attack, stats, actorName);
            }}
            title={`TN ${profile.targetNumber || "—"} · ${
              profile.d20Count
            }d20 · ${profile.damageDice} CD`}
          >
            {attack.name}
          </button>
        );
      })}
    </div>
  );
}

export default function GmUnifiedTokenManagerV4({ session }) {
  const { i18n } = useTranslation();
  const text = gmMenuText(i18n.resolvedLanguage || i18n.language);
  const scene = session?.tacticalScene || null;
  const players = useMemo(
    () =>
      (Array.isArray(session?.players) ? session.players : []).filter(
        (player) => player?.clientId
      ),
    [session?.players]
  );
  const tokens = Array.isArray(scene?.tokens) ? scene.tokens : [];
  const playerTokens = tokens.filter((token) => token.kind === "player");
  const npcTokens = tokens.filter((token) => token.kind !== "player");

  const [library, setLibrary] = useState([]);
  const [weaponsDb, setWeaponsDb] = useState([]);
  const [editorKind, setEditorKind] = useState("npc");
  const [draft, setDraft] = useState(() => blankCreature("npc"));
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [selectedCustomTokenId, setSelectedCustomTokenId] = useState("");
  const [selectedBestiaryId, setSelectedBestiaryId] = useState("");
  const [selectedWeaponId, setSelectedWeaponId] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [spawnRank, setSpawnRank] = useState("standard");
  const [spawnHorde, setSpawnHorde] = useState(false);
  const [spawnHordeSize, setSpawnHordeSize] = useState(2);
  const [spawnSpecialId, setSpawnSpecialId] = useState("");
  const [spawnLegendaryId, setSpawnLegendaryId] = useState("");
  const [spawnRewardType, setSpawnRewardType] = useState("weapon");
  const [spawnReward, setSpawnReward] = useState("");
  const [message, setMessage] = useState("");
  const [expandedTokenId, setExpandedTokenId] = useState("");
  const [diceOpen, setDiceOpen] = useState(false);
  const [rollConfig, setRollConfig] = useState(null);
  const [pendingAutoD6, setPendingAutoD6] = useState(null);
  const avatarRef = useRef(null);

  const bestiaryEntries = useMemo(
    () => BESTIARY_ENTRIES.filter(isBestiaryCreature),
    []
  );
  const typeOptions = useMemo(() => {
    const values = new Set();
    bestiaryEntries.forEach((entry) =>
      values.add(primaryType(entry.creatureType, primaryType(entry.category)))
    );
    library.forEach((entry) =>
      values.add(
        primaryType(entry.creatureType, kindLabel(entry.cardKind, text))
      )
    );
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [bestiaryEntries, library, text]);

  const filteredBestiary = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bestiaryEntries
      .filter((entry) => {
        const type = primaryType(
          entry?.creatureType,
          primaryType(entry?.category)
        );
        if (typeFilter !== "all" && type !== typeFilter) return false;
        if (!q) return true;
        return `${entry?.name || ""} ${entry?.creatureType || ""} ${
          entry?.category || ""
        } ${(entry?.tags || []).join(" ")}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 180);
  }, [bestiaryEntries, search, typeFilter]);

  const filteredCustom = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((entry) => {
      const type = primaryType(
        entry?.creatureType,
        kindLabel(entry.cardKind, text)
      );
      if (typeFilter !== "all" && type !== typeFilter) return false;
      if (!q) return true;
      return `${entry?.name || ""} ${entry?.creatureType || ""} ${
        entry?.cardKind || ""
      }`
        .toLowerCase()
        .includes(q);
    });
  }, [library, search, typeFilter, text]);

  const selectedBestiary =
    bestiaryEntries.find(
      (entry) => String(entry.id) === String(selectedBestiaryId)
    ) || null;
  const selectedCustom =
    library.find(
      (entry) => String(entry.id) === String(selectedCustomTokenId)
    ) || null;
  const legendaryOptions = useMemo(
    () => legendaryAbilitiesFor(editorKind),
    [editorKind]
  );

  useEffect(() => {
    let active = true;
    const reload = () =>
      loadCustomCreatures()
        .then((items) => active && setLibrary(items))
        .catch(() => active && setLibrary([]));
    reload();
    window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT, reload);
    };
  }, []);
  useEffect(() => {
    loadNpcWeaponDatabase()
      .then(setWeaponsDb)
      .catch(() => setWeaponsDb([]));
  }, []);
  useEffect(() => {
    if (
      expandedTokenId &&
      !npcTokens.some((token) => token.id === expandedTokenId)
    )
      setExpandedTokenId("");
  }, [expandedTokenId, npcTokens]);

  if (!session?.isActive || session?.mode !== "host" || !scene) return null;

  const playerTokenFor = (clientId) =>
    playerTokens.find(
      (token) => token.ownerClientId === clientId && token.assignedByGm
    ) || null;
  const patchDraft = (patch) =>
    setDraft((current) => ({ ...current, ...patch }));
  const patchSpecial = (key, value) =>
    setDraft((current) => ({
      ...current,
      special: { ...(current.special || {}), [key]: value },
    }));

  const resetDraft = (kind = editorKind) => {
    setEditorKind(cardKind(kind));
    setSelectedLibraryId("");
    setDraft(blankCreature(kind));
    setSelectedWeaponId("");
    setMessage("");
  };
  const chooseLibrary = (id) => {
    setSelectedLibraryId(id);
    const item = library.find((entry) => entry.id === id);
    if (!item) return resetDraft(editorKind);
    const kind = cardKind(item.cardKind);
    setEditorKind(kind);
    setDraft({
      ...item,
      special: { ...(item.special || {}) },
      customAttacks: [...(item.customAttacks || [])],
      weapons: [...(item.weapons || [])],
    });
    setMessage("");
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.has(String(file.type || "").toLowerCase()))
      return setMessage(text.imageType);
    if (file.size > MAX_AVATAR_BYTES) return setMessage(text.imageSize);
    try {
      patchDraft({ avatar: await readAsDataUrl(file) });
      setMessage("");
    } catch {
      setMessage(text.imageRead);
    }
  };

  const setDraftRank = (patch) => {
    setDraft((current) => {
      const nextBase = {
        ...current,
        baseMaxHp: Math.max(
          1,
          num(current.baseMaxHp ?? current.maxHp ?? current.hp, 1)
        ),
        baseDefense: Math.max(
          0,
          num(current.baseDefense ?? current.defense, 0)
        ),
        baseXp: Math.max(0, num(current.baseXp ?? current.xp, 0)),
        baseSize: Number(current.baseSize ?? current.size) === 2 ? 2 : 1,
        ...patch,
      };
      const featured = applyFeatureFields(nextBase, nextBase);
      const effective = applyNpcRank(featured, featured);
      return { ...featured, ...effective, size: effective.footprint };
    });
  };

  const saveCard = async () => {
    if (!String(draft.name || "").trim())
      return setMessage(
        interpolateGmText(text.nameRequired, {
          kind: kindLabel(editorKind, text),
        })
      );
    const saved = await saveCustomCreature({
      ...draft,
      cardKind: editorKind,
      category: editorKind,
    });
    setLibrary(await loadCustomCreatures());
    setSelectedLibraryId(saved.id);
    setSelectedCustomTokenId(saved.id);
    setDraft(saved);
    setMessage(
      interpolateGmText(text.cardSaved, { kind: kindLabel(editorKind, text) })
    );
  };
  const removeCard = async () => {
    if (!selectedLibraryId) return;
    setLibrary(await deleteCustomCreature(selectedLibraryId));
    resetDraft(editorKind);
    setSelectedCustomTokenId("");
    setMessage(text.cardRemoved);
  };

  const addCustomAttack = () => {
    const targetNumber =
      editorKind === "creature"
        ? Math.max(0, num(draft.body, 0) + num(draft.melee, 0))
        : 10;
    patchDraft({
      customAttacks: [
        ...(draft.customAttacks || []),
        normalizeStructuredAttack({
          name: text.newAttack,
          attribute: editorKind === "creature" ? "BODY" : "SPECIAL",
          skill: text.combat,
          targetNumber,
          damageDice: 4,
        }),
      ],
    });
  };
  const patchCustomAttack = (index, patch) =>
    patchDraft({
      customAttacks: (draft.customAttacks || []).map((attack, i) =>
        i === index ? { ...attack, ...patch } : attack
      ),
    });
  const removeCustomAttack = (index) =>
    patchDraft({
      customAttacks: (draft.customAttacks || []).filter((_, i) => i !== index),
    });

  const addWeapon = () => {
    const weapon = weaponsDb.find((item) => item.id === selectedWeaponId);
    if (!weapon || editorKind !== "npc") return;
    const attack = normalizeWeaponAttack({
      ...weapon,
      weaponId: weapon.id,
      targetNumber: 10,
      damageDice: weapon.damage,
      attribute: "SPECIAL",
      skill: weapon.weaponType || text.weapon,
    });
    patchDraft({ weapons: [...(draft.weapons || []), attack] });
    setSelectedWeaponId("");
  };
  const patchWeapon = (index, patch) =>
    patchDraft({
      weapons: (draft.weapons || []).map((weapon, i) =>
        i === index ? { ...weapon, ...patch } : weapon
      ),
    });
  const removeWeapon = (index) =>
    patchDraft({
      weapons: (draft.weapons || []).filter((_, i) => i !== index),
    });

  const openAttackRoll = (attack, stats, actorName) => {
    setRollConfig(buildNpcAttackRollConfig(attack, stats, actorName));
    setPendingAutoD6(null);
    setDiceOpen(true);
  };
  const createToken = async ({ name, npcId, avatar = "", stats }) => {
    const footprint = Math.max(1, Math.min(3, num(stats?.footprint, 1)));
    const placement = findFreePlacement(scene, footprint, []);
    if (!placement)
      return { ok: false, error: `NO_FREE_${footprint}X${footprint}_AREA` };
    return session.createNpcToken?.({
      name,
      size: footprint,
      npcId,
      avatar,
      stats,
      x: placement.x,
      y: placement.y,
    });
  };

  const createBestiaryToken = async () => {
    if (!selectedBestiary) return setMessage(text.chooseBestiary);
    const stats = buildSpawnStats(bestiaryBase(selectedBestiary), {
      rank: spawnRank,
      hordeEnabled: spawnHorde,
      hordeSize: spawnHordeSize,
      specialFeatureId: spawnSpecialId,
      legendaryAbilityId: spawnLegendaryId,
      legendaryRewardType: spawnRewardType,
      legendaryReward: spawnReward,
    });
    const response = await createToken({
      name: selectedBestiary.name,
      npcId: selectedBestiary.id,
      stats,
    });
    setMessage(
      response?.ok
        ? `${interpolateGmText(text.addedHidden, {
            name: selectedBestiary.name,
          })} · ${localizedRank(spawnRank, text)}${
            spawnHorde ? ` · ${text.horde} ${spawnHordeSize}` : ""
          }`
        : `${text.addFailed} [${response?.error || "ERROR"}]`
    );
  };
  const createCustomToken = async (item) => {
    if (!item) return setMessage(text.chooseCustom);
    const base = customBase(item);
    const stats = buildSpawnStats(base, base);
    const response = await createToken({
      name: item.name,
      npcId: item.id,
      avatar: item.avatar || "",
      stats,
    });
    setMessage(
      response?.ok
        ? `${interpolateGmText(text.addedHidden, {
            name: item.name,
          })} · ${kindLabel(item.cardKind, text)} · ${localizedRank(
            stats.rank,
            text
          )}${stats.hordeEnabled ? ` · ${text.horde} ${stats.hordeSize}` : ""}`
        : `${text.addFailed} [${response?.error || "ERROR"}]`
    );
  };

  const updateNpcStats = (token, patch) =>
    session.updateToken?.(token.id, {
      stats: { ...tokenStats(token), ...patch },
    });
  const updateHordeMember = (token, index, delta) => {
    const stats = tokenStats(token);
    const max = Math.max(1, num(stats.memberMaxHp, 1));
    const hp = [...(stats.hordeHp || [])];
    hp[index] = Math.max(0, Math.min(max, num(hp[index], max) + delta));
    updateNpcStats(token, {
      hordeHp: hp,
      hordeLiving: hp.filter((value) => value > 0).length,
      hp: hp.reduce((sum, value) => sum + value, 0),
    });
  };

  const draftEffective = applyNpcRank(
    applyFeatureFields(customBase(draft), draft),
    draft
  );
  const selectedPreviewBase = selectedBestiary
    ? bestiaryBase(selectedBestiary)
    : selectedCustom
    ? customBase(selectedCustom)
    : null;
  const selectedPreview = selectedPreviewBase
    ? buildSpawnStats(
        selectedPreviewBase,
        selectedBestiary
          ? {
              rank: spawnRank,
              hordeEnabled: spawnHorde,
              hordeSize: spawnHordeSize,
              specialFeatureId: spawnSpecialId,
              legendaryAbilityId: spawnLegendaryId,
              legendaryRewardType: spawnRewardType,
              legendaryReward: spawnReward,
            }
          : selectedPreviewBase
      )
    : null;

  return (
    <>
      <section className="pip-panel gm-unified-token-manager gm-unified-token-manager-v4">
        <header className="gm-unified-token-manager__head">
          <div>
            <div className="pip-bootline">{text.tacticalControl}</div>
            <h2>[ {text.tokensTitle} ]</h2>
          </div>
          <span>
            {tokens.length} {text.onScene}
          </span>
        </header>

        <section className="gm-token-section">
          <h3>{text.players}</h3>
          <div className="gm-player-token-grid">
            {players.length ? (
              players.map((player) => {
                const token = playerTokenFor(player.clientId);
                const name =
                  player?.character?.name || player?.name || text.player;
                return (
                  <article
                    key={player.clientId}
                    className="gm-token-control-card"
                  >
                    <div className="gm-token-control-card__identity">
                      <span
                        className={`session-status-dot ${
                          player.online === false
                            ? "is-disconnected"
                            : "is-online"
                        }`}
                      />
                      <strong>{name}</strong>
                      <small>
                        {token
                          ? `${text.token} ${tokenSize(token)}×${tokenSize(
                              token
                            )}`
                          : text.noToken}
                      </small>
                    </div>
                    <div className="gm-token-control-card__actions">
                      {!token ? (
                        <>
                          <button
                            type="button"
                            className="pip-btn"
                            disabled={!session.liveSceneId}
                            onClick={() =>
                              session.createAssignedPlayerToken?.({
                                targetClientId: player.clientId,
                                name,
                                size: 1,
                              })
                            }
                          >
                            {text.assign} 1×1
                          </button>
                          <button
                            type="button"
                            className="pip-btn"
                            disabled={!session.liveSceneId}
                            onClick={() =>
                              session.createAssignedPlayerToken?.({
                                targetClientId: player.clientId,
                                name,
                                size: 2,
                              })
                            }
                          >
                            {text.assign} 2×2
                          </button>
                        </>
                      ) : (
                        <>
                          <select
                            className="pip-input"
                            value={tokenSize(token)}
                            onChange={(event) =>
                              session.updateAssignedPlayerToken?.(
                                player.clientId,
                                {
                                  size:
                                    Number(event.target.value) === 2 ? 2 : 1,
                                }
                              )
                            }
                          >
                            <option value="1">1×1</option>
                            <option value="2">2×2</option>
                          </select>
                          <button
                            type="button"
                            className="pip-btn"
                            onClick={() =>
                              session.removeAssignedPlayerToken?.(
                                player.clientId
                              )
                            }
                          >
                            {text.remove}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="pip-logbox">{text.noPlayers}</div>
            )}
          </div>
        </section>

        <section className="gm-token-section gm-bestiary-picker">
          <div className="gm-token-section__head">
            <h3>{text.addToken}</h3>
            <span>
              {filteredBestiary.length} {text.bestiary} ·{" "}
              {filteredCustom.length} {text.custom}
            </span>
          </div>
          <div className="gm-bestiary-filter-row">
            <input
              className="pip-input"
              value={search}
              placeholder={text.search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="pip-input"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">{text.allTypes}</option>
              {typeOptions.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="gm-bestiary-picker__controls">
            <select
              className="pip-input"
              value={selectedBestiaryId}
              onChange={(event) => {
                setSelectedBestiaryId(event.target.value);
                setSelectedCustomTokenId("");
              }}
            >
              <option value="">— {text.bestiaryCreature} —</option>
              {filteredBestiary.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} ·{" "}
                  {primaryType(entry.creatureType, entry.category)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pip-btn is-primary"
              disabled={!selectedBestiary}
              onClick={createBestiaryToken}
            >
              {text.addBestiary}
            </button>
            <select
              className="pip-input"
              value={selectedCustomTokenId}
              onChange={(event) => {
                setSelectedCustomTokenId(event.target.value);
                setSelectedBestiaryId("");
              }}
            >
              <option value="">— {text.savedCard} —</option>
              {filteredCustom.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {kindLabel(entry.cardKind, text)} · {entry.name} ·{" "}
                  {localizedRank(entry.rank, text)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pip-btn is-primary"
              disabled={!selectedCustom}
              onClick={() => createCustomToken(selectedCustom)}
            >
              {text.addCustom}
            </button>
          </div>
          {selectedBestiary ? (
            <div className="gm-npc-spawn-modifiers gm-npc-v4-modifiers">
              <label>
                {text.rank}
                <select
                  className="pip-input"
                  value={spawnRank}
                  onChange={(event) => setSpawnRank(event.target.value)}
                >
                  {NPC_RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      {localizedRank(rank, text)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="gm-horde-toggle">
                <input
                  type="checkbox"
                  checked={spawnHorde}
                  onChange={(event) => setSpawnHorde(event.target.checked)}
                />{" "}
                {text.horde}
              </label>
              {spawnHorde ? (
                <label>
                  {text.group}
                  <select
                    className="pip-input"
                    value={spawnHordeSize}
                    onChange={(event) =>
                      setSpawnHordeSize(Number(event.target.value))
                    }
                  >
                    {[2, 3, 4, 5].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {spawnRank === "special" ? (
                <label className="is-wide">
                  {text.specialFeature}
                  <select
                    className="pip-input"
                    value={spawnSpecialId}
                    onChange={(event) => setSpawnSpecialId(event.target.value)}
                  >
                    <option value="">— {text.selectFeature} —</option>
                    {SPECIAL_CREATURE_FEATURES.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {spawnRank === "legendary" ? (
                <>
                  <label className="is-wide">
                    {text.legendaryAbility}
                    <select
                      className="pip-input"
                      value={spawnLegendaryId}
                      onChange={(event) =>
                        setSpawnLegendaryId(event.target.value)
                      }
                    >
                      <option value="">— {text.selectAbility} —</option>
                      {legendaryAbilitiesFor("creature").map((ability) => (
                        <option key={ability.id} value={ability.id}>
                          {ability.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {text.rewardType}
                    <select
                      className="pip-input"
                      value={spawnRewardType}
                      onChange={(event) =>
                        setSpawnRewardType(event.target.value)
                      }
                    >
                      <option value="weapon">{text.legendaryWeapon}</option>
                      <option value="armor">{text.legendaryArmor}</option>
                    </select>
                  </label>
                  <label className="is-wide">
                    {text.reward}
                    <input
                      className="pip-input"
                      value={spawnReward}
                      placeholder={text.rewardPlaceholder}
                      onChange={(event) => setSpawnReward(event.target.value)}
                    />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}
          {selectedPreview ? (
            <div className="gm-bestiary-preview">
              <div>
                <strong>
                  {selectedBestiary?.name || selectedCustom?.name}
                </strong>
                <span>
                  {selectedBestiary
                    ? text.bestiaryCreature
                    : kindLabel(selectedCustom?.cardKind, text)}{" "}
                  · {localizedRank(selectedPreview.rank, text)}
                  {selectedPreview.hordeEnabled
                    ? ` · ${text.horde} ${selectedPreview.hordeSize}`
                    : ""}
                </span>
              </div>
              <ModifierSummary stats={selectedPreview} />
            </div>
          ) : null}
        </section>

        <section className="gm-token-section gm-custom-npc-card gm-npc-v4-editor">
          <div className="gm-token-section__head">
            <h3>{text.creationCard}</h3>
            <span>{text.npcOrCreature}</span>
          </div>
          <div className="gm-npc-v4-kind-tabs">
            <button
              type="button"
              className={`pip-btn${editorKind === "npc" ? " is-primary" : ""}`}
              onClick={() => resetDraft("npc")}
            >
              {text.customNpc}
            </button>
            <button
              type="button"
              className={`pip-btn${
                editorKind === "creature" ? " is-primary" : ""
              }`}
              onClick={() => resetDraft("creature")}
            >
              {text.customCreature}
            </button>
          </div>
          <div className="gm-creature-library-row">
            <select
              className="pip-input"
              value={selectedLibraryId}
              onChange={(event) => chooseLibrary(event.target.value)}
            >
              <option value="">
                — {text.new} {kindLabel(editorKind, text)} —
              </option>
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  {kindLabel(item.cardKind, text)} · {item.name} ·{" "}
                  {localizedRank(item.rank, text)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pip-btn"
              onClick={() => resetDraft(editorKind)}
            >
              {text.new}
            </button>
            {selectedLibraryId ? (
              <button type="button" className="pip-btn" onClick={removeCard}>
                {text.deleteCard}
              </button>
            ) : null}
          </div>

          <div className="gm-npc-card-editor">
            <div className="gm-npc-card-editor__identity">
              <button
                type="button"
                className="gm-creature-avatar"
                onClick={() => avatarRef.current?.click()}
              >
                {draft.avatar ? (
                  <img src={draft.avatar} alt="" />
                ) : (
                  <span>{editorKind === "creature" ? "CR" : "NPC"}</span>
                )}
              </button>
              <input
                ref={avatarRef}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  uploadAvatar(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <label className="is-wide">
                <span>{text.name}</span>
                <input
                  className="pip-input"
                  value={draft.name || ""}
                  onChange={(event) => patchDraft({ name: event.target.value })}
                />
              </label>
              <label className="is-wide">
                <span>
                  {editorKind === "creature" ? text.creatureType : text.npcType}
                </span>
                <input
                  className="pip-input"
                  value={draft.creatureType || ""}
                  onChange={(event) =>
                    patchDraft({ creatureType: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{text.baseSize}</span>
                <select
                  className="pip-input"
                  value={draft.baseSize || 1}
                  onChange={(event) =>
                    setDraftRank({
                      baseSize: Number(event.target.value),
                      size: Number(event.target.value),
                    })
                  }
                >
                  <option value="1">1×1</option>
                  <option value="2">2×2 {text.big}</option>
                </select>
              </label>
              <label>
                <span>LVL</span>
                <input
                  className="pip-input"
                  type="number"
                  min="0"
                  value={draft.level ?? 0}
                  onChange={(event) =>
                    patchDraft({ level: Number(event.target.value) })
                  }
                />
              </label>
            </div>

            <div className="gm-npc-card-editor__section">
              <h4>{text.modifier}</h4>
              <div className="gm-npc-rank-grid">
                <label>
                  {text.rank}
                  <select
                    className="pip-input"
                    value={draft.rank || "standard"}
                    onChange={(event) =>
                      setDraftRank({ rank: event.target.value })
                    }
                  >
                    {NPC_RANKS.map((rank) => (
                      <option value={rank} key={rank}>
                        {localizedRank(rank, text)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="gm-horde-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.hordeEnabled)}
                    onChange={(event) =>
                      setDraftRank({ hordeEnabled: event.target.checked })
                    }
                  />{" "}
                  {text.horde}
                </label>
                {draft.hordeEnabled ? (
                  <label>
                    {text.groupSize}
                    <select
                      className="pip-input"
                      value={draft.hordeSize || 2}
                      onChange={(event) =>
                        setDraftRank({ hordeSize: Number(event.target.value) })
                      }
                    >
                      {[2, 3, 4, 5].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {draft.rank === "special" ? (
                  <label className="is-wide">
                    {text.specialFeature}
                    <select
                      className="pip-input"
                      value={draft.specialFeatureId || ""}
                      onChange={(event) =>
                        setDraftRank({ specialFeatureId: event.target.value })
                      }
                    >
                      <option value="">— {text.selectFeature} —</option>
                      {SPECIAL_CREATURE_FEATURES.map((feature) => (
                        <option key={feature.id} value={feature.id}>
                          {feature.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {draft.rank === "legendary" ? (
                  <>
                    <label className="is-wide">
                      {text.legendaryAbility}
                      <select
                        className="pip-input"
                        value={draft.legendaryAbilityId || ""}
                        onChange={(event) =>
                          setDraftRank({
                            legendaryAbilityId: event.target.value,
                          })
                        }
                      >
                        <option value="">— {text.selectAbility} —</option>
                        {legendaryOptions.map((ability) => (
                          <option key={ability.id} value={ability.id}>
                            {ability.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {text.rewardType}
                      <select
                        className="pip-input"
                        value={draft.legendaryRewardType || "weapon"}
                        onChange={(event) =>
                          patchDraft({
                            legendaryRewardType: event.target.value,
                          })
                        }
                      >
                        <option value="weapon">{text.legendaryWeapon}</option>
                        <option value="armor">{text.legendaryArmor}</option>
                      </select>
                    </label>
                    <label className="is-wide">
                      {text.reward}
                      <input
                        className="pip-input"
                        value={draft.legendaryReward || ""}
                        placeholder={text.rewardPlaceholder}
                        onChange={(event) =>
                          patchDraft({ legendaryReward: event.target.value })
                        }
                      />
                    </label>
                  </>
                ) : null}
              </div>
              {draft.rank === "special" &&
              specialFeatureById(draft.specialFeatureId) ? (
                <div className="gm-npc-v4-preset-note">
                  {specialFeatureById(draft.specialFeatureId).summary}
                </div>
              ) : null}
              {draft.rank === "legendary" &&
              legendaryAbilityById(draft.legendaryAbilityId) ? (
                <div className="gm-npc-v4-preset-note">
                  {legendaryAbilityById(draft.legendaryAbilityId).summary}
                </div>
              ) : null}
              <ModifierSummary stats={draftEffective} />
            </div>

            <div className="gm-npc-card-editor__section">
              <h4>{text.baseStats}</h4>
              <div className="gm-npc-card-editor__stats">
                <label>
                  <span>BASE HP</span>
                  <input
                    className="pip-input"
                    type="number"
                    min="1"
                    value={draft.baseMaxHp ?? 10}
                    onChange={(event) =>
                      setDraftRank({
                        baseMaxHp: Number(event.target.value),
                        maxHp: Number(event.target.value),
                        hp: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>BASE DEF</span>
                  <input
                    className="pip-input"
                    type="number"
                    min="0"
                    value={draft.baseDefense ?? 1}
                    onChange={(event) =>
                      setDraftRank({
                        baseDefense: Number(event.target.value),
                        defense: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>BASE XP</span>
                  <input
                    className="pip-input"
                    type="number"
                    min="0"
                    value={draft.baseXp ?? 0}
                    onChange={(event) =>
                      setDraftRank({
                        baseXp: Number(event.target.value),
                        xp: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>INIT</span>
                  <input
                    className="pip-input"
                    type="number"
                    min="0"
                    value={draft.initiative ?? 0}
                    onChange={(event) =>
                      patchDraft({ initiative: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
            </div>

            {editorKind === "creature" ? (
              <div className="gm-npc-card-editor__section">
                <h4>{text.creatureStats}</h4>
                <div className="gm-npc-card-editor__stats gm-npc-v4-creature-stats">
                  {["body", "mind", "melee", "guns", "other"].map((key) => (
                    <label key={key}>
                      <span>{text.creatureStatLabels[key]}</span>
                      <input
                        className="pip-input"
                        type="number"
                        value={draft[key] ?? ""}
                        onChange={(event) =>
                          patchDraft({ [key]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="gm-npc-card-editor__section">
                <h4>NPC S.P.E.C.I.A.L.</h4>
                <div className="gm-npc-card-editor__special">
                  {SPECIAL_KEYS.map((key) => (
                    <label key={key}>
                      <span>{key}</span>
                      <input
                        className="pip-input"
                        type="number"
                        min="0"
                        max="20"
                        value={draft.special?.[key] ?? ""}
                        onChange={(event) =>
                          patchSpecial(key, event.target.value)
                        }
                      />
                    </label>
                  ))}
                </div>
                <label className="gm-npc-v4-skills">
                  <span>{text.skillsTags}</span>
                  <textarea
                    className="pip-input"
                    value={draft.skills || ""}
                    onChange={(event) =>
                      patchDraft({ skills: event.target.value })
                    }
                  />
                </label>
              </div>
            )}

            <div className="gm-npc-card-editor__section">
              <div className="gm-token-section__head">
                <h4>{text.customAttacks}</h4>
                <button
                  type="button"
                  className="pip-btn"
                  onClick={addCustomAttack}
                >
                  + {text.customAttack}
                </button>
              </div>
              <div className="gm-npc-attack-editor-list">
                {(draft.customAttacks || []).map((attack, index) => (
                  <div
                    className="gm-npc-attack-editor"
                    key={attack.id || index}
                  >
                    <input
                      className="pip-input"
                      value={attack.name || ""}
                      placeholder={text.attackName}
                      onChange={(event) =>
                        patchCustomAttack(index, { name: event.target.value })
                      }
                    />
                    <label>
                      TN
                      <input
                        className="pip-input"
                        type="number"
                        min="0"
                        max="20"
                        value={attack.targetNumber ?? 0}
                        onChange={(event) =>
                          patchCustomAttack(index, {
                            targetNumber: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      CD
                      <input
                        className="pip-input"
                        type="number"
                        min="0"
                        value={attack.damageDice ?? 0}
                        onChange={(event) =>
                          patchCustomAttack(index, {
                            damageDice: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <input
                      className="pip-input"
                      value={attack.skill || text.combat}
                      placeholder={text.skill}
                      onChange={(event) =>
                        patchCustomAttack(index, { skill: event.target.value })
                      }
                    />
                    <input
                      className="pip-input"
                      value={attack.damageType || text.physical}
                      placeholder={text.damageType}
                      onChange={(event) =>
                        patchCustomAttack(index, {
                          damageType: event.target.value,
                        })
                      }
                    />
                    <input
                      className="pip-input"
                      value={attack.effects || ""}
                      placeholder={text.effects}
                      onChange={(event) =>
                        patchCustomAttack(index, {
                          effects: event.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="pip-btn"
                      onClick={() =>
                        openAttackRoll(
                          attack,
                          draftEffective,
                          draft.name || kindLabel(editorKind, text)
                        )
                      }
                    >
                      {text.roll}
                    </button>
                    <button
                      type="button"
                      className="pip-btn"
                      onClick={() => removeCustomAttack(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {editorKind === "npc" ? (
              <div className="gm-npc-card-editor__section">
                <div className="gm-token-section__head">
                  <h4>{text.weaponsDb}</h4>
                  <span>
                    {weaponsDb.length} {text.available}
                  </span>
                </div>
                <div className="gm-npc-v4-weapon-picker">
                  <select
                    className="pip-input"
                    value={selectedWeaponId}
                    onChange={(event) =>
                      setSelectedWeaponId(event.target.value)
                    }
                  >
                    <option value="">— {text.selectWeapon} —</option>
                    {weaponsDb.map((weapon) => (
                      <option key={weapon.id} value={weapon.id}>
                        {weapon.name} · {weapon.damage} CD · {weapon.damageType}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="pip-btn is-primary"
                    disabled={!selectedWeaponId}
                    onClick={addWeapon}
                  >
                    + {text.addWeapon}
                  </button>
                </div>
                <div className="gm-npc-v4-weapons">
                  {(draft.weapons || []).map((weapon, index) => (
                    <div
                      className="gm-npc-v4-weapon-row"
                      key={`${weapon.id}-${index}`}
                    >
                      <strong>{weapon.name}</strong>
                      <span>
                        {weapon.damageDice} CD · {weapon.damageType}
                        {weapon.effects ? ` · ${weapon.effects}` : ""}
                      </span>
                      <label>
                        TN
                        <input
                          className="pip-input"
                          type="number"
                          min="0"
                          max="20"
                          value={weapon.targetNumber ?? 10}
                          onChange={(event) =>
                            patchWeapon(index, {
                              targetNumber: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="pip-btn"
                        onClick={() =>
                          openAttackRoll(
                            weapon,
                            draftEffective,
                            draft.name || text.npc
                          )
                        }
                      >
                        {text.roll}
                      </button>
                      <button
                        type="button"
                        className="pip-btn"
                        onClick={() => removeWeapon(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="gm-npc-card-editor__section">
              <h4>{text.fullDetails}</h4>
              <div className="gm-npc-card-editor__text-grid">
                {editorKind === "creature" ? (
                  <label>
                    <span>{text.skills}</span>
                    <textarea
                      className="pip-input"
                      value={draft.skills || ""}
                      onChange={(event) =>
                        patchDraft({ skills: event.target.value })
                      }
                    />
                  </label>
                ) : null}
                <label>
                  <span>{text.textAttacks}</span>
                  <textarea
                    className="pip-input"
                    value={draft.attacks || ""}
                    onChange={(event) =>
                      patchDraft({ attacks: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{text.abilities}</span>
                  <textarea
                    className="pip-input"
                    value={draft.abilities || ""}
                    onChange={(event) =>
                      patchDraft({ abilities: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{text.resistance}</span>
                  <textarea
                    className="pip-input"
                    value={draft.drBlock || ""}
                    onChange={(event) =>
                      patchDraft({ drBlock: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{text.tactics}</span>
                  <textarea
                    className="pip-input"
                    value={draft.tactics || ""}
                    onChange={(event) =>
                      patchDraft({ tactics: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{text.loot}</span>
                  <textarea
                    className="pip-input"
                    value={draft.loot || ""}
                    onChange={(event) =>
                      patchDraft({ loot: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{text.summary}</span>
                  <textarea
                    className="pip-input"
                    value={draft.summary || ""}
                    onChange={(event) =>
                      patchDraft({ summary: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{text.notes}</span>
                  <textarea
                    className="pip-input"
                    value={draft.notes || ""}
                    onChange={(event) =>
                      patchDraft({ notes: event.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="gm-creature-editor-actions">
            <button
              type="button"
              className="pip-btn"
              onClick={() => avatarRef.current?.click()}
            >
              {text.avatar}
            </button>
            <button type="button" className="pip-btn" onClick={saveCard}>
              {interpolateGmText(text.saveCard, {
                kind: kindLabel(editorKind, text),
              })}
            </button>
            <button
              type="button"
              className="pip-btn is-primary"
              onClick={() =>
                createCustomToken({ ...draft, cardKind: editorKind })
              }
            >
              {text.addHidden}
            </button>
          </div>
          {message ? (
            <div className="gm-token-manager-message">{message}</div>
          ) : null}
        </section>

        <section className="gm-token-section">
          <div className="gm-token-section__head">
            <h3>{text.sceneCreatures}</h3>
            <span>{text.cardHint}</span>
          </div>
          <div className="gm-npc-token-list">
            {npcTokens.length ? (
              npcTokens.map((token) => {
                const stats = tokenStats(token);
                const linked = bestiaryEntryFor(token);
                const visible = stats.visibleToPlayers !== false;
                const controller = String(stats.controlledByClientId || "");
                const hp = Math.max(0, num(stats.hp));
                const maxHp = Math.max(0, num(stats.maxHp, hp));
                const expanded = expandedTokenId === token.id;
                const attacks = attacksFor(stats, linked);
                return (
                  <article
                    className={`gm-npc-token-row gm-npc-v4-scene-card${
                      visible ? " is-active" : " is-hidden"
                    }${expanded ? " is-expanded" : ""}`}
                    key={token.id}
                  >
                    <div
                      className="gm-npc-v4-compact-row"
                      onClick={() =>
                        setExpandedTokenId(expanded ? "" : token.id)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ")
                          setExpandedTokenId(expanded ? "" : token.id);
                      }}
                    >
                      <div className="gm-npc-token-row__avatar">
                        {token.avatar ? (
                          <img src={token.avatar} alt="" draggable={false} />
                        ) : (
                          <span>{String(token.name || "N").slice(0, 1)}</span>
                        )}
                      </div>
                      <div className="gm-npc-v4-compact-main">
                        <div className="gm-npc-v4-compact-title">
                          <strong>{token.name}</strong>
                          <small>
                            {kindLabel(stats.cardKind, text)} ·{" "}
                            {localizedRank(stats.rank, text)}
                            {stats.hordeEnabled
                              ? ` · ${text.horde} ${stats.hordeLiving}/${stats.hordeSize}`
                              : ""}{" "}
                            · {visible ? text.visible : text.hidden}
                          </small>
                        </div>
                        <div className="gm-npc-token-row__stats">
                          <span>
                            HP {hp}/{maxHp}
                          </span>
                          <span>DEF {num(stats.defense)}</span>
                          <span>INIT {num(stats.initiative)}</span>
                          <span>
                            {tokenSize(token)}×{tokenSize(token)}
                          </span>
                        </div>
                        <AttackButtons
                          attacks={attacks}
                          stats={stats}
                          actorName={token.name}
                          onRoll={openAttackRoll}
                        />
                      </div>
                      <span className="gm-npc-token-row__chevron">
                        {expanded ? "▲" : "▼"}
                      </span>
                    </div>
                    {expanded ? (
                      <div className="gm-npc-token-details gm-npc-v4-full-card">
                        <div className="gm-npc-token-row__actions">
                          <button
                            type="button"
                            className={`pip-btn${visible ? "" : " is-primary"}`}
                            onClick={() =>
                              session.updateNpcVisibility?.(token.id, !visible)
                            }
                          >
                            {visible ? text.hide : text.activate}
                          </button>
                          <select
                            className="pip-input"
                            value={controller}
                            onChange={(event) =>
                              session.updateNpcController?.(
                                token.id,
                                event.target.value
                              )
                            }
                          >
                            <option value="">{text.gmControl}</option>
                            {players.map((player) => (
                              <option
                                key={player.clientId}
                                value={player.clientId}
                              >
                                {player?.character?.name ||
                                  player?.name ||
                                  text.player}
                              </option>
                            ))}
                          </select>
                          {!stats.hordeEnabled ? (
                            <>
                              <button
                                type="button"
                                className="pip-btn"
                                onClick={() =>
                                  updateNpcStats(token, {
                                    hp: Math.max(0, hp - 1),
                                  })
                                }
                              >
                                -HP
                              </button>
                              <button
                                type="button"
                                className="pip-btn"
                                onClick={() =>
                                  updateNpcStats(token, {
                                    hp: Math.min(maxHp, hp + 1),
                                  })
                                }
                              >
                                +HP
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className="pip-btn"
                            onClick={() => session.deleteToken?.(token.id)}
                          >
                            {text.remove}
                          </button>
                        </div>
                        <div className="gm-npc-token-details__quick">
                          <span>
                            HP{" "}
                            <b>
                              {hp}/{maxHp}
                            </b>
                          </span>
                          <span>
                            DEF <b>{num(stats.defense)}</b>
                          </span>
                          <span>
                            INIT <b>{num(stats.initiative)}</b>
                          </span>
                          <span>
                            LVL <b>{num(stats.level)}</b>
                          </span>
                          <span>
                            XP <b>{num(stats.xp)}</b>
                          </span>
                          <span>
                            {text.rank} <b>{localizedRank(stats.rank, text)}</b>
                          </span>
                          <span>
                            {text.drBonus} <b>+{num(stats.resistanceBonus)}</b>
                          </span>
                          <span>
                            DMG <b>×{num(stats.damageMultiplier, 1)}</b>
                          </span>
                        </div>
                        {stats.hordeEnabled ? (
                          <div className="gm-horde-members">
                            <strong>{text.hordeMembers}</strong>
                            {(stats.hordeHp || []).map((memberHp, index) => (
                              <div
                                key={index}
                                className={`gm-horde-member${
                                  memberHp <= 0 ? " is-down" : ""
                                }`}
                              >
                                <span>#{index + 1}</span>
                                <b>
                                  {memberHp}/{stats.memberMaxHp}
                                </b>
                                <button
                                  type="button"
                                  className="pip-btn"
                                  onClick={() =>
                                    updateHordeMember(token, index, -1)
                                  }
                                >
                                  −
                                </button>
                                <button
                                  type="button"
                                  className="pip-btn"
                                  onClick={() =>
                                    updateHordeMember(token, index, 1)
                                  }
                                >
                                  +
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {attacks.length ? (
                          <div className="gm-npc-v4-expanded-attacks">
                            <strong>{text.attacks}</strong>
                            {attacks.map((attack, index) => {
                              const profile = effectiveAttackProfile(
                                attack,
                                stats
                              );
                              return (
                                <button
                                  type="button"
                                  key={`${attack.id}-${index}`}
                                  className="gm-npc-attack-button"
                                  onClick={() =>
                                    openAttackRoll(attack, stats, token.name)
                                  }
                                >
                                  <b>{attack.name}</b>
                                  <span>
                                    {profile.d20Count}d20 · TN{" "}
                                    {profile.targetNumber || "—"} ·{" "}
                                    {profile.damageDice} CD ·{" "}
                                    {profile.damageType}
                                    {profile.effects
                                      ? ` · ${profile.effects}`
                                      : ""}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        <DetailLine
                          label={text.type}
                          value={stats.creatureType || linked?.creatureType}
                        />
                        <DetailLine
                          label={text.specialFeature}
                          value={stats.specialFeature}
                        />
                        <DetailLine
                          label={text.legendaryAbility}
                          value={stats.legendaryAbility}
                        />
                        <DetailLine
                          label={text.legendaryReward}
                          value={
                            stats.legendaryReward
                              ? `${String(
                                  stats.legendaryRewardType || ""
                                ).toUpperCase()} · ${stats.legendaryReward}`
                              : ""
                          }
                        />
                        {cardKind(stats.cardKind) === "npc" ? (
                          <DetailLine
                            label="SPECIAL"
                            value={stats.special || linked?.special}
                          />
                        ) : (
                          <DetailLine
                            label={`${text.creatureStatLabels.body} / ${text.creatureStatLabels.mind}`}
                            value={`${text.creatureStatLabels.body} ${
                              stats.body || linked?.body || "—"
                            } · ${text.creatureStatLabels.mind} ${
                              stats.mind || linked?.mind || "—"
                            } · ${text.creatureStatLabels.melee} ${
                              stats.melee || linked?.melee || "—"
                            } · ${text.creatureStatLabels.guns} ${
                              stats.guns || linked?.guns || "—"
                            }`}
                          />
                        )}
                        <DetailLine
                          label={text.skills}
                          value={stats.skills || linked?.skills}
                        />
                        <DetailLine
                          label={text.abilities}
                          value={stats.abilities || linked?.abilities}
                        />
                        <DetailLine
                          label={text.resistance}
                          value={`${stats.drBlock || linked?.drBlock || ""}${
                            num(stats.resistanceBonus)
                              ? ` · +${stats.resistanceBonus} ${text.all}`
                              : ""
                          }`}
                        />
                        <DetailLine
                          label={text.tactics}
                          value={stats.tactics || linked?.tactics}
                        />
                        <DetailLine
                          label={text.loot}
                          value={stats.loot || linked?.loot}
                        />
                        <DetailLine
                          label={text.summary}
                          value={stats.summary || linked?.summary}
                        />
                        <DetailLine label={text.notes} value={stats.notes} />
                        <DetailLine
                          label={text.source}
                          value={stats.source || linked?.source}
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="pip-logbox">{text.noCreatures}</div>
            )}
          </div>
        </section>
      </section>

      <DiceRollModal
        isOpen={diceOpen}
        onClose={() => setDiceOpen(false)}
        rollConfig={rollConfig}
        form={null}
        pendingAutoD6={pendingAutoD6}
        setPendingAutoD6={setPendingAutoD6}
        combatState={session?.combat || null}
        currentLuckPoints={undefined}
        onSpendCombatLuck={undefined}
        onMarkCombatUse={undefined}
        onDiceResult={session?.sendDiceResult}
      />
    </>
  );
}
