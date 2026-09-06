import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMapRegion, getRegionName } from "../../data/map/mapRegions.js";
import { TERRAIN_TYPES } from "../../data/map/terrainTypes.js";
import "./gmSessionMap.css";

const GM_STATE_KEY = "fallout_pipboy_gm_panel_v1";
const VIEW_COLS = 8;
const VIEW_ROWS = 8;

const COPY = {
  en: { title: "SESSION MAP", region: "REGION", players: "PLAYERS", npc: "NPC", move: "Select a token, then click a cell to move it", noMap: "No character map loaded. Showing session grid.", location: "LOCATION", selected: "SELECTED", reset: "RESET TOKENS" },
  ru: { title: "КАРТА СЕССИИ", region: "РЕГИОН", players: "ИГРОКИ", npc: "NPC", move: "Выберите токен, затем нажмите на клетку для перемещения", noMap: "Карта персонажа не загружена. Показана сетка сессии.", location: "ЛОКАЦИЯ", selected: "ВЫБРАН", reset: "СБРОСИТЬ ТОКЕНЫ" },
  uk: { title: "МАПА СЕСІЇ", region: "РЕГІОН", players: "ГРАВЦІ", npc: "NPC", move: "Оберіть токен, потім натисніть клітинку для переміщення", noMap: "Мапу персонажа не завантажено. Показано сітку сесії.", location: "ЛОКАЦІЯ", selected: "ОБРАНО", reset: "СКИНУТИ ТОКЕНИ" },
  pl: { title: "MAPA SESJI", region: "REGION", players: "GRACZE", npc: "NPC", move: "Wybierz token, a następnie kliknij pole, aby go przenieść", noMap: "Mapa postaci nie jest wczytana. Pokazano siatkę sesji.", location: "LOKACJA", selected: "WYBRANO", reset: "RESETUJ TOKENY" },
};

function languageCode(value) {
  const code = String(value || "en").split("-")[0];
  return COPY[code] ? code : "en";
}

function safeReadJson(key, fallback) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "null");
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional */ }
}

function sameList(previous, next) {
  if (previous.length !== next.length) return false;
  return previous.every((item, index) => item.id === next[index]?.id && item.name === next[index]?.name);
}

function getSessionCode() {
  return document.querySelector(".session-gm-code")?.textContent?.trim() || "offline";
}

function getConnectedPlayers() {
  return Array.from(document.querySelectorAll(".session-gm-roster-strip__list .session-gm-player-card"))
    .map((node, index) => ({
      id: `player-${index}-${node.querySelector("strong")?.textContent?.trim() || "player"}`,
      name: node.querySelector("strong")?.textContent?.trim() || `Player ${index + 1}`,
    }));
}

function getNpcTokens() {
  const state = safeReadJson(GM_STATE_KEY, {});
  return (Array.isArray(state.initiative) ? state.initiative : [])
    .filter((entry) => entry?.type !== "player")
    .map((entry, index) => ({ id: `npc-${entry.id || index}`, name: entry.name || `NPC ${index + 1}` }));
}

function terrainSymbol(terrainId) {
  const symbols = {
    road: "═",
    urban: "▦",
    ruins: "⌁",
    swamp: "≈",
    forest: "♠",
    industrial: "⚙",
    water: "~",
    mountains: "▲",
    blocked_ruins: "▓",
  };
  return symbols[terrainId] || "·";
}

function tokenDefaultPosition(index, center, cols, rows) {
  const offsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const [dx, dy] = offsets[index % offsets.length];
  return {
    x: Math.max(0, Math.min(cols - 1, Number(center.x || 0) + dx)),
    y: Math.max(0, Math.min(rows - 1, Number(center.y || 0) + dy)),
  };
}

