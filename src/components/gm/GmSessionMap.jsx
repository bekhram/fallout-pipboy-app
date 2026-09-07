import React, { useEffect, useMemo, useRef, useState } from "react";
import TacticalEnemyManager from "./TacticalEnemyManager.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import "./gmSessionMap.css";

const DEFAULT_COLS = 12;
const DEFAULT_ROWS = 12;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_BACKGROUND_LENGTH = 790000;

const COPY = {
  en: {
    title: "TACTICAL MAP", waiting: "Waiting for the Socket.IO GM session...", players: "PLAYER TOKENS", startZone: "START ZONE",
    editStart: "EDIT START ZONE", finishEdit: "FINISH EDITING", startScene: "ENABLE SCENE", resetPlayers: "RETURN PLAYERS TO START",
    endScene: "END SCENE", inactive: "Prepare the battlemap, mark the start zone and enable the scene when players should enter.",
    active: "SCENE ENABLED", move: "Drag any token to a free cell, or select it and click a destination cell.",
    editHint: "Click cells to add or remove them from the player start zone.", size: "GRID", resetMap: "RESET MAP",
    uploadBackground: "UPLOAD BACKGROUND", replaceBackground: "REPLACE BACKGROUND", removeBackground: "REMOVE BACKGROUND",
    background: "BACKGROUND", noBackground: "No background image", processing: "PROCESSING IMAGE...",
    imageError: "Could not prepare this image.", imageTooLarge: "Image is too large. Maximum source file size is 12 MB.", connected: "SERVER LINKS",
  },
  ru: {
    title: "ТАКТИЧЕСКАЯ КАРТА", waiting: "Ожидаю Socket.IO сессию ГМ...", players: "ТОКЕНЫ ИГРОКОВ", startZone: "СТАРТОВАЯ ЗОНА",
    editStart: "ИЗМЕНИТЬ СТАРТОВУЮ ЗОНУ", finishEdit: "ЗАКОНЧИТЬ РЕДАКТИРОВАНИЕ", startScene: "ВКЛЮЧИТЬ СЦЕНУ",
    resetPlayers: "ВЕРНУТЬ ИГРОКОВ В СТАРТ", endScene: "ЗАВЕРШИТЬ СЦЕНУ",
    inactive: "Подготовьте карту, отметьте стартовую зону и включите сцену, когда игрокам нужно перейти в тактический режим.",
    active: "СЦЕНА ВКЛЮЧЕНА", move: "Перетягивайте токены на свободные клетки или выберите токен и нажмите клетку назначения.",
    editHint: "Нажимайте клетки, чтобы добавить или убрать их из стартовой зоны.", size: "СЕТКА", resetMap: "СБРОСИТЬ КАРТУ",
    uploadBackground: "ЗАГРУЗИТЬ ФОН", replaceBackground: "ЗАМЕНИТЬ ФОН", removeBackground: "УДАЛИТЬ ФОН", background: "ФОН",
    noBackground: "Фоновая картинка не загружена", processing: "ОБРАБОТКА ИЗОБРАЖЕНИЯ...", imageError: "Не удалось подготовить изображение.",
    imageTooLarge: "Файл слишком большой. Максимум 12 МБ.", connected: "ПОДКЛЮЧЕНИЯ К СЕРВЕРУ",
  },
  uk: {
    title: "ТАКТИЧНА МАПА", waiting: "Очікую Socket.IO сесію ГМ...", players: "ТОКЕНИ ГРАВЦІВ", startZone: "СТАРТОВА ЗОНА",
    editStart: "ЗМІНИТИ СТАРТОВУ ЗОНУ", finishEdit: "ЗАКІНЧИТИ РЕДАГУВАННЯ", startScene: "УВІМКНУТИ СЦЕНУ",
    resetPlayers: "ПОВЕРНУТИ ГРАВЦІВ НА СТАРТ", endScene: "ЗАВЕРШИТИ СЦЕНУ",
    inactive: "Підготуйте карту, позначте стартову зону й увімкніть сцену, коли гравцям потрібно перейти в тактичний режим.",
    active: "СЦЕНУ УВІМКНЕНО", move: "Перетягуйте токени на вільні клітинки або оберіть токен і натисніть клітинку призначення.",
    editHint: "Натискайте клітинки, щоб додати або прибрати їх зі стартової зони.", size: "СІТКА", resetMap: "СКИНУТИ МАПУ",
    uploadBackground: "ЗАВАНТАЖИТИ ФОН", replaceBackground: "ЗАМІНИТИ ФОН", removeBackground: "ВИДАЛИТИ ФОН", background: "ФОН",
    noBackground: "Фонове зображення не завантажено", processing: "ОБРОБКА ЗОБРАЖЕННЯ...", imageError: "Не вдалося підготувати зображення.",
    imageTooLarge: "Файл завеликий. Максимум 12 МБ.", connected: "ПІДКЛЮЧЕННЯ ДО СЕРВЕРА",
  },
  pl: {
    title: "MAPA TAKTYCZNA", waiting: "Oczekiwanie na sesję Socket.IO GM...", players: "TOKENY GRACZY", startZone: "STREFA STARTOWA",
    editStart: "EDYTUJ STREFĘ STARTOWĄ", finishEdit: "ZAKOŃCZ EDYCJĘ", startScene: "WŁĄCZ SCENĘ",
    resetPlayers: "PRZENIEŚ GRACZY NA START", endScene: "ZAKOŃCZ SCENĘ",
    inactive: "Przygotuj mapę, zaznacz strefę startową i włącz scenę, gdy gracze mają wejść do trybu taktycznego.",
    active: "SCENA WŁĄCZONA", move: "Przeciągaj tokeny na wolne pola albo wybierz token i kliknij pole docelowe.",
    editHint: "Klikaj pola, aby dodać lub usunąć je ze strefy startowej.", size: "SIATKA", resetMap: "RESETUJ MAPĘ",
    uploadBackground: "WGRAJ TŁO", replaceBackground: "ZMIEŃ TŁO", removeBackground: "USUŃ TŁO", background: "TŁO",
    noBackground: "Brak obrazu tła", processing: "PRZETWARZANIE OBRAZU...", imageError: "Nie udało się przygotować obrazu.",
    imageTooLarge: "Plik jest za duży. Maks. 12 MB.", connected: "POŁĄCZENIA Z SERWEREM",
  },
};

