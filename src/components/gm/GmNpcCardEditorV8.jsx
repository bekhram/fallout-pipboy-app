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
import { loadNpcWeaponDatabase } from "../../utils/npcWeaponDatabase.js";
import { findFreePlacement } from "../../utils/gmSessionModel.js";
import "./gmNpcCardEditorV8.css";

const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
const COPY = {
  en: {
    title: "CREATE NPC", npc: "NPC", creature: "CREATURE", saved: "SAVED CARD", newCard: "NEW CARD",
    delete: "DELETE", createNpc: "CREATE NPC", createCreature: "CREATE CREATURE", addMap: "ADD TO MAP",
    name: "NAME", type: "TYPE", level: "LVL", size: "SIZE", rank: "RANK", horde: "HORDE", members: "MEMBERS",
    hp: "HP", defense: "DEF", xp: "XP", init: "INIT", attacks: "COMBAT ATTACKS", addAttack: "ADD ATTACK",
    weapons: "WEAPONS", archive: "WEAPON ARCHIVE", archiveSearch: "Search weapon archive...", chooseWeapon: "Choose weapon",
    addWeapon: "ADD WEAPON", edit: "EDIT", collapse: "CLOSE EDITOR", remove: "REMOVE", empty: "Nothing added yet",
    attackName: "Attack name", tn: "TN", cd: "Damage / CD", attribute: "Attribute", skill: "Skill",
    damageType: "Damage type", range: "Range", weaponType: "Weapon / attack type", effects: "Effect / qualities",
    rate: "Rate of Fire", ammo: "Ammo", cost: "Cost", weight: "Weight", rarity: "Rarity",
    savedOk: "Card created", added: "Token added to selected scene", failed: "Could not add token",
    noScene: "Select a scene first", noSpace: "Not enough free space", required: "Enter a name first",
  },
  ru: {
    title: "СОЗДАТЬ NPC", npc: "NPC", creature: "СУЩЕСТВО", saved: "СОХРАНЁННАЯ КАРТОЧКА", newCard: "НОВАЯ КАРТОЧКА",
    delete: "УДАЛИТЬ", createNpc: "СОЗДАТЬ NPC", createCreature: "СОЗДАТЬ СУЩЕСТВО", addMap: "ДОБАВИТЬ НА КАРТУ",
    name: "ИМЯ", type: "ТИП", level: "LVL", size: "РАЗМЕР", rank: "РАНГ", horde: "ТОЛПА", members: "УЧАСТНИКОВ",
    hp: "HP", defense: "ЗАЩИТА", xp: "XP", init: "ИНИЦИАТИВА", attacks: "БОЕВЫЕ АТАКИ", addAttack: "ДОБАВИТЬ АТАКУ",
    weapons: "ОРУЖИЕ", archive: "АРХИВ ОРУЖИЯ", archiveSearch: "Поиск оружия в архиве...", chooseWeapon: "Выбрать оружие",
    addWeapon: "ДОБАВИТЬ ОРУЖИЕ", edit: "РЕДАКТИРОВАТЬ", collapse: "ЗАКРЫТЬ РЕДАКТОР", remove: "УДАЛИТЬ", empty: "Пока ничего не добавлено",
    attackName: "Название атаки", tn: "TN", cd: "Урон / CD", attribute: "Характеристика", skill: "Навык",
    damageType: "Тип урона", range: "Дистанция", weaponType: "Тип оружия / атаки", effects: "Эффект / свойства",
    rate: "Скорострельность", ammo: "Боеприпас", cost: "Стоимость", weight: "Вес", rarity: "Редкость",
    savedOk: "Карточка создана", added: "Токен добавлен на выбранную сцену", failed: "Не удалось добавить токен",
    noScene: "Сначала выберите сцену", noSpace: "Недостаточно свободного места", required: "Сначала укажите имя",
  },
  uk: {
    title: "СТВОРИТИ NPC", npc: "NPC", creature: "ІСТОТА", saved: "ЗБЕРЕЖЕНА КАРТКА", newCard: "НОВА КАРТКА",
    delete: "ВИДАЛИТИ", createNpc: "СТВОРИТИ NPC", createCreature: "СТВОРИТИ ІСТОТУ", addMap: "ДОДАТИ НА МАПУ",
    name: "ІМ'Я", type: "ТИП", level: "LVL", size: "РОЗМІР", rank: "РАНГ", horde: "НАТОВП", members: "УЧАСНИКІВ",
    hp: "HP", defense: "ЗАХИСТ", xp: "XP", init: "ІНІЦІАТИВА", attacks: "БОЙОВІ АТАКИ", addAttack: "ДОДАТИ АТАКУ",
    weapons: "ЗБРОЯ", archive: "АРХІВ ЗБРОЇ", archiveSearch: "Пошук зброї в архіві...", chooseWeapon: "Обрати зброю",
    addWeapon: "ДОДАТИ ЗБРОЮ", edit: "РЕДАГУВАТИ", collapse: "ЗАКРИТИ РЕДАКТОР", remove: "ВИДАЛИТИ", empty: "Поки нічого не додано",
    attackName: "Назва атаки", tn: "TN", cd: "Шкода / CD", attribute: "Характеристика", skill: "Навичка",
    damageType: "Тип шкоди", range: "Дистанція", weaponType: "Тип зброї / атаки", effects: "Ефект / властивості",
    rate: "Темп вогню", ammo: "Боєприпас", cost: "Вартість", weight: "Вага", rarity: "Рідкість",
    savedOk: "Картку створено", added: "Токен додано на обрану сцену", failed: "Не вдалося додати токен",
    noScene: "Спочатку оберіть сцену", noSpace: "Недостатньо вільного місця", required: "Спочатку вкажіть ім'я",
  },
  pl: {
    title: "UTWÓRZ NPC", npc: "NPC", creature: "STWÓR", saved: "ZAPISANA KARTA", newCard: "NOWA KARTA",
    delete: "USUŃ", createNpc: "UTWÓRZ NPC", createCreature: "UTWÓRZ STWORA", addMap: "DODAJ NA MAPĘ",
    name: "NAZWA", type: "TYP", level: "LVL", size: "ROZMIAR", rank: "RANGA", horde: "HORDA", members: "CZŁONKÓW",
    hp: "HP", defense: "OBRONA", xp: "XP", init: "INICJATYWA", attacks: "ATAKI BOJOWE", addAttack: "DODAJ ATAK",
    weapons: "BROŃ", archive: "ARCHIWUM BRONI", archiveSearch: "Szukaj broni w archiwum...", chooseWeapon: "Wybierz broń",
    addWeapon: "DODAJ BROŃ", edit: "EDYTUJ", collapse: "ZAMKNIJ EDYTOR", remove: "USUŃ", empty: "Nic jeszcze nie dodano",
    attackName: "Nazwa ataku", tn: "TN", cd: "Obrażenia / CD", attribute: "Cecha", skill: "Umiejętność",
    damageType: "Typ obrażeń", range: "Zasięg", weaponType: "Typ broni / ataku", effects: "Efekt / właściwości",
    rate: "Szybkostrzelność", ammo: "Amunicja", cost: "Koszt", weight: "Waga", rarity: "Rzadkość",
    savedOk: "Karta utworzona", added: "Token dodany do wybranej sceny", failed: "Nie udało się dodać tokena",
    noScene: "Najpierw wybierz scenę", noSpace: "Brak wolnego miejsca", required: "Najpierw podaj nazwę",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}
function kindOf(value) { return String(value || "").toLowerCase() === "creature" ? "creature" : "npc"; }
function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function cloneCard(value) {
  return {
    ...(value || {}),
    special: { ...(value?.special || {}) },
    customAttacks: (Array.isArray(value?.customAttacks) ? value.customAttacks : []).map((item) => ({ ...item })),
    weapons: (Array.isArray(value?.weapons) ? value.weapons : []).map((item) => ({ ...item })),
  };
}
function Field({ label, children, wide = false }) {
  return <label className={wide ? "is-wide" : ""}><span>{label}</span>{children}</label>;
}

function CombatProfileEditor({ profile, onChange, text, weapon = false }) {
  const patch = (key, value) => onChange({ [key]: value });
  return (
    <div className="gm-npc-v8-profile-editor">
      <div className="gm-npc-v8-form-grid">
        <Field label={text.attackName} wide>
          <input className="pip-input" value={profile.name || ""} onChange={(e) => patch("name", e.target.value)} />
        </Field>
        <Field label={text.tn}><input className="pip-input" inputMode="numeric" value={profile.targetNumber ?? 10} onChange={(e) => patch("targetNumber", e.target.value)} /></Field>
        <Field label={text.cd}><input className="pip-input" inputMode="numeric" value={profile.damageDice ?? 0} onChange={(e) => patch("damageDice", e.target.value)} /></Field>
        <Field label={text.attribute}><input className="pip-input" value={profile.attribute || ""} onChange={(e) => patch("attribute", e.target.value)} /></Field>
        <Field label={text.skill}><input className="pip-input" value={profile.skill || ""} onChange={(e) => patch("skill", e.target.value)} /></Field>
        <Field label={text.damageType}><input className="pip-input" value={profile.damageType || ""} onChange={(e) => patch("damageType", e.target.value)} /></Field>
        <Field label={text.range}><input className="pip-input" value={profile.range || ""} onChange={(e) => patch("range", e.target.value)} /></Field>
        <Field label={text.weaponType} wide><input className="pip-input" value={profile.weaponType || ""} onChange={(e) => patch("weaponType", e.target.value)} /></Field>
        {weapon ? (
          <>
            <Field label={text.rate}><input className="pip-input" inputMode="numeric" value={profile.rate ?? 0} onChange={(e) => patch("rate", e.target.value)} /></Field>
            <Field label={text.ammo}><input className="pip-input" value={profile.ammo || ""} onChange={(e) => patch("ammo", e.target.value)} /></Field>
            <Field label={text.cost}><input className="pip-input" value={profile.cost || ""} onChange={(e) => patch("cost", e.target.value)} /></Field>
            <Field label={text.weight}><input className="pip-input" value={profile.weight || ""} onChange={(e) => patch("weight", e.target.value)} /></Field>
            <Field label={text.rarity}><input className="pip-input" value={profile.rarity || ""} onChange={(e) => patch("rarity", e.target.value)} /></Field>
          </>
        ) : null}
      </div>
      <Field label={text.effects} wide>
        <textarea
          className="pip-input gm-npc-v8-effect"
          value={profile.effect ?? profile.effects ?? ""}
          onChange={(e) => onChange({ effect: e.target.value, effects: e.target.value })}
        />
      </Field>
    </div>
  );
}

export default function GmNpcCardEditorV8({ session }) {
  const { i18n } = useTranslation();
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const [kind, setKind] = useState("npc");
  const [draft, setDraft] = useState(() => cloneCard(blankCreature("npc")));
  const [library, setLibrary] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [weaponsDb, setWeaponsDb] = useState([]);
  const [weaponSearch, setWeaponSearch] = useState("");
  const [weaponId, setWeaponId] = useState("");
  const [openAttack, setOpenAttack] = useState(null);
  const [openWeapon, setOpenWeapon] = useState(null);
  const [message, setMessage] = useState("");

  const effective = useMemo(() => applyNpcRank(draft, draft), [draft]);
  const filteredWeapons = useMemo(() => {
    const query = String(weaponSearch || "").trim().toLowerCase();
    if (!query) return weaponsDb;
    return weaponsDb.filter((weapon) => [weapon.name, weapon.weaponType, weapon.damageType, weapon.effects, weapon.qualities, weapon.ammo]
      .filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [weaponsDb, weaponSearch]);

  const reload = () => loadCustomCreatures().then((items) => setLibrary(Array.isArray(items) ? items : [])).catch(() => setLibrary([]));

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT, handler);
  }, []);
  useEffect(() => { loadNpcWeaponDatabase().then(setWeaponsDb).catch(() => setWeaponsDb([])); }, []);

  const patch = (value) => setDraft((current) => ({ ...current, ...value }));
  const patchSpecial = (key, value) => setDraft((current) => ({ ...current, special: { ...(current.special || {}), [key]: value } }));

  const makeNew = (nextKind = kind) => {
    const resolved = kindOf(nextKind);
    setKind(resolved);
    setSelectedId("");
    setDraft(cloneCard(blankCreature(resolved)));
    setOpenAttack(null);
    setOpenWeapon(null);
    setWeaponId("");
    setMessage("");
  };

  const chooseSaved = (id) => {
    setSelectedId(id);
    if (!id) return makeNew(kind);
    const card = library.find((item) => String(item.id) === String(id));
    if (!card) return;
    setKind(kindOf(card.cardKind));
    setDraft(cloneCard(card));
    setOpenAttack(null);
    setOpenWeapon(null);
    setMessage("");
  };

  const createCard = async () => {
    if (!String(draft.name || "").trim()) { setMessage(text.required); return null; }
    const payload = {
      ...draft,
      cardKind: kind,
      category: kind,
      customAttacks: (draft.customAttacks || []).map((item, index) => normalizeStructuredAttack(item, index)),
      weapons: (draft.weapons || []).map((item, index) => normalizeWeaponAttack(item, index)),
    };
    const saved = await saveCustomCreature(payload);
    setDraft(cloneCard(saved));
    setSelectedId(saved.id);
    await reload();
    setMessage(text.savedOk);
    return saved;
  };

  const removeCard = async () => {
    if (!selectedId) return;
    await deleteCustomCreature(selectedId);
    await reload();
    makeNew(kind);
  };

  const addAttack = () => {
    setDraft((current) => {
      const list = current.customAttacks || [];
      const attack = normalizeStructuredAttack({
        name: text.attackName,
        targetNumber: 10,
        damageDice: 4,
        attribute: kind === "creature" ? "BODY" : "STR",
        skill: "Melee Weapons",
        weaponType: "Melee",
        damageType: "Physical",
        range: "C",
        effects: "",
      }, list.length);
      setOpenAttack(list.length);
      return { ...current, customAttacks: [...list, attack] };
    });
  };
  const patchAttack = (index, value) => setDraft((current) => ({
    ...current,
    customAttacks: (current.customAttacks || []).map((attack, currentIndex) => currentIndex === index ? { ...attack, ...value } : attack),
  }));
  const removeAttack = (index) => {
    setDraft((current) => ({ ...current, customAttacks: (current.customAttacks || []).filter((_, currentIndex) => currentIndex !== index) }));
    setOpenAttack(null);
  };

  const addWeapon = () => {
    const source = weaponsDb.find((item) => item.id === weaponId);
    if (!source) return;
    setDraft((current) => {
      const list = current.weapons || [];
      const weapon = normalizeWeaponAttack({
        ...source,
        weaponId: source.id,
        targetNumber: 10,
        damageDice: source.damage,
        attribute: "PER",
        skill: source.weaponType || "Guns",
        effects: source.effect || source.effects || "",
      }, list.length);
      setOpenWeapon(list.length);
      return { ...current, weapons: [...list, weapon] };
    });
    setWeaponId("");
  };
  const patchWeapon = (index, value) => setDraft((current) => ({
    ...current,
    weapons: (current.weapons || []).map((weapon, currentIndex) => currentIndex === index ? { ...weapon, ...value } : weapon),
  }));
  const removeWeapon = (index) => {
    setDraft((current) => ({ ...current, weapons: (current.weapons || []).filter((_, currentIndex) => currentIndex !== index) }));
    setOpenWeapon(null);
  };

  const addToMap = async () => {
    if (!String(draft.name || "").trim()) { setMessage(text.required); return; }
    const scene = session?.tacticalScene;
    if (!scene) { setMessage(text.noScene); return; }
    const stats = applyNpcRank({
      ...draft,
      customAttacks: (draft.customAttacks || []).map((item, index) => normalizeStructuredAttack(item, index)),
      weapons: (draft.weapons || []).map((item, index) => normalizeWeaponAttack(item, index)),
    }, draft);
    const footprint = Math.max(1, Math.min(3, number(stats.footprint || stats.size, 1)));
    const placement = findFreePlacement(scene, footprint, []);
    if (!placement) { setMessage(text.noSpace); return; }
    const response = await session.createNpcToken?.({
      name: draft.name,
      npcId: draft.id,
      avatar: draft.avatar || "",
      size: footprint,
      x: placement.x,
      y: placement.y,
      stats: { ...stats, size: footprint, footprint, visibleToPlayers: false, controlledByClientId: "" },
    });
    setMessage(response?.ok ? text.added : `${text.failed}${response?.error ? ` [${response.error}]` : ""}`);
  };

  return (
    <section className="pip-panel gm-npc-card-editor-v8">
      <header className="gm-npc-v8-head">
        <h2>[ {text.title} ]</h2>
        <button type="button" className="pip-btn" onClick={() => makeNew(kind === "npc" ? "creature" : "npc")}>{text.npc} ⇄ {text.creature} · {kind === "npc" ? text.npc : text.creature}</button>
      </header>

      <div className="gm-npc-v8-library">
        <Field label={text.saved} wide>
          <select className="pip-input" value={selectedId} onChange={(e) => chooseSaved(e.target.value)}>
            <option value="">— {text.newCard} —</option>
            {library.map((card) => <option key={card.id} value={card.id}>{kindOf(card.cardKind) === "npc" ? text.npc : text.creature} · {card.name}</option>)}
          </select>
        </Field>
        <button type="button" className="pip-btn" onClick={() => makeNew(kind)}>{text.newCard}</button>
        <button type="button" className="pip-btn" disabled={!selectedId} onClick={removeCard}>{text.delete}</button>
      </div>

      <div className="gm-npc-v8-form-grid gm-npc-v8-identity">
        <Field label={text.name} wide><input className="pip-input" value={draft.name || ""} onChange={(e) => patch({ name: e.target.value })} /></Field>
        <Field label={text.type} wide><input className="pip-input" value={draft.creatureType || ""} onChange={(e) => patch({ creatureType: e.target.value })} /></Field>
        <Field label={text.level}><input className="pip-input" type="number" value={draft.level ?? 1} onChange={(e) => patch({ level: number(e.target.value) })} /></Field>
        <Field label={text.size}><select className="pip-input" value={Number(draft.baseSize || 1)} onChange={(e) => patch({ baseSize: number(e.target.value, 1), size: number(e.target.value, 1) })}><option value="1">1×1</option><option value="2">2×2</option></select></Field>
      </div>

      <section className="gm-npc-v8-section">
        <h3>{text.rank}</h3>
        <div className="gm-npc-v8-ranks">{NPC_RANKS.map((rank) => <button type="button" key={rank} className={`pip-btn${draft.rank === rank ? " is-primary" : ""}`} onClick={() => patch({ rank })}>{rank.toUpperCase()}</button>)}</div>
        <div className="gm-npc-v8-horde">
          <label><input type="checkbox" checked={Boolean(draft.hordeEnabled)} onChange={(e) => patch({ hordeEnabled: e.target.checked })} /> {text.horde}</label>
          {draft.hordeEnabled ? <Field label={text.members}><select className="pip-input" value={draft.hordeSize || 2} onChange={(e) => patch({ hordeSize: number(e.target.value, 2) })}>{[2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></Field> : null}
          <b>HP {effective.hp}/{effective.maxHp} · DEF {effective.defense} · {effective.footprint}×{effective.footprint}</b>
        </div>
      </section>

      <section className="gm-npc-v8-section">
        <div className="gm-npc-v8-form-grid">
          <Field label={text.hp}><input className="pip-input" type="number" value={draft.baseMaxHp ?? 10} onChange={(e) => patch({ baseMaxHp: Math.max(1, number(e.target.value, 1)), hp: Math.max(1, number(e.target.value, 1)), maxHp: Math.max(1, number(e.target.value, 1)) })} /></Field>
          <Field label={text.defense}><input className="pip-input" type="number" value={draft.baseDefense ?? 1} onChange={(e) => patch({ baseDefense: Math.max(0, number(e.target.value)), defense: Math.max(0, number(e.target.value)) })} /></Field>
          <Field label={text.xp}><input className="pip-input" type="number" value={draft.baseXp ?? 0} onChange={(e) => patch({ baseXp: Math.max(0, number(e.target.value)), xp: Math.max(0, number(e.target.value)) })} /></Field>
          <Field label={text.init}><input className="pip-input" type="number" value={draft.initiative ?? 0} onChange={(e) => patch({ initiative: Math.max(0, number(e.target.value)) })} /></Field>
        </div>
        {kind === "npc" ? <div className="gm-npc-v8-special">{SPECIAL_KEYS.map((key) => <Field key={key} label={key}><input className="pip-input" type="number" value={draft.special?.[key] ?? 5} onChange={(e) => patchSpecial(key, e.target.value)} /></Field>)}</div> : null}
      </section>

      <section className="gm-npc-v8-section">
        <div className="gm-npc-v8-section-head"><h3>{text.attacks}</h3><button type="button" className="pip-btn" onClick={addAttack}>+ {text.addAttack}</button></div>
        <div className="gm-npc-v8-list">
          {(draft.customAttacks || []).length ? (draft.customAttacks || []).map((attack, index) => (
            <article className="gm-npc-v8-combat-card" key={attack.id || index}>
              <div className="gm-npc-v8-card-summary">
                <div><strong>{attack.name || text.attackName}</strong><small>{attack.damageDice || 0} CD · {attack.damageType || "Physical"} · TN {attack.targetNumber ?? 10}</small></div>
                <div><button type="button" className="pip-btn" onClick={() => setOpenAttack(openAttack === index ? null : index)}>{openAttack === index ? text.collapse : text.edit}</button><button type="button" className="pip-btn" onClick={() => removeAttack(index)}>{text.remove}</button></div>
              </div>
              {openAttack === index ? <CombatProfileEditor profile={attack} onChange={(value) => patchAttack(index, value)} text={text} /> : null}
            </article>
          )) : <div className="pip-logbox">{text.empty}</div>}
        </div>
      </section>

      {kind === "npc" ? (
        <section className="gm-npc-v8-section">
          <div className="gm-npc-v8-section-head"><h3>{text.weapons}</h3><span>{weaponsDb.length}</span></div>
          <div className="gm-npc-v8-archive">
            <label>{text.archive}<input className="pip-input" type="search" value={weaponSearch} placeholder={text.archiveSearch} onChange={(e) => setWeaponSearch(e.target.value)} /></label>
            <select className="pip-input" value={weaponId} onChange={(e) => setWeaponId(e.target.value)}>
              <option value="">— {text.chooseWeapon} ({filteredWeapons.length}) —</option>
              {filteredWeapons.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.damage} CD · {weapon.weaponType}</option>)}
            </select>
            <button type="button" className="pip-btn" disabled={!weaponId} onClick={addWeapon}>+ {text.addWeapon}</button>
          </div>
          <div className="gm-npc-v8-list">
            {(draft.weapons || []).length ? (draft.weapons || []).map((weapon, index) => (
              <article className="gm-npc-v8-combat-card is-weapon" key={`${weapon.id || weapon.weaponId || "weapon"}-${index}`}>
                <div className="gm-npc-v8-card-summary">
                  <div><strong>{weapon.name || text.weapons}</strong><small>{weapon.damageDice || 0} CD · {weapon.damageType || "Physical"} · {weapon.range || "C"} · {weapon.weaponType || ""}</small></div>
                  <div><button type="button" className="pip-btn" onClick={() => setOpenWeapon(openWeapon === index ? null : index)}>{openWeapon === index ? text.collapse : text.edit}</button><button type="button" className="pip-btn" onClick={() => removeWeapon(index)}>{text.remove}</button></div>
                </div>
                {openWeapon === index ? <CombatProfileEditor profile={weapon} onChange={(value) => patchWeapon(index, value)} text={text} weapon /> : null}
              </article>
            )) : <div className="pip-logbox">{text.empty}</div>}
          </div>
        </section>
      ) : null}

      {message ? <div className="gm-token-manager-message">{message}</div> : null}
      <div className="gm-npc-v8-final-actions">
        <button type="button" className="pip-btn is-primary gm-npc-v8-create" onClick={createCard}>{kind === "npc" ? text.createNpc : text.createCreature}</button>
        <button type="button" className="pip-btn" onClick={addToMap}>{text.addMap}</button>
      </div>
    </section>
  );
}
