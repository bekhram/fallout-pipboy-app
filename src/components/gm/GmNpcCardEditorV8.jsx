import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
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
    title: "CREATE NPC", npc: "NPC", creature: "CREATURE", saved: "SAVED CARD",
    newCard: "NEW CARD", remove: "DELETE", save: "SAVE CHANGES", addMap: "ADD TO MAP",
    name: "NAME", type: "TYPE", level: "LVL", size: "SIZE", rank: "RANK",
    horde: "HORDE", members: "MEMBERS", attacks: "CUSTOM ATTACKS", addAttack: "ADD ATTACK",
    attackName: "Attack name", skill: "Skill", damageType: "Damage type", range: "Range",
    effects: "Effects", weapons: "WEAPONS", selectWeapon: "Choose weapon", addWeapon: "ADD WEAPON",
    rof: "ROF", empty: "Nothing added", required: "Enter a name first", savedOk: "Card saved",
    added: "Token added to selected scene", failed: "Could not add token", noScene: "Select a scene first",
    noSpace: "Not enough free space",
  },
  ru: {
    title: "СОЗДАТЬ NPC", npc: "NPC", creature: "СУЩЕСТВО", saved: "СОХРАНЁННАЯ КАРТОЧКА",
    newCard: "НОВАЯ КАРТОЧКА", remove: "УДАЛИТЬ", save: "СОХРАНИТЬ ИЗМЕНЕНИЯ", addMap: "ДОБАВИТЬ НА КАРТУ",
    name: "ИМЯ", type: "ТИП", level: "LVL", size: "РАЗМЕР", rank: "РАНГ",
    horde: "ТОЛПА", members: "УЧАСТНИКОВ", attacks: "СВОИ АТАКИ", addAttack: "ДОБАВИТЬ АТАКУ",
    attackName: "Название атаки", skill: "Навык", damageType: "Тип урона", range: "Дистанция",
    effects: "Эффекты", weapons: "ОРУЖИЕ", selectWeapon: "Выбрать оружие", addWeapon: "ДОБАВИТЬ ОРУЖИЕ",
    rof: "СКОРОСТРЕЛЬНОСТЬ", empty: "Пока ничего не добавлено", required: "Сначала укажите имя", savedOk: "Карточка сохранена",
    added: "Токен добавлен на выбранную сцену", failed: "Не удалось добавить токен", noScene: "Сначала выберите сцену",
    noSpace: "Недостаточно свободного места",
  },
  uk: {
    title: "СТВОРИТИ NPC", npc: "NPC", creature: "ІСТОТА", saved: "ЗБЕРЕЖЕНА КАРТКА",
    newCard: "НОВА КАРТКА", remove: "ВИДАЛИТИ", save: "ЗБЕРЕГТИ ЗМІНИ", addMap: "ДОДАТИ НА МАПУ",
    name: "ІМ'Я", type: "ТИП", level: "LVL", size: "РОЗМІР", rank: "РАНГ",
    horde: "НАТОВП", members: "УЧАСНИКІВ", attacks: "ВЛАСНІ АТАКИ", addAttack: "ДОДАТИ АТАКУ",
    attackName: "Назва атаки", skill: "Навичка", damageType: "Тип шкоди", range: "Дистанція",
    effects: "Ефекти", weapons: "ЗБРОЯ", selectWeapon: "Обрати зброю", addWeapon: "ДОДАТИ ЗБРОЮ",
    rof: "ТЕМП ВОГНЮ", empty: "Поки нічого не додано", required: "Спочатку вкажіть ім'я", savedOk: "Картку збережено",
    added: "Токен додано на обрану сцену", failed: "Не вдалося додати токен", noScene: "Спочатку оберіть сцену",
    noSpace: "Недостатньо вільного місця",
  },
  pl: {
    title: "UTWÓRZ NPC", npc: "NPC", creature: "STWÓR", saved: "ZAPISANA KARTA",
    newCard: "NOWA KARTA", remove: "USUŃ", save: "ZAPISZ ZMIANY", addMap: "DODAJ NA MAPĘ",
    name: "NAZWA", type: "TYP", level: "LVL", size: "ROZMIAR", rank: "RANGA",
    horde: "HORDA", members: "CZŁONKÓW", attacks: "WŁASNE ATAKI", addAttack: "DODAJ ATAK",
    attackName: "Nazwa ataku", skill: "Umiejętność", damageType: "Typ obrażeń", range: "Zasięg",
    effects: "Efekty", weapons: "BROŃ", selectWeapon: "Wybierz broń", addWeapon: "DODAJ BROŃ",
    rof: "SZYBKOSTRZELNOŚĆ", empty: "Nic jeszcze nie dodano", required: "Najpierw podaj nazwę", savedOk: "Karta zapisana",
    added: "Token dodany do wybranej sceny", failed: "Nie udało się dodać tokena", noScene: "Najpierw wybierz scenę",
    noSpace: "Brak wolnego miejsca",
  },
};

