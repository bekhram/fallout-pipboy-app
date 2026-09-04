import React, { useMemo, useState } from "react";
import { FALLOUT_4_LOCATIONS } from "../../data/map/bostonMap.js";
import "./localGmChat.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";
const CHAT_STORAGE_KEY = "fallout_pipboy_local_gm_chat_v1";

function readCharacter() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.data || null;
  } catch {
    return null;
  }
}

function readSavedMessages() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function compactCharacter(character) {
  if (!character) return null;

  return {
    name: character.characterName || character.name || "Unknown wanderer",
    level: character.level ?? null,
    origin: character.origin || null,
    special: character.special || character.SPECIAL || null,
    skills: character.skills || null,
    taggedSkills: character.tagged_skills || null,
    hp: {
      current: character.currentHp ?? character.hpCurrent ?? null,
      max: character.maxHp ?? character.hpMax ?? null,
    },
    defense: character.defenseOverride || character.defense || null,
    statuses: character.statuses || null,
    injuries: character.injuries || null,
    perks: (character.perksAndTraits || []).slice(0, 20).map((perk) => ({
      name: perk?.name,
      rank: perk?.rank,
    })),
    inventory: (character.inventoryItems || []).slice(0, 30).map((item) => ({
      name: item?.name,
      quantity: item?.quantity,
    })),
  };
}

function compactLocation(location) {
  if (!location) return null;
  return {
    id: location.id || null,
    name: location.name || null,
    nameKey: location.nameKey || null,
    type: location.type || null,
    worldX: location.worldX ?? null,
    worldY: location.worldY ?? null,
    major: location.major ?? null,
  };
}

function buildWorldContext(mapData, playerPosition, selectedCell, savedMapData) {
  const currentCell = mapData?.cells?.find(
    (cell) => cell.x === playerPosition?.x && cell.y === playerPosition?.y
  );

  const worldOffset = mapData?.worldOffset || savedMapData?.worldOffset || { x: 0, y: 0 };
  const cols = mapData?.cols || 8;
  const rows = mapData?.rows || 8;
  const worldX = worldOffset.x * cols + (playerPosition?.x || 0);
  const worldY = worldOffset.y * rows + (playerPosition?.y || 0);

  const staticLocation = FALLOUT_4_LOCATIONS.find(
    (location) => location.worldX === worldX && location.worldY === worldY
  );

  const trackedLocation = FALLOUT_4_LOCATIONS.find(
    (location) => location.id === savedMapData?.trackedLocationId
  );

  const selectedWorldX = selectedCell
    ? worldOffset.x * cols + selectedCell.x
    : null;
  const selectedWorldY = selectedCell
    ? worldOffset.y * rows + selectedCell.y
    : null;
  const selectedStaticLocation = selectedCell
    ? FALLOUT_4_LOCATIONS.find(
        (location) =>
          location.worldX === selectedWorldX && location.worldY === selectedWorldY
      )
    : null;

  return {
    sector: mapData?.title || mapData?.id || null,
    sectorOffset: worldOffset,
    localPosition: playerPosition || null,
    worldPosition: { x: worldX, y: worldY },
    currentTerrain: currentCell?.terrain || null,
    currentLocation: compactLocation(staticLocation) || currentCell?.poi || null,
    trackedObjective: compactLocation(trackedLocation),
    selectedDestination: selectedCell
      ? {
          localX: selectedCell.x,
          localY: selectedCell.y,
          worldX: selectedWorldX,
          worldY: selectedWorldY,
          terrain: selectedCell.terrain,
          location: compactLocation(selectedStaticLocation) || selectedCell.poi || null,
        }
      : null,
  };
}

export default function LocalGmChat({ mapData, playerPosition, selectedCell }) {
  const [messages, setMessages] = useState(() => readSavedMessages());
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const rawCharacter = useMemo(() => readCharacter(), []);
  const character = useMemo(() => compactCharacter(rawCharacter), [rawCharacter]);
  const world = useMemo(
    () => buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData),
    [mapData, playerPosition, selectedCell, rawCharacter]
  );

  function persist(nextMessages) {
    setMessages(nextMessages);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextMessages.slice(-80)));
    } catch {
      // Storage is optional; the chat still works for the current session.
    }
  }

  async function sendMessage(event) {
    event?.preventDefault?.();
    const text = draft.trim();
    if (!text || isSending) return;

    const userMessage = { role: "user", text, at: Date.now() };
    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage];
    persist(nextMessages);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/auto-gm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character,
          world,
          history: previousMessages.slice(-16),
          message: text,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `GM request failed (${response.status})`);
      }

      const gmMessage = {
        role: "gm",
        text: data?.text || "The GM did not return a response.",
        at: Date.now(),
      };
      persist([...nextMessages, gmMessage]);
    } catch (requestError) {
      setError(requestError?.message || "Could not contact Auto GM.");
    } finally {
      setIsSending(false);
    }
  }

  function resetChat() {
    persist([]);
    setError("");
  }

  const currentPlace =
    world.currentLocation?.name ||
    world.currentLocation?.id ||
    world.currentTerrain ||
    "Wasteland";
  const objective =
    world.selectedDestination?.location?.name ||
    world.selectedDestination?.location?.id ||
    world.trackedObjective?.name ||
    world.trackedObjective?.id ||
    "Explore area";

  return (
    <section className="pip-local-gm">
      <header className="pip-local-gm__header">
        <div>
          <div className="pip-local-gm__eyebrow">LOCAL // AUTO GM</div>
          <h3>Fallout 2D20 Session</h3>
          <div className="pip-local-gm__context">
            {currentPlace}
            {world.worldPosition
              ? ` · WORLD ${world.worldPosition.x},${world.worldPosition.y}`
              : ""}
          </div>
        </div>
        <button type="button" className="pip-btn pip-local-gm__reset" onClick={resetChat}>
          NEW SESSION
        </button>
      </header>

      <div className="pip-local-gm__brief">
        <span>CHARACTER: {character?.name || "Not loaded"}</span>
        <span>LEVEL: {character?.level ?? "-"}</span>
        <span>LOCATION: {currentPlace}</span>
        <span>OBJECTIVE: {objective}</span>
      </div>

      <div className="pip-local-gm__messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="pip-local-gm__empty">
            <strong>AUTO GM READY.</strong>
            <p>
              Describe what your character does. The app sends the GM your character summary, exact global-map position, current location and tracked objective automatically.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.at || index}-${index}`}
              className={`pip-local-gm__message pip-local-gm__message--${message.role}`}
            >
              <div className="pip-local-gm__speaker">
                {message.role === "gm" ? "AUTO GM" : "YOU"}
              </div>
              <div>{message.text}</div>
            </article>
          ))
        )}
        {isSending ? (
          <div className="pip-local-gm__thinking">AUTO GM IS PROCESSING...</div>
        ) : null}
      </div>

      {error ? <div className="pip-local-gm__error">{error}</div> : null}

      <form className="pip-local-gm__composer" onSubmit={sendMessage}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What do you do?"
          rows={3}
          disabled={isSending}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage(event);
            }
          }}
        />
        <button type="submit" className="pip-action-button" disabled={!draft.trim() || isSending}>
          SEND
        </button>
      </form>
    </section>
  );
}
