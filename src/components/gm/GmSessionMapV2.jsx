import { PhaserToken } from "../phaser/PhaserAsset.jsx";
import PhaserMapViewport from "../phaser/PhaserMapViewport.jsx";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import TacticalEnemyManager from "./TacticalEnemyManager.jsx";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import { gridDropCell } from "../../utils/battlemapCoordinates.js";
import "./gmSessionMap.css";
import "./sceneLibrary.css";

const DEFAULT_COLS = 12;
const DEFAULT_ROWS = 12;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_BACKGROUND_LENGTH = 790000;

const COPY = {
  en: {
    title: "TACTICAL MAP",
    waiting: "Waiting for the GM room...",
    players: "PLAYER TOKENS",
    startZone: "START ZONE",
    editStart: "EDIT START ZONE",
    finishEdit: "FINISH EDITING",
    startScene: "ENABLE SCENE",
    resetPlayers: "RETURN PLAYERS TO START",
    endScene: "END LIVE SCENE",
    inactive: "Prepare this scene, then enable it when players should enter.",
    active: "SCENE LIVE",
    move: "Drag any token to a free cell, or select it and click a destination cell.",
    editHint: "Click cells to edit the player start zone.",
    size: "GRID",
    resetMap: "RESET SCENE",
    uploadBackground: "UPLOAD BACKGROUND",
    replaceBackground: "REPLACE BACKGROUND",
    removeBackground: "REMOVE BACKGROUND",
    background: "BACKGROUND",
    noBackground: "No background image",
    processing: "PROCESSING IMAGE...",
    imageError: "Could not prepare this image.",
    imageTooLarge: "Image is too large. Maximum source file size is 12 MB.",
    connected: "PLAYERS",
    scenes: "SCENES",
    newScene: "+ NEW SCENE",
    deleteScene: "DELETE",
    saveName: "SAVE NAME",
    sceneName: "SCENE NAME",
    live: "LIVE",
    authority: "PIP 2D20 // GM DEVICE AUTHORITY", sceneActions:"SCENE ACTIONS", actionPoints:"ACTION POINTS", playersAp:"Players AP", gmAp:"GM AP", placeEnemies:"PLACE ENEMIES", removeEnemies:"REMOVE ENEMIES", activateScene:"ACTIVATE SCENE", deactivateScene:"DEACTIVATE SCENE", creatures:"CREATURES ON MAP", focus:"FOCUS", show:"SHOW", hide:"HIDE", remove:"REMOVE", hp:"HP", initiative:"INIT", emptyCreatures:"No creatures on this scene.", rooms:"ROOM DESCRIPTIONS",
  },
  ru: {
    title: "ТАКТИЧЕСКАЯ КАРТА",
    waiting: "Ожидаю комнату ГМ...",
    players: "ТОКЕНЫ ИГРОКОВ",
    startZone: "СТАРТОВАЯ ЗОНА",
    editStart: "ИЗМЕНИТЬ СТАРТОВУЮ ЗОНУ",
    finishEdit: "ЗАКОНЧИТЬ РЕДАКТИРОВАНИЕ",
    startScene: "ВКЛЮЧИТЬ СЦЕНУ",
    resetPlayers: "ВЕРНУТЬ ИГРОКОВ В СТАРТ",
    endScene: "ЗАВЕРШИТЬ LIVE СЦЕНУ",
    inactive: "Подготовьте эту сцену и включите её, когда игрокам нужно войти.",
    active: "СЦЕНА LIVE",
    move: "Перетягивайте любые токены или выберите токен и нажмите клетку назначения.",
    editHint: "Нажимайте клетки, чтобы изменить стартовую зону.",
    size: "СЕТКА",
    resetMap: "СБРОСИТЬ СЦЕНУ",
    uploadBackground: "ЗАГРУЗИТЬ ФОН",
    replaceBackground: "ЗАМЕНИТЬ ФОН",
    removeBackground: "УДАЛИТЬ ФОН",
    background: "ФОН",
    noBackground: "Фоновая картинка не загружена",
    processing: "ОБРАБОТКА ИЗОБРАЖЕНИЯ...",
    imageError: "Не удалось подготовить изображение.",
    imageTooLarge: "Файл слишком большой. Максимум 12 МБ.",
    connected: "ИГРОКИ",
    scenes: "СЦЕНЫ",
    newScene: "+ НОВАЯ СЦЕНА",
    deleteScene: "УДАЛИТЬ",
    saveName: "СОХРАНИТЬ ИМЯ",
    sceneName: "ИМЯ СЦЕНЫ",
    live: "АКТИВНА",
    authority: "PIP 2D20 // УСТРОЙСТВО ГМ", sceneActions:"ДЕЙСТВИЯ СЦЕНЫ", actionPoints:"ЭКШЕН ПОИНТЫ", playersAp:"AP игроков", gmAp:"AP ГМа", placeEnemies:"РАССТАВИТЬ ВРАГОВ", removeEnemies:"УБРАТЬ ВРАГОВ", activateScene:"АКТИВИРОВАТЬ СЦЕНУ", deactivateScene:"ДЕАКТИВИРОВАТЬ", creatures:"СУЩЕСТВА НА КАРТЕ", focus:"ФОКУС", show:"ПОКАЗАТЬ", hide:"СКРЫТЬ", remove:"УДАЛИТЬ", hp:"HP", initiative:"ИНИЦ.", emptyCreatures:"На сцене нет существ.", rooms:"ОПИСАНИЕ КОМНАТ",
  },
  uk: {
    title: "ТАКТИЧНА МАПА",
    waiting: "Очікую кімнату ГМ...",
    players: "ТОКЕНИ ГРАВЦІВ",
    startZone: "СТАРТОВА ЗОНА",
    editStart: "ЗМІНИТИ СТАРТОВУ ЗОНУ",
    finishEdit: "ЗАКІНЧИТИ РЕДАГУВАННЯ",
    startScene: "УВІМКНУТИ СЦЕНУ",
    resetPlayers: "ПОВЕРНУТИ ГРАВЦІВ НА СТАРТ",
    endScene: "ЗАВЕРШИТИ LIVE СЦЕНУ",
    inactive:
      "Підготуйте цю сцену та увімкніть її, коли гравцям потрібно увійти.",
    active: "СЦЕНА LIVE",
    move: "Перетягуйте будь-які токени або оберіть токен і натисніть клітинку призначення.",
    editHint: "Натискайте клітинки, щоб змінити стартову зону.",
    size: "СІТКА",
    resetMap: "СКИНУТИ СЦЕНУ",
    uploadBackground: "ЗАВАНТАЖИТИ ФОН",
    replaceBackground: "ЗАМІНИТИ ФОН",
    removeBackground: "ВИДАЛИТИ ФОН",
    background: "ФОН",
    noBackground: "Фонове зображення не завантажено",
    processing: "ОБРОБКА ЗОБРАЖЕННЯ...",
    imageError: "Не вдалося підготувати зображення.",
    imageTooLarge: "Файл завеликий. Максимум 12 МБ.",
    connected: "ГРАВЦІ",
    scenes: "СЦЕНИ",
    newScene: "+ НОВА СЦЕНА",
    deleteScene: "ВИДАЛИТИ",
    saveName: "ЗБЕРЕГТИ ІМ'Я",
    sceneName: "НАЗВА СЦЕНИ",
    live: "АКТИВНА",
    authority: "PIP 2D20 // ПРИСТРІЙ ГМ", sceneActions:"ДІЇ СЦЕНИ", actionPoints:"ЕКШЕН ПОІНТИ", playersAp:"AP гравців", gmAp:"AP ГМа", placeEnemies:"РОЗСТАВИТИ ВОРОГІВ", removeEnemies:"ПРИБРАТИ ВОРОГІВ", activateScene:"АКТИВУВАТИ СЦЕНУ", deactivateScene:"ДЕАКТИВУВАТИ", creatures:"ІСТОТИ НА МАПІ", focus:"ФОКУС", show:"ПОКАЗАТИ", hide:"СХОВАТИ", remove:"ВИДАЛИТИ", hp:"HP", initiative:"ІНІЦ.", emptyCreatures:"На сцені немає істот.", rooms:"ОПИС КІМНАТ",
  },
  pl: {
    title: "MAPA TAKTYCZNA",
    waiting: "Oczekiwanie na pokój GM...",
    players: "TOKENY GRACZY",
    startZone: "STREFA STARTOWA",
    editStart: "EDYTUJ STREFĘ STARTOWĄ",
    finishEdit: "ZAKOŃCZ EDYCJĘ",
    startScene: "WŁĄCZ SCENĘ",
    resetPlayers: "PRZENIEŚ GRACZY NA START",
    endScene: "ZAKOŃCZ SCENĘ LIVE",
    inactive: "Przygotuj scenę i włącz ją, gdy gracze mają wejść.",
    active: "SCENA LIVE",
    move: "Przeciągaj dowolne tokeny albo wybierz token i kliknij pole docelowe.",
    editHint: "Klikaj pola, aby edytować strefę startową.",
    size: "SIATKA",
    resetMap: "RESETUJ SCENĘ",
    uploadBackground: "WGRAJ TŁO",
    replaceBackground: "ZMIEŃ TŁO",
    removeBackground: "USUŃ TŁO",
    background: "TŁO",
    noBackground: "Brak obrazu tła",
    processing: "PRZETWARZANIE OBRAZU...",
    imageError: "Nie udało się przygotować obrazu.",
    imageTooLarge: "Plik jest za duży. Maks. 12 MB.",
    connected: "GRACZE",
    scenes: "SCENY",
    newScene: "+ NOWA SCENA",
    deleteScene: "USUŃ",
    saveName: "ZAPISZ NAZWĘ",
    sceneName: "NAZWA SCENY",
    live: "AKTYWNA",
    authority: "PIP 2D20 // URZĄDZENIE MG", sceneActions:"AKCJE SCENY", actionPoints:"PUNKTY AKCJI", playersAp:"AP graczy", gmAp:"AP MG", placeEnemies:"ROZMIEŚĆ WROGÓW", removeEnemies:"USUŃ WROGÓW", activateScene:"AKTYWUJ SCENĘ", deactivateScene:"DEZAKTYWUJ", creatures:"ISTOTY NA MAPIE", focus:"FOKUS", show:"POKAŻ", hide:"UKRYJ", remove:"USUŃ", hp:"HP", initiative:"INIT", emptyCreatures:"Brak istot na scenie.", rooms:"OPISY POMIESZCZEŃ",
  },
};

