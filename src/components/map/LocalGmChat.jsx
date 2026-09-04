import React, { useMemo, useState } from "react";
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

function buildWorldContext(mapData, playerPosition, selectedCell) {
  const currentCell = mapData?.cells?.find(
    (cell) => cell.x === playerPosition?.x && cell.y === playerPosition?.y
  );

  return {
    sector: mapData?.sectorKey || mapData?.id || null,
    position: playerPosition || null,
    currentTerrain: currentCell?.terrain || null,
    currentPoi: currentCell?.poi || null,
    selectedDestination: selectedCell
      ? {
          x: selectedCell.x,
          y: selectedCell.y,
          terrain: selectedCell.terrain,
          poi: selectedCell.poi || null,
        }
      : null,
  };
}

export default function LocalGmChat({ mapData, playerPosition, selectedCell }) {
  const [messages, setMessages] = useState(() => readSavedMessages());
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const character = useMemo(() => compactCharacter(readCharacter()), []);
  const world = useMemo(
    () => buildWorldContext(mapData, playerPosition, selectedCell),
    [mapData, playerPosition, selectedCell]
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
    const nextMessages = [...messages, userMessage];
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
          history: nextMessages.slice(-16),
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

  return (
    <section className="pip-local-gm">
      <header className="pip-local-gm__header">
        <div>
          <div className="pip-local-gm__eyebrow">LOCAL // AUTO GM</div>
          <h3>Fallout 2D20 Session</h3>
          <div className="pip-local-gm__context">
            {world.currentPoi?.name || world.currentPoi?.id || world.currentTerrain || "Wasteland"}
            {world.position ? ` · ${world.position.x},${world.position.y}` : ""}
          </div>
        </div>
        <button type="button" className="pip-btn pip-local-gm__reset" onClick={resetChat}>
          NEW SESSION
        </button>
      </header>

      <div className="pip-local-gm__brief">
        <span>CHARACTER: {character?.name || "Not loaded"}</span>
        <span>LEVEL: {character?.level ?? "-"}</span>
        <span>TERRAIN: {world.currentTerrain || "-"}</span>
        <span>OBJECTIVE: {world.selectedDestination?.poi?.name || world.selectedDestination?.poi?.id || "Explore area"}</span>
      </div>

      <div className="pip-local-gm__messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="pip-local-gm__empty">
            <strong>AUTO GM READY.</strong>
            <p>
              Describe what your character does. The app sends the GM your character summary and current global-map context automatically.
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
