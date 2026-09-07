import React, { useMemo, useState } from "react";
import "../session/playerTokenAssignment.css";

const COPY = {
  en: { title: "PLAYER TOKEN CONTROL", empty: "No connected players", assigned: "ASSIGNED", waiting: "REQUEST SENT", one: "ASSIGN 1×1", two: "ASSIGN 2×2", size1: "1×1", size2: "2×2", remove: "REMOVE", hint: "GM creates the token and grants control. The player only uploads an avatar and moves the assigned token." },
  ru: { title: "УПРАВЛЕНИЕ ТОКЕНАМИ ИГРОКОВ", empty: "Нет подключённых игроков", assigned: "НАЗНАЧЕН", waiting: "ЗАПРОС ОТПРАВЛЕН", one: "НАЗНАЧИТЬ 1×1", two: "НАЗНАЧИТЬ 2×2", size1: "1×1", size2: "2×2", remove: "УДАЛИТЬ", hint: "ГМ создаёт токен и выдаёт управление. Игрок только загружает аватар и двигает назначенный токен." },
  uk: { title: "КЕРУВАННЯ ТОКЕНАМИ ГРАВЦІВ", empty: "Немає підключених гравців", assigned: "ПРИЗНАЧЕНО", waiting: "ЗАПИТ НАДІСЛАНО", one: "ПРИЗНАЧИТИ 1×1", two: "ПРИЗНАЧИТИ 2×2", size1: "1×1", size2: "2×2", remove: "ВИДАЛИТИ", hint: "ГМ створює токен і надає керування. Гравець лише завантажує аватар та рухає призначений токен." },
  pl: { title: "KONTROLA TOKENÓW GRACZY", empty: "Brak połączonych graczy", assigned: "PRZYDZIELONY", waiting: "WYSŁANO", one: "PRZYDZIEL 1×1", two: "PRZYDZIEL 2×2", size1: "1×1", size2: "2×2", remove: "USUŃ", hint: "GM tworzy token i przydziela sterowanie. Gracz tylko wgrywa awatar i porusza przypisanym tokenem." },
};

function languageCode() {
  if (typeof document === "undefined") return "en";
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function tokenSize(token) { return Number(token?.size) === 2 ? 2 : 1; }

export default function GmPlayerTokenAssignments({ session }) {
  const text = COPY[languageCode()];
  const scene = session?.tacticalScene || null;
  const players = useMemo(
    () => (Array.isArray(session?.players) ? session.players : []).filter((player) => player?.online !== false && player?.clientId),
    [session?.players]
  );
  const [pending, setPending] = useState({});

  if (!session?.isActive || session?.mode !== "host" || !scene) return null;

  const tokens = Array.isArray(scene.tokens) ? scene.tokens : [];
  const playerToken = (clientId) => tokens.find((token) => token.kind === "player" && token.ownerClientId === clientId) || null;

  const requestAssignment = (player, size) => {
    const ok = session.requestPlayerTokenAssignment?.({ targetClientId: player.clientId, sceneId: scene.sceneId, size });
    if (!ok) return;
    setPending((current) => ({ ...current, [player.clientId]: Date.now() }));
    window.setTimeout(() => setPending((current) => {
      const next = { ...current };
      delete next[player.clientId];
      return next;
    }), 8000);
  };

  return (
    <section className="pip-panel gm-player-assignments">
      <div className="gm-player-assignments__head">
        <strong>[ {text.title} ]</strong>
        <span>{text.hint}</span>
      </div>
      {!players.length ? <div className="gm-player-assignments__empty">{text.empty}</div> : (
        <div className="gm-player-assignments__list">
          {players.map((player) => {
            const token = playerToken(player.clientId);
            const isPending = Boolean(pending[player.clientId] && !token);
            const name = player?.character?.name || player?.name || "Player";
            return (
              <div className="gm-player-assignment" key={player.clientId}>
                <div className="gm-player-assignment__identity">
                  <span className="session-status-dot is-online" />
                  <strong>{name}</strong>
                  {token ? <small>{text.assigned} · {tokenSize(token) === 2 ? text.size2 : text.size1}</small> : isPending ? <small>{text.waiting}</small> : null}
                </div>
                <div className="gm-player-assignment__actions">
                  {!token ? <>
                    <button type="button" className="pip-btn" disabled={isPending} onClick={() => requestAssignment(player, 1)}>{text.one}</button>
                    <button type="button" className="pip-btn" disabled={isPending} onClick={() => requestAssignment(player, 2)}>{text.two}</button>
                  </> : <>
                    <button type="button" className={`pip-btn${tokenSize(token) === 1 ? " is-primary" : ""}`} onClick={() => session.updateToken?.(token.id, { size: 1 })}>{text.size1}</button>
                    <button type="button" className={`pip-btn${tokenSize(token) === 2 ? " is-primary" : ""}`} onClick={() => session.updateToken?.(token.id, { size: 2 })}>{text.size2}</button>
                    <button type="button" className="pip-btn" onClick={() => session.deleteToken?.(token.id)}>{text.remove}</button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