function languageCode(language) {
  const code = String(language || "en")
    .toLowerCase()
    .split("-")[0];
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
  const n = Number(token?.stats?.footprint || token?.size);
  return n === 3 ? 3 : n === 2 ? 2 : 1;
}
function cellKey(x, y) {
  return `${x}:${y}`;
}

function cellsFor(token, x = token.x, y = token.y) {
  const result = [];
  const size = tokenSize(token);
  for (let dy = 0; dy < size; dy += 1)
    for (let dx = 0; dx < size; dx += 1) result.push(cellKey(x + dx, y + dy));
  return result;
}

function freeCell(tokens, movingId, x, y, size, cols, rows) {
  if (x < 0 || y < 0 || x + size > cols || y + size > rows) return false;
  const occupied = new Set();
  tokens.forEach((token) => {
    if (token.id === movingId) return;
    cellsFor(token).forEach((key) => occupied.add(key));
  });
  return cellsFor({ id: movingId, x, y, size }).every(
    (key) => !occupied.has(key)
  );
}

function pointerPlacement(grid, event, cols, rows, drag) {
  const firstCell = grid?.querySelector?.(".gm-session-map__cell");
  if (!grid || !firstCell) return null;
  return gridDropCell({
    clientX: event.clientX,
    clientY: event.clientY,
    rect: grid.getBoundingClientRect(),
    scrollLeft: grid.scrollLeft,
    scrollTop: grid.scrollTop,
    cellWidth: firstCell.getBoundingClientRect().width,
    cellHeight: firstCell.getBoundingClientRect().height,
    cols,
    rows,
    size: drag.size,
    anchorX: drag.anchorX,
    anchorY: drag.anchorY,
  });
}

