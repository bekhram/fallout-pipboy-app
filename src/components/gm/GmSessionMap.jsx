import React, { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import "./gmSessionMap.css";

const TACTICAL_HOST_PREFIX = "pip2d20-tactical-";
const DEFAULT_COLS = 12;
const DEFAULT_ROWS = 12;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

const COPY = {
  en: {
    title: "TACTICAL MAP",
    waiting: "Waiting for an active GM session...",
    players: "PLAYERS",
    startZone: "START ZONE",
    editStart: "EDIT START ZONE",
    finishEdit: "FINISH EDITING",
    startScene: "START SCENE",
    resetPlayers: "RETURN ALL TO START",
    endScene: "END SCENE",
    inactive: "Upload a background if needed, mark the start zone and launch the scene.",
    active: "LIVE TACTICAL SCENE",
    move: "Select a token and click any cell to move it.",
    editHint: "Click cells to add or remove them from the forced player start zone.",
    size: "GRID",
    resetMap: "RESET MAP",
    uploadBackground: "UPLOAD BACKGROUND",
    replaceBackground: "REPLACE BACKGROUND",
    removeBackground: "REMOVE BACKGROUND",
    background: "BACKGROUND",
    noBackground: "No background image",
    processing: "PROCESSING IMAGE...",
    imageError: "Could not load this image.",
    imageTooLarge: "Image is too large. Maximum source file size is 12 MB.",
  },
  ru: {
    title: "ТАКТИЧЕСКАЯ КАРТА",
    waiting: "Ожидаю активную сессию ГМ...",
    players: "ИГРОКИ",
    startZone: "СТАРТОВАЯ ЗОНА",
    editStart: "ИЗМЕНИТЬ СТАРТОВУЮ ЗОНУ",
    finishEdit: "ЗАКОНЧИТЬ РЕДАКТИРОВАНИЕ",
    startScene: "НАЧАТЬ СЦЕНУ",
    resetPlayers: "ВЕРНУТЬ ВСЕХ В СТАРТ",
    endScene: "ЗАВЕРШИТЬ СЦЕНУ",
    inactive: "При необходимости загрузите фон, отметьте стартовую зону и запустите сцену.",
    active: "ТАКТИЧЕСКАЯ СЦЕНА LIVE",
    move: "Выберите токен и нажмите на любую клетку, чтобы переместить его.",
    editHint: "Нажимайте на клетки, чтобы добавить или убрать их из стартовой зоны игроков.",
    size: "СЕТКА",
    resetMap: "СБРОСИТЬ КАРТУ",
    uploadBackground: "ЗАГРУЗИТЬ ФОН",
    replaceBackground: "ЗАМЕНИТЬ ФОН",
    removeBackground: "УДАЛИТЬ ФОН",
    background: "ФОН",
    noBackground: "Фоновая картинка не загружена",
    processing: "ОБРАБОТКА ИЗОБРАЖЕНИЯ...",
    imageError: "Не удалось загрузить это изображение.",
    imageTooLarge: "Файл слишком большой. Максимальный размер исходного изображения — 12 МБ.",
  },
  uk: {
    title: "ТАКТИЧНА МАПА",
    waiting: "Очікую активну сесію ГМ...",
    players: "ГРАВЦІ",
    startZone: "СТАРТОВА ЗОНА",
    editStart: "ЗМІНИТИ СТАРТОВУ ЗОНУ",
    finishEdit: "ЗАКІНЧИТИ РЕДАГУВАННЯ",
    startScene: "ПОЧАТИ СЦЕНУ",
    resetPlayers: "ПОВЕРНУТИ ВСІХ НА СТАРТ",
    endScene: "ЗАВЕРШИТИ СЦЕНУ",
    inactive: "За потреби завантажте фон, позначте стартову зону та запустіть сцену.",
    active: "ТАКТИЧНА СЦЕНА LIVE",
    move: "Оберіть токен і натисніть будь-яку клітинку, щоб перемістити його.",
    editHint: "Натискайте клітинки, щоб додати або прибрати їх зі стартової зони гравців.",
    size: "СІТКА",
    resetMap: "СКИНУТИ МАПУ",
    uploadBackground: "ЗАВАНТАЖИТИ ФОН",
    replaceBackground: "ЗАМІНИТИ ФОН",
    removeBackground: "ВИДАЛИТИ ФОН",
    background: "ФОН",
    noBackground: "Фонове зображення не завантажено",
    processing: "ОБРОБКА ЗОБРАЖЕННЯ...",
    imageError: "Не вдалося завантажити це зображення.",
    imageTooLarge: "Файл завеликий. Максимальний розмір вихідного зображення — 12 МБ.",
  },
  pl: {
    title: "MAPA TAKTYCZNA",
    waiting: "Oczekiwanie na aktywną sesję GM...",
    players: "GRACZE",
    startZone: "STREFA STARTOWA",
    editStart: "EDYTUJ STREFĘ STARTOWĄ",
    finishEdit: "ZAKOŃCZ EDYCJĘ",
    startScene: "ROZPOCZNIJ SCENĘ",
    resetPlayers: "PRZENIEŚ WSZYSTKICH NA START",
    endScene: "ZAKOŃCZ SCENĘ",
    inactive: "W razie potrzeby wgraj tło, zaznacz strefę startową i uruchom scenę.",
    active: "SCENA TAKTYCZNA LIVE",
    move: "Wybierz token i kliknij dowolne pole, aby go przenieść.",
    editHint: "Klikaj pola, aby dodać lub usunąć je ze strefy startowej graczy.",
    size: "SIATKA",
    resetMap: "RESETUJ MAPĘ",
    uploadBackground: "WGRAJ TŁO",
    replaceBackground: "ZMIEŃ TŁO",
    removeBackground: "USUŃ TŁO",
    background: "TŁO",
    noBackground: "Brak obrazu tła",
    processing: "PRZETWARZANIE OBRAZU...",
    imageError: "Nie udało się wczytać tego obrazu.",
    imageTooLarge: "Plik jest za duży. Maksymalny rozmiar obrazu źródłowego to 12 MB.",
  },
};

function languageCode() {
  const html = document.documentElement.lang || "en";
  const code = String(html).toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function getSessionCode() {
  return document.querySelector(".session-gm-code")?.textContent?.trim()?.toUpperCase() || "";
}

function slug(value) {
  return String(value || "player")
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїє]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "player";
}

function getRoster() {
  const seen = new Map();
  return Array.from(document.querySelectorAll(".session-gm-roster-strip__list .session-gm-player-card"))
    .map((node) => {
      const name = node.querySelector("strong")?.textContent?.trim() || "Player";
      const base = slug(name);
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      return { id: count ? `player-${base}-${count + 1}` : `player-${base}`, name };
    });
}

function sameRoster(a, b) {
  return a.length === b.length && a.every((item, index) => item.id === b[index]?.id && item.name === b[index]?.name);
}

function makeDefaultStartZone(cols, rows) {
  const result = [];
  const startY = Math.max(0, rows - 3);
  for (let y = startY; y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function normalizeCell(cell, cols, rows) {
  return {
    x: Math.max(0, Math.min(cols - 1, Number(cell?.x || 0))),
    y: Math.max(0, Math.min(rows - 1, Number(cell?.y || 0))),
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

function forcePlayersToStart(state, roster) {
  const startZone = state.startZone?.length ? state.startZone : makeDefaultStartZone(state.cols, state.rows);
  const tokens = roster.map((player, index) => {
    const cell = startZone[index % startZone.length] || { x: 0, y: state.rows - 1 };
    return {
      id: player.id,
      kind: "player",
      name: player.name,
      x: cell.x,
      y: cell.y,
      connected: true,
    };
  });
  return { ...state, tokens, revision: Number(state.revision || 0) + 1 };
}

function reconcileRoster(state, roster) {
  const previousByName = new Map((state.tokens || []).map((token) => [String(token.name).toLowerCase(), token]));
  const occupied = new Set();
  const startZone = state.startZone?.length ? state.startZone : makeDefaultStartZone(state.cols, state.rows);

  const tokens = roster.map((player, index) => {
    const previous = previousByName.get(String(player.name).toLowerCase());
    if (previous) {
      occupied.add(`${previous.x}:${previous.y}`);
      return { ...previous, id: player.id, name: player.name, connected: true };
    }
    const preferred = startZone.find((cell) => !occupied.has(`${cell.x}:${cell.y}`))
      || startZone[index % startZone.length]
      || { x: 0, y: state.rows - 1 };
    occupied.add(`${preferred.x}:${preferred.y}`);
    return { id: player.id, kind: "player", name: player.name, x: preferred.x, y: preferred.y, connected: true };
  });

  return { ...state, tokens, revision: Number(state.revision || 0) + 1 };
}

function findTokenForHello(state, packet) {
  const names = [packet?.characterName, packet?.playerName]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  if (!names.length) return null;
  return (state.tokens || []).find((token) => names.includes(String(token.name || "").trim().toLowerCase()))
    || (state.tokens || []).find((token) => names.some((name) => {
      const tokenName = String(token.name || "").trim().toLowerCase();
      return tokenName && (tokenName.includes(name) || name.includes(tokenName));
    }))
    || null;
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

export default function GmSessionMap() {
  const text = COPY[languageCode()];
  const [sessionCode, setSessionCode] = useState(() => getSessionCode());
  const [roster, setRoster] = useState(() => getRoster());
  const [state, setState] = useState(() => makeEmptyState());
  const [selectedToken, setSelectedToken] = useState(null);
  const [editingStart, setEditingStart] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const peerRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const identityRef = useRef(new Map());
  const stateRef = useRef(state);
  const rosterRef = useRef(roster);
  const previousBackgroundRef = useRef(state.backgroundImage);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { rosterRef.current = roster; }, [roster]);

  const sendState = (connection, includeBackground = false) => {
    if (!connection?.open) return;
    const tokenId = identityRef.current.get(connection.peer) || null;
    const current = stateRef.current;
    const packetState = includeBackground
      ? current
      : { ...current, backgroundImage: undefined };
    connection.send({ type: "tactical_state", state: packetState, youTokenId: tokenId });
  };

  const broadcastState = (includeBackground = false) => {
    connectionsRef.current.forEach((connection) => sendState(connection, includeBackground));
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const code = getSessionCode();
      if (code && code !== sessionCode) setSessionCode(code);
      const nextRoster = getRoster();
      setRoster((previous) => sameRoster(previous, nextRoster) ? previous : nextRoster);
    }, 700);
    return () => window.clearInterval(timer);
  }, [sessionCode]);

  useEffect(() => {
    if (!state.active) return;
    const currentNames = new Set((state.tokens || []).map((token) => String(token.name).toLowerCase()));
    const rosterNames = new Set(roster.map((player) => String(player.name).toLowerCase()));
    const changed = roster.some((player) => !currentNames.has(String(player.name).toLowerCase()))
      || (state.tokens || []).some((token) => !rosterNames.has(String(token.name).toLowerCase()));
    if (changed) setState((previous) => reconcileRoster(previous, roster));
  }, [roster, state.active]);

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
      try { peerRef.current?.destroy?.(); } catch { /* noop */ }
      peerRef.current = null;
    };

    cleanup();
    const peer = new Peer(`${TACTICAL_HOST_PREFIX}${sessionCode.toLowerCase()}`, { debug: 0 });
    peerRef.current = peer;

    peer.on("connection", (connection) => {
      connectionsRef.current.set(connection.peer, connection);
      connection.on("open", () => sendState(connection, true));
      connection.on("data", (packet) => {
        if (!packet || typeof packet !== "object") return;
        if (packet.type === "tactical_hello") {
          const token = findTokenForHello(stateRef.current, packet);
          if (token) identityRef.current.set(connection.peer, token.id);
          sendState(connection, true);
          return;
        }
        if (packet.type === "tactical_move") {
          const allowedTokenId = identityRef.current.get(connection.peer);
          if (!allowedTokenId || packet.tokenId !== allowedTokenId || !stateRef.current.active) return;
          const target = normalizeCell(packet, stateRef.current.cols, stateRef.current.rows);
          setState((previous) => ({
            ...previous,
            tokens: previous.tokens.map((token) => token.id === allowedTokenId ? { ...token, ...target } : token),
            revision: Number(previous.revision || 0) + 1,
          }));
        }
      });
      connection.on("close", () => {
        connectionsRef.current.delete(connection.peer);
        identityRef.current.delete(connection.peer);
      });
      connection.on("error", () => {
        connectionsRef.current.delete(connection.peer);
        identityRef.current.delete(connection.peer);
      });
    });
    peer.on("error", () => {});

    return cleanup;
  }, [sessionCode]);

  const startScene = () => {
    setEditingStart(false);
    setSelectedToken(null);
    setState((previous) => ({
      ...forcePlayersToStart({ ...previous, active: true, sceneId: `scene-${Date.now()}` }, rosterRef.current),
      active: true,
    }));
  };

  const resetPlayers = () => {
    setSelectedToken(null);
    setState((previous) => forcePlayersToStart({ ...previous, active: true }, rosterRef.current));
  };

  const endScene = () => {
    setSelectedToken(null);
    setState((previous) => ({ ...previous, active: false, revision: Number(previous.revision || 0) + 1 }));
  };

  const resetMap = () => {
    setEditingStart(false);
    setSelectedToken(null);
    setUploadError("");
    setState(makeEmptyState(state.cols, state.rows));
  };

  const changeSize = (value) => {
    const [cols, rows] = value.split("x").map(Number);
    setEditingStart(false);
    setSelectedToken(null);
    setState((previous) => ({
      ...makeEmptyState(cols, rows),
      backgroundImage: previous.backgroundImage,
      backgroundName: previous.backgroundName,
    }));
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

  const moveSelectedToken = (x, y) => {
    if (!selectedToken || editingStart || !state.active) return;
    setState((previous) => ({
      ...previous,
      tokens: previous.tokens.map((token) => token.id === selectedToken ? { ...token, x, y } : token),
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
    setState((previous) => ({
      ...previous,
      backgroundImage: "",
      backgroundName: "",
      revision: Number(previous.revision || 0) + 1,
    }));
  };

  const startKeys = useMemo(() => new Set(state.startZone.map((cell) => `${cell.x}:${cell.y}`)), [state.startZone]);

  if (!sessionCode) {
    return <article className="pip-panel gm-session-map"><div className="pip-logbox">{text.waiting}</div></article>;
  }

  return (
    <article className="pip-panel gm-session-map tactical-map">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="tactical-background-input"
        onChange={handleBackgroundFile}
      />

      <div className="gm-session-map__head">
        <div>
          <div className="gm-session-map__eyebrow">ROBCO // GM TACTICAL LINK // {sessionCode}</div>
          <h2>[ {text.title} ]</h2>
        </div>
        <div className="gm-session-map__meta">
          <span>{text.players}: <strong>{roster.length}</strong></span>
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
          {state.backgroundImage ? (
            <button type="button" className="pip-btn" disabled={uploading} onClick={removeBackground}>{text.removeBackground}</button>
          ) : null}
        </div>
      </div>
      {uploadError ? <div className="session-error tactical-background-error">{uploadError}</div> : null}

      <div className="tactical-toolbar">
        <button type="button" className={`pip-btn${editingStart ? " is-primary" : ""}`} onClick={() => setEditingStart((value) => !value)}>
          {editingStart ? text.finishEdit : text.editStart}
        </button>
        <button type="button" className="pip-btn is-primary" disabled={!state.startZone.length || !roster.length} onClick={startScene}>{text.startScene}</button>
        <button type="button" className="pip-btn" disabled={!state.active || !roster.length} onClick={resetPlayers}>{text.resetPlayers}</button>
        <button type="button" className="pip-btn" disabled={!state.active} onClick={endScene}>{text.endScene}</button>
        <button type="button" className="pip-btn" onClick={resetMap}>{text.resetMap}</button>
      </div>

      <div className={`gm-session-map__hint${editingStart ? " is-editing" : ""}`}>
        {editingStart ? text.editHint : state.active ? text.move : text.inactive}
        <span> · {text.startZone}: {state.startZone.length}</span>
      </div>

      <div
        className={`gm-session-map__grid tactical-grid${state.backgroundImage ? " has-background" : ""}`}
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
              <span className="gm-session-map__coords">{x},{y}</span>
              {inStart ? <span className="tactical-start-mark">S</span> : null}
              <span className="gm-session-map__tokens">
                {tokens.map((token) => (
                  <span
                    key={token.id}
                    className={`gm-session-token is-player${selectedToken === token.id ? " is-selected" : ""}`}
                    title={token.name}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!editingStart && state.active) setSelectedToken((current) => current === token.id ? null : token.id);
                    }}
                  >
                    <b>P</b><small>{token.name}</small>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
