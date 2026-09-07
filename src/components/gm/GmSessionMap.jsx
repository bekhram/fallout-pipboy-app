import React, { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import {
  generateTacticalLocation,
  getTacticalTile,
  isTacticalCellBlocked,
  tacticalTileGlyph,
  toggleTacticalDoor,
} from "../../utils/tacticalLocationGenerator.js";
import "./gmSessionMap.css";

const TACTICAL_HOST_PREFIX = "pip2d20-tactical-";
const DEFAULT_COLS = 12;
const DEFAULT_ROWS = 12;

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
    inactive: "Scene is not active. Generate a location, mark the start zone and launch it.",
    active: "LIVE TACTICAL SCENE",
    move: "Select any token, then click a free cell to move it. Click a door with no token selected to open/close it.",
    editHint: "Click cells to add/remove them from the forced player start zone.",
    size: "GRID",
    resetMap: "RESET MAP",
    generator: "LOCATION GENERATOR",
    preset: "TYPE",
    density: "DENSITY",
    generate: "GENERATE LOCATION",
    clearLayout: "CLEAR OBJECTS",
    sparse: "SPARSE",
    normal: "NORMAL",
    dense: "DENSE",
    ruins: "RUINS",
    vault: "VAULT",
    warehouse: "WAREHOUSE",
    camp: "CAMP",
    walls: "WALLS",
    doors: "DOORS",
    obstacles: "OBSTACLES",
    cover: "COVER",
    hazards: "HAZARDS",
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
    inactive: "Сцена не активна. Сгенерируйте локацию, отметьте стартовую зону и запустите её.",
    active: "ТАКТИЧЕСКАЯ СЦЕНА LIVE",
    move: "Выберите токен и нажмите на свободную клетку. Чтобы открыть или закрыть дверь, снимите выбор токена и нажмите на дверь.",
    editHint: "Нажимайте на клетки, чтобы добавить или убрать их из стартовой зоны игроков.",
    size: "СЕТКА",
    resetMap: "СБРОСИТЬ КАРТУ",
    generator: "ГЕНЕРАТОР ЛОКАЦИИ",
    preset: "ТИП",
    density: "ПЛОТНОСТЬ",
    generate: "СГЕНЕРИРОВАТЬ",
    clearLayout: "УБРАТЬ ОБЪЕКТЫ",
    sparse: "РЕДКО",
    normal: "НОРМАЛЬНО",
    dense: "ПЛОТНО",
    ruins: "РУИНЫ",
    vault: "УБЕЖИЩЕ",
    warehouse: "СКЛАД",
    camp: "ЛАГЕРЬ",
    walls: "СТЕНЫ",
    doors: "ДВЕРИ",
    obstacles: "ПРЕПЯТСТВИЯ",
    cover: "УКРЫТИЯ",
    hazards: "ОПАСНОСТИ",
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
    inactive: "Сцена не активна. Згенеруйте локацію, позначте стартову зону та запустіть її.",
    active: "ТАКТИЧНА СЦЕНА LIVE",
    move: "Оберіть токен і натисніть вільну клітинку. Щоб відкрити або закрити двері, зніміть вибір токена та натисніть двері.",
    editHint: "Натискайте клітинки, щоб додати або прибрати їх зі стартової зони гравців.",
    size: "СІТКА",
    resetMap: "СКИНУТИ МАПУ",
    generator: "ГЕНЕРАТОР ЛОКАЦІЇ",
    preset: "ТИП",
    density: "ЩІЛЬНІСТЬ",
    generate: "ЗГЕНЕРУВАТИ",
    clearLayout: "ПРИБРАТИ ОБ'ЄКТИ",
    sparse: "РІДКО",
    normal: "НОРМАЛЬНО",
    dense: "ЩІЛЬНО",
    ruins: "РУЇНИ",
    vault: "СХОВИЩЕ",
    warehouse: "СКЛАД",
    camp: "ТАБІР",
    walls: "СТІНИ",
    doors: "ДВЕРІ",
    obstacles: "ПЕРЕШКОДИ",
    cover: "УКРИТТЯ",
    hazards: "НЕБЕЗПЕКИ",
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
    inactive: "Scena nie jest aktywna. Wygeneruj lokację, zaznacz strefę startową i uruchom scenę.",
    active: "SCENA TAKTYCZNA LIVE",
    move: "Wybierz token i kliknij wolne pole. Aby otworzyć lub zamknąć drzwi, odznacz token i kliknij drzwi.",
    editHint: "Klikaj pola, aby dodać lub usunąć je ze strefy startowej graczy.",
    size: "SIATKA",
    resetMap: "RESETUJ MAPĘ",
    generator: "GENERATOR LOKACJI",
    preset: "TYP",
    density: "GĘSTOŚĆ",
    generate: "GENERUJ",
    clearLayout: "USUŃ OBIEKTY",
    sparse: "RZADKO",
    normal: "NORMALNIE",
    dense: "GĘSTO",
    ruins: "RUINY",
    vault: "KRYPTA",
    warehouse: "MAGAZYN",
    camp: "OBÓZ",
    walls: "ŚCIANY",
    doors: "DRZWI",
    obstacles: "PRZESZKODY",
    cover: "OSŁONY",
    hazards: "ZAGROŻENIA",
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

function getRoster() {
  return Array.from(document.querySelectorAll(".session-gm-roster-strip__list .session-gm-player-card"))
    .map((node, index) => ({
      id: `player-${index}-${String(node.querySelector("strong")?.textContent || "player").toLowerCase().replace(/[^a-z0-9а-яіїє]+/gi, "-")}`,
      name: node.querySelector("strong")?.textContent?.trim() || `Player ${index + 1}`,
    }));
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
  const x = Math.max(0, Math.min(cols - 1, Number(cell?.x || 0)));
  const y = Math.max(0, Math.min(rows - 1, Number(cell?.y || 0)));
  return { x, y };
}

function makeEmptyState(cols = DEFAULT_COLS, rows = DEFAULT_ROWS) {
  return {
    active: false,
    sceneId: `scene-${Date.now()}`,
    cols,
    rows,
    startZone: makeDefaultStartZone(cols, rows),
    tokens: [],
    layout: null,
    revision: 1,
  };
}

function placePlayers(state, roster) {
  const startZone = state.startZone?.length ? state.startZone : makeDefaultStartZone(state.cols, state.rows);
  const tokens = roster.map((player, index) => {
    const fallback = { x: 0, y: state.rows - 1 };
    const cell = startZone.find((candidate, offset) => {
      const candidateIndex = (index + offset) % startZone.length;
      const target = startZone[candidateIndex];
      return target && !isTacticalCellBlocked(state.layout, target.x, target.y);
    }) || startZone[index % startZone.length] || fallback;
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

function findTokenForHello(state, packet) {
  const mainName = String(packet?.characterName || packet?.playerName || "").trim().toLowerCase();
  if (!mainName) return null;
  return (state.tokens || []).find((token) => String(token.name || "").trim().toLowerCase() === mainName)
    || (state.tokens || []).find((token) => String(token.name || "").trim().toLowerCase().includes(mainName) || mainName.includes(String(token.name || "").trim().toLowerCase()))
    || null;
}

function countKinds(layout) {
  const result = { wall: 0, door: 0, obstacle: 0, cover: 0, hazard: 0 };
  (layout?.tiles || []).forEach((tile) => {
    if (Object.prototype.hasOwnProperty.call(result, tile.kind)) result[tile.kind] += 1;
  });
  return result;
}

export default function GmSessionMap() {
  const text = COPY[languageCode()];
  const [sessionCode, setSessionCode] = useState(() => getSessionCode());
  const [roster, setRoster] = useState(() => getRoster());
  const [state, setState] = useState(() => makeEmptyState());
  const [selectedToken, setSelectedToken] = useState(null);
  const [editingStart, setEditingStart] = useState(false);
  const [generatorPreset, setGeneratorPreset] = useState("ruins");
  const [generatorDensity, setGeneratorDensity] = useState("normal");
  const peerRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const identityRef = useRef(new Map());
  const stateRef = useRef(state);
  const rosterRef = useRef(roster);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { rosterRef.current = roster; }, [roster]);

  const sendState = (connection) => {
    if (!connection?.open) return;
    const tokenId = identityRef.current.get(connection.peer) || null;
    connection.send({ type: "tactical_state", state: stateRef.current, youTokenId: tokenId });
  };

  const broadcastState = () => {
    connectionsRef.current.forEach((connection) => sendState(connection));
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
    const currentNames = new Set((state.tokens || []).map((token) => token.name));
    const rosterNames = new Set(roster.map((player) => player.name));
    const changed = roster.some((player) => !currentNames.has(player.name)) || (state.tokens || []).some((token) => token.kind === "player" && !rosterNames.has(token.name));
    if (!changed) return;
    setState((previous) => placePlayers(previous, roster));
  }, [roster, state.active]);

  useEffect(() => {
    broadcastState();
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
      connection.on("open", () => sendState(connection));
      connection.on("data", (packet) => {
        if (!packet || typeof packet !== "object") return;
        if (packet.type === "tactical_hello") {
          const token = findTokenForHello(stateRef.current, packet);
          if (token) identityRef.current.set(connection.peer, token.id);
          sendState(connection);
          return;
        }
        if (packet.type === "tactical_move") {
          const allowedTokenId = identityRef.current.get(connection.peer);
          if (!allowedTokenId || packet.tokenId !== allowedTokenId || !stateRef.current.active) return;
          const target = normalizeCell(packet, stateRef.current.cols, stateRef.current.rows);
          if (isTacticalCellBlocked(stateRef.current.layout, target.x, target.y)) return;
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
      ...placePlayers({ ...previous, active: true, sceneId: `scene-${Date.now()}` }, rosterRef.current),
      active: true,
    }));
  };

  const resetPlayers = () => {
    setSelectedToken(null);
    setState((previous) => placePlayers({ ...previous, active: true }, rosterRef.current));
  };

  const endScene = () => {
    setSelectedToken(null);
    setState((previous) => ({ ...previous, active: false, revision: Number(previous.revision || 0) + 1 }));
  };

  const resetMap = () => {
    setEditingStart(false);
    setSelectedToken(null);
    setState(makeEmptyState(state.cols, state.rows));
  };

  const changeSize = (value) => {
    const [cols, rows] = value.split("x").map(Number);
    setEditingStart(false);
    setSelectedToken(null);
    setState(makeEmptyState(cols, rows));
  };

  const generateLocation = () => {
    setEditingStart(false);
    setSelectedToken(null);
    setState((previous) => ({
      ...previous,
      active: false,
      tokens: [],
      sceneId: `scene-${Date.now()}`,
      layout: generateTacticalLocation({
        cols: previous.cols,
        rows: previous.rows,
        preset: generatorPreset,
        density: generatorDensity,
        startZone: previous.startZone,
      }),
      revision: Number(previous.revision || 0) + 1,
    }));
  };

  const clearLayout = () => {
    setSelectedToken(null);
    setState((previous) => ({ ...previous, layout: null, revision: Number(previous.revision || 0) + 1 }));
  };

  const toggleStartCell = (x, y) => {
    setState((previous) => {
      const exists = previous.startZone.some((cell) => cell.x === x && cell.y === y);
      const nextZone = exists
        ? previous.startZone.filter((cell) => !(cell.x === x && cell.y === y))
        : [...previous.startZone, { x, y }];
      const nextLayout = !exists && previous.layout
        ? { ...previous.layout, tiles: (previous.layout.tiles || []).filter((tile) => !(tile.x === x && tile.y === y)) }
        : previous.layout;
      return { ...previous, startZone: nextZone, layout: nextLayout, revision: Number(previous.revision || 0) + 1 };
    });
  };

  const toggleDoorAt = (x, y) => {
    setState((previous) => ({
      ...previous,
      layout: toggleTacticalDoor(previous.layout, x, y),
      revision: Number(previous.revision || 0) + 1,
    }));
  };

  const moveSelectedToken = (x, y) => {
    if (!selectedToken || editingStart || isTacticalCellBlocked(state.layout, x, y)) return;
    setState((previous) => ({
      ...previous,
      tokens: previous.tokens.map((token) => token.id === selectedToken ? { ...token, x, y } : token),
      revision: Number(previous.revision || 0) + 1,
    }));
  };

  const handleCellClick = (x, y, tile) => {
    if (editingStart) {
      toggleStartCell(x, y);
      return;
    }
    if (!selectedToken && tile?.kind === "door") {
      toggleDoorAt(x, y);
      return;
    }
    moveSelectedToken(x, y);
  };

  const startKeys = useMemo(() => new Set(state.startZone.map((cell) => `${cell.x}:${cell.y}`)), [state.startZone]);
  const tileIndex = useMemo(() => new Map((state.layout?.tiles || []).map((tile) => [`${tile.x}:${tile.y}`, tile])), [state.layout]);
  const layoutCounts = useMemo(() => countKinds(state.layout), [state.layout]);

  if (!sessionCode) {
    return <article className="pip-panel gm-session-map"><div className="pip-logbox">{text.waiting}</div></article>;
  }

  return (
    <article className="pip-panel gm-session-map tactical-map">
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

      <div className="tactical-generator">
        <div className="tactical-generator__title">[ {text.generator} ]</div>
        <label>{text.preset}
          <select className="pip-input" value={generatorPreset} onChange={(event) => setGeneratorPreset(event.target.value)}>
            <option value="ruins">{text.ruins}</option>
            <option value="vault">{text.vault}</option>
            <option value="warehouse">{text.warehouse}</option>
            <option value="camp">{text.camp}</option>
          </select>
        </label>
        <label>{text.density}
          <select className="pip-input" value={generatorDensity} onChange={(event) => setGeneratorDensity(event.target.value)}>
            <option value="sparse">{text.sparse}</option>
            <option value="normal">{text.normal}</option>
            <option value="dense">{text.dense}</option>
          </select>
        </label>
        <button type="button" className="pip-btn is-primary" onClick={generateLocation}>{text.generate}</button>
        <button type="button" className="pip-btn" disabled={!state.layout} onClick={clearLayout}>{text.clearLayout}</button>
        {state.layout ? (
          <div className="tactical-generator__stats">
            <span>{text.walls}: {layoutCounts.wall}</span>
            <span>{text.doors}: {layoutCounts.door}</span>
            <span>{text.obstacles}: {layoutCounts.obstacle}</span>
            <span>{text.cover}: {layoutCounts.cover}</span>
            <span>{text.hazards}: {layoutCounts.hazard}</span>
          </div>
        ) : null}
      </div>

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
        className="gm-session-map__grid tactical-grid"
        style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: state.rows * state.cols }, (_, index) => {
          const x = index % state.cols;
          const y = Math.floor(index / state.cols);
          const key = `${x}:${y}`;
          const inStart = startKeys.has(key);
          const tile = tileIndex.get(key) || getTacticalTile(state.layout, x, y);
          const blocked = isTacticalCellBlocked(state.layout, x, y);
          const tokens = state.tokens.filter((token) => token.x === x && token.y === y);
          return (
            <button
              type="button"
              key={key}
              className={`gm-session-map__cell tactical-cell${inStart ? " is-start-zone" : ""}${editingStart ? " is-start-edit" : ""}${tile ? ` is-${tile.kind}` : ""}${blocked ? " is-blocked" : ""}${tile?.kind === "door" && tile.open ? " is-door-open" : ""}`}
              title={tile?.kind || "floor"}
              onClick={() => handleCellClick(x, y, tile)}
            >
              <span className="gm-session-map__coords">{x},{y}</span>
              {inStart ? <span className="tactical-start-mark">S</span> : null}
              {tile ? <span className="tactical-object" aria-hidden="true">{tacticalTileGlyph(tile)}</span> : null}
              <span className="gm-session-map__tokens">
                {tokens.map((token) => (
                  <span
                    key={token.id}
                    className={`gm-session-token is-player${selectedToken === token.id ? " is-selected" : ""}`}
                    title={token.name}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!editingStart) setSelectedToken((current) => current === token.id ? null : token.id);
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
