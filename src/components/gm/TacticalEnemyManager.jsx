import React, { useMemo, useState } from "react";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";

const CUSTOM_BESTIARY_KEY = "fallout_pipboy_bestiary_custom_v1";
const MAX_AVATAR_SOURCE_BYTES = 8 * 1024 * 1024;

const COPY = {
  en: {
    title: "NPC / ENEMY TOKENS",
    search: "Search bestiary...",
    choose: "Choose from bestiary",
    custom: "Custom token",
    name: "Token name",
    size: "SIZE",
    add: "ADD TOKEN",
    avatar: "AVATAR",
    replaceAvatar: "REPLACE AVATAR",
    remove: "REMOVE",
    hp: "HP",
    defense: "DEF",
    initiative: "INIT",
    level: "LVL",
    attacks: "ATTACKS",
    noTokens: "No enemy tokens on this tactical scene.",
    imageError: "Could not load token avatar.",
    imageTooLarge: "Avatar source file is too large (max 8 MB).",
    linked: "BESTIARY",
    manual: "MANUAL",
    selectOnMap: "SELECT",
  },
  ru: {
    title: "ТОКЕНЫ NPC / ВРАГОВ",
    search: "Поиск по бестиарию...",
    choose: "Выбрать из бестиария",
    custom: "Свободный токен",
    name: "Имя токена",
    size: "РАЗМЕР",
    add: "ДОБАВИТЬ ТОКЕН",
    avatar: "АВАТАР",
    replaceAvatar: "ЗАМЕНИТЬ АВАТАР",
    remove: "УДАЛИТЬ",
    hp: "HP",
    defense: "ЗАЩ",
    initiative: "ИНИЦ",
    level: "УР",
    attacks: "АТАКИ",
    noTokens: "На тактической сцене пока нет токенов врагов.",
    imageError: "Не удалось загрузить аватар токена.",
    imageTooLarge: "Файл аватара слишком большой (максимум 8 МБ).",
    linked: "БЕСТИАРИЙ",
    manual: "РУЧНОЙ",
    selectOnMap: "ВЫБРАТЬ",
  },
  uk: {
    title: "ТОКЕНИ NPC / ВОРОГІВ",
    search: "Пошук у бестіарії...",
    choose: "Обрати з бестіарію",
    custom: "Вільний токен",
    name: "Ім'я токена",
    size: "РОЗМІР",
    add: "ДОДАТИ ТОКЕН",
    avatar: "АВАТАР",
    replaceAvatar: "ЗАМІНИТИ АВАТАР",
    remove: "ВИДАЛИТИ",
    hp: "HP",
    defense: "ЗАХ",
    initiative: "ІНІЦ",
    level: "РІВ",
    attacks: "АТАКИ",
    noTokens: "На тактичній сцені ще немає токенів ворогів.",
    imageError: "Не вдалося завантажити аватар токена.",
    imageTooLarge: "Файл аватара завеликий (максимум 8 МБ).",
    linked: "БЕСТІАРІЙ",
    manual: "РУЧНИЙ",
    selectOnMap: "ОБРАТИ",
  },
  pl: {
    title: "TOKENY NPC / WROGÓW",
    search: "Szukaj w bestiariuszu...",
    choose: "Wybierz z bestiariusza",
    custom: "Token własny",
    name: "Nazwa tokena",
    size: "ROZMIAR",
    add: "DODAJ TOKEN",
    avatar: "AWATAR",
    replaceAvatar: "ZMIEŃ AWATAR",
    remove: "USUŃ",
    hp: "HP",
    defense: "OBR",
    initiative: "INIC",
    level: "POZ",
    attacks: "ATAKI",
    noTokens: "Brak tokenów wrogów na scenie taktycznej.",
    imageError: "Nie udało się wczytać awatara tokena.",
    imageTooLarge: "Plik awatara jest za duży (maks. 8 MB).",
    linked: "BESTIARIUSZ",
    manual: "RĘCZNY",
    selectOnMap: "WYBIERZ",
  },
};

function textCopy() {
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] || COPY.en;
}

function readCustomBestiary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_BESTIARY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isNpcEntry(entry) {
  if (!entry || entry.statKind === "rule") return false;
  return !["trap", "hazard", "obstacle"].includes(String(entry.category || "").toLowerCase());
}