function languageCode() {
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function makeStartZone(cols, rows) {
  const result = [];
  for (let y = Math.max(0, rows - 3); y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function tokenSize(token) {
  return Number(token?.size) === 2 ? 2 : 1;
}

function cellKey(x, y) {
  return `${x}:${y}`;
}

function cellsFor(token, x = token.x, y = token.y) {
  const result = [];
  const size = tokenSize(token);
  for (let dy = 0; dy < size; dy += 1) for (let dx = 0; dx < size; dx += 1) result.push(cellKey(x + dx, y + dy));
  return result;
}

function freeCell(tokens, movingId, x, y, size, cols, rows) {
  if (x < 0 || y < 0 || x + size > cols || y + size > rows) return false;
  const occupied = new Set();
  tokens.forEach((token) => {
    if (token.id === movingId) return;
    cellsFor(token).forEach((key) => occupied.add(key));
  });
  const probe = { id: movingId, x, y, size };
  return cellsFor(probe).every((key) => !occupied.has(key));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function renderImage(image, maxDimension, quality) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("canvas");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", quality);
}

async function compressBackground(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("image");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("too-large");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const attempts = [[1500, .72], [1250, .68], [1050, .62], [900, .58], [760, .54]];
    let result = "";
    for (const [dimension, quality] of attempts) {
      result = renderImage(image, dimension, quality);
      if (result.length <= MAX_BACKGROUND_LENGTH) return result;
    }
    throw new Error("too-large");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function npcStats(entry) {
  if (!entry) return null;
  const maxHp = Number(entry.maxHp ?? entry.hp ?? entry.health ?? 0) || null;
  return {
    hp: maxHp,
    maxHp,
    defense: Number(entry.defense ?? entry.def ?? 0) || null,
    initiative: Number(entry.initiative ?? entry.init ?? 0) || null,
    level: Number(entry.level ?? 0) || null,
    attacks: String(entry.attacks ?? entry.attack ?? entry.weapons ?? ""),
    drBlock: String(entry.drBlock ?? entry.dr ?? entry.resistance ?? ""),
  };
}

function managerToken(token) {
  const stats = token.stats || {};
  return {
    ...token,
    bestiaryId: token.npcId || "",
    hp: stats.hp ?? stats.currentHp ?? null,
    maxHp: stats.maxHp ?? null,
    defense: stats.defense ?? null,
    initiative: stats.initiative ?? null,
    level: stats.level ?? null,
    attacks: stats.attacks ?? "",
    drBlock: stats.drBlock ?? "",
  };
}

export default function GmSessionMap({ session: sessionProp = null }) {
  const bridgedSession = useLiveSessionBridge();
  const session = sessionProp || bridgedSession;
  const text = COPY[languageCode()];
  const remote = session?.tacticalScene || null;
  const [draft, setDraft] = useState(() => ({
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    startZone: makeStartZone(DEFAULT_COLS, DEFAULT_ROWS),
    backgroundUrl: "",
    backgroundName: "",
  }));
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [editingStart, setEditingStart] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragState, setDragState] = useState(null);
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!remote || remote.active) return;
    setDraft((current) => ({
      ...current,
      cols: Number(remote.cols || current.cols || DEFAULT_COLS),
      rows: Number(remote.rows || current.rows || DEFAULT_ROWS),
      startZone: Array.isArray(remote.startZone) && remote.startZone.length ? remote.startZone : current.startZone,
      backgroundUrl: remote.backgroundUrl || current.backgroundUrl || "",
      backgroundName: remote.backgroundName || current.backgroundName || "",
    }));
  }, [remote?.sceneId]);

  const scene = remote?.active
    ? remote
    : {
        ...(remote || {}),
        active: false,
        cols: draft.cols,
        rows: draft.rows,
        startZone: draft.startZone,
        backgroundUrl: draft.backgroundUrl,
        backgroundName: draft.backgroundName,
        tokens: remote?.tokens || [],
      };

  const cols = Number(scene?.cols || DEFAULT_COLS);
  const rows = Number(scene?.rows || DEFAULT_ROWS);
  const tokens = Array.isArray(scene?.tokens) ? scene.tokens : [];
  const playerTokens = tokens.filter((token) => token.kind === "player");
  const enemyTokens = tokens.filter((token) => token.kind !== "player");
  const startKeys = useMemo(() => new Set((scene?.startZone || []).map((cell) => cellKey(cell.x, cell.y))), [scene?.startZone]);

  if (!session?.isActive || session?.mode !== "host") {
    return <section className="pip-panel gm-session-map tactical-map"><div className="gm-session-map__hint">{text.waiting}</div></section>;
  }

  const setGridSize = (value) => {
    if (remote?.active) return;
    const [nextCols, nextRows] = String(value).split("x").map(Number);
    if (!nextCols || !nextRows) return;
    setDraft((current) => ({ ...current, cols: nextCols, rows: nextRows, startZone: makeStartZone(nextCols, nextRows) }));
  };

  const toggleStartCell = async (x, y) => {
    if (!editingStart) return;
    const key = cellKey(x, y);
    const current = scene.startZone || [];
    const next = startKeys.has(key) ? current.filter((cell) => cellKey(cell.x, cell.y) !== key) : [...current, { x, y }];
    if (remote?.active) await session.updateTacticalScene?.({ startZone: next });
    else setDraft((value) => ({ ...value, startZone: next }));
  };

  const uploadBackground = async (file) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const backgroundUrl = await compressBackground(file);
      if (remote?.active) await session.updateTacticalScene?.({ backgroundUrl, backgroundName: file.name });
      else setDraft((value) => ({ ...value, backgroundUrl, backgroundName: file.name }));
    } catch (error) {
      setUploadError(error?.message === "too-large" ? text.imageTooLarge : text.imageError);
    } finally {
      setUploading(false);
    }
  };

  const removeBackground = async () => {
    if (remote?.active) await session.updateTacticalScene?.({ backgroundUrl: "", backgroundName: "" });
    else setDraft((value) => ({ ...value, backgroundUrl: "", backgroundName: "" }));
  };

  const enableScene = async () => {
    setEditingStart(false);
    await session.enableTacticalScene?.({
      cols: draft.cols,
      rows: draft.rows,
      startZone: draft.startZone,
      backgroundUrl: draft.backgroundUrl,
      backgroundName: draft.backgroundName,
      keepNpcs: true,
    });
  };

  const returnPlayersToStart = async () => {
    if (!remote?.active) return;
    const placed = enemyTokens.map((token) => ({ ...token }));
    const preferred = remote.startZone?.length ? remote.startZone : makeStartZone(cols, rows);
    for (const token of playerTokens) {
      let target = null;
      for (const cell of preferred) {
        if (freeCell(placed, token.id, cell.x, cell.y, 1, cols, rows)) { target = cell; break; }
      }
      if (!target) continue;
      await session.moveToken?.(token.id, target.x, target.y);
      placed.push({ ...token, x: target.x, y: target.y, size: 1 });
    }
  };

  const resetMap = async () => {
    if (remote?.active) await session.disableTacticalScene?.();
    for (const token of tokens) await session.deleteToken?.(token.id);
    setSelectedTokenId(null);
    setEditingStart(false);
    setDraft({ cols: DEFAULT_COLS, rows: DEFAULT_ROWS, startZone: makeStartZone(DEFAULT_COLS, DEFAULT_ROWS), backgroundUrl: "", backgroundName: "" });
  };

  const addEnemy = async ({ entry, name, size }) => {
    await session.createNpcToken?.({ name, size, npcId: entry?.id || null, stats: npcStats(entry) });
  };

  const updateEnemy = async (tokenId, patch = {}) => {
    const source = tokens.find((token) => token.id === tokenId);
    if (!source) return;
    const next = {};
    if (Object.prototype.hasOwnProperty.call(patch, "avatar")) next.avatar = patch.avatar;
    if (Object.prototype.hasOwnProperty.call(patch, "size")) next.size = patch.size;
    if (Object.prototype.hasOwnProperty.call(patch, "name")) next.name = patch.name;
    const statKeys = ["hp", "maxHp", "defense", "initiative", "level", "attacks", "drBlock"];
    if (statKeys.some((key) => Object.prototype.hasOwnProperty.call(patch, key))) {
      next.stats = { ...(source.stats || {}) };
      statKeys.forEach((key) => { if (Object.prototype.hasOwnProperty.call(patch, key)) next.stats[key] = patch[key]; });
    }
    await session.updateToken?.(tokenId, next);
  };

  const moveSelected = async (x, y) => {
    if (!selectedTokenId || editingStart) return;
    await session.moveToken?.(selectedTokenId, x, y);
  };

  const beginDrag = (event, token) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = tokenSize(token);
    const anchorX = Math.max(0, Math.min(size - 1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * size)));
    const anchorY = Math.max(0, Math.min(size - 1, Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * size)));
    dragRef.current = { tokenId: token.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, anchorX, anchorY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({ tokenId: token.id, x: event.clientX, y: event.clientY, avatar: token.avatar || "", name: token.name || "", size, moved: false });
    event.stopPropagation();
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5;
    if (drag.moved) event.preventDefault();
    setDragState((value) => value ? { ...value, x: event.clientX, y: event.clientY, moved: drag.moved } : value);
  };

  const finishDrag = async (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();
    if (!drag.moved) { setSelectedTokenId((value) => value === drag.tokenId ? null : drag.tokenId); return; }
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * cols) - drag.anchorX;
    const y = Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * rows) - drag.anchorY;
    await session.moveToken?.(drag.tokenId, x, y);
  };

  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const anchored = tokens.filter((token) => Number(token.x) === x && Number(token.y) === y);
      cells.push(
        <button
          type="button"
          key={cellKey(x, y)}
          className={`gm-session-map__cell tactical-cell${startKeys.has(cellKey(x, y)) ? " is-start-zone" : ""}${editingStart ? " is-start-edit" : ""}`}
          onClick={() => editingStart ? toggleStartCell(x, y) : moveSelected(x, y)}
        >
          {anchored.length ? <span className="gm-session-map__tokens">
            {anchored.map((token) => {
              const size = tokenSize(token);
              return <span
                key={token.id}
                className={`gm-session-token ${token.kind === "player" ? "is-player" : "is-npc is-enemy"} is-size-${size}${selectedTokenId === token.id ? " is-selected" : ""}${dragState?.tokenId === token.id ? " is-dragging" : ""}`}
                onPointerDown={(event) => beginDrag(event, token)}
                onPointerMove={moveDrag}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
              >
                {token.avatar ? <img src={token.avatar} alt="" /> : <b>{String(token.name || "T").slice(0, 1).toUpperCase()}</b>}
                <small>{token.name}</small>
              </span>;
            })}
          </span> : null}
        </button>
      );
    }
  }

  return (
    <section className="pip-panel gm-session-map tactical-map">
      <div className="gm-session-map__head">
        <div><div className="gm-session-map__eyebrow">PIP 2D20 // SOCKET.IO TACTICAL</div><h2>[ {text.title} ]</h2></div>
        <div className="gm-session-map__meta">
          <span>{session.sessionCode}</span>
          <span className={remote?.active ? "tactical-live" : ""}>{remote?.active ? text.active : session.status}</span>
          <span>{text.connected}: {session.players?.length || 0}</span>
          <span>{text.players}: {playerTokens.length}</span>
        </div>
      </div>

      <div className="tactical-toolbar">
        <label className="tactical-size-select">{text.size}
          <select className="pip-input" value={`${cols}x${rows}`} disabled={Boolean(remote?.active)} onChange={(event) => setGridSize(event.target.value)}>
            <option value="8x8">8×8</option><option value="12x12">12×12</option><option value="16x12">16×12</option><option value="16x16">16×16</option>
          </select>
        </label>
        <button type="button" className={`pip-btn${editingStart ? " is-primary" : ""}`} onClick={() => setEditingStart((value) => !value)}>{editingStart ? text.finishEdit : text.editStart}</button>
        {!remote?.active
          ? <button type="button" className="pip-btn is-primary" onClick={enableScene}>{text.startScene}</button>
          : <><button type="button" className="pip-btn" onClick={returnPlayersToStart}>{text.resetPlayers}</button><button type="button" className="pip-btn" onClick={() => session.disableTacticalScene?.()}>{text.endScene}</button></>}
        <button type="button" className="pip-btn" onClick={resetMap}>{text.resetMap}</button>
      </div>

      <div className={`gm-session-map__hint${editingStart ? " is-editing" : ""}`}>{editingStart ? text.editHint : (remote?.active ? text.move : text.inactive)} · {text.startZone}: {scene.startZone?.length || 0}</div>

      <input ref={fileRef} className="tactical-background-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { uploadBackground(event.target.files?.[0]); event.target.value = ""; }} />
      <div className="tactical-background-bar">
        <div className="tactical-background-info"><span>{text.background}</span><strong>{scene.backgroundName || text.noBackground}</strong></div>
        <div className="tactical-background-actions">
          <button type="button" className="pip-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? text.processing : (scene.backgroundUrl ? text.replaceBackground : text.uploadBackground)}</button>
          {scene.backgroundUrl ? <button type="button" className="pip-btn" onClick={removeBackground}>{text.removeBackground}</button> : null}
        </div>
      </div>
      {uploadError ? <div className="session-error tactical-background-error">{uploadError}</div> : null}

      <div
        ref={gridRef}
        className={`gm-session-map__grid tactical-grid${scene.backgroundUrl ? " has-background" : ""}${dragState?.moved ? " is-drag-active" : ""}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`, backgroundImage: scene.backgroundUrl ? `url(${JSON.stringify(scene.backgroundUrl)})` : undefined }}
      >{cells}</div>

      <TacticalEnemyManager
        tokens={enemyTokens.map(managerToken)}
        selectedTokenId={selectedTokenId}
        onSelectToken={setSelectedTokenId}
        onAddToken={addEnemy}
        onRemoveToken={(tokenId) => session.deleteToken?.(tokenId)}
        onUpdateToken={updateEnemy}
      />

      {dragState?.moved ? <div className={`tactical-drag-ghost${dragState.size === 2 ? " is-size-2" : ""}`} style={{ left: dragState.x, top: dragState.y }}>{dragState.avatar ? <img src={dragState.avatar} alt="" /> : <b>{String(dragState.name || "T").slice(0, 1)}</b>}</div> : null}
    </section>
  );
}
