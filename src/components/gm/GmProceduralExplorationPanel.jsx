import React, { useEffect, useMemo, useRef } from "react";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import GmSettlementRoomPanel from "./GmSettlementRoomPanel.jsx";
import GmWastelandPoiPanel from "./GmWastelandPoiPanel.jsx";
import GmBattlemapExtrasPanel from "./GmBattlemapExtrasPanel.jsx";
import { applyRandomEncounterEnemyBuff } from "../../utils/proceduralEnemyBuffs.js";
import { applyEncounterDifficultyPower } from "../../utils/proceduralEncounterDifficultyPower.js";
import { buildProceduralEncounterContext } from "../../utils/proceduralEncounterContextV2.js";

function buffSeed(payload = {}, stats = {}) {
  return [
    stats.generatedEncounterSeed || "encounter",
    stats.generatedRoomId || stats.generatedPoiId || "area",
    payload.npcId || payload.name || "npc",
    Number.isFinite(Number(payload.x)) ? Number(payload.x) : "x",
    Number.isFinite(Number(payload.y)) ? Number(payload.y) : "y",
  ].join(":");
}

function languageCode() {
  const raw = typeof document === "undefined" ? "en" : document.documentElement?.lang || "en";
  const code = String(raw).toLowerCase().split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(code) ? code : "en";
}

function autoBrief(language) {
  if (language === "ru") return "Сгенерируй вступление к только что расставленному процедурному энкаунтеру. Красочно опиши сцену игрокам, естественно подай цель мини-квеста и используй только безопасные подсказки о скрытой угрозе. Не раскрывай тип, количество и точное положение скрытых врагов.";
  if (language === "uk") return "Створи вступ до щойно розставленого процедурного енкаунтера. Яскраво опиши сцену гравцям, природно подай мету мініквесту та використовуй лише безпечні підказки про приховану загрозу. Не розкривай тип, кількість і точне положення прихованих ворогів.";
  if (language === "pl") return "Wygeneruj wprowadzenie do właśnie rozmieszczonego proceduralnego spotkania. Opisz scenę graczom, naturalnie przedstaw cel mini-zadania i używaj wyłącznie bezpiecznych wskazówek dotyczących ukrytego zagrożenia. Nie ujawniaj typu, liczby ani dokładnego położenia ukrytych wrogów.";
  return "Introduce the newly placed procedural encounter. Vividly describe the scene to the players, naturally present the mini-quest objective, and use only spoiler-safe clues about hidden threats. Never reveal hidden enemy type, count, or exact position.";
}

function chatChunks(text) {
  const chunks = [];
  let rest = String(text || "").trim();
  while (rest.length > 1080) {
    let cut = rest.lastIndexOf("\n", 1080);
    if (cut < 600) cut = rest.lastIndexOf(" ", 1080);
    if (cut < 600) cut = 1080;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}

export default function GmProceduralExplorationPanel({ session }) {
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec || null;
  const type = String(spec?.type || "");
  const batchesRef = useRef(new Map());
  const timerRef = useRef(null);
  const deliveryTimerRef = useRef(null);
  const narrationQueueRef = useRef([]);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const flushNarrationQueue = (attempt = 0) => {
    const latestSession = sessionRef.current;
    while (narrationQueueRef.current.length) {
      const chunk = narrationQueueRef.current[0];
      const sent = latestSession?.sendChat?.(chunk);
      if (!sent) {
        if (attempt < 10 && typeof window !== "undefined") {
          if (deliveryTimerRef.current) window.clearTimeout(deliveryTimerRef.current);
          deliveryTimerRef.current = window.setTimeout(() => {
            deliveryTimerRef.current = null;
            flushNarrationQueue(attempt + 1);
          }, 750);
        }
        return false;
      }
      narrationQueueRef.current.shift();
    }
    return true;
  };

  useEffect(() => {
    sessionRef.current = session;
    if (session?.status === "online" && narrationQueueRef.current.length) flushNarrationQueue(0);
  }, [session, session?.status]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (deliveryTimerRef.current) window.clearTimeout(deliveryTimerRef.current);
  }, []);

  const encounterSession = useMemo(() => {
    if (!session || !spec) return session;

    const finalizeEncounter = async (stamp) => {
      const placedTokens = batchesRef.current.get(stamp) || [];
      if (!placedTokens.length) return;
      batchesRef.current.delete(stamp);

      const latestSession = sessionRef.current || session;
      const language = languageCode();
      const currentScene = latestSession?.tacticalScene || {};
      const encounterContext = buildProceduralEncounterContext({
        spec,
        scene: currentScene,
        placedTokens,
        language,
      });

      try {
        await latestSession?.updateTacticalScene?.({ encounterContext });
      } catch {
        /* narration still works with the freshly built context */
      }

      try {
        const response = await fetch("/api/gm-encounter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: autoBrief(language),
            language,
            history: [],
            gmContext: {
              scene: {
                id: currentScene?.sceneId || "",
                name: currentScene?.name || "Tactical scene",
                grid: `${currentScene?.cols || 12}x${currentScene?.rows || 12}`,
              },
              environment: currentScene?.environment || {},
              players: Array.isArray(latestSession?.players) ? latestSession.players : [],
              encounterContext,
            },
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.narration) {
          narrationQueueRef.current.push(...chatChunks(payload.narration));
          flushNarrationQueue(0);
        }
      } catch {
        /* Auto GM is optional; token placement must never fail because narration failed. */
      }
    };

    const scheduleFinalize = (stamp) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void finalizeEncounter(stamp);
      }, 1400);
    };

    return {
      ...session,
      createNpcToken: async (payload = {}) => {
        const stats = payload?.stats && typeof payload.stats === "object" ? payload.stats : {};
        const latestSession = sessionRef.current || session;
        if (!stats.generatedEncounterSeed) return latestSession.createNpcToken?.(payload);

        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        const disposition = String(stats.generatedDisposition || "hostile").toLowerCase();
        const hostile = disposition !== "friendly";
        let nextStats = stats;

        if (spec.enemyBuffsEnabled) {
          nextStats = applyRandomEncounterEnemyBuff(nextStats, {
            enabled: hostile,
            tier: spec.enemyBuffTier,
            disposition,
            seed: buffSeed(payload, stats),
          });
        }

        if (hostile) {
          nextStats = applyEncounterDifficultyPower(
            nextStats,
            spec.encounterDifficulty ?? spec.difficulty ?? "standard",
          );
        }

        const finalPayload = { ...payload, stats: nextStats };
        const response = await latestSession.createNpcToken?.(finalPayload);
        if (response?.ok) {
          const stamp = String(nextStats.generatedEncounterSeed);
          const batch = batchesRef.current.get(stamp) || [];
          batch.push(finalPayload);
          batchesRef.current.set(stamp, batch);
          scheduleFinalize(stamp);
        }
        return response;
      },
    };
  }, [
    session,
    spec?.enemyBuffsEnabled,
    spec?.enemyBuffTier,
    spec?.encounterDifficulty,
    spec?.difficulty,
    spec?.seed,
    spec?.type,
  ]);

  let primary = <GmProceduralRoomDescriptionsV4 session={encounterSession} />;
  if (type === "wasteland") primary = <GmWastelandPoiPanel session={encounterSession} />;
  if (type === "settlement") primary = <GmSettlementRoomPanel session={encounterSession} />;

  return (
    <>
      {primary}
      <GmBattlemapExtrasPanel session={session} />
    </>
  );
}
