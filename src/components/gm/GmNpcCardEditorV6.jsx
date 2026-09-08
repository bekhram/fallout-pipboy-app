import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  normalizeStructuredAttack,
  normalizeWeaponAttack,
} from "../../utils/npcCombat.js";
import {
  SPECIAL_CREATURE_FEATURES,
  legendaryAbilitiesFor,
  legendaryAbilityById,
  specialFeatureById,
} from "../../utils/npcFeaturePresets.js";
import { loadNpcWeaponDatabase } from "../../utils/npcWeaponDatabase.js";
import "./gmNpcCardEditorV6.css";

const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];

const COPY = {
  en: {
    title: "CREATE NPC",
    subtitle: "NPC / creature card",
    npc: "NPC",
    creature: "CREATURE",
    saved: "SAVED CARD",
    newCard: "NEW CARD",
    delete: "DELETE",
    save: "SAVE CARD",
    savedOk: "Card saved. Attacks and weapon changes are stored.",
    deleted: "Card deleted.",
    nameRequired: "Enter a name first.",
    addHidden: "ADD TO MAP HIDDEN",
    added: "Token added to the map.",
    addFailed: "Could not add token.",
    name: "NAME",
    type: "TYPE",
    level: "LVL",
    size: "BASE SIZE",
    rank: "RANK",
    horde: "HORDE",
    hordeSize: "HORDE SIZE",
    hp: "BASE HP",
    def: "BASE DEF",
    xp: "BASE XP",
    init: "INIT",
    stats: "COMBAT STATS",
    special: "S.P.E.C.I.A.L.",
    creatureStats: "CREATURE STATS",
    customAttacks: "CUSTOM ATTACKS",
    addAttack: "ADD ATTACK",
    attackName: "Attack name",
    skill: "Skill",
    damageType: "Damage type",
    effects: "Effects",
    range: "Range",
    weapons: "WEAPONS",
    weaponDb: "WEAPON FROM DATABASE",
    chooseWeapon: "Choose weapon",
    addWeapon: "ADD WEAPON",
    weaponName: "Weapon name",
    rof: "ROF",
    advanced: "OPTIONAL / ADVANCED FIELDS",
    skills: "Skills / tags",
    legacyAttacks: "Legacy text attacks",
    abilities: "Abilities",
    resistance: "Damage resistance",
    tactics: "Tactics",
    loot: "Loot",
    summary: "Description",
    notes: "Notes",
    specialFeature: "SPECIAL FEATURE",
    legendaryAbility: "LEGENDARY ABILITY",
    rewardType: "REWARD TYPE",
    reward: "REWARD",
    weapon: "WEAPON",
    armor: "ARMOR",
    minion: "MINION",
    standard: "STANDARD",
    specialRank: "SPECIAL",
    legendary: "LEGENDARY",
  },
  ru: {
    title: "СОЗДАТЬ NPC",
    subtitle: "Карточка NPC / существа",
    npc: "NPC",
    creature: "СУЩЕСТВО",
    saved: "СОХРАНЁННАЯ КАРТОЧКА",
    newCard: "НОВАЯ КАРТОЧКА",
    delete: "УДАЛИТЬ",
    save: "СОХРАНИТЬ КАРТОЧКУ",
    savedOk: "Карточка сохранена. Атаки и изменения оружия записаны.",
    deleted: "Карточка удалена.",
    nameRequired: "Сначала укажите имя.",
    addHidden: "ДОБАВИТЬ НА КАРТУ СКРЫТЫМ",
    added: "Токен добавлен на карту.",
    addFailed: "Не удалось добавить токен.",
    name: "ИМЯ",
    type: "ТИП",
    level: "LVL",
    size: "БАЗОВЫЙ РАЗМЕР",
    rank: "РАНГ",
    horde: "ТОЛПА",
    hordeSize: "РАЗМЕР ТОЛПЫ",
    hp: "БАЗОВЫЙ HP",
    def: "БАЗОВАЯ ЗАЩИТА",
    xp: "БАЗОВЫЙ XP",
    init: "ИНИЦИАТИВА",
    stats: "БОЕВЫЕ ПАРАМЕТРЫ",
    special: "S.P.E.C.I.A.L.",
    creatureStats: "ПАРАМЕТРЫ СУЩЕСТВА",
    customAttacks: "СВОИ АТАКИ",
    addAttack: "ДОБАВИТЬ АТАКУ",
    attackName: "Название атаки",
    skill: "Навык",
    damageType: "Тип урона",
    effects: "Эффекты",
    range: "Дистанция",
    weapons: "ОРУЖИЕ",
    weaponDb: "ОРУЖИЕ ИЗ БАЗЫ",
    chooseWeapon: "Выбрать оружие",
    addWeapon: "ДОБАВИТЬ ОРУЖИЕ",
    weaponName: "Название оружия",
    rof: "СКОРОСТРЕЛЬНОСТЬ",
    advanced: "ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ",
    skills: "Навыки / теги",
    legacyAttacks: "Старые текстовые атаки",
    abilities: "Способности",
    resistance: "Сопротивление урону",
    tactics: "Тактика",
    loot: "Добыча",
    summary: "Описание",
    notes: "Заметки",
    specialFeature: "ОСОБАЯ ЧЕРТА",
    legendaryAbility: "ЛЕГЕНДАРНАЯ СПОСОБНОСТЬ",
    rewardType: "ТИП НАГРАДЫ",
    reward: "НАГРАДА",
    weapon: "ОРУЖИЕ",
    armor: "БРОНЯ",
    minion: "МИНЬОН",
    standard: "ОБЫЧНЫЙ",
    specialRank: "ОСОБЫЙ",
    legendary: "ЛЕГЕНДАРНЫЙ",
  },
  uk: {
    title: "СТВОРИТИ NPC",
    subtitle: "Картка NPC / істоти",
    npc: "NPC",
    creature: "ІСТОТА",
    saved: "ЗБЕРЕЖЕНА КАРТКА",
    newCard: "НОВА КАРТКА",
    delete: "ВИДАЛИТИ",
    save: "ЗБЕРЕГТИ КАРТКУ",
    savedOk: "Картку збережено. Атаки та зміни зброї записані.",
    deleted: "Картку видалено.",
    nameRequired: "Спочатку вкажіть ім'я.",
    addHidden: "ДОДАТИ НА МАПУ ПРИХОВАНИМ",
    added: "Токен додано на мапу.",
    addFailed: "Не вдалося додати токен.",
    name: "ІМ'Я",
    type: "ТИП",
    level: "LVL",
    size: "БАЗОВИЙ РОЗМІР",
    rank: "РАНГ",
    horde: "НАТОВП",
    hordeSize: "РОЗМІР НАТОВПУ",
    hp: "БАЗОВИЙ HP",
    def: "БАЗОВИЙ ЗАХИСТ",
    xp: "БАЗОВИЙ XP",
    init: "ІНІЦІАТИВА",
    stats: "БОЙОВІ ПАРАМЕТРИ",
    special: "S.P.E.C.I.A.L.",
    creatureStats: "ПАРАМЕТРИ ІСТОТИ",
    customAttacks: "ВЛАСНІ АТАКИ",
    addAttack: "ДОДАТИ АТАКУ",
    attackName: "Назва атаки",
    skill: "Навичка",
    damageType: "Тип шкоди",
    effects: "Ефекти",
    range: "Дистанція",
    weapons: "ЗБРОЯ",
    weaponDb: "ЗБРОЯ З БАЗИ",
    chooseWeapon: "Вибрати зброю",
    addWeapon: "ДОДАТИ ЗБРОЮ",
    weaponName: "Назва зброї",
    rof: "ТЕМП ВОГНЮ",
    advanced: "ДОДАТКОВІ ПОЛЯ",
    skills: "Навички / теги",
    legacyAttacks: "Старі текстові атаки",
    abilities: "Здібності",
    resistance: "Опір шкоді",
    tactics: "Тактика",
    loot: "Здобич",
    summary: "Опис",
    notes: "Нотатки",
    specialFeature: "ОСОБЛИВА РИСА",
    legendaryAbility: "ЛЕГЕНДАРНА ЗДІБНІСТЬ",
    rewardType: "ТИП НАГОРОДИ",
    reward: "НАГОРОДА",
    weapon: "ЗБРОЯ",
    armor: "БРОНЯ",
    minion: "МІНЬЙОН",
    standard: "ЗВИЧАЙНИЙ",
    specialRank: "ОСОБЛИВИЙ",
    legendary: "ЛЕГЕНДАРНИЙ",
  },
  pl: {
    title: "UTWÓRZ NPC",
    subtitle: "Karta NPC / stworzenia",
    npc: "NPC",
    creature: "STWÓR",
    saved: "ZAPISANA KARTA",
    newCard: "NOWA KARTA",
    delete: "USUŃ",
    save: "ZAPISZ KARTĘ",
    savedOk: "Karta zapisana. Ataki i zmiany broni zostały zapisane.",
    deleted: "Karta usunięta.",
    nameRequired: "Najpierw podaj nazwę.",
    addHidden: "DODAJ NA MAPĘ UKRYTEGO",
    added: "Token dodany do mapy.",
    addFailed: "Nie udało się dodać tokena.",
    name: "NAZWA",
    type: "TYP",
    level: "LVL",
    size: "ROZMIAR BAZOWY",
    rank: "RANGA",
    horde: "HORDA",
    hordeSize: "ROZMIAR HORDY",
    hp: "BAZOWE HP",
    def: "BAZOWA OBRONA",
    xp: "BAZOWE XP",
    init: "INICJATYWA",
    stats: "STATYSTYKI BOJOWE",
    special: "S.P.E.C.I.A.L.",
    creatureStats: "STATYSTYKI STWORA",
    customAttacks: "WŁASNE ATAKI",
    addAttack: "DODAJ ATAK",
    attackName: "Nazwa ataku",
    skill: "Umiejętność",
    damageType: "Typ obrażeń",
    effects: "Efekty",
    range: "Zasięg",
    weapons: "BROŃ",
    weaponDb: "BROŃ Z BAZY",
    chooseWeapon: "Wybierz broń",
    addWeapon: "DODAJ BROŃ",
    weaponName: "Nazwa broni",
    rof: "SZYBKOSTRZELNOŚĆ",
    advanced: "POLA DODATKOWE",
    skills: "Umiejętności / tagi",
    legacyAttacks: "Stare ataki tekstowe",
    abilities: "Zdolności",
    resistance: "Odporność na obrażenia",
    tactics: "Taktyka",
    loot: "Łup",
    summary: "Opis",
    notes: "Notatki",
    specialFeature: "CECHA SPECJALNA",
    legendaryAbility: "ZDOLNOŚĆ LEGENDARNA",
    rewardType: "TYP NAGRODY",
    reward: "NAGRODA",
    weapon: "BROŃ",
    armor: "PANCERZ",
    minion: "MINION",
    standard: "STANDARDOWY",
    specialRank: "SPECJALNY",
    legendary: "LEGENDARNY",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function cardKind(value) {
  return String(value || "").toLowerCase() === "creature" ? "creature" : "npc";
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cloneCard(value) {
  return {
    ...(value || {}),
    special: { ...(value?.special || {}) },
    customAttacks: (Array.isArray(value?.customAttacks) ? value.customAttacks : []).map((item) => ({ ...item })),
    weapons: (Array.isArray(value?.weapons) ? value.weapons : []).map((item) => ({ ...item })),
  };
}

function featureFields(card) {
  const special = specialFeatureById(card?.specialFeatureId);
  const legendary = legendaryAbilityById(card?.legendaryAbilityId);
  return {
    ...card,
    specialFeature: special ? `${special.name} — ${special.summary}` : "",
    legendaryAbility: legendary ? `${legendary.name} — ${legendary.summary}` : "",
  };
}

function rankText(rank, copy) {
  if (rank === "minion") return copy.minion;
  if (rank === "special") return copy.specialRank;
  if (rank === "legendary") return copy.legendary;
  return copy.standard;
}

function Field({ label, children, wide = false }) {
  return <label className={wide ? "is-wide" : ""}><span>{label}</span>{children}</label>;
}

export default function GmNpcCardEditorV6({ session }) {
  const { i18n } = useTranslation();
  const copy = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const [library, setLibrary] = useState([]);
  const [weaponsDb, setWeaponsDb] = useState([]);
  const [kind, setKind] = useState("npc");
  const [draft, setDraft] = useState(() => cloneCard(blankCreature("npc")));
  const [selectedId, setSelectedId] = useState("");
  const [weaponId, setWeaponId] = useState("");
  const [message, setMessage] = useState("");

  const legendaryOptions = useMemo(() => legendaryAbilitiesFor(kind), [kind]);
  const effective = useMemo(() => applyNpcRank(featureFields(draft), featureFields(draft)), [draft]);

  const reloadLibrary = () => loadCustomCreatures()
    .then((items) => setLibrary(Array.isArray(items) ? items : []))
    .catch(() => setLibrary([]));

  useEffect(() => {
    reloadLibrary();
    const handler = () => reloadLibrary();
    window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    loadNpcWeaponDatabase().then(setWeaponsDb).catch(() => setWeaponsDb([]));
  }, []);

  const patch = (value) => setDraft((current) => ({ ...current, ...value }));
  const patchSpecial = (key, value) => setDraft((current) => ({
    ...current,
    special: { ...(current.special || {}), [key]: value },
  }));

  const makeNew = (nextKind = kind) => {
    const resolved = cardKind(nextKind);
    setKind(resolved);
    setSelectedId("");
    setDraft(cloneCard(blankCreature(resolved)));
    setWeaponId("");
    setMessage("");
  };

  const chooseSaved = (id) => {
    setSelectedId(id);
    if (!id) return makeNew(kind);
    const card = library.find((item) => String(item.id) === String(id));
    if (!card) return;
    setKind(cardKind(card.cardKind));
    setDraft(cloneCard(card));
    setMessage("");
  };

  const save = async () => {
    if (!String(draft.name || "").trim()) {
      setMessage(copy.nameRequired);
      return null;
    }
    const saved = await saveCustomCreature({
      ...featureFields(draft),
      cardKind: kind,
      category: kind,
    });
    setKind(cardKind(saved.cardKind));
    setDraft(cloneCard(saved));
    setSelectedId(saved.id);
    await reloadLibrary();
    setMessage(copy.savedOk);
    return saved;
  };

  const remove = async () => {
    if (!selectedId) return;
    await deleteCustomCreature(selectedId);
    await reloadLibrary();
    makeNew(kind);
    setMessage(copy.deleted);
  };

  const addAttack = () => {
    const attack = normalizeStructuredAttack({
      name: copy.attackName,
      targetNumber: 10,
      damageDice: 4,
      skill: "Combat",
      attribute: kind === "creature" ? "BODY" : "SPECIAL",
      damageType: "Physical",
      effects: "",
      range: "C",
    });
    patch({ customAttacks: [...(draft.customAttacks || []), attack] });
  };

  const patchAttack = (index, value) => patch({
    customAttacks: (draft.customAttacks || []).map((attack, i) => i === index ? { ...attack, ...value } : attack),
  });
  const removeAttack = (index) => patch({
    customAttacks: (draft.customAttacks || []).filter((_, i) => i !== index),
  });

  const addWeapon = () => {
    const source = weaponsDb.find((item) => item.id === weaponId);
    if (!source) return;
    const weapon = normalizeWeaponAttack({
      ...source,
      weaponId: source.id,
      targetNumber: 10,
      damageDice: source.damage,
      skill: source.weaponType || "Combat",
      attribute: "SPECIAL",
      damageType: source.damageType || "Physical",
      effects: source.effects || "",
      range: source.range || "C",
      rate: source.rate || 0,
    });
    patch({ weapons: [...(draft.weapons || []), weapon] });
    setWeaponId("");
  };

  const patchWeapon = (index, value) => patch({
    weapons: (draft.weapons || []).map((weapon, i) => i === index ? { ...weapon, ...value } : weapon),
  });
  const removeWeapon = (index) => patch({
    weapons: (draft.weapons || []).filter((_, i) => i !== index),
  });

  const addToMap = async () => {
    if (!String(draft.name || "").trim()) return setMessage(copy.nameRequired);
    const featured = featureFields(draft);
    const stats = applyNpcRank(featured, featured);
    const footprint = Math.max(1, Math.min(3, Number(stats.footprint || stats.size || 1)));
    const response = await session?.createNpcToken?.({
      name: draft.name,
      npcId: draft.id,
      avatar: draft.avatar || "",
      size: footprint,
      stats: {
        ...stats,
        size: footprint,
        footprint,
        visibleToPlayers: false,
        controlledByClientId: "",
      },
    });
    setMessage(response?.ok ? copy.added : `${copy.addFailed}${response?.error ? ` [${response.error}]` : ""}`);
  };

  const setRank = (rank) => patch({ rank });

  return (
    <section className="pip-panel gm-npc-card-editor-v6">
      <header className="gm-npc-v6-head">
        <div>
          <div className="pip-bootline">PIP 2D20 // GM</div>
          <h2>[ {copy.title} ]</h2>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" className="pip-btn is-primary gm-npc-v6-kind" onClick={() => makeNew(kind === "npc" ? "creature" : "npc")}>
          {copy.npc} ⇄ {copy.creature} · {kind === "npc" ? copy.npc : copy.creature}
        </button>
      </header>

      <div className="gm-npc-v6-library">
        <Field label={copy.saved} wide>
          <select className="pip-input" value={selectedId} onChange={(event) => chooseSaved(event.target.value)}>
            <option value="">— {copy.newCard} —</option>
            {library.map((card) => <option key={card.id} value={card.id}>{cardKind(card.cardKind) === "npc" ? copy.npc : copy.creature} · {card.name}</option>)}
          </select>
        </Field>
        <button type="button" className="pip-btn" onClick={() => makeNew(kind)}>{copy.newCard}</button>
        <button type="button" className="pip-btn" disabled={!selectedId} onClick={remove}>{copy.delete}</button>
      </div>

      <div className="gm-npc-v6-primary-actions">
        <button type="button" className="pip-btn is-primary" onClick={save}>{copy.save}</button>
        <button type="button" className="pip-btn" onClick={addToMap}>{copy.addHidden}</button>
      </div>
      {message ? <div className="gm-token-manager-message">{message}</div> : null}

      <div className="gm-npc-v6-grid gm-npc-v6-identity">
        <Field label={copy.name} wide><input className="pip-input" value={draft.name || ""} onChange={(event) => patch({ name: event.target.value })} /></Field>
        <Field label={copy.type} wide><input className="pip-input" value={draft.creatureType || ""} onChange={(event) => patch({ creatureType: event.target.value })} /></Field>
        <Field label={copy.level}><input className="pip-input" type="number" min="0" value={draft.level ?? 1} onChange={(event) => patch({ level: number(event.target.value) })} /></Field>
        <Field label={copy.size}><select className="pip-input" value={Number(draft.baseSize || 1)} onChange={(event) => patch({ baseSize: number(event.target.value, 1), size: number(event.target.value, 1) })}><option value="1">1×1</option><option value="2">2×2</option></select></Field>
      </div>

      <section className="gm-npc-v6-section">
        <div className="gm-npc-v6-section-head"><h3>{copy.rank}</h3><strong>{rankText(draft.rank, copy)}</strong></div>
        <div className="gm-npc-v6-ranks">
          {NPC_RANKS.map((rank) => <button type="button" key={rank} className={`pip-btn${draft.rank === rank ? " is-primary" : ""}`} onClick={() => setRank(rank)}>{rankText(rank, copy)}</button>)}
        </div>
        <div className="gm-npc-v6-horde-row">
          <label className="gm-horde-toggle"><input type="checkbox" checked={Boolean(draft.hordeEnabled)} onChange={(event) => patch({ hordeEnabled: event.target.checked })} /> {copy.horde}</label>
          {draft.hordeEnabled ? <Field label={copy.hordeSize}><select className="pip-input" value={draft.hordeSize || 2} onChange={(event) => patch({ hordeSize: number(event.target.value, 2) })}>{[2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></Field> : null}
          <div className="gm-npc-v6-effective">HP <b>{effective.hp}/{effective.maxHp}</b> · DEF <b>{effective.defense}</b> · XP <b>{effective.xp}</b> · SIZE <b>{effective.footprint}×{effective.footprint}</b></div>
        </div>
        {draft.rank === "special" ? <Field label={copy.specialFeature} wide><select className="pip-input" value={draft.specialFeatureId || ""} onChange={(event) => patch({ specialFeatureId: event.target.value })}><option value="">—</option>{SPECIAL_CREATURE_FEATURES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field> : null}
        {draft.rank === "legendary" ? <div className="gm-npc-v6-grid"><Field label={copy.legendaryAbility} wide><select className="pip-input" value={draft.legendaryAbilityId || ""} onChange={(event) => patch({ legendaryAbilityId: event.target.value })}><option value="">—</option>{legendaryOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label={copy.rewardType}><select className="pip-input" value={draft.legendaryRewardType || "weapon"} onChange={(event) => patch({ legendaryRewardType: event.target.value })}><option value="weapon">{copy.weapon}</option><option value="armor">{copy.armor}</option></select></Field><Field label={copy.reward} wide><input className="pip-input" value={draft.legendaryReward || ""} onChange={(event) => patch({ legendaryReward: event.target.value })} /></Field></div> : null}
      </section>

      <section className="gm-npc-v6-section">
        <h3>{copy.stats}</h3>
        <div className="gm-npc-v6-grid gm-npc-v6-stats">
          <Field label={copy.hp}><input className="pip-input" type="number" min="1" value={draft.baseMaxHp ?? 10} onChange={(event) => patch({ baseMaxHp: Math.max(1, number(event.target.value, 1)), hp: Math.max(1, number(event.target.value, 1)), maxHp: Math.max(1, number(event.target.value, 1)) })} /></Field>
          <Field label={copy.def}><input className="pip-input" type="number" min="0" value={draft.baseDefense ?? 1} onChange={(event) => patch({ baseDefense: Math.max(0, number(event.target.value)), defense: Math.max(0, number(event.target.value)) })} /></Field>
          <Field label={copy.xp}><input className="pip-input" type="number" min="0" value={draft.baseXp ?? 0} onChange={(event) => patch({ baseXp: Math.max(0, number(event.target.value)), xp: Math.max(0, number(event.target.value)) })} /></Field>
          <Field label={copy.init}><input className="pip-input" type="number" min="0" value={draft.initiative ?? 0} onChange={(event) => patch({ initiative: Math.max(0, number(event.target.value)) })} /></Field>
        </div>
      </section>

      {kind === "npc" ? (
        <section className="gm-npc-v6-section">
          <h3>{copy.special}</h3>
          <div className="gm-npc-v6-special">{SPECIAL_KEYS.map((key) => <Field key={key} label={key}><input className="pip-input" type="number" min="0" max="20" value={draft.special?.[key] ?? 5} onChange={(event) => patchSpecial(key, event.target.value)} /></Field>)}</div>
        </section>
      ) : (
        <section className="gm-npc-v6-section">
          <h3>{copy.creatureStats}</h3>
          <div className="gm-npc-v6-grid gm-npc-v6-stats">{["body","mind","melee","guns","other"].map((key) => <Field key={key} label={key.toUpperCase()}><input className="pip-input" type="number" value={draft[key] ?? 0} onChange={(event) => patch({ [key]: event.target.value })} /></Field>)}</div>
        </section>
      )}

      <section className="gm-npc-v6-section">
        <div className="gm-npc-v6-section-head"><h3>{copy.customAttacks}</h3><button type="button" className="pip-btn" onClick={addAttack}>+ {copy.addAttack}</button></div>
        <div className="gm-npc-v6-attack-list">
          {(draft.customAttacks || []).map((attack, index) => (
            <article className="gm-npc-v6-attack-card" key={attack.id || index}>
              <Field label={copy.attackName} wide><input className="pip-input" value={attack.name || ""} onChange={(event) => patchAttack(index, { name: event.target.value })} /></Field>
              <div className="gm-npc-v6-grid gm-npc-v6-attack-grid">
                <Field label="TN"><input className="pip-input" type="number" min="0" max="20" value={attack.targetNumber ?? 10} onChange={(event) => patchAttack(index, { targetNumber: number(event.target.value) })} /></Field>
                <Field label="CD"><input className="pip-input" type="number" min="0" value={attack.damageDice ?? 0} onChange={(event) => patchAttack(index, { damageDice: number(event.target.value) })} /></Field>
                <Field label={copy.skill}><input className="pip-input" value={attack.skill || ""} onChange={(event) => patchAttack(index, { skill: event.target.value })} /></Field>
                <Field label={copy.damageType}><input className="pip-input" value={attack.damageType || "Physical"} onChange={(event) => patchAttack(index, { damageType: event.target.value })} /></Field>
                <Field label={copy.range}><input className="pip-input" value={attack.range || ""} onChange={(event) => patchAttack(index, { range: event.target.value })} /></Field>
                <Field label={copy.effects} wide><input className="pip-input" value={attack.effects || ""} onChange={(event) => patchAttack(index, { effects: event.target.value })} /></Field>
              </div>
              <button type="button" className="pip-btn gm-npc-v6-remove" onClick={() => removeAttack(index)}>×</button>
            </article>
          ))}
          {!(draft.customAttacks || []).length ? <div className="pip-logbox">—</div> : null}
        </div>
        <button type="button" className="pip-btn is-primary gm-npc-v6-inline-save" onClick={save}>{copy.save}</button>
      </section>

      {kind === "npc" ? (
        <section className="gm-npc-v6-section">
          <div className="gm-npc-v6-section-head"><h3>{copy.weapons}</h3><span>{weaponsDb.length}</span></div>
          <div className="gm-npc-v6-weapon-picker"><select className="pip-input" value={weaponId} onChange={(event) => setWeaponId(event.target.value)}><option value="">— {copy.chooseWeapon} —</option>{weaponsDb.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.damage} CD · {weapon.damageType}</option>)}</select><button type="button" className="pip-btn" disabled={!weaponId} onClick={addWeapon}>+ {copy.addWeapon}</button></div>
          <div className="gm-npc-v6-attack-list">
            {(draft.weapons || []).map((weapon, index) => (
              <article className="gm-npc-v6-attack-card is-weapon" key={`${weapon.id || weapon.weaponId}-${index}`}>
                <Field label={copy.weaponName} wide><input className="pip-input" value={weapon.name || ""} onChange={(event) => patchWeapon(index, { name: event.target.value })} /></Field>
                <div className="gm-npc-v6-grid gm-npc-v6-attack-grid">
                  <Field label="TN"><input className="pip-input" type="number" min="0" max="20" value={weapon.targetNumber ?? 10} onChange={(event) => patchWeapon(index, { targetNumber: number(event.target.value) })} /></Field>
                  <Field label="CD"><input className="pip-input" type="number" min="0" value={weapon.damageDice ?? 0} onChange={(event) => patchWeapon(index, { damageDice: number(event.target.value) })} /></Field>
                  <Field label={copy.skill}><input className="pip-input" value={weapon.skill || ""} onChange={(event) => patchWeapon(index, { skill: event.target.value })} /></Field>
                  <Field label={copy.damageType}><input className="pip-input" value={weapon.damageType || "Physical"} onChange={(event) => patchWeapon(index, { damageType: event.target.value })} /></Field>
                  <Field label={copy.range}><input className="pip-input" value={weapon.range || ""} onChange={(event) => patchWeapon(index, { range: event.target.value })} /></Field>
                  <Field label={copy.rof}><input className="pip-input" type="number" min="0" value={weapon.rate ?? 0} onChange={(event) => patchWeapon(index, { rate: number(event.target.value) })} /></Field>
                  <Field label={copy.effects} wide><input className="pip-input" value={weapon.effects || ""} onChange={(event) => patchWeapon(index, { effects: event.target.value })} /></Field>
                </div>
                <button type="button" className="pip-btn gm-npc-v6-remove" onClick={() => removeWeapon(index)}>×</button>
              </article>
            ))}
          </div>
          <button type="button" className="pip-btn is-primary gm-npc-v6-inline-save" onClick={save}>{copy.save}</button>
        </section>
      ) : null}

      <details className="gm-npc-v6-advanced">
        <summary>{copy.advanced}</summary>
        <div className="gm-npc-v6-text-grid">
          <Field label={copy.skills}><textarea className="pip-input" value={draft.skills || ""} onChange={(event) => patch({ skills: event.target.value })} /></Field>
          <Field label={copy.legacyAttacks}><textarea className="pip-input" value={draft.attacks || ""} onChange={(event) => patch({ attacks: event.target.value })} /></Field>
          <Field label={copy.abilities}><textarea className="pip-input" value={draft.abilities || ""} onChange={(event) => patch({ abilities: event.target.value })} /></Field>
          <Field label={copy.resistance}><textarea className="pip-input" value={draft.drBlock || ""} onChange={(event) => patch({ drBlock: event.target.value })} /></Field>
          <Field label={copy.tactics}><textarea className="pip-input" value={draft.tactics || ""} onChange={(event) => patch({ tactics: event.target.value })} /></Field>
          <Field label={copy.loot}><textarea className="pip-input" value={draft.loot || ""} onChange={(event) => patch({ loot: event.target.value })} /></Field>
          <Field label={copy.summary}><textarea className="pip-input" value={draft.summary || ""} onChange={(event) => patch({ summary: event.target.value })} /></Field>
          <Field label={copy.notes}><textarea className="pip-input" value={draft.notes || ""} onChange={(event) => patch({ notes: event.target.value })} /></Field>
        </div>
      </details>

      <div className="gm-npc-v6-primary-actions is-bottom">
        <button type="button" className="pip-btn is-primary" onClick={save}>{copy.save}</button>
        <button type="button" className="pip-btn" onClick={addToMap}>{copy.addHidden}</button>
      </div>
    </section>
  );
}