function autoScrollNearEdge(grid, clientX, clientY) {
  if (!grid || grid.dataset.phaserGrid) return;
  const rect = grid.getBoundingClientRect();
  const edge = Math.min(
    64,
    Math.max(36, Math.min(rect.width, rect.height) * 0.12)
  );
  const speed = 18;
  const dx =
    clientX < rect.left + edge
      ? -speed
      : clientX > rect.right - edge
      ? speed
      : 0;
  const dy =
    clientY < rect.top + edge
      ? -speed
      : clientY > rect.bottom - edge
      ? speed
      : 0;
  if (dx || dy) grid.scrollBy({ left: dx, top: dy, behavior: "auto" });
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
    for (const [dimension, quality] of [
      [1500, 0.72],
      [1250, 0.68],
      [1050, 0.62],
      [900, 0.58],
      [760, 0.54],
    ]) {
      const result = renderImage(image, dimension, quality);
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
    attacks: String(entry.attacks ?? entry.attack ?? ""),
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

export default function GmSessionMapV2({ session: sessionProp = null }) {
  const { i18n } = useTranslation();
  const bridgedSession = useLiveSessionBridge();
  const session = sessionProp || bridgedSession;
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const scene = session?.tacticalScene || null;
  const scenes = Array.isArray(session?.tacticalScenes)
    ? session.tacticalScenes
    : [];
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [editingStart, setEditingStart] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragState, setDragState] = useState(null);
  const [sceneName, setSceneName] = useState(scene?.name || "");
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const suppressCellClickRef = useRef(false);
  const fileRef = useRef(null);
  const roomDescriptionsRef = useRef(null);
  const [sceneActionBusy,setSceneActionBusy]=useState("");

  useEffect(() => {
    setSceneName(scene?.name || "");
    setSelectedTokenId(null);
    setEditingStart(false);
    dragRef.current = null;
    setDragState(null);
  }, [scene?.sceneId]);

  if (!session?.isActive || session?.mode !== "host" || !scene) {
    return (
      <section className="pip-panel gm-session-map tactical-map">
        <div className="gm-session-map__hint">{text.waiting}</div>
      </section>
    );
  }

  const cols = Number(scene.environment?.proceduralMapSpec?.cols || scene.cols || DEFAULT_COLS);
  const rows = Number(scene.environment?.proceduralMapSpec?.rows || scene.rows || DEFAULT_ROWS);
  const tokens = Array.isArray(scene.tokens) ? scene.tokens : [];
  const playerTokens = tokens.filter((token) => token.kind === "player");
  const enemyTokens = tokens.filter((token) => token.kind !== "player");
  const startKeys = new Set(
    (scene.startZone || []).map((cell) => cellKey(cell.x, cell.y))
  );
  const liveScene =
    scenes.find((item) => item.sceneId === session.liveSceneId) || null;
  const selectedIsLive = scene.sceneId === session.liveSceneId && scene.active;

  const setGridSize = async (value) => {
    if (selectedIsLive) return;
    const [nextCols, nextRows] = String(value).split("x").map(Number);
    if (!nextCols || !nextRows) return;
    await session.updateTacticalScene?.({
      cols: nextCols,
      rows: nextRows,
      startZone: makeStartZone(nextCols, nextRows),
    });
  };

  const toggleStartCell = async (x, y) => {
    if (!editingStart) return;
    const key = cellKey(x, y);
    const current = scene.startZone || [];
    const next = startKeys.has(key)
      ? current.filter((cell) => cellKey(cell.x, cell.y) !== key)
      : [...current, { x, y }];
    await session.updateTacticalScene?.({ startZone: next });
  };

  const uploadBackground = async (file) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const backgroundUrl = await compressBackground(file);
      await session.updateTacticalScene?.({
        backgroundUrl,
        backgroundName: file.name,
      });
    } catch (error) {
      setUploadError(
        error?.message === "too-large" ? text.imageTooLarge : text.imageError
      );
    } finally {
      setUploading(false);
    }
  };

  const enableScene = async () => {
    setEditingStart(false);
    await session.enableTacticalScene?.({
      cols,
      rows,
      startZone: scene.startZone,
      backgroundUrl: scene.backgroundUrl,
      backgroundName: scene.backgroundName,
    });
  };

  const returnPlayersToStart = async () => {
    if (!selectedIsLive) return;
    const placed = enemyTokens.map((token) => ({ ...token }));
    const preferred = scene.startZone?.length
      ? scene.startZone
      : makeStartZone(cols, rows);
    for (const token of playerTokens) {
      const size = tokenSize(token);
      let target = null;
      for (const cell of preferred) {
        if (freeCell(placed, token.id, cell.x, cell.y, size, cols, rows)) {
          target = cell;
          break;
        }
      }
      if (!target) continue;
      await session.moveToken?.(token.id, target.x, target.y);
      placed.push({ ...token, x: target.x, y: target.y });
    }
  };

  const resetScene = async () => {
    if (selectedIsLive) await session.disableTacticalScene?.();
    for (const token of [...tokens]) await session.deleteToken?.(token.id);
    await session.updateTacticalScene?.({
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      startZone: makeStartZone(DEFAULT_COLS, DEFAULT_ROWS),
      backgroundUrl: "",
      backgroundName: "",
    });
  };

  const addEnemy = async ({ entry, name, size }) =>
    session.createNpcToken?.({
      name,
      size,
      npcId: entry?.id || null,
      stats: npcStats(entry),
    });

  const updateEnemy = async (tokenId, patch = {}) => {
    const source = tokens.find((token) => token.id === tokenId);
    if (!source) return;
    const next = {};
    if (Object.prototype.hasOwnProperty.call(patch, "avatar"))
      next.avatar = patch.avatar;
    if (Object.prototype.hasOwnProperty.call(patch, "size"))
      next.size = patch.size;
    if (Object.prototype.hasOwnProperty.call(patch, "name"))
      next.name = patch.name;
    const statKeys = [
      "hp",
      "maxHp",
      "defense",
      "initiative",
      "level",
      "attacks",
      "drBlock",
    ];
    if (
      statKeys.some((key) => Object.prototype.hasOwnProperty.call(patch, key))
    ) {
      next.stats = { ...(source.stats || {}) };
      statKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(patch, key))
          next.stats[key] = patch[key];
      });
    }
    await session.updateToken?.(tokenId, next);
  };

  const placeGeneratedEnemies = async () => {
    if(sceneActionBusy)return;
    setSceneActionBusy("place");
    try{
      await roomDescriptionsRef.current?.placeEnemies?.();
    } finally {
      setSceneActionBusy("");
    }
  };

  const removeAllEnemies = async () => {
    if(sceneActionBusy)return;
    setSceneActionBusy("remove");
    try{
      for(const token of enemyTokens) await session.deleteToken?.(token.id);
      setSelectedTokenId(null);
    } finally {
      setSceneActionBusy("");
    }
  };

  const focusToken = (tokenId) => {
    setSelectedTokenId(tokenId);
    gridRef.current?.scrollIntoView?.({behavior:"smooth",block:"center"});
  };

  const toggleTokenVisibility = async (token) => {
    const current=token?.stats?.visibleToPlayers !== false;
    await session.updateToken?.(token.id,{stats:{...(token.stats||{}),visibleToPlayers:!current}});
  };

  const actionPoints=scene.actionPoints||{players:0,gm:0,max:6};
  const changeActionPoints = async (pool,delta) => {
    const current=Math.max(0,Math.floor(Number(actionPoints?.[pool]||0)));
    const next=pool==="players"
      ? Math.max(0,Math.min(6,current+delta))
      : Math.max(0,current+delta);
    await session.updateTacticalScene?.({
      actionPoints:{
        players:Math.max(0,Math.min(6,Math.floor(Number(actionPoints.players||0)))),
        gm:Math.max(0,Math.floor(Number(actionPoints.gm||0))),
        max:6,
        [pool]:next,
      },
    });
  };

  const moveSelected = async (x, y) => {
    if (suppressCellClickRef.current) return;
    if (!selectedTokenId || editingStart) return;
    await session.moveToken?.(selectedTokenId, x, y);
  };

  const beginDrag = (event, token) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = tokenSize(token);
    const anchorX = Math.max(
      0,
      Math.min(
        size - 1,
        Math.floor(
          ((event.clientX - rect.left) / Math.max(1, rect.width)) * size
        )
      )
    );
    const anchorY = Math.max(
      0,
      Math.min(
        size - 1,
        Math.floor(
          ((event.clientY - rect.top) / Math.max(1, rect.height)) * size
        )
      )
    );
    dragRef.current = {
      tokenId: token.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      anchorX,
      anchorY,
      size,
      pointerType: event.pointerType,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({
      tokenId: token.id,
      x: event.clientX,
      y: event.clientY,
      avatar: token.avatar || "",
      name: token.name || "",
      size,
      moved: false,
    });
    event.stopPropagation();
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const threshold = drag.pointerType === "touch" ? 8 : 5;
    drag.moved =
      drag.moved ||
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >
        threshold;
    let placement = null;
    let valid = false;
    if (drag.moved) {
      event.preventDefault();
      autoScrollNearEdge(gridRef.current, event.clientX, event.clientY);
      placement = pointerPlacement(gridRef.current, event, cols, rows, drag);
      valid = Boolean(
        placement &&
          freeCell(
            tokens,
            drag.tokenId,
            placement.x,
            placement.y,
            drag.size,
            cols,
            rows
          )
      );
    }
    setDragState((value) =>
      value
        ? {
            ...value,
            x: event.clientX,
            y: event.clientY,
            moved: drag.moved,
            targetX: placement?.x,
            targetY: placement?.y,
            valid,
          }
        : value
    );
  };

  const finishDrag = async (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();
    if (!drag.moved) {
      setSelectedTokenId((value) =>
        value === drag.tokenId ? null : drag.tokenId
      );
      return;
    }
    event.preventDefault();
    suppressCellClickRef.current = true;
    requestAnimationFrame(() => {
      suppressCellClickRef.current = false;
    });
    const placement = pointerPlacement(
      gridRef.current,
      event,
      cols,
      rows,
      drag
    );
    if (
      !placement ||
      !freeCell(
        tokens,
        drag.tokenId,
        placement.x,
        placement.y,
        drag.size,
        cols,
        rows
      )
    )
      return;
    await session.moveToken?.(drag.tokenId, placement.x, placement.y);
  };

  const cancelDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();
  };

  const dragTargetKeys = new Set();
  if (
    dragState?.moved &&
    Number.isFinite(dragState.targetX) &&
    Number.isFinite(dragState.targetY)
  ) {
    cellsFor({
      x: dragState.targetX,
      y: dragState.targetY,
      size: dragState.size,
    }).forEach((key) => dragTargetKeys.add(key));
  }

  const tokensByAnchor = new Map();
  tokens.forEach((token) => {
    const key = cellKey(Number(token.x), Number(token.y));
    const anchored = tokensByAnchor.get(key);
    if (anchored) anchored.push(token);
    else tokensByAnchor.set(key, [token]);
  });

  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const anchored = tokensByAnchor.get(cellKey(x, y)) || [];
      cells.push(
        <button
          type="button"
          key={cellKey(x, y)}
          className={`gm-session-map__cell tactical-cell${
            startKeys.has(cellKey(x, y)) ? " is-start-zone" : ""
          }${editingStart ? " is-start-edit" : ""}${
            dragTargetKeys.has(cellKey(x, y))
              ? dragState?.valid
                ? " is-drag-target"
                : " is-drag-invalid"
              : ""
          }`}
          onClick={() =>
            editingStart ? toggleStartCell(x, y) : moveSelected(x, y)
          }
        >
          {anchored.length ? (
            <span className="gm-session-map__tokens">
              {anchored.map((token) => {
                const size = tokenSize(token);
                return (
                  <span
                    key={token.id}
                    className={`gm-session-token ${
                      token.kind === "player" ? "is-player" : "is-npc is-enemy"
                    } is-size-${size}${
                      selectedTokenId === token.id ? " is-selected" : ""
                    }${dragState?.tokenId === token.id ? " is-dragging" : ""}`}
                    onPointerDown={(event) => beginDrag(event, token)}
                    onPointerMove={moveDrag}
                    onPointerUp={finishDrag}
                    onPointerCancel={cancelDrag}
                  >
                    <PhaserToken token={token} selected={selectedTokenId === token.id} />
                    <small>{token.name}</small>
                  </span>
                );
              })}
            </span>
          ) : null}
        </button>
      );
    }
  }

  return (
    <section className="pip-panel gm-session-map tactical-map">
      <div className="gm-session-map__head">
        <div>
          <div className="gm-session-map__eyebrow">{text.authority}</div>
          <h2>[ {text.title} ]</h2>
        </div>
        <div className="gm-session-map__meta">
          <span>{session.sessionCode}</span>
          <span className={selectedIsLive ? "tactical-live" : ""}>
            {selectedIsLive ? text.active : session.status}
          </span>
          <span>
            {text.connected}: {session.players?.length || 0}
          </span>
          <span>
            {text.players}: {playerTokens.length}
          </span>
        </div>
      </div>

      <details className="phaser-map-settings">
        <summary>{text.scenes} · {text.background}</summary>
      <div className="gm-scene-library">
        <label>
          <span>{text.scenes}</span>
          <select
            className="pip-input"
            value={session.selectedSceneId || scene.sceneId}
            onChange={(event) =>
              session.switchTacticalScene?.(event.target.value)
            }
          >
            {scenes.map((item) => (
              <option key={item.sceneId} value={item.sceneId}>
                {item.name}
                {item.sceneId === session.liveSceneId ? ` • ${text.live}` : ""}
              </option>
            ))}
          </select>
        </label>
        <input
          className="pip-input gm-scene-library__name"
          value={sceneName}
          maxLength={80}
          placeholder={text.sceneName}
          onChange={(event) => setSceneName(event.target.value)}
        />
        <button
          type="button"
          className="pip-btn"
          onClick={() =>
            session.renameTacticalScene?.(scene.sceneId, sceneName)
          }
        >
          {text.saveName}
        </button>
        <button
          type="button"
          className="pip-btn is-primary"
          onClick={() =>
            session.createTacticalScene?.({
              name: `${text.scenes} ${scenes.length + 1}`,
              cols,
              rows,
            })
          }
        >
          {text.newScene}
        </button>
        <button
          type="button"
          className="pip-btn"
          disabled={scenes.length <= 1}
          onClick={() => session.deleteTacticalScene?.(scene.sceneId)}
        >
          {text.deleteScene}
        </button>
        {liveScene ? (
          <span className="gm-scene-library__live">
            {text.live}: {liveScene.name}
          </span>
        ) : null}
      </div>

      <div className="tactical-toolbar">
        <label className="tactical-size-select">
          {text.size}
          <select
            className="pip-input"
            value={`${cols}x${rows}`}
            disabled={selectedIsLive}
            onChange={(event) => setGridSize(event.target.value)}
          >
            <option value="8x8">8×8</option>
            <option value="12x12">12×12</option>
            <option value="16x12">16×12</option>
            <option value="16x16">16×16</option>
            {[18,24,36,48,60].map(size => <option key={size} value={`${size}x${size}`}>{size}×{size}</option>)}
            {![[8,8],[12,12],[16,12],[16,16],[18,18],[24,24],[36,36],[48,48],[60,60]].some(([x,y]) => x === cols && y === rows) && <option value={`${cols}x${rows}`}>{cols}×{rows}</option>}
          </select>
        </label>
        <button
          type="button"
          className={`pip-btn${editingStart ? " is-primary" : ""}`}
          onClick={() => setEditingStart((value) => !value)}
        >
          {editingStart ? text.finishEdit : text.editStart}
        </button>
        {!selectedIsLive ? (
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={enableScene}
          >
            {text.startScene}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="pip-btn"
              onClick={returnPlayersToStart}
            >
              {text.resetPlayers}
            </button>
            <button
              type="button"
              className="pip-btn"
              onClick={() => session.disableTacticalScene?.()}
            >
              {text.endScene}
            </button>
          </>
        )}
        <button type="button" className="pip-btn" onClick={resetScene}>
          {text.resetMap}
        </button>
      </div>

      <div
        className={`gm-session-map__hint${editingStart ? " is-editing" : ""}`}
      >
        {editingStart
          ? text.editHint
          : selectedIsLive
          ? text.move
          : text.inactive}{" "}
        · {text.startZone}: {scene.startZone?.length || 0}
      </div>
      <input
        ref={fileRef}
        className="tactical-background-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          uploadBackground(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="tactical-background-bar">
        <div className="tactical-background-info">
          <span>{text.background}</span>
          <strong>{scene.backgroundName || text.noBackground}</strong>
        </div>
        <div className="tactical-background-actions">
          <button
            type="button"
            className="pip-btn"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? text.processing
              : scene.backgroundUrl
              ? text.replaceBackground
              : text.uploadBackground}
          </button>
          {scene.backgroundUrl ? (
            <button
              type="button"
              className="pip-btn"
              onClick={() =>
                session.updateTacticalScene?.({
                  backgroundUrl: "",
                  backgroundName: "",
                })
              }
            >
              {text.removeBackground}
            </button>
          ) : null}
        </div>
      </div>
      {uploadError ? (
        <div className="session-error tactical-background-error">
          {uploadError}
        </div>
      ) : null}
      </details>

      <section className="gm-map-actions pip-panel">
        <div className="gm-map-actions__head">
          <div className="pip-panel-title">{text.sceneActions}</div>
          <div className="gm-map-ap" aria-label={text.actionPoints}>
            <div className="gm-map-ap__row">
              <span>{text.playersAp}</span>
              <button type="button" onClick={()=>changeActionPoints("players",-1)}>−</button>
              <strong>{Math.max(0,Math.min(6,Number(actionPoints.players||0)))}/6</strong>
              <button type="button" onClick={()=>changeActionPoints("players",1)}>+</button>
            </div>
            <div className="gm-map-ap__row">
              <span>{text.gmAp}</span>
              <button type="button" onClick={()=>changeActionPoints("gm",-1)}>−</button>
              <strong>{Math.max(0,Number(actionPoints.gm||0))}</strong>
              <button type="button" onClick={()=>changeActionPoints("gm",1)}>+</button>
            </div>
          </div>
        </div>
        <div className="gm-map-actions__buttons">
          <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)} onClick={placeGeneratedEnemies}>{text.placeEnemies}</button>
          <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)||!enemyTokens.length} onClick={removeAllEnemies}>{text.removeEnemies}</button>
          {!selectedIsLive
            ? <button type="button" className="pip-btn is-primary" disabled={Boolean(sceneActionBusy)} onClick={enableScene}>{text.activateScene}</button>
            : <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)} onClick={()=>session.disableTacticalScene?.()}>{text.deactivateScene}</button>}
        </div>
      </section>

      <PhaserMapViewport cols={cols} rows={rows} sceneKey={scene.sceneId} background={scene.backgroundUrl} gridRef={gridRef} player={playerTokens[0]} label={text.title}>
      <div
        data-phaser-grid="true"
        ref={gridRef}
        className={`gm-session-map__grid tactical-grid${
          scene.backgroundUrl ? " has-background" : ""
        }${dragState?.moved ? " is-drag-active" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`,
          "--battlemap-cell": "64px",
          "--battlemap-world-width": `${cols * 64}px`,
          "--battlemap-world-height": `${rows * 64}px`,
        }}
      >
        {cells}
      </div>
      </PhaserMapViewport>

      <section className="gm-map-creatures pip-panel">
        <div className="pip-panel-title">{text.creatures}</div>
        {tokens.length ? <div className="gm-map-creatures__list">{tokens.map(token=>{
          const hp=Number(token?.stats?.hp ?? token?.stats?.currentHp ?? 0);
          const maxHp=Number(token?.stats?.maxHp ?? token?.stats?.hp ?? 0);
          const init=Number(token?.stats?.initiative ?? 0);
          const visible=token.kind==="player" || token?.stats?.visibleToPlayers !== false;
          return <article className={"gm-map-creature"+(selectedTokenId===token.id?" is-selected":"")} key={token.id}>
            <div className="gm-map-creature__main"><strong>{token.name||"Token"}</strong><small>{token.kind==="player"?"PLAYER":"NPC"} · [{Number(token.x)||0},{Number(token.y)||0}] · {text.hp} {hp}{maxHp?"/"+maxHp:""} · {text.initiative} {init}</small></div>
            <div className="gm-map-creature__actions">
              <button type="button" className="pip-btn" onClick={()=>focusToken(token.id)}>{text.focus}</button>
              {token.kind!=="player"?<button type="button" className="pip-btn" onClick={()=>toggleTokenVisibility(token)}>{visible?text.hide:text.show}</button>:null}
              {token.kind!=="player"?<button type="button" className="pip-btn" onClick={()=>session.deleteToken?.(token.id)}>{text.remove}</button>:null}
            </div>
          </article>;
        })}</div>:<small className="gm-map-creatures__empty">{text.emptyCreatures}</small>}
      </section>

      <section className="gm-map-rooms">
        <GmProceduralRoomDescriptionsV4 ref={roomDescriptionsRef} session={session} embedded />
      </section>

      <TacticalEnemyManager
        tokens={enemyTokens.map(managerToken)}
        selectedTokenId={selectedTokenId}
        onSelectToken={setSelectedTokenId}
        onAddToken={addEnemy}
        onRemoveToken={(tokenId) => session.deleteToken?.(tokenId)}
        onUpdateToken={updateEnemy}
      />
      {dragState?.moved ? (
        <div
          className={`tactical-drag-ghost is-size-${dragState.size}`}
          style={{ left: dragState.x, top: dragState.y }}
        >
          {dragState.avatar ? (
            <img src={dragState.avatar} alt="" />
          ) : (
            <b>{String(dragState.name || "T").slice(0, 1)}</b>
          )}
        </div>
      ) : null}
    </section>
  );
}