function defaultSize(entry) {
  const haystack = `${entry?.abilities || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return haystack.includes("big") || haystack.includes("massive") ? 2 : 1;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function compressAvatar(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("image");
  if (file.size > MAX_AVATAR_SOURCE_BYTES) throw new Error("too-large");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const side = Math.min(sourceWidth, sourceHeight);
    const sx = Math.max(0, (sourceWidth - side) / 2);
    const sy = Math.max(0, (sourceHeight - side) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("canvas");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, side, side, 0, 0, 256, 256);
    return canvas.toDataURL("image/webp", 0.76);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function TacticalEnemyManager({ tokens = [], selectedTokenId, onSelectToken, onAddToken, onRemoveToken, onUpdateToken }) {
  const text = textCopy();
  const [search, setSearch] = useState("");
  const [bestiaryId, setBestiaryId] = useState("");
  const [name, setName] = useState("");
  const [size, setSize] = useState(1);
  const [error, setError] = useState("");

  const entries = useMemo(() => {
    const merged = [...BESTIARY_ENTRIES, ...readCustomBestiary()].filter(isNpcEntry);
    const seen = new Set();
    return merged.filter((entry) => {
      const key = String(entry?.id || entry?.name || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries.slice(0, 120);
    return entries.filter((entry) => `${entry.name || ""} ${entry.creatureType || ""} ${(entry.tags || []).join(" ")}`.toLowerCase().includes(query)).slice(0, 120);
  }, [entries, search]);

  const selectedEntry = entries.find((entry) => String(entry.id) === String(bestiaryId)) || null;

  const chooseEntry = (value) => {
    setBestiaryId(value);
    const entry = entries.find((item) => String(item.id) === String(value)) || null;
    if (entry) {
      setName(entry.name || "");
      setSize(defaultSize(entry));
    }
  };

  const add = () => {
    const finalName = String(name || selectedEntry?.name || "Enemy").trim();
    if (!finalName) return;
    onAddToken?.({ entry: selectedEntry, name: finalName, size });
  };

  const uploadAvatar = async (tokenId, file) => {
    if (!file) return;
    setError("");
    try {
      const avatar = await compressAvatar(file);
      onUpdateToken?.(tokenId, { avatar });
    } catch (uploadError) {
      setError(uploadError?.message === "too-large" ? text.imageTooLarge : text.imageError);
    }
  };

  return (
    <section className="tactical-enemy-manager">
      <div className="tactical-enemy-manager__head">
        <strong>[ {text.title} ]</strong>
        <span>{tokens.length}</span>
      </div>

      <div className="tactical-enemy-create">
        <input className="pip-input" value={search} placeholder={text.search} onChange={(event) => setSearch(event.target.value)} />
        <select className="pip-input" value={bestiaryId} onChange={(event) => chooseEntry(event.target.value)}>
          <option value="">— {text.custom} —</option>
          {filteredEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
        <input className="pip-input" value={name} placeholder={text.name} onChange={(event) => setName(event.target.value)} />
        <label className="tactical-enemy-size-label">
          {text.size}
          <select className="pip-input" value={size} onChange={(event) => setSize(Number(event.target.value) === 2 ? 2 : 1)}>
            <option value={1}>1×1</option>
            <option value={2}>2×2</option>
          </select>
        </label>
        <button type="button" className="pip-btn is-primary" onClick={add}>{text.add}</button>
      </div>

      {error ? <div className="session-error tactical-enemy-error">{error}</div> : null}

      <div className="tactical-enemy-list">
        {tokens.length ? tokens.map((token) => {
          const selected = token.id === selectedTokenId;
          return (
            <article key={token.id} className={`tactical-enemy-card${selected ? " is-selected" : ""}`}>
              <button type="button" className="tactical-enemy-avatar" onClick={() => onSelectToken?.(token.id)} title={text.selectOnMap}>
                {token.avatar ? <img src={token.avatar} alt="" /> : <span>{String(token.name || "E").slice(0, 1).toUpperCase()}</span>}
              </button>
              <div className="tactical-enemy-card__body">
                <div className="tactical-enemy-card__title">
                  <button type="button" onClick={() => onSelectToken?.(token.id)}>{token.name}</button>
                  <span>{token.bestiaryId ? text.linked : text.manual}</span>
                </div>
                <div className="tactical-enemy-stats">
                  {token.maxHp != null ? <span>{text.hp}: <strong>{token.hp}/{token.maxHp}</strong></span> : null}
                  {token.defense ? <span>{text.defense}: <strong>{token.defense}</strong></span> : null}
                  {token.initiative ? <span>{text.initiative}: <strong>{token.initiative}</strong></span> : null}
                  {token.level ? <span>{text.level}: <strong>{token.level}</strong></span> : null}
                </div>
                <div className="tactical-enemy-card__actions">
                  <label className="pip-btn tactical-avatar-upload">
                    {token.avatar ? text.replaceAvatar : text.avatar}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { uploadAvatar(token.id, event.target.files?.[0]); event.target.value = ""; }} />
                  </label>
                  <select className="pip-input" value={token.size === 2 ? 2 : 1} onChange={(event) => onUpdateToken?.(token.id, { size: Number(event.target.value) === 2 ? 2 : 1 })}>
                    <option value={1}>1×1</option>
                    <option value={2}>2×2</option>
                  </select>
                  {token.maxHp != null ? (
                    <>
                      <button type="button" className="pip-btn" onClick={() => onUpdateToken?.(token.id, { hp: Math.max(0, Number(token.hp || 0) - 1) })}>-HP</button>
                      <button type="button" className="pip-btn" onClick={() => onUpdateToken?.(token.id, { hp: Math.min(Number(token.maxHp || 0), Number(token.hp || 0) + 1) })}>+HP</button>
                    </>
                  ) : null}
                  <button type="button" className="pip-btn" onClick={() => onRemoveToken?.(token.id)}>{text.remove}</button>
                </div>
                {selected && token.attacks ? (
                  <div className="tactical-enemy-details">
                    <strong>{text.attacks}</strong>
                    <div>{token.attacks}</div>
                    {token.drBlock ? <div>DR: {token.drBlock}</div> : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        }) : <div className="pip-logbox">{text.noTokens}</div>}
      </div>
    </section>
  );
}
