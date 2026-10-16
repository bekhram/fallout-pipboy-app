import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deliverPlayerNarration,
  gmNarrativeGenerationMessage,
  gmNarrativeStorageKey,
  readGmNarrative,
  writeGmNarrative,
} from "../../utils/gmNarrativeNotes.js";
import "./gmNarrativeEditor.css";

const COPY = {
  en: {
    title: "NUMBERED DESCRIPTION", room: "Room", event: "Event", enemy: "Enemy",
    player: "FOR PLAYERS · READ ALOUD", gm: "GM ONLY · PRIVATE NOTES",
    playerPlaceholder: "A description without secret threats, checks or rewards...",
    gmPlaceholder: "Private facts, traps, checks, tactics, enemies and rewards...",
    guide: "Extra instructions for Auto GM", guidePlaceholder: "Atmosphere, character hooks or what the group knows already...",
    generate: "GENERATE WITH AUTO GM", again: "REGENERATE", busy: "GENERATING...",
    send: "SEND TO PLAYERS", sent: "SENT TO CHAT",
    saved: "Saved only on this GM device", offline: "To share, start this scene as LIVE and connect the GM.",
    error: "Auto GM couldn't generate the description.", sendError: "Player chat is unavailable. Nothing was shared.",
    empty: "Write or generate the player-facing description first.",
    private: "GM notes stay private. Only the player text is sent when you press Send.",
    storageError: "Local saving is unavailable in this browser. Do not close the editor before copying your notes.",
    rewards: "Rewards", next: "Possible developments", hidden: "Hidden enemy: review the player text before sharing.",
  },
  ru: {
    title: "ОПИСАНИЕ ПО НОМЕРУ", room: "Комната", event: "Событие", enemy: "Враг",
    player: "ДЛЯ ИГРОКОВ · ПРОЧИТАТЬ ВСЛУХ", gm: "ТОЛЬКО ГМ · СЕКРЕТЫ И МЕХАНИКИ",
    playerPlaceholder: "Что видят и слышат персонажи, без скрытых угроз и наград...",
    gmPlaceholder: "Секреты, проверки, ловушки, тактика, противники и награды...",
    guide: "Уточнение для АвтоГМ", guidePlaceholder: "Атмосфера, подсказки, сюжетные детали и что игроки уже знают...",
    generate: "СОЗДАТЬ ЧЕРЕЗ АВТОГМ", again: "ПЕРЕСОЗДАТЬ", busy: "ГЕНЕРАЦИЯ...",
    send: "ОТПРАВИТЬ ИГРОКАМ", sent: "ОТПРАВЛЕНО В ЧАТ",
    saved: "Сохранено только на устройстве ГМ", offline: "Для отправки запусти эту сцену как LIVE и подключись к сессии.",
    error: "АвтоГМ не смог создать описание.", sendError: "Чат игроков недоступен. Ничего не отправлено.",
    empty: "Сначала напиши или сгенерируй текст для игроков.",
    private: "Заметки ГМ остаются приватными. В чат отправляется только текст для игроков.",
    storageError: "Нельзя сохранить локально. Перед закрытием скопируй свои заметки.",
    rewards: "Награды", next: "Возможное развитие", hidden: "Скрытый враг: проверь текст перед отправкой игрокам.",
  },
  uk: {
    title: "ОПИС ЗА НОМЕРОМ", room: "Кімната", event: "Подія", enemy: "Ворог",
    player: "ДЛЯ ГРАВЦІВ · ЗАЧИТАТИ ВГОЛОС", gm: "ЛИШЕ ГМ · ТАЄМНИЦІ ТА МЕХАНІКИ",
    playerPlaceholder: "Що персонажі бачать і чують, без прихованих загроз і нагород...",
    gmPlaceholder: "Таємниці, перевірки, пастки, тактика, вороги й нагороди...",
    guide: "Уточнення для АвтоГМ", guidePlaceholder: "Атмосфера, підказки, сюжетні деталі й те, що гравці вже знають...",
    generate: "СТВОРИТИ ЧЕРЕЗ АВТОГМ", again: "ЗГЕНЕРУВАТИ ЗНОВУ", busy: "ГЕНЕРАЦІЯ...",
    send: "НАДІСЛАТИ ГРАВЦЯМ", sent: "НАДІСЛАНО В ЧАТ",
    saved: "Збережено лише на пристрої ГМ", offline: "Щоб надіслати, увімкни цю сцену як LIVE та підключи ГМ.",
    error: "АвтоГМ не зміг створити опис.", sendError: "Чат гравців недоступний. Нічого не надіслано.",
    empty: "Спочатку напиши або згенеруй текст для гравців.",
    private: "Нотатки ГМ приватні. У чат надсилається лише текст для гравців.",
    storageError: "Локальне збереження недоступне. Скопіюй нотатки перед закриттям.",
    rewards: "Нагороди", next: "Можливі події", hidden: "Прихований ворог: перевір текст перед надсиланням гравцям.",
  },
  pl: {
    title: "OPIS WEDŁUG NUMERU", room: "Pomieszczenie", event: "Zdarzenie", enemy: "Wróg",
    player: "DLA GRACZY · PRZECZYTAJ NA GŁOS", gm: "TYLKO MG · SEKRETY I MECHANIKA",
    playerPlaceholder: "Co postacie widzą i słyszą, bez tajnych zagrożeń lub nagród...",
    gmPlaceholder: "Sekrety, testy, pułapki, taktyka, przeciwnicy i nagrody...",
    guide: "Dodatkowe wskazówki dla Auto MG", guidePlaceholder: "Atmosfera, fabuła, wskazówki i informacje już znane drużynie...",
    generate: "WYGENERUJ PRZEZ AUTO MG", again: "GENERUJ PONOWNIE", busy: "GENEROWANIE...",
    send: "WYŚLIJ GRACZOM", sent: "WYSŁANO NA CZAT",
    saved: "Zapisano tylko na urządzeniu MG", offline: "Aby udostępnić, uruchom tę scenę jako LIVE i połącz MG.",
    error: "Auto MG nie mógł wygenerować opisu.", sendError: "Czat graczy jest niedostępny. Nic nie wysłano.",
    empty: "Najpierw wpisz lub wygeneruj tekst dla graczy.",
    private: "Notatki MG pozostają prywatne. Do czatu trafia tylko tekst dla graczy.",
    storageError: "Zapis lokalny jest niedostępny. Skopiuj notatki przed zamknięciem.",
    rewards: "Nagrody", next: "Możliwy rozwój", hidden: "Ukryty wróg: sprawdź tekst przed udostępnieniem.",
  },
};
const languageCode = (value) => {
  const code = String(value || "en").split("-")[0].toLowerCase();
  return COPY[code] ? code : "en";
};

