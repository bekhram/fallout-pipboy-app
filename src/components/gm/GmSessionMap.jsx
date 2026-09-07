import React, { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import TacticalEnemyManager from "./TacticalEnemyManager.jsx";
import "./gmSessionMap.css";

const TACTICAL_HOST_PREFIX = "pip2d20-tactical-";
const DEFAULT_COLS = 12;
const DEFAULT_ROWS = 12;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_PLAYER_AVATAR_LENGTH = 950000;

const COPY = {
  en: {
    title: "TACTICAL MAP", waiting: "Waiting for an active GM session...", players: "PLAYER TOKENS", startZone: "START ZONE",
    editStart: "EDIT START ZONE", finishEdit: "FINISH EDITING", startScene: "ENABLE SCENE", resetPlayers: "RETURN PLAYERS TO START",
    endScene: "END SCENE", inactive: "Prepare the battlemap, mark the start zone and enable the scene when the players should enter.",
    active: "SCENE ENABLED", move: "Drag any token to a free cell, or select it and click a destination cell.",
    editHint: "Click cells to add or remove them from the player start zone.", size: "GRID", resetMap: "RESET MAP",
    uploadBackground: "UPLOAD BACKGROUND", replaceBackground: "REPLACE BACKGROUND", removeBackground: "REMOVE BACKGROUND",
    background: "BACKGROUND", noBackground: "No background image", processing: "PROCESSING IMAGE...",
    imageError: "Could not load this image.", imageTooLarge: "Image is too large. Maximum source file size is 12 MB.",
    connected: "TACTICAL LINKS",
  },
  ru: {
    title: "ТАКТИЧЕСКАЯ КАРТА", waiting: "Ожидаю активную сессию ГМ...", players: "ТОКЕНЫ ИГРОКОВ", startZone: "СТАРТОВАЯ ЗОНА",
    editStart: "ИЗМЕНИТЬ СТАРТОВУЮ ЗОНУ", finishEdit: "ЗАКОНЧИТЬ РЕДАКТИРОВАНИЕ", startScene: "ВКЛЮЧИТЬ СЦЕНУ",
    resetPlayers: "ВЕРНУТЬ ИГРОКОВ В СТАРТ", endScene: "ЗАВЕРШИТЬ СЦЕНУ",
    inactive: "Подготовьте карту, отметьте стартовую зону и включите сцену, когда игрокам нужно перейти в тактический режим.",
    active: "СЦЕНА ВКЛЮЧЕНА", move: "Перетягивайте токены на свободные клетки или выберите токен и нажмите клетку назначения.",
    editHint: "Нажимайте на клетки, чтобы добавить или убрать их из стартовой зоны игроков.", size: "СЕТКА", resetMap: "СБРОСИТЬ КАРТУ",
    uploadBackground: "ЗАГРУЗИТЬ ФОН", replaceBackground: "ЗАМЕНИТЬ ФОН", removeBackground: "УДАЛИТЬ ФОН", background: "ФОН",
    noBackground: "Фоновая картинка не загружена", processing: "ОБРАБОТКА ИЗОБРАЖЕНИЯ...", imageError: "Не удалось загрузить это изображение.",
    imageTooLarge: "Файл слишком большой. Максимальный размер исходного изображения — 12 МБ.", connected: "ТАКТИЧЕСКИЕ ПОДКЛЮЧЕНИЯ",
  },
  uk: {
    title: "ТАКТИЧНА МАПА", waiting: "Очікую активну сесію ГМ...", players: "ТОКЕНИ ГРАВЦІВ", startZone: "СТАРТОВА ЗОНА",
    editStart: "ЗМІНИТИ СТАРТОВУ ЗОНУ", finishEdit: "ЗАКІНЧИТИ РЕДАГУВАННЯ", startScene: "УВІМКНУТИ СЦЕНУ",
    resetPlayers: "ПОВЕРНУТИ ГРАВЦІВ НА СТАРТ", endScene: "ЗАВЕРШИТИ СЦЕНУ",
    inactive: "Підготуйте карту, позначте стартову зону й увімкніть сцену, коли гравцям потрібно перейти в тактичний режим.",
    active: "СЦЕНУ УВІМКНЕНО", move: "Перетягуйте токени на вільні клітинки або оберіть токен і натисніть клітинку призначення.",
    editHint: "Натискайте клітинки, щоб додати або прибрати їх зі стартової зони гравців.", size: "СІТКА", resetMap: "СКИНУТИ МАПУ",
    uploadBackground: "ЗАВАНТАЖИТИ ФОН", replaceBackground: "ЗАМІНИТИ ФОН", removeBackground: "ВИДАЛИТИ ФОН", background: "ФОН",
    noBackground: "Фонове зображення не завантажено", processing: "ОБРОБКА ЗОБРАЖЕННЯ...", imageError: "Не вдалося завантажити це зображення.",
    imageTooLarge: "Файл завеликий. Максимальний розмір вихідного зображення — 12 МБ.", connected: "ТАКТИЧНІ ПІДКЛЮЧЕННЯ",
  },
  pl: {
    title: "MAPA TAKTYCZNA", waiting: "Oczekiwanie na aktywną sesję GM...", players: "TOKENY GRACZY", startZone: "STREFA STARTOWA",
    editStart: "EDYTUJ STREFĘ STARTOWĄ", finishEdit: "ZAKOŃCZ EDYCJĘ", startScene: "WŁĄCZ SCENĘ",
    resetPlayers: "PRZENIEŚ GRACZY NA START", endScene: "ZAKOŃCZ SCENĘ",
    inactive: "Przygotuj mapę, zaznacz strefę startową i włącz scenę, gdy gracze mają przejść do trybu taktycznego.",
    active: "SCENA WŁĄCZONA", move: "Przeciągnij token na wolne pole albo wybierz token i kliknij pole docelowe.",
    editHint: "Klikaj pola, aby dodać lub usunąć je ze strefy startowej graczy.", size: "SIATKA", resetMap: "RESETUJ MAPĘ",
    uploadBackground: "WGRAJ TŁO", replaceBackground: "ZMIEŃ TŁO", removeBackground: "USUŃ TŁO", background: "TŁO",
    noBackground: "Brak obrazu tła", processing: "PRZETWARZANIE OBRAZU...", imageError: "Nie udało się wczytać tego obrazu.",
    imageTooLarge: "Plik jest za duży. Maksymalny rozmiar obrazu źródłowego to 12 MB.", connected: "POŁĄCZENIA TAKTYCZNE",
  },
};

function languageCode() {
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function getSessionCode() {
  return document.querySelector(".session-gm-code")?.textContent?.trim()?.toUpperCase() || "";
}

function slug(value) {
  return String(value || "player").toLowerCase().replace(/[^a-z0-9а-яіїє]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 42) || "player";
}

function makeDefaultStartZone(cols, rows) {
  const result = [];
  const startY = Math.max(0, rows - 3);
  for (let y = startY; y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function tokenSize(token) {
  return Number(token?.size) === 2 ? 2 : 1;
}

function tokenCells(token, x = token?.x, y = token?.y, size = tokenSize(token)) {
  const cells = [];
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) cells.push(`${Number(x) + dx}:${Number(y) + dy}`);
  }
  return cells;
}

function canPlaceToken(tokens, tokenId, x, y, size, cols, rows) {
  if (x < 0 || y < 0 || x + size > cols || y + size > rows) return false;
  const occupied = new Set();
  (tokens || []).forEach((token) => {
    if (token.id === tokenId) return;
    tokenCells(token).forEach((key) => occupied.add(key));
  });
  return tokenCells({ x, y, size }).every((key) => !occupied.has(key));
}

function findFreePlacement(tokens, size, cols, rows, preferred = []) {
  for (const cell of preferred) {
    if (canPlaceToken(tokens, null, cell.x, cell.y, size, cols, rows)) return { x: cell.x, y: cell.y };
  }
  for (let y = 0; y <= rows - size; y += 1) {
    for (let x = cols - size; x >= 0; x -= 1) {
      if (canPlaceToken(tokens, null, x, y, size, cols, rows)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

function normalizeTokenCell(cell, size, cols, rows) {
  return {
    x: Math.max(0, Math.min(cols - size, Number(cell?.x || 0))),
    y: Math.max(0, Math.min(rows - size, Number(cell?.y || 0))),
  };
}

function makeEmptyState(cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  return {
    active: false,
    sceneId: `scene-${Date.now()}`,
    cols,
    rows,
    startZone: makeDefaultStartZone(cols, rows),
    tokens: [],
    backgroundImage: "",
    backgroundName: "",
    revision: 1,
  };
}

function moveExistingPlayersToStart(state) {
  const startZone = state.startZone?.length ? state.startZone : makeDefaultStartZone(state.cols, state.rows);
  const enemies = (state.tokens || []).filter((token) => token.kind !== "player");
  const existingPlayers = (state.tokens || []).filter((token) => token.kind === "player");
  const placed = [...enemies];
  const players = existingPlayers.map((player) => {
    const cell = findFreePlacement(placed, 1, state.cols, state.rows, startZone);
    const next = { ...player, x: cell.x, y: cell.y, size: 1, connected: true };
    placed.push(next);
    return next;
  });
  return { ...state, tokens: [...enemies, ...players], revision: Number(state.revision || 0) + 1 };
}

function findTokenForHello(state, packet) {
  const names = [packet?.characterName, packet?.playerName]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  if (!names.length) return null;
  const players = (state.tokens || []).filter((token) => token.kind === "player");
  return players.find((token) => names.includes(String(token.name || "").trim().toLowerCase()))
    || players.find((token) => names.some((name) => {
      const tokenName = String(token.name || "").trim().toLowerCase();
      return tokenName && (tokenName.includes(name) || name.includes(tokenName));
    })) || null;
}

function safePlayerAvatar(value) {
  const avatar = String(value || "");
  if (!avatar || avatar.length > MAX_PLAYER_AVATAR_LENGTH) return "";
  return /^data:image\/(?:png|jpe?g|webp);base64,/i.test(avatar) ? avatar : "";
}

function playerTokenId(packet, peerId) {
  const name = String(packet?.characterName || packet?.playerName || "Player").trim() || "Player";
  return `player-${slug(name)}-${String(peerId || "link").slice(-6)}`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function renderCompressed(image, maxDimension, quality) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/webp", quality);
}

async function compressBackground(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("image");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("too-large");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    let dataUrl = renderCompressed(image, 1800, 0.8);
    if (dataUrl.length > 2_700_000) dataUrl = renderCompressed(image, 1400, 0.7);
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function numberOrNull(value) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) ? number : null;
}

export default function GmSessionMap() {
  const text = COPY[languageCode()];
  const [sessionCode, setSessionCode] = useState(() => getSessionCode());
  const [state, setState] = useState(() => makeEmptyState());
  const [selectedToken, setSelectedToken] = useState(null);
  const [editingStart, setEditingStart] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragState, setDragState] = useState(null);
  const [connectedLinks, setConnectedLinks] = useState(0);
  const fileInputRef = useRef(null);
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const peerRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const identityRef = useRef(new Map());
  const stateRef = useRef(state);
  const previousBackgroundRef = useRef(state.backgroundImage);

  useEffect(() => { stateRef.current = state; }, [state]);

  const sendState = (connection, includeBackground = false) => {
    if (!connection?.open) return;
    const tokenId = identityRef.current.get(connection.peer) || null;
    const current = stateRef.current;
    const packetState = includeBackground ? current : { ...current, backgroundImage: undefined };
    connection.send({ type: "tactical_state", state: packetState, youTokenId: tokenId });
  };

  const broadcastState = (includeBackground = false) => {
    connectionsRef.current.forEach((connection) => sendState(connection, includeBackground));
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const code = getSessionCode();
      if (code && code !== sessionCode) setSessionCode(code);
    }, 700);
    return () => window.clearInterval(timer);
  }, [sessionCode]);

  useEffect(() => {
    const backgroundChanged = previousBackgroundRef.current !== state.backgroundImage;
    previousBackgroundRef.current = state.backgroundImage;
    broadcastState(backgroundChanged);
  }, [state]);

  useEffect(() => {
    if (!sessionCode) return undefined;

    const cleanup = () => {
      connectionsRef.current.forEach((connection) => { try { connection.close(); } catch { /* noop */ } });
      connectionsRef.current.clear();
      identityRef.current.clear();
      setConnectedLinks(0);
      try { peerRef.current?.destroy?.(); } catch { /* noop */ }
      peerRef.current = null;
    };

    cleanup();
    const peer = new Peer(`${TACTICAL_HOST_PREFIX}${sessionCode.toLowerCase()}`, { debug: 0 });
    peerRef.current = peer;

    peer.on("connection", (connection) => {
      connectionsRef.current.set(connection.peer, connection);
      setConnectedLinks(connectionsRef.current.size);

      connection.on("open", () => sendState(connection, true));
      connection.on("data", (packet) => {
        if (!packet || typeof packet !== "object") return;

        if (packet.type === "tactical_hello") {
          const token = findTokenForHello(stateRef.current, packet);
          if (token) identityRef.current.set(connection.peer, token.id);
          sendState(connection, true);
          return;
        }

        if (packet.type === "tactical_create_token") {
          if (!stateRef.current.active) return;
          const alreadyLinkedId = identityRef.current.get(connection.peer);
          const alreadyLinked = alreadyLinkedId
            ? stateRef.current.tokens.find((token) => token.id === alreadyLinkedId && token.kind === "player")
            : findTokenForHello(stateRef.current, packet);

          if (alreadyLinked) {
            identityRef.current.set(connection.peer, alreadyLinked.id);
            const avatar = safePlayerAvatar(packet.avatar);
            if (avatar && avatar !== alreadyLinked.avatar) {
              setState((previous) => ({
                ...previous,
                tokens: previous.tokens.map((token) => token.id === alreadyLinked.id ? { ...token, avatar } : token),
                revision: Number(previous.revision || 0) + 1,
              }));
            } else {
              sendState(connection, true);
            }
            return;
          }

          const current = stateRef.current;
          const startZone = current.startZone?.length ? current.startZone : makeDefaultStartZone(current.cols, current.rows);
          const cell = findFreePlacement(current.tokens, 1, current.cols, current.rows, startZone);
          const name = String(packet.characterName || packet.playerName || "Player").trim().slice(0, 80) || "Player";
          const token = {
            id: playerTokenId(packet, connection.peer),
            kind: "player",
            name,
            x: cell.x,
            y: cell.y,
            size: 1,
            avatar: safePlayerAvatar(packet.avatar),
            connected: true,
          };
          identityRef.current.set(connection.peer, token.id);
          setState((previous) => ({
            ...previous,
            tokens: [...previous.tokens, token],
            revision: Number(previous.revision || 0) + 1,
          }));
          return;
        }

        if (packet.type === "tactical_update_token") {
          const allowedTokenId = identityRef.current.get(connection.peer);
          if (!allowedTokenId) return;
          const avatar = safePlayerAvatar(packet.avatar);
          if (!avatar) return;
          setState((previous) => ({
            ...previous,
            tokens: previous.tokens.map((token) => token.id === allowedTokenId && token.kind === "player" ? { ...token, avatar } : token),
            revision: Number(previous.revision || 0) + 1,
          }));
          return;
        }

        if (packet.type === "tactical_move") {
          const allowedTokenId = identityRef.current.get(connection.peer);
          if (!allowedTokenId || packet.tokenId !== allowedTokenId || !stateRef.current.active) return;
          const currentToken = stateRef.current.tokens.find((token) => token.id === allowedTokenId && token.kind === "player");
          if (!currentToken) return;
          const size = tokenSize(currentToken);
          const target = normalizeTokenCell(packet, size, stateRef.current.cols, stateRef.current.rows);
          if (!canPlaceToken(stateRef.current.tokens, allowedTokenId, target.x, target.y, size, stateRef.current.cols, stateRef.current.rows)) return;
          setState((previous) => ({
            ...previous,
            tokens: previous.tokens.map((token) => token.id === allowedTokenId ? { ...token, ...target } : token),
            revision: Number(previous.revision || 0) + 1,
          }));
        }
      });

      const removeConnection = () => {
        connectionsRef.current.delete(connection.peer);
        identityRef.current.delete(connection.peer);
        setConnectedLinks(connectionsRef.current.size);
      };
      connection.on("close", removeConnection);
      connection.on("error", removeConnection);
    });

    peer.on("error", () => {});
    return cleanup;
  }, [sessionCode]);

  const startScene = () => {
    setEditingStart(false);
    setSelectedToken(null);
    setState((previous) => ({
      ...moveExistingPlayersToStart({ ...previous, active: true, sceneId: `scene-${Date.now()}` }),
      active: true,
    }));
  };

  const resetPlayers = () => {
    setSelectedToken(null);
    setState((previous) => moveExistingPlayersToStart({ ...previous, active: true }));
  };

  const endScene = () => {
    setSelectedToken(null);
    setState((previous) => ({ ...previous, active: false, revision: Number(previous.revision || 0) + 1 }));
  };

  const resetMap = () => {
    setEditingStart(false);
    setSelectedToken(null);
    setDragState(null);
    dragRef.current = null;
    setUploadError("");
    setState(makeEmptyState(state.cols, state.rows));
  };

  const changeSize = (value) => {
    const [cols, rows] = value.split("x").map(Number);
    setEditingStart(false);
    setSelectedToken(null);
    setDragState(null);
    dragRef.current = null;
    setState((previous) => ({
      ...makeEmptyState(cols, rows),
      backgroundImage: previous.backgroundImage,
      backgroundName: previous.backgroundName,
      tokens: previous.tokens.filter((token) => token.kind === "enemy"),
    }));
    identityRef.current.clear();
  };

  const toggleStartCell = (x, y) => {
    setState((previous) => {
      const exists = previous.startZone.some((cell) => cell.x === x && cell.y === y);
      const nextZone = exists
        ? previous.startZone.filter((cell) => !(cell.x === x && cell.y === y))
        : [...previous.startZone, { x, y }];
      return { ...previous, startZone: nextZone, revision: Number(previous.revision || 0) + 1 };
    });
  };

  const moveTokenTo = (tokenId, x, y) => {
    if (!tokenId || editingStart) return;
    setState((previous) => {
      const token = previous.tokens.find((item) => item.id === tokenId);
      if (!token) return previous;
      const size = tokenSize(token);
      const target = normalizeTokenCell({ x, y }, size, previous.cols, previous.rows);
      if (!canPlaceToken(previous.tokens, token.id, target.x, target.y, size, previous.cols, previous.rows)) return previous;
      return {
        ...previous,
        tokens: previous.tokens.map((item) => item.id === token.id ? { ...item, ...target } : item),
        revision: Number(previous.revision || 0) + 1,
      };
    });
  };

  const moveSelectedToken = (x, y) => {
    if (!selectedToken || editingStart) return;
    moveTokenTo(selectedToken, x, y);
  };

  const beginTokenDrag = (event, token) => {
    if (editingStart || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = tokenSize(token);
    const anchorX = Math.max(0, Math.min(size - 1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * size)));
    const anchorY = Math.max(0, Math.min(size - 1, Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * size)));
    dragRef.current = {
      tokenId: token.id,
      startX: event.clientX,
      startY: event.clientY,
      anchorX,
      anchorY,
      moved: false,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({ tokenId: token.id, x: event.clientX, y: event.clientY, moved: false, size, avatar: token.avatar || "", name: token.name || "" });
    event.stopPropagation();
  };

  const moveTokenDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6;
    drag.moved = moved;
    if (moved) event.preventDefault();
    setDragState((current) => current ? { ...current, x: event.clientX, y: event.clientY, moved } : current);
  };

  const finishTokenDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();

    if (!drag.moved) {
      setSelectedToken((current) => current === drag.tokenId ? null : drag.tokenId);
      return;
    }

    event.preventDefault();
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    const cellX = Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * stateRef.current.cols);
    const cellY = Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * stateRef.current.rows);
    moveTokenTo(drag.tokenId, cellX - drag.anchorX, cellY - drag.anchorY);
    setSelectedToken(drag.tokenId);
  };

  const cancelTokenDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
  };

  const addEnemyToken = ({ entry, name, size }) => {
    setState((previous) => {
      const tokenId = `enemy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const finalSize = Number(size) === 2 ? 2 : 1;
      const position = findFreePlacement(previous.tokens, finalSize, previous.cols, previous.rows);
      const maxHp = numberOrNull(entry?.hp);
      const token = {
        id: tokenId,
        kind: "enemy",
        name: String(name || entry?.name || "Enemy").trim().slice(0, 80),
        x: position.x,
        y: position.y,
        size: finalSize,
        avatar: "",
        bestiaryId: entry?.id || "",
        maxHp,
        hp: maxHp,
        level: entry?.level || "",
        defense: entry?.defense || "",
        initiative: entry?.initiative || "",
        drBlock: entry?.drBlock || "",
        attacks: entry?.attacks || "",
        abilities: entry?.abilities || "",
        creatureType: entry?.creatureType || "",
      };
      return { ...previous, tokens: [...previous.tokens, token], revision: Number(previous.revision || 0) + 1 };
    });
  };

  const updateEnemyToken = (tokenId, patch) => {
    setState((previous) => {
      const current = previous.tokens.find((token) => token.id === tokenId && token.kind === "enemy");
      if (!current) return previous;
      const requestedSize = patch.size != null ? (Number(patch.size) === 2 ? 2 : 1) : tokenSize(current);
      let target = normalizeTokenCell(current, requestedSize, previous.cols, previous.rows);
      if (!canPlaceToken(previous.tokens, tokenId, target.x, target.y, requestedSize, previous.cols, previous.rows)) {
        target = findFreePlacement(previous.tokens.filter((token) => token.id !== tokenId), requestedSize, previous.cols, previous.rows);
      }
      const next = { ...current, ...patch, ...target, size: requestedSize };
      if (next.maxHp != null && patch.hp != null) next.hp = Math.max(0, Math.min(Number(next.maxHp), Number(patch.hp)));
      return {
        ...previous,
        tokens: previous.tokens.map((token) => token.id === tokenId ? next : token),
        revision: Number(previous.revision || 0) + 1,
      };
    });
  };

  const removeEnemyToken = (tokenId) => {
    setSelectedToken((current) => current === tokenId ? null : current);
    setState((previous) => ({
      ...previous,
      tokens: previous.tokens.filter((token) => token.id !== tokenId || token.kind !== "enemy"),
      revision: Number(previous.revision || 0) + 1,
    }));
  };

  const handleBackgroundFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const backgroundImage = await compressBackground(file);
      setState((previous) => ({
        ...previous,
        backgroundImage,
        backgroundName: String(file.name || "map").slice(0, 100),
        revision: Number(previous.revision || 0) + 1,
      }));
    } catch (error) {
      setUploadError(error?.message === "too-large" ? text.imageTooLarge : text.imageError);
    } finally {
      setUploading(false);
    }
  };

  const removeBackground = () => {
    setUploadError("");
    setState((previous) => ({ ...previous, backgroundImage: "", backgroundName: "", revision: Number(previous.revision || 0) + 1 }));
  };

  const startKeys = useMemo(() => new Set(state.startZone.map((cell) => `${cell.x}:${cell.y}`)), [state.startZone]);
  const enemyTokens = useMemo(() => state.tokens.filter((token) => token.kind === "enemy"), [state.tokens]);
  const playerTokens = useMemo(() => state.tokens.filter((token) => token.kind === "player"), [state.tokens]);

  if (!sessionCode) {
    return <article className="pip-panel gm-session-map"><div className="pip-logbox">{text.waiting}</div></article>;
  }

  return (
    <article className="pip-panel gm-session-map tactical-map">
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="tactical-background-input" onChange={handleBackgroundFile} />

      <div className="gm-session-map__head">
        <div>
          <div className="gm-session-map__eyebrow">ROBCO // GM TACTICAL LINK // {sessionCode}</div>
          <h2>[ {text.title} ]</h2>
        </div>
        <div className="gm-session-map__meta">
          <span>{text.players}: <strong>{playerTokens.length}</strong></span>
          <span>{text.connected}: <strong>{connectedLinks}</strong></span>
          <span className={state.active ? "tactical-live" : ""}>{state.active ? text.active : "OFFLINE"}</span>
          <label className="tactical-size-select">{text.size}
            <select className="pip-input" value={`${state.cols}x${state.rows}`} onChange={(event) => changeSize(event.target.value)}>
              <option value="8x8">8×8</option>
              <option value="12x12">12×12</option>
              <option value="16x12">16×12</option>
              <option value="16x16">16×16</option>
            </select>
          </label>
        </div>
      </div>

      <div className="tactical-background-bar">
        <div className="tactical-background-info">
          <span>{text.background}</span>
          <strong>{uploading ? text.processing : (state.backgroundName || text.noBackground)}</strong>
        </div>
        <div className="tactical-background-actions">
          <button type="button" className="pip-btn" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {state.backgroundImage ? text.replaceBackground : text.uploadBackground}
          </button>
          {state.backgroundImage ? <button type="button" className="pip-btn" disabled={uploading} onClick={removeBackground}>{text.removeBackground}</button> : null}
        </div>
      </div>
      {uploadError ? <div className="session-error tactical-background-error">{uploadError}</div> : null}

      <TacticalEnemyManager
        tokens={enemyTokens}
        selectedTokenId={selectedToken}
        onSelectToken={(tokenId) => setSelectedToken((current) => current === tokenId ? null : tokenId)}
        onAddToken={addEnemyToken}
        onRemoveToken={removeEnemyToken}
        onUpdateToken={updateEnemyToken}
      />

      <div className="tactical-toolbar">
        <button type="button" className={`pip-btn${editingStart ? " is-primary" : ""}`} onClick={() => setEditingStart((value) => !value)}>
          {editingStart ? text.finishEdit : text.editStart}
        </button>
        {!state.active ? (
          <button type="button" className="pip-btn is-primary tactical-scene-toggle" disabled={!state.startZone.length} onClick={startScene}>{text.startScene}</button>
        ) : (
          <button type="button" className="pip-btn is-primary tactical-scene-toggle is-live" onClick={endScene}>{text.endScene}</button>
        )}
        <button type="button" className="pip-btn" disabled={!state.active || !playerTokens.length} onClick={resetPlayers}>{text.resetPlayers}</button>
        <button type="button" className="pip-btn" onClick={resetMap}>{text.resetMap}</button>
      </div>

      <div className={`gm-session-map__hint${editingStart ? " is-editing" : ""}`}>
        {editingStart ? text.editHint : state.active ? text.move : text.inactive}
        <span> · {text.startZone}: {state.startZone.length}</span>
      </div>

      <div
        ref={gridRef}
        className={`gm-session-map__grid tactical-grid${state.backgroundImage ? " has-background" : ""}${dragState?.moved ? " is-drag-active" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))`,
          backgroundImage: state.backgroundImage ? `url(${state.backgroundImage})` : undefined,
        }}
      >
        {Array.from({ length: state.rows * state.cols }, (_, index) => {
          const x = index % state.cols;
          const y = Math.floor(index / state.cols);
          const key = `${x}:${y}`;
          const inStart = startKeys.has(key);
          const tokens = state.tokens.filter((token) => token.x === x && token.y === y);
          return (
            <button
              type="button"
              key={key}
              className={`gm-session-map__cell tactical-cell${inStart ? " is-start-zone" : ""}${editingStart ? " is-start-edit" : ""}`}
              onClick={() => editingStart ? toggleStartCell(x, y) : moveSelectedToken(x, y)}
            >
              <span className="gm-session-map__tokens">
                {tokens.map((token) => {
                  const enemy = token.kind === "enemy";
                  const selected = selectedToken === token.id;
                  const dragging = dragState?.tokenId === token.id && dragState?.moved;
                  return (
                    <span
                      key={token.id}
                      className={`gm-session-token ${enemy ? "is-enemy" : "is-player"} is-size-${tokenSize(token)}${selected ? " is-selected" : ""}${dragging ? " is-dragging" : ""}`}
                      title={token.name}
                      onPointerDown={(event) => beginTokenDrag(event, token)}
                      onPointerMove={moveTokenDrag}
                      onPointerUp={finishTokenDrag}
                      onPointerCancel={cancelTokenDrag}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {token.avatar ? <img src={token.avatar} alt="" /> : <b>{enemy ? String(token.name || "E").slice(0, 1).toUpperCase() : "P"}</b>}
                      <small>{token.name}</small>
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>

      {dragState?.moved ? (
        <div className={`tactical-drag-ghost is-size-${dragState.size}`} style={{ left: dragState.x, top: dragState.y }} aria-hidden="true">
          {dragState.avatar ? <img src={dragState.avatar} alt="" /> : <b>{String(dragState.name || "T").slice(0, 1).toUpperCase()}</b>}
        </div>
      ) : null}
    </article>
  );
}