export default function GmSessionMap({ character = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[language];
  const mapData = character?.mapData || {};
  const cols = Math.max(1, Number(mapData.cols || VIEW_COLS));
  const rows = Math.max(1, Number(mapData.rows || VIEW_ROWS));
  const playerPosition = mapData.playerPosition || { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const worldOffset = mapData.worldOffset || { x: 0, y: 0 };
  const region = getMapRegion(mapData.regionId);
  const regionName = getRegionName(region, language);

  const [roster, setRoster] = useState(() => getConnectedPlayers());
  const [npcs, setNpcs] = useState(() => getNpcTokens());
  const [selectedToken, setSelectedToken] = useState(null);
  const [sessionCode, setSessionCode] = useState(() => getSessionCode());
  const storageKey = `fallout_pipboy_gm_token_positions_${sessionCode}`;
  const [tokenPositions, setTokenPositions] = useState(() => safeReadJson(storageKey, {}));

  useEffect(() => {
    const refresh = () => {
      const nextRoster = getConnectedPlayers();
      const nextNpcs = getNpcTokens();
      setRoster((previous) => sameList(previous, nextRoster) ? previous : nextRoster);
      setNpcs((previous) => sameList(previous, nextNpcs) ? previous : nextNpcs);
      const code = getSessionCode();
      if (code !== sessionCode) setSessionCode(code);
    };
    refresh();
    const observer = new MutationObserver(refresh);
    const target = document.querySelector(".session-gm-roster-strip__list") || document.querySelector(".session-gm-host") || document.body;
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(refresh, 1200);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [sessionCode]);

  useEffect(() => {
    setTokenPositions(safeReadJson(`fallout_pipboy_gm_token_positions_${sessionCode}`, {}));
  }, [sessionCode]);

  useEffect(() => {
    safeWriteJson(storageKey, tokenPositions);
  }, [storageKey, tokenPositions]);

  const cells = useMemo(() => {
    const index = new Map();
    (Array.isArray(mapData.cells) ? mapData.cells : []).forEach((cell) => index.set(`${cell.x}:${cell.y}`, cell));
    const result = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        result.push(index.get(`${x}:${y}`) || { x, y, terrain: "road" });
      }
    }
    return result;
  }, [mapData.cells, cols, rows]);

  const locationsByCell = useMemo(() => {
    const result = new Map();
    (region?.locations || []).forEach((location) => {
      const localX = Number(location.worldX) - Number(worldOffset.x || 0) * cols;
      const localY = Number(location.worldY) - Number(worldOffset.y || 0) * rows;
      if (localX >= 0 && localX < cols && localY >= 0 && localY < rows) result.set(`${localX}:${localY}`, location);
    });
    return result;
  }, [region, worldOffset.x, worldOffset.y, cols, rows]);

  const tokens = useMemo(() => {
    const all = [
      ...roster.map((player) => ({ ...player, kind: "player" })),
      ...npcs.map((npc) => ({ ...npc, kind: "npc" })),
    ];
    return all.map((token, index) => ({
      ...token,
      position: tokenPositions[token.id] || tokenDefaultPosition(index, playerPosition, cols, rows),
    }));
  }, [roster, npcs, tokenPositions, playerPosition.x, playerPosition.y, cols, rows]);

  const moveToken = (tokenId, x, y) => {
    setTokenPositions((previous) => ({ ...previous, [tokenId]: { x, y } }));
    setSelectedToken(tokenId);
  };

  const handleCellClick = (cell) => {
    if (!selectedToken) return;
    moveToken(selectedToken, cell.x, cell.y);
  };

  const resetTokens = () => {
    setTokenPositions({});
    setSelectedToken(null);
  };

  return (
    <article className="pip-panel gm-session-map">
      <div className="gm-session-map__head">
        <div>
          <div className="gm-session-map__eyebrow">ROBCO // LIVE TACTICAL DISPLAY</div>
          <h2>[ {text.title} ]</h2>
        </div>
        <div className="gm-session-map__meta">
          <span>{text.region}: <strong>{regionName}</strong></span>
          <span>{text.players}: <strong>{roster.length}</strong></span>
          <span>{text.npc}: <strong>{npcs.length}</strong></span>
          <button type="button" className="pip-btn" onClick={resetTokens}>{text.reset}</button>
        </div>
      </div>

      <div className="gm-session-map__hint">
        {selectedToken ? `${text.selected}: ${tokens.find((token) => token.id === selectedToken)?.name || "-"}` : text.move}
        {!Array.isArray(mapData.cells) || !mapData.cells.length ? <span> · {text.noMap}</span> : null}
      </div>

      <div
        className="gm-session-map__grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => {
          const key = `${cell.x}:${cell.y}`;
          const location = locationsByCell.get(key);
          const terrain = TERRAIN_TYPES[cell.terrain] || TERRAIN_TYPES.road;
          const cellTokens = tokens.filter((token) => token.position.x === cell.x && token.position.y === cell.y);
          return (
            <button
              type="button"
              key={key}
              className={`gm-session-map__cell is-${terrain.id}${location ? " has-location" : ""}`}
              title={`${terrain.label}${location ? ` · ${location.name}` : ""}`}
              onClick={() => handleCellClick(cell)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const tokenId = event.dataTransfer.getData("text/gm-token");
                if (tokenId) moveToken(tokenId, cell.x, cell.y);
              }}
            >
              <span className="gm-session-map__terrain">{terrainSymbol(terrain.id)}</span>
              {location ? <span className="gm-session-map__location" title={`${text.location}: ${location.name}`}>{location.icon || "◆"}</span> : null}
              <span className="gm-session-map__coords">{cell.x},{cell.y}</span>
              <span className="gm-session-map__tokens">
                {cellTokens.map((token) => (
                  <span
                    key={token.id}
                    draggable
                    className={`gm-session-token is-${token.kind}${selectedToken === token.id ? " is-selected" : ""}`}
                    title={token.name}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedToken((current) => current === token.id ? null : token.id);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/gm-token", token.id);
                      event.dataTransfer.effectAllowed = "move";
                      setSelectedToken(token.id);
                    }}
                  >
                    <b>{token.kind === "player" ? "P" : "N"}</b>
                    <small>{token.name}</small>
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