function gmDefaultText(target) {
  return String(target?.source || "").slice(0, 6000);
}

export default function GmNarrativeEditor({ session, target }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const labels = COPY[language];
  const scene = session?.tacticalScene;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const key = gmNarrativeStorageKey({
    campaignId: session?.campaignId || session?.roomCode || session?.sessionCode,
    sceneId: scene?.sceneId,
    type: spec?.type || "",
    seed: spec?.seed || "",
    kind: target?.kind,
    id: target?.id,
    language,
  });
  const [draft, setDraft] = useState(() => readGmNarrative(key, gmDefaultText(target)));
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const requestControllerRef = useRef(null);

  useEffect(() => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    setLoading(false);
    setDraft(readGmNarrative(key, gmDefaultText(target)));
    setSent(false);
    setError("");
    setGenerated(false);
    setStorageError(false);
  }, [key]);

  useEffect(() => () => {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
  }, []);

  const live = session?.mode === "host" &&
    session?.status === "online" &&
    session?.liveSceneId &&
    session.liveSceneId === scene?.sceneId &&
    scene?.active !== false;

  const label = labels[target?.kind] || target?.kind || labels.room;
  const number = target?.number;
  const title = `${label} #${number || "?"} · ${target?.name || ""}`;

  const save = (next) => {
    setDraft(next);
    setSent(false);
    setStorageError(!writeGmNarrative(key, next));
  };
  const change = (field, value) => save({ ...draft, [field]: value });

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setSent(false);
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const context = {
        scene: {
          id: String(scene?.sceneId || ""),
          name: String(scene?.name || ""),
          grid: `${scene?.cols || 24}x${scene?.rows || 24}`,
        },
        environment: {
          type: String(spec?.type || ""),
          terrain: String(scene?.environment?.terrain || spec?.terrain || ""),
          timeOfDay: String(scene?.environment?.timeOfDay || ""),
          weather: String(scene?.environment?.weather || ""),
        },
        target: {
          kind: String(target?.kind || ""),
          id: String(target?.id || ""),
          marker: number,
          name: String(target?.name || "").slice(0, 140),
          hidden: Boolean(target?.hidden),
          gmSource: gmDefaultText(target).slice(0, 2400),
          gmNotes: String(draft.gmText || "").slice(0, 2500),
        },
        players: (session?.players || []).slice(0, 8).map((player) => ({
          name: String(player?.character?.name || player?.name || "Player").slice(0, 80),
          level: Number(player?.character?.level || 1),
        })),
      };
      const response = await fetch("/api/gm-encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: gmNarrativeGenerationMessage({
            kind: label, number, name: target?.name, guidance: draft.guidance,
          }),
          language,
          history: [],
          gmContext: context,
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || labels.error);
      const narration = String(body?.narration || "").trim().slice(0, 6000);
      const gmNotes = [
        String(body?.gmNotes || "").trim(),
        body?.rewards ? `${labels.rewards}: ${String(body.rewards)}` : "",
        Array.isArray(body?.nextBeats) && body.nextBeats.length
          ? `${labels.next}: ${body.nextBeats.map((value) => String(value)).join("; ")}`
          : "",
      ].filter(Boolean).join("\n\n").slice(0, 6000);
      if (!narration && !gmNotes) throw new Error(labels.error);
      const next = {
        ...draft,
        playerText: narration || draft.playerText,
        gmText: gmNotes || draft.gmText,
      };
      save(next);
      setGenerated(true);
    } catch (err) {
      if (err?.name !== "AbortError") setError(err?.message || labels.error);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const send = () => {
    if (!live || !draft.playerText.trim()) return;
    const delivered = deliverPlayerNarration(session, number, draft.playerText);
    setSent(delivered);
    setError(delivered ? "" : labels.sendError);
  };

  if (!scene || session?.mode !== "host") return null;

  return (
    <section className="gm-narrative-editor" aria-label={title}>
      <header className="gm-narrative-editor__header">
        <strong>{labels.title} · {title}</strong>
        <small>{labels.saved}</small>
      </header>
      <div className="gm-narrative-editor__fields">
        <label className="gm-narrative-editor__player">
          <span>{labels.player}</span>
          <textarea rows={4} maxLength={6000} value={draft.playerText} placeholder={labels.playerPlaceholder} onChange={(event) => change("playerText", event.target.value)} />
        </label>
        <label className="gm-narrative-editor__gm">
          <span>{labels.gm}</span>
          <textarea rows={4} maxLength={6000} value={draft.gmText} placeholder={labels.gmPlaceholder} onChange={(event) => change("gmText", event.target.value)} />
        </label>
      </div>
      <p className="gm-narrative-editor__privacy">{labels.private}</p>
      {target?.hidden ? <p className="gm-narrative-editor__warning">{labels.hidden}</p> : null}
      <details className="gm-narrative-editor__extra">
        <summary>{labels.guide}</summary>
        <textarea rows={2} maxLength={2000} value={draft.guidance} placeholder={labels.guidePlaceholder} onChange={(event) => change("guidance", event.target.value)} />
      </details>
      <div className="gm-narrative-editor__actions">
        <button type="button" className="pip-btn" disabled={loading} onClick={generate}>{loading ? labels.busy : generated ? labels.again : labels.generate}</button>
        <button type="button" className="pip-btn is-primary" disabled={loading || !live || !draft.playerText.trim()} onClick={send}>{sent ? labels.sent : labels.send}</button>
      </div>
      {!live ? <small className="gm-narrative-editor__notice">{labels.offline}</small> : null}
      {storageError ? <small className="gm-narrative-editor__warning">{labels.storageError}</small> : null}
      {error ? <div role="alert" className="gm-narrative-editor__error">{error}</div> : null}
    </section>
  );
}
