import React, { useEffect, useMemo, useState } from "react";
import {
  environmentEffects,
  labelFor,
  normalizeTacticalEnvironment,
} from "../../utils/tacticalEnvironment.js";
import "./gmAutoGmPanel.css";

const STORAGE_PREFIX = "pip2d20_gm_auto_encounter_v1";

const COPY = {
  en: {
    title: "AUTO GM", subtitle: "Encounter narrator", brief: "GM ENCOUNTER BRIEF", placeholder: "What is happening here? Example: The party enters an abandoned station looking for a missing caravan shipment...", generate: "DESCRIBE ENCOUNTER", regenerate: "GENERATE AGAIN", clear: "CLEAR HISTORY", send: "SEND NARRATION TO CHAT", sent: "SENT", players: "PLAYERS", enemies: "ACTIVE ENEMIES", hidden: "GM SECRETS", round: "ROUND", narration: "READ-ALOUD NARRATION", notes: "GM NOTES", rewards: "SEARCH / REWARDS", beats: "POSSIBLE NEXT BEATS", context: "AUTO CONTEXT", waiting: "Auto GM will use the scene, player cards, environment and active enemies automatically.", error: "AUTO GM ERROR",
  },
  ru: {
    title: "AUTO GM", subtitle: "Описание энкаунтера", brief: "ЗАМЫСЕЛ ЭНКАУНТЕРА", placeholder: "Что происходит в этой сцене? Например: группа входит на заброшенную станцию в поисках пропавшего груза каравана...", generate: "ОПИСАТЬ ЭНКАУНТЕР", regenerate: "СГЕНЕРИРОВАТЬ ЕЩЁ", clear: "ОЧИСТИТЬ ИСТОРИЮ", send: "ОТПРАВИТЬ ОПИСАНИЕ В ЧАТ", sent: "ОТПРАВЛЕНО", players: "ИГРОКИ", enemies: "АКТИВНЫЕ ВРАГИ", hidden: "СЕКРЕТЫ ГМ", round: "РАУНД", narration: "ТЕКСТ ДЛЯ ИГРОКОВ", notes: "ЗАМЕТКИ ГМ", rewards: "ПОИСК / НАГРАДЫ", beats: "ВОЗМОЖНОЕ РАЗВИТИЕ", context: "АВТОКОНТЕКСТ", waiting: "Auto GM автоматически использует сцену, карточки игроков, окружение и активных врагов.", error: "ОШИБКА AUTO GM",
  },
  uk: {
    title: "AUTO GM", subtitle: "Опис енкаунтера", brief: "ЗАДУМ ЕНКАУНТЕРА", placeholder: "Що відбувається у цій сцені? Наприклад: група заходить на покинуту станцію в пошуках зниклого вантажу каравану...", generate: "ОПИСАТИ ЕНКАУНТЕР", regenerate: "ЗГЕНЕРУВАТИ ЩЕ", clear: "ОЧИСТИТИ ІСТОРІЮ", send: "НАДІСЛАТИ ОПИС У ЧАТ", sent: "НАДІСЛАНО", players: "ГРАВЦІ", enemies: "АКТИВНІ ВОРОГИ", hidden: "СЕКРЕТИ ГМ", round: "РАУНД", narration: "ТЕКСТ ДЛЯ ГРАВЦІВ", notes: "НОТАТКИ ГМ", rewards: "ПОШУК / НАГОРОДИ", beats: "МОЖЛИВИЙ РОЗВИТОК", context: "АВТОКОНТЕКСТ", waiting: "Auto GM автоматично використовує сцену, картки гравців, оточення та активних ворогів.", error: "ПОМИЛКА AUTO GM",
  },
  pl: {
    title: "AUTO GM", subtitle: "Narrator spotkania", brief: "ZAŁOŻENIE SPOTKANIA", placeholder: "Co dzieje się w tej scenie? Np. drużyna wchodzi na opuszczoną stację, szukając zaginionego ładunku karawany...", generate: "OPISZ SPOTKANIE", regenerate: "GENERUJ PONOWNIE", clear: "WYCZYŚĆ HISTORIĘ", send: "WYŚLIJ NARRACJĘ NA CZAT", sent: "WYSŁANO", players: "GRACZE", enemies: "AKTYWNI WROGOWIE", hidden: "SEKRETY MG", round: "RUNDA", narration: "NARRACJA DLA GRACZY", notes: "NOTATKI MG", rewards: "PRZESZUKANIE / NAGRODY", beats: "MOŻLIWE DALSZE WYDARZENIA", context: "AUTO KONTEKST", waiting: "Auto GM automatycznie użyje sceny, kart graczy, środowiska i aktywnych wrogów.", error: "BŁĄD AUTO GM",
  },
};