function getCopy(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] || COPY.en;
}

function cardKind(value) {
  return String(value || "").toLowerCase() === "creature" ? "creature" : "npc";
}

function numberValue(value, fallback = 0) {
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

function Field({ label, children, wide = false }) {
  return (
    <label className={wide ? "is-wide" : ""}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function GmNpcCardEditorV8({ session }) {
  const { i18n } = useTranslation();
  const text = getCopy(i18n.resolvedLanguage || i18n.language);
  const [kind, setKind] = useState("npc");
  const [draft, setDraft] = useState(() => cloneCard(blankCreature("npc")));
  const [library, setLibrary] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [weaponDb, setWeaponDb] = useState([]);
  const [weaponId, setWeaponId] = useState("");
  const [message, setMessage] = useState("");

  const effective = useMemo(() => applyNpcRank(draft, draft), [draft]);

  const reload = async () => {
    const items = await loadCustomCreatures().catch(() => []);
    setLibrary(Array.isArray(items) ? items : []);
  };

  useEffect(() => {
    reload();
    loadNpcWeaponDatabase().then(setWeaponDb).catch(() => setWeaponDb([]));
  }, []);

  const patch = (patchValue) => {
    setDraft((current) => ({ ...current, ...patchValue }));
  };

  const reset = (nextKind = kind) => {
    const resolved = cardKind(nextKind);
    setKind(resolved);
    setSelectedId("");
    setWeaponId("");
    setDraft(cloneCard(blankCreature(resolved)));
    setMessage("");
  };

  const chooseSaved = (id) => {
    if (!id) {
      reset(kind);
      return;
    }
    const item = library.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    setSelectedId(id);
    setKind(cardKind(item.cardKind));
    setDraft(cloneCard(item));
    setMessage("");
  };

  const saveCard = async () => {
    if (!String(draft.name || "").trim()) {
      setMessage(text.required);
      return null;
    }
    const payload = {
      ...draft,
      cardKind: kind,
      category: kind,
      customAttacks: (draft.customAttacks || []).map((attack, index) => normalizeStructuredAttack(attack, index)),
      weapons: (draft.weapons || []).map((weapon, index) => normalizeWeaponAttack(weapon, index)),
    };
    const saved = await saveCustomCreature(payload);
    setDraft(cloneCard(saved));
    setSelectedId(saved.id);
    await reload();
    setMessage(text.savedOk);
    return saved;
  };

  const deleteCard = async () => {
    if (!selectedId) return;
    await deleteCustomCreature(selectedId);
    await reload();
    reset(kind);
  };

  const addAttack = () => {
    setDraft((current) => {
      const list = current.customAttacks || [];
      const attack = normalizeStructuredAttack({
        name: text.attackName,
        targetNumber: 10,
        damageDice: 4,
        skill: "Combat",
        attribute: kind === "creature" ? "BODY" : "SPECIAL",
        damageType: "Physical",
        range: "C",
        effects: "",
      }, list.length);
      return { ...current, customAttacks: [...list, attack] };
    });
  };

  const patchAttack = (index, attackPatch) => {
    setDraft((current) => ({
      ...current,
      customAttacks: (current.customAttacks || []).map((attack, itemIndex) =>
        itemIndex === index ? { ...attack, ...attackPatch } : attack
      ),
    }));
  };

  const removeAttack = (index) => {
    setDraft((current) => ({
      ...current,
      customAttacks: (current.customAttacks || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addWeapon = () => {
    const source = weaponDb.find((item) => item.id === weaponId);
    if (!source) return;
    setDraft((current) => {
      const list = current.weapons || [];
      const weapon = normalizeWeaponAttack({
        ...source,
        weaponId: source.id,
        targetNumber: 10,
        damageDice: source.damage,
        skill: source.weaponType || "Combat",
        damageType: source.damageType || "Physical",
        range: source.range || "C",
        rate: source.rate || 0,
        effects: source.effects || "",
      }, list.length);
      return { ...current, weapons: [...list, weapon] };
    });
    setWeaponId("");
  };

  const patchWeapon = (index, weaponPatch) => {
    setDraft((current) => ({
      ...current,
      weapons: (current.weapons || []).map((weapon, itemIndex) =>
        itemIndex === index ? { ...weapon, ...weaponPatch } : weapon
      ),
    }));
  };

  const removeWeapon = (index) => {
    setDraft((current) => ({
      ...current,
      weapons: (current.weapons || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addToMap = async () => {
    if (!String(draft.name || "").trim()) {
      setMessage(text.required);
      return;
    }
    const scene = session?.tacticalScene;
    if (!scene) {
      setMessage(text.noScene);
      return;
    }
    const prepared = {
      ...draft,
      customAttacks: (draft.customAttacks || []).map((attack, index) => normalizeStructuredAttack(attack, index)),
      weapons: (draft.weapons || []).map((weapon, index) => normalizeWeaponAttack(weapon, index)),
    };
    const stats = applyNpcRank(prepared, prepared);
    const footprint = Math.max(1, Math.min(3, numberValue(stats.footprint || stats.size, 1)));
    const placement = findFreePlacement(scene, footprint, []);
    if (!placement) {
      setMessage(text.noSpace);
      return;
    }
    const response = await session.createNpcToken?.({
      name: draft.name,
      npcId: draft.id,
      avatar: draft.avatar || "",
      size: footprint,
      x: placement.x,
      y: placement.y,
      stats: {
        ...stats,
        size: footprint,
        footprint,
        visibleToPlayers: false,
        controlledByClientId: "",
      },
    });
    setMessage(response?.ok ? text.added : `${text.failed}${response?.error ? ` [${response.error}]` : ""}`);
  };

  const attackCards = (draft.customAttacks || []).map((attack, index) => (
    <article className="gm-npc-v8-card" key={attack.id || index}>
      <Field label={text.attackName} wide>
        <input className="pip-input" value={attack.name || ""} onChange={(event) => patchAttack(index, { name: event.target.value })} />
      </Field>
      <div className="gm-npc-v8-grid gm-npc-v8-attack-grid">
        <Field label="TN"><input className="pip-input" inputMode="numeric" value={attack.targetNumber ?? 10} onChange={(event) => patchAttack(index, { targetNumber: event.target.value })} /></Field>
        <Field label="CD"><input className="pip-input" inputMode="numeric" value={attack.damageDice ?? 0} onChange={(event) => patchAttack(index, { damageDice: event.target.value })} /></Field>
        <Field label={text.skill}><input className="pip-input" value={attack.skill || ""} onChange={(event) => patchAttack(index, { skill: event.target.value })} /></Field>
        <Field label={text.damageType}><input className="pip-input" value={attack.damageType || ""} onChange={(event) => patchAttack(index, { damageType: event.target.value })} /></Field>
        <Field label={text.range}><input className="pip-input" value={attack.range || ""} onChange={(event) => patchAttack(index, { range: event.target.value })} /></Field>
        <Field label={text.effects} wide><input className="pip-input" value={attack.effects || ""} onChange={(event) => patchAttack(index, { effects: event.target.value })} /></Field>
      </div>
      <button type="button" className="pip-btn gm-npc-v8-remove" onClick={() => removeAttack(index)}>×</button>
    </article>
  ));

  const weaponCards = (draft.weapons || []).map((weapon, index) => (
    <article className="gm-npc-v8-card is-weapon" key={`${weapon.id || weapon.weaponId || "weapon"}-${index}`}>
      <Field label={text.weapons} wide>
        <input className="pip-input" value={weapon.name || ""} onChange={(event) => patchWeapon(index, { name: event.target.value })} />
      </Field>
      <div className="gm-npc-v8-grid gm-npc-v8-attack-grid">
        <Field label="TN"><input className="pip-input" inputMode="numeric" value={weapon.targetNumber ?? 10} onChange={(event) => patchWeapon(index, { targetNumber: event.target.value })} /></Field>
        <Field label="CD"><input className="pip-input" inputMode="numeric" value={weapon.damageDice ?? 0} onChange={(event) => patchWeapon(index, { damageDice: event.target.value })} /></Field>
        <Field label={text.skill}><input className="pip-input" value={weapon.skill || ""} onChange={(event) => patchWeapon(index, { skill: event.target.value })} /></Field>
        <Field label={text.damageType}><input className="pip-input" value={weapon.damageType || ""} onChange={(event) => patchWeapon(index, { damageType: event.target.value })} /></Field>
        <Field label={text.range}><input className="pip-input" value={weapon.range || ""} onChange={(event) => patchWeapon(index, { range: event.target.value })} /></Field>
        <Field label={text.rof}><input className="pip-input" inputMode="numeric" value={weapon.rate ?? 0} onChange={(event) => patchWeapon(index, { rate: event.target.value })} /></Field>
        <Field label={text.effects} wide><input className="pip-input" value={weapon.effects || ""} onChange={(event) => patchWeapon(index, { effects: event.target.value })} /></Field>
      </div>
      <button type="button" className="pip-btn gm-npc-v8-remove" onClick={() => removeWeapon(index)}>×</button>
    </article>
  ));

  return (
    <section className="pip-panel gm-npc-card-editor-v8">
      <header className="gm-npc-v8-head">
        <h2>[ {text.title} ]</h2>
        <button type="button" className="pip-btn is-primary" onClick={() => reset(kind === "npc" ? "creature" : "npc")}>
          {text.npc} ⇄ {text.creature} · {kind === "npc" ? text.npc : text.creature}
        </button>
      </header>

      <div className="gm-npc-v8-library">
        <Field label={text.saved} wide>
          <select className="pip-input" value={selectedId} onChange={(event) => chooseSaved(event.target.value)}>
            <option value="">— {text.newCard} —</option>
            {library.map((item) => <option key={item.id} value={item.id}>{cardKind(item.cardKind) === "npc" ? text.npc : text.creature} · {item.name}</option>)}
          </select>
        </Field>
        <button type="button" className="pip-btn" onClick={() => reset(kind)}>{text.newCard}</button>
        <button type="button" className="pip-btn" disabled={!selectedId} onClick={deleteCard}>{text.remove}</button>
      </div>

      <div className="gm-npc-v8-actions">
        <button type="button" className="pip-btn is-primary" onClick={saveCard}>{text.save}</button>
        <button type="button" className="pip-btn" onClick={addToMap}>{text.addMap}</button>
      </div>
      {message ? <div className="gm-token-manager-message">{message}</div> : null}

      <div className="gm-npc-v8-grid">
        <Field label={text.name} wide><input className="pip-input" value={draft.name || ""} onChange={(event) => patch({ name: event.target.value })} /></Field>
        <Field label={text.type} wide><input className="pip-input" value={draft.creatureType || ""} onChange={(event) => patch({ creatureType: event.target.value })} /></Field>
        <Field label={text.level}><input className="pip-input" type="number" value={draft.level ?? 1} onChange={(event) => patch({ level: numberValue(event.target.value) })} /></Field>
        <Field label={text.size}><select className="pip-input" value={draft.baseSize || 1} onChange={(event) => patch({ baseSize: numberValue(event.target.value, 1), size: numberValue(event.target.value, 1) })}><option value="1">1×1</option><option value="2">2×2</option></select></Field>
      </div>

      <section className="gm-npc-v8-section">
        <h3>{text.rank}</h3>
        <div className="gm-npc-v8-ranks">
          {NPC_RANKS.map((rank) => <button type="button" key={rank} className={`pip-btn${draft.rank === rank ? " is-primary" : ""}`} onClick={() => patch({ rank })}>{rank.toUpperCase()}</button>)}
        </div>
        <div className="gm-npc-v8-horde">
          <label><input type="checkbox" checked={Boolean(draft.hordeEnabled)} onChange={(event) => patch({ hordeEnabled: event.target.checked })} /> {text.horde}</label>
          {draft.hordeEnabled ? <Field label={text.members}><select className="pip-input" value={draft.hordeSize || 2} onChange={(event) => patch({ hordeSize: numberValue(event.target.value, 2) })}>{[2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></Field> : null}
          <b>HP {effective.hp}/{effective.maxHp} · DEF {effective.defense} · {effective.footprint}×{effective.footprint}</b>
        </div>
      </section>

      {kind === "npc" ? (
        <section className="gm-npc-v8-section">
          <h3>{text.npc} S.P.E.C.I.A.L.</h3>
          <div className="gm-npc-v8-special">
            {SPECIAL_KEYS.map((key) => <Field key={key} label={key}><input className="pip-input" type="number" value={draft.special?.[key] ?? 5} onChange={(event) => setDraft((current) => ({ ...current, special: { ...(current.special || {}), [key]: event.target.value } }))} /></Field>)}
          </div>
        </section>
      ) : null}

      <section className="gm-npc-v8-section">
        <div className="gm-npc-v8-section-head"><h3>{text.attacks}</h3><button type="button" className="pip-btn" onClick={addAttack}>+ {text.addAttack}</button></div>
        <div className="gm-npc-v8-list">{attackCards.length ? attackCards : <div className="pip-logbox">{text.empty}</div>}</div>
        <button type="button" className="pip-btn is-primary gm-npc-v8-save-section" onClick={saveCard}>{text.save}</button>
      </section>

      {kind === "npc" ? (
        <section className="gm-npc-v8-section">
          <div className="gm-npc-v8-section-head"><h3>{text.weapons}</h3><span>{weaponDb.length}</span></div>
          <div className="gm-npc-v8-weapon-picker">
            <select className="pip-input" value={weaponId} onChange={(event) => setWeaponId(event.target.value)}>
              <option value="">— {text.selectWeapon} —</option>
              {weaponDb.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.name} · {weapon.damage} CD</option>)}
            </select>
            <button type="button" className="pip-btn" disabled={!weaponId} onClick={addWeapon}>+ {text.addWeapon}</button>
          </div>
          <div className="gm-npc-v8-list">{weaponCards}</div>
          <button type="button" className="pip-btn is-primary gm-npc-v8-save-section" onClick={saveCard}>{text.save}</button>
        </section>
      ) : null}
    </section>
  );
}
