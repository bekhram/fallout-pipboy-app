import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import LocalGmChat from "./LocalGmChat.jsx";
import { BESTIARY_COMBAT_ACTION_EVENT } from "../../utils/bestiaryCombatContext.js";
import { getMapLanguageCode } from "./mapUiText.js";

const CHAT_STORAGE_KEY = "fallout_pipboy_local_gm_sessions_v3";

const LABELS = {
  en: { attack: "ATTACK", hit: "HIT", miss: "MISS", damage: "DAMAGE", hp: "HP", location: "LOCATION", dr: "DR" },
  ru: { attack: "АТАКА", hit: "ПОПАДАНИЕ", miss: "ПРОМАХ", damage: "УРОН", hp: "HP", location: "ЗОНА", dr: "DR" },
  uk: { attack: "АТАКА", hit: "ВЛУЧАННЯ", miss: "ПРОМАХ", damage: "ШКОДА", hp: "HP", location: "ЗОНА", dr: "DR" },
  pl: { attack: "ATAK", hit: "TRAFIENIE", miss: "PUDŁO", damage: "OBRAŻENIA", hp: "HP", location: "LOKACJA", dr: "DR" },
};

function readStore() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Chat persistence is optional.
  }
}

function formatDice(values) {
  if (!Array.isArray(values)) return "—";
  return values.map((die) => `[${die?.value ?? die}]`).join(" ");
}

function formatMechanicalAction(action, language) {
  const copy = LABELS[language] || LABELS.en;
  const result = action?.result || {};
  const target = action?.target || {};
  const weapon = result?.weapon?.name || "Weapon";
  const targetName = target?.name || result?.target?.name || "Target";
  const status = result?.hit ? copy.hit : copy.miss;
  const attackDice = formatDice(result?.attackRoll?.dice);
  const lines = [
    `${copy.attack}: ${weapon} → ${targetName} // ${status}`,
    `d20 ${attackDice} // TN ${result?.skill?.targetNumber ?? "—"} // D ${result?.difficulty ?? "—"} // successes ${result?.attackRoll?.totalSuccesses ?? 0}`,
  ];

  if (result?.hit && result?.damageRoll) {
    lines.push(
      `${copy.location}: ${result?.hitLocationLabel || "—"}`,
      `${copy.damage}: ${result?.damageDiceCount ?? 0} CD ${formatDice(result?.damageRoll?.dice)} = ${result?.damageRoll?.rawDamage ?? 0} // ${copy.dr} ${result?.resistance === "immune" ? "IMMUNE" : result?.resistance ?? 0} // final ${result?.totalFinalDamage ?? 0}`
    );
  }

  if (target?.hpBefore && target?.hpAfter) {
    lines.push(`${copy.hp}: ${target.hpBefore.current}/${target.hpBefore.max} → ${target.hpAfter.current}/${target.hpAfter.max}`);
  }

  return lines.join("\n");
}

function mergeEvents(previous, incoming) {
  const next = Array.isArray(previous) ? [...previous] : [];
  for (const event of Array.isArray(incoming) ? incoming : []) {
    if (!event?.type || !event?.title) continue;
    const key = `${event.type}:${event.title}`.toLowerCase();
    const index = next.findIndex((item) => `${item?.type}:${item?.title}`.toLowerCase() === key);
    const normalized = {
      type: String(event.type),
      title: String(event.title),
      detail: String(event.detail || ""),
      status: String(event.status || "discovered"),
      at: Date.now(),
    };
    if (index >= 0) next[index] = { ...next[index], ...normalized };
    else next.push(normalized);
  }
  return next.slice(-40);
}

function sessionHistory(session) {
  return (Array.isArray(session?.messages) ? session.messages : [])
    .slice(-16)
    .filter((message) => message?.role === "user" || message?.role === "gm")
    .map((message) => ({ role: message.role, text: String(message.text || "") }));
}

export default function CombatAwareLocalGmChat(props) {
  const { i18n } = useTranslation();
  const language = getMapLanguageCode(i18n.resolvedLanguage || i18n.language || "en");
  const [version, setVersion] = useState(0);
  const handledRef = useRef(new Set());
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    const onCombatAction = (event) => {
      const detail = event?.detail || {};
      const sessionKey = String(detail.sessionKey || "").trim();
      const action = detail.action;
      const combat = detail.combat;
      const token = String(action?.token || "").trim();
      if (!sessionKey || !token || handledRef.current.has(token)) return;
      handledRef.current.add(token);

      queueRef.current = queueRef.current.then(async () => {
        const store = readStore();
        const session = store[sessionKey] || {
          messages: [],
          events: [],
          check: null,
          persistent: false,
          temporary: true,
          updatedAt: Date.now(),
        };
        const existingMessages = Array.isArray(session.messages) ? session.messages : [];
        if (existingMessages.some((message) => message?.combatActionToken === token)) return;

        const mechanicalText = formatMechanicalAction(action, language);
        const mechanicalMessage = {
          role: "gm",
          text: mechanicalText,
          at: Date.now(),
          combatActionToken: token,
        };
        const baseMessages = [...existingMessages, mechanicalMessage].slice(-80);
        store[sessionKey] = { ...session, messages: baseMessages, updatedAt: Date.now() };
        writeStore(store);
        setVersion((value) => value + 1);

        try {
          const mapData = props.mapData || {};
          const playerPosition = props.playerPosition || null;
          const currentCell = (mapData.cells || []).find(
            (cell) => cell.x === playerPosition?.x && cell.y === playerPosition?.y
          ) || null;
          const world = {
            region: props.region || null,
            sector: mapData.title || mapData.id || null,
            sectorOffset: mapData.worldOffset || null,
            localPosition: playerPosition,
            currentTerrain: currentCell?.terrain || null,
            travelEncounter: props.travelEncounter || null,
            activeCombat: combat || null,
          };
          const message = `An application-generated PLAYER ATTACK has just been resolved. The result below is authoritative and has already been applied to the stored enemy combat state. Do not reroll the attack, damage, hit location, DR, or HP change. Briefly narrate the result in the selected app language, respect the enemy's remaining HP and abilities, then continue the combat situation without deciding the player's next action. RESULT: ${JSON.stringify(action)}`;
          const response = await fetch("/api/auto-gm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              character: props.characterData || null,
              world,
              language,
              locationState: {
                persistent: session.persistent === true,
                facts: Array.isArray(session.events) ? session.events.slice(-40) : [],
              },
              sessionKey,
              history: sessionHistory({ ...session, messages: baseMessages }),
              message,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.text) return;

          const latestStore = readStore();
          const latestSession = latestStore[sessionKey] || session;
          const latestMessages = Array.isArray(latestSession.messages) ? latestSession.messages : baseMessages;
          latestStore[sessionKey] = {
            ...latestSession,
            messages: [
              ...latestMessages,
              { role: "gm", text: payload.text, at: Date.now(), combatNarrationToken: token },
            ].slice(-80),
            events: mergeEvents(latestSession.events, payload.events),
            check: payload?.check && typeof payload.check === "object" ? payload.check : null,
            updatedAt: Date.now(),
          };
          writeStore(latestStore);
          setVersion((value) => value + 1);
        } catch {
          // The authoritative mechanical result remains in chat even if GM narration is unavailable.
        }
      });
    };

    window.addEventListener(BESTIARY_COMBAT_ACTION_EVENT, onCombatAction);
    return () => window.removeEventListener(BESTIARY_COMBAT_ACTION_EVENT, onCombatAction);
  }, [language, props]);

  return <LocalGmChat key={`combat-aware-${version}`} {...props} />;
}