function languageCode() {
  if (typeof document === "undefined") return "en";
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function storageKey(session, scene) {
  return `${STORAGE_PREFIX}:${session?.campaignId || "campaign"}:${scene?.sceneId || "scene"}`;
}

function readStored(key) {
  if (typeof window === "undefined") return { brief: "", history: [], output: null };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed : { brief: "", history: [], output: null };
  } catch {
    return { brief: "", history: [], output: null };
  }
}

function tokenHp(token) {
  return Math.max(0, Number(token?.stats?.hp ?? token?.stats?.currentHp ?? 0));
}

function enemyContext(token) {
  const stats = token?.stats || {};
  const attacks = Array.isArray(stats.attacks)
    ? stats.attacks.slice(0, 8).map((attack) => typeof attack === "string" ? attack : attack?.name).filter(Boolean)
    : String(stats.attacks || "").split(/\n|;/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
  return {
    id: token.id,
    name: token.name || "Enemy",
    creatureType: stats.creatureType || stats.cardKind || stats.type || "",
    rank: stats.creatureRank || stats.rank || "standard",
    hp: tokenHp(token),
    maxHp: Math.max(0, Number(stats.maxHp || stats.hp || 0)),
    defense: Number(stats.defense || 0),
    initiative: Number(stats.initiative || 0),
    level: Number(stats.level || 0),
    horde: Boolean(stats.hordeEnabled || stats.isHorde),
    hordeCount: Number(stats.hordeCount || stats.groupSize || 0),
    specialFeature: stats.specialFeature || stats.specialAbility || "",
    legendaryAbility: stats.legendaryAbility || "",
    attacks,
  };
}

function playerContext(player) {
  const character = player?.character || {};
  return {
    clientId: player?.clientId || player?.peerId || "",
    name: character.name || player?.name || "Player",
    online: player?.online !== false,
    level: Number(character.level || 1),
    hp: Number(character.currentHp || 0),
    maxHp: Number(character.maxHp || 0),
    defense: Number(character.defense || 0),
    initiative: Number(character.initiative || 0),
    card: character.detailedCard || null,
  };
}

function buildContext(session, scene) {
  const environment = normalizeTacticalEnvironment(scene?.environment);
  const tokens = Array.isArray(scene?.tokens) ? scene.tokens : [];
  const enemies = tokens.filter((token) => token.kind !== "player" && tokenHp(token) > 0);
  const activeEnemies = enemies.filter((token) => token?.stats?.visibleToPlayers !== false).map(enemyContext);
  const hiddenEnemies = enemies.filter((token) => token?.stats?.visibleToPlayers === false).map(enemyContext);
  const activeToken = tokens.find((token) => token.id === session?.turnState?.activeTokenId) || null;

  return {
    scene: {
      id: scene?.sceneId || "",
      name: scene?.name || "Tactical scene",
      live: Boolean(scene?.active),
      grid: `${scene?.cols || 12}x${scene?.rows || 12}`,
      backgroundName: scene?.backgroundName || "",
    },
    environment: {
      locationType: labelFor("locationType", environment.locationType),
      terrain: labelFor("terrain", environment.terrain),
      zoneType: labelFor("zoneType", environment.zoneType),
      zoneSubtype: environment.zoneSubtype ? labelFor("zoneSubtype", environment.zoneSubtype) : "",
      timeOfDay: labelFor("timeOfDay", environment.timeOfDay),
      weather: labelFor("weather", environment.weather),
      activeEffects: environmentEffects(environment),
      hazardBaseCd: environment.hazardBaseCd,
      hazardGrowthCd: environment.hazardGrowthCd,
    },
    players: (Array.isArray(session?.players) ? session.players : []).map(playerContext),
    activeEnemies,
    hiddenEnemies,
    defeatedEnemies: tokens.filter((token) => token.kind !== "player" && tokenHp(token) <= 0).map((token) => token.name || "Enemy").slice(0, 20),
    combat: {
      round: Math.max(1, Number(session?.turnState?.round || 1)),
      activeTokenId: session?.turnState?.activeTokenId || "",
      activeActor: activeToken?.name || "",
    },
    campaignIntent: {
      primary: "The party came here to pursue and complete a mission objective.",
      secondary: ["survive", "find useful resources", "search for loot", "find or earn caps"],
      worldTone: "The wasteland is usually hostile and suspicious toward the party, with scarcity and danger as the default pressure.",
    },
  };
}

function sendLongChat(session, text) {
  const value = String(text || "").trim();
  if (!value) return false;
  const chunks = [];
  let rest = value;
  while (rest.length > 1080) {
    let cut = rest.lastIndexOf("\n", 1080);
    if (cut < 600) cut = rest.lastIndexOf(" ", 1080);
    if (cut < 600) cut = 1080;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  chunks.forEach((chunk) => session?.sendChat?.(chunk));
  return chunks.length > 0;
}

export default function GmAutoGmPanel({ session }) {
  const scene = session?.tacticalScene || null;
  const language = languageCode();
  const text = COPY[language] || COPY.en;
  const key = storageKey(session, scene);
  const initial = useMemo(() => readStored(key), [key]);
  const [brief, setBrief] = useState(initial.brief || "");
  const [history, setHistory] = useState(Array.isArray(initial.history) ? initial.history : []);
  const [output, setOutput] = useState(initial.output || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const next = readStored(key);
    setBrief(next.brief || "");
    setHistory(Array.isArray(next.history) ? next.history : []);
    setOutput(next.output || null);
    setError("");
    setSent(false);
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(key, JSON.stringify({ brief, history: history.slice(-10), output })); } catch { /* optional */ }
  }, [key, brief, history, output]);

  const context = useMemo(() => buildContext(session, scene), [session, scene]);
  const activeEnemyCount = context.activeEnemies.length;
  const hiddenEnemyCount = context.hiddenEnemies.length;

  const generate = async () => {
    const message = brief.trim();
    if (!message || loading) return;
    setLoading(true);
    setError("");
    setSent(false);
    try {
      const response = await fetch("/api/gm-encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, language, history, gmContext: context }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "AUTO_GM_FAILED");
      const nextOutput = {
        narration: String(payload?.narration || "").trim(),
        gmNotes: String(payload?.gmNotes || "").trim(),
        rewards: String(payload?.rewards || "").trim(),
        nextBeats: Array.isArray(payload?.nextBeats) ? payload.nextBeats : [],
      };
      setOutput(nextOutput);
      setHistory((current) => [...current,
        { role: "user", text: message },
        { role: "gm", text: JSON.stringify(nextOutput) },
      ].slice(-10));
    } catch (requestError) {
      setError(requestError?.message || "AUTO_GM_FAILED");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setOutput(null);
    setError("");
    setSent(false);
  };

  const sendNarration = () => {
    if (!output?.narration) return;
    if (sendLongChat(session, output.narration)) setSent(true);
  };

  if (!session?.isActive || session?.mode !== "host" || !scene) return null;

  return <section className="pip-panel gm-auto-gm-panel">
    <header className="gm-auto-gm-panel__head">
      <div><div className="pip-bootline">PIP 2D20 // GM ASSIST</div><h2>[ {text.title} ]</h2><span>{text.subtitle}</span></div>
      <div className="gm-auto-gm-panel__scene"><strong>{scene.name || "SCENE"}</strong><small>{scene.cols}×{scene.rows}</small></div>
    </header>

    <div className="gm-auto-gm-context">
      <strong>[ {text.context} ]</strong>
      <span>{text.players}: {context.players.length}</span>
      <span>{text.enemies}: {activeEnemyCount}</span>
      <span>{text.hidden}: {hiddenEnemyCount}</span>
      <span>{text.round}: {context.combat.round}</span>
      <span>{context.environment.locationType}</span>
      <span>{context.environment.terrain}</span>
      <span>{context.environment.timeOfDay}</span>
      <span>{context.environment.weather}</span>
    </div>

    <label className="gm-auto-gm-brief">
      <span>{text.brief}</span>
      <textarea className="pip-input" value={brief} maxLength={8000} rows={7} placeholder={text.placeholder} onChange={(event) => setBrief(event.target.value)} />
    </label>

    <div className="gm-auto-gm-actions">
      <button type="button" className="pip-btn is-primary" disabled={loading || !brief.trim()} onClick={generate}>{loading ? "GENERATING..." : (output ? text.regenerate : text.generate)}</button>
      <button type="button" className="pip-btn" disabled={!history.length && !output} onClick={clearHistory}>{text.clear}</button>
      <button type="button" className="pip-btn" disabled={!output?.narration} onClick={sendNarration}>{sent ? text.sent : text.send}</button>
    </div>

    {error ? <div className="session-error gm-auto-gm-error"><strong>{text.error}</strong><span>{error}</span></div> : null}
    {!output && !loading ? <div className="gm-auto-gm-empty">{text.waiting}</div> : null}

    {output ? <div className="gm-auto-gm-output">
      {output.narration ? <article className="gm-auto-gm-block is-narration"><h3>[ {text.narration} ]</h3><p>{output.narration}</p></article> : null}
      {output.gmNotes ? <article className="gm-auto-gm-block"><h3>[ {text.notes} ]</h3><p>{output.gmNotes}</p></article> : null}
      {output.rewards ? <article className="gm-auto-gm-block"><h3>[ {text.rewards} ]</h3><p>{output.rewards}</p></article> : null}
      {output.nextBeats?.length ? <article className="gm-auto-gm-block"><h3>[ {text.beats} ]</h3><ol>{output.nextBeats.map((beat, index) => <li key={`${beat}-${index}`}>{beat}</li>)}</ol></article> : null}
    </div> : null}
  </section>;
}
