import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Peer } from "peerjs";
import { getMapRegion, getRegionName } from "../../data/map/mapRegions.js";
import { TERRAIN_TYPES } from "../../data/map/terrainTypes.js";
import "./gmSessionMap.css";

const GM_STATE_KEY = "fallout_pipboy_gm_panel_v1";
const MAP_HOST_PREFIX = "pip2d20-map-";
const VIEW_COLS = 8;
const VIEW_ROWS = 8;

const COPY = {
  en: { title: "SESSION MAP", region: "REGION", players: "PLAYERS", live: "LIVE", npc: "NPC", move: "NPC and fallback tokens can be moved. Player LIVE tokens follow their own maps automatically.", noMap: "No sector map loaded. Showing fallback session grid.", location: "LOCATION", selected: "SELECTED", reset: "RESET TOKENS", offMap: "player(s) are in another sector" },
  ru: { title: "КАРТА СЕССИИ", region: "РЕГИОН", players: "ИГРОКИ", live: "LIVE", npc: "NPC", move: "NPC и резервные токены можно двигать. LIVE-токены игроков следуют за их картой автоматически.", noMap: "Карта сектора не загружена. Показана резервная сетка сессии.", location: "ЛОКАЦИЯ", selected: "ВЫБРАН", reset: "СБРОСИТЬ ТОКЕНЫ", offMap: "игрок(а) находятся в другом секторе" },
  uk: { title: "МАПА СЕСІЇ", region: "РЕГІОН", players: "ГРАВЦІ", live: "LIVE", npc: "NPC", move: "NPC та резервні токени можна рухати. LIVE-токени гравців автоматично слідують за їхньою мапою.", noMap: "Мапу сектора не завантажено. Показано резервну сітку сесії.", location: "ЛОКАЦІЯ", selected: "ОБРАНО", reset: "СКИНУТИ ТОКЕНИ", offMap: "гравець(ці) знаходяться в іншому секторі" },
  pl: { title: "MAPA SESJI", region: "REGION", players: "GRACZE", live: "LIVE", npc: "NPC", move: "NPC i tokeny zapasowe można przesuwać. Tokeny LIVE graczy automatycznie śledzą ich mapę.", noMap: "Mapa sektora nie jest wczytana. Pokazano zapasową siatkę sesji.", location: "LOKACJA", selected: "WYBRANO", reset: "RESETUJ TOKENY", offMap: "gracz(e) znajdują się w innym sektorze" },
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
  return document.querySelector(".session-gm-code")?.textContent?.trim()?.toUpperCase() || "offline";
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

function sanitizeLivePacket(packet, peerId) {
  if (!packet || packet.type !== "map_position") return null;
  const cols = Math.max(1, Math.min(64, Number(packet.cols || VIEW_COLS)));
  const rows = Math.max(1, Math.min(64, Number(packet.rows || VIEW_ROWS)));
  const x = Math.max(0, Math.min(cols - 1, Number(packet.playerPosition?.x || 0)));
  const y = Math.max(0, Math.min(rows - 1, Number(packet.playerPosition?.y || 0)));
  return {
    id: `live-${peerId}`,
    peerId,
    name: String(packet.name || "Player").trim().slice(0, 60) || "Player",
    regionId: String(packet.regionId || "commonwealth").slice(0, 60),
    worldOffset: {
      x: Number(packet.worldOffset?.x || 0),
      y: Number(packet.worldOffset?.y || 0),
    },
    position: { x, y },
    cols,
    rows,
    updatedAt: packet.updatedAt || new Date().toISOString(),
  };
}

export default function GmSessionMap({ character = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[language];

  const mapState = character?.mapData || {};
  const worldOffset = mapState.worldOffset || { x: 0, y: 0 };
  const sectorKey = `${Number(worldOffset.x || 0)},${Number(worldOffset.y || 0)}`;
  const currentSector = mapState.sectorCache?.[sectorKey] || {};
  const cols = Math.max(1, Number(currentSector.cols || VIEW_COLS));
  const rows = Math.max(1, Number(currentSector.rows || VIEW_ROWS));
  const playerPosition = mapState.playerPosition || currentSector.start || { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const region = getMapRegion(mapState.regionId);
  const regionName = getRegionName(region, language);

  const [roster, setRoster] = useState(() => getConnectedPlayers());
  const [npcs, setNpcs] = useState(() => getNpcTokens());
  const [livePlayers, setLivePlayers] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [sessionCode, setSessionCode] = useState(() => getSessionCode());
  const mapPeerRef = useRef(null);
  const mapConnectionsRef = useRef(new Map());

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
    const timer = window.setInterval(refresh, 900);
    return () => window.clearInterval(timer);
  }, [sessionCode]);

  useEffect(() => {
    setTokenPositions(safeReadJson(`fallout_pipboy_gm_token_positions_${sessionCode}`, {}));
  }, [sessionCode]);

  useEffect(() => {
    safeWriteJson(storageKey, tokenPositions);
  }, [storageKey, tokenPositions]);

  useEffect(() => {
    if (!sessionCode || sessionCode === "offline") return undefined;
    let disposed = false;

    const removeLivePlayer = (peerId) => {
      setLivePlayers((previous) => previous.filter((player) => player.peerId !== peerId));
    };

    const peer = new Peer(`${MAP_HOST_PREFIX}${sessionCode.toLowerCase()}`, { debug: 0 });
    mapPeerRef.current = peer;

    peer.on("connection", (connection) => {
      mapConnectionsRef.current.set(connection.peer, connection);
      connection.on("data", (packet) => {
        const live = sanitizeLivePacket(packet, connection.peer);
        if (!live || disposed) return;
        setLivePlayers((previous) => {
          const exists = previous.some((player) => player.peerId === live.peerId);
          return exists
            ? previous.map((player) => player.peerId === live.peerId ? live : player)
            : [...previous, live];
        });
      });
      connection.on("close", () => {
        mapConnectionsRef.current.delete(connection.peer);
        removeLivePlayer(connection.peer);
      });
      connection.on("error", () => {
        mapConnectionsRef.current.delete(connection.peer);
        removeLivePlayer(connection.peer);
      });
    });

    return () => {
      disposed = true;
      mapConnectionsRef.current.forEach((connection) => {
        try { connection?.close?.(); } catch { /* best effort */ }
      });
      mapConnectionsRef.current.clear();
      try { peer.destroy(); } catch { /* best effort */ }
      if (mapPeerRef.current === peer) mapPeerRef.current = null;
      setLivePlayers([]);
    };
  }, [sessionCode]);

  const cells = useMemo(() => {
    const index = new Map();
    (Array.isArray(currentSector.cells) ? currentSector.cells : []).forEach((cell) => index.set(`${cell.x}:${cell.y}`, cell));
    const result = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        result.push(index.get(`${x}:${y}`) || { x, y, terrain: "road" });
      }
    }
    return result;
  }, [currentSector.cells, cols, rows]);

  const locationsByCell = useMemo(() => {
    const result = new Map();
    (region?.locations || []).forEach((location) => {
      const localX = Number(location.worldX) - Number(worldOffset.x || 0) * cols;
      const localY = Number(location.worldY) - Number(worldOffset.y || 0) * rows;
      if (localX >= 0 && localX < cols && localY >= 0 && localY < rows) result.set(`${localX}:${localY}`, location);
    });
    return result;
  }, [region, worldOffset.x, worldOffset.y, cols, rows]);

  const liveNames = useMemo(() => new Set(livePlayers.map((player) => player.name.toLowerCase())), [livePlayers]);
  const liveOnCurrentSector = useMemo(() => livePlayers.filter((player) =>
    player.regionId === region.id
    && Number(player.worldOffset.x) === Number(worldOffset.x || 0)
    && Number(player.worldOffset.y) === Number(worldOffset.y || 0)
  ), [livePlayers, region.id, worldOffset.x, worldOffset.y]);
  const liveOffMapCount = Math.max(0, livePlayers.length - liveOnCurrentSector.length);

  const tokens = useMemo(() => {
    const fallbackPlayers = roster
      .filter((player) => !liveNames.has(String(player.name || "").toLowerCase()))
      .map((player) => ({ ...player, kind: "player", live: false, movable: true }));
    const liveTokens = liveOnCurrentSector.map((player) => ({
      ...player,
      kind: "player",
      live: true,
      movable: false,
    }));
    const npcTokens = npcs.map((npc) => ({ ...npc, kind: "npc", live: false, movable: true }));
    const all = [...liveTokens, ...fallbackPlayers, ...npcTokens];
    return all.map((token, index) => ({
      ...token,
      position: token.live
        ? token.position
        : (tokenPositions[token.id] || tokenDefaultPosition(index, playerPosition, cols, rows)),
    }));
  }, [roster, npcs, liveNames, liveOnCurrentSector, tokenPositions, playerPosition.x, playerPosition.y, cols, rows]);

  const selected = tokens.find((token) => token.id === selectedToken) || null;

  const moveToken = (tokenId, x, y) => {
    const token = tokens.find((item) => item.id === tokenId);
    if (!token?.movable) return;
    setTokenPositions((previous) => ({ ...previous, [tokenId]: { x, y } }));
    setSelectedToken(tokenId);
  };

  const handleCellClick = (cell) => {
    if (!selected?.movable) return;
    moveToken(selected.id, cell.x, cell.y);
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
          <span className="gm-session-map__live-stat">{text.live}: <strong>{livePlayers.length}</strong></span>
          <span>{text.npc}: <strong>{npcs.length}</strong></span>
          <button type="button" className="pip-btn" onClick={resetTokens}>{text.reset}</button>
        </div>
      </div>

      <div className="gm-session-map__hint">
        {selected ? `${text.selected}: ${selected.name}${selected.live ? " · LIVE" : ""}` : text.move}
        {!Array.isArray(currentSector.cells) || !currentSector.cells.length ? <span> · {text.noMap}</span> : null}
        {liveOffMapCount > 0 ? <span> · {liveOffMapCount} {text.offMap}</span> : null}
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
              onDragOver={(event) => {
                if (selected?.movable) event.preventDefault();
              }}
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
                    draggable={token.movable}
                    className={`gm-session-token is-${token.kind}${token.live ? " is-live" : ""}${selectedToken === token.id ? " is-selected" : ""}`}
                    title={`${token.name}${token.live ? " · LIVE" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedToken((current) => current === token.id ? null : token.id);
                    }}
                    onDragStart={(event) => {
                      if (!token.movable) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.setData("text/gm-token", token.id);
                      event.dataTransfer.effectAllowed = "move";
                      setSelectedToken(token.id);
                    }}
                  >
                    <b>{token.kind === "player" ? "P" : "N"}</b>
                    {token.live ? <i className="gm-session-token__live-dot" aria-hidden="true" /> : null}
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
