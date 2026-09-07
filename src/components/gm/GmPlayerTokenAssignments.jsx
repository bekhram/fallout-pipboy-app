import React, { useMemo, useState } from "react";
import "../session/playerTokenAssignment.css";

const COPY = {
  en: { title: "PLAYER TOKEN CONTROL", empty: "No connected players", noLive: "Enable a LIVE scene before assigning player tokens.", assigned: "ASSIGNED", creating: "CREATING...", failed: "COULD NOT CREATE", one: "ASSIGN 1×1", two: "ASSIGN 2×2", size1: "1×1", size2: "2×2", remove: "REMOVE", hint: "GM creates the token in the LIVE scene and grants control to a player." },
  ru: { title: "УПРАВЛЕНИЕ ТОКЕНАМИ ИГРОКОВ", empty: "Нет подключённых игроков", noLive: "Сначала включите LIVE-сцену, затем назначайте токены игрокам.", assigned: "НАЗНАЧЕН", creating: "СОЗДАНИЕ...", failed: "НЕ УДАЛОСЬ СОЗДАТЬ", one: "НАЗНАЧИТЬ 1×1", two: "НАЗНАЧИТЬ 2×2", size1: "1×1", size2: "2×2", remove: "УДАЛИТЬ", hint: "ГМ создаёт токен прямо в LIVE-сцене и выдаёт управление игроку." },
  uk: { title: "КЕРУВАННЯ ТОКЕНАМИ ГРАВЦІВ", empty: "Немає підключених гравців", noLive: "Спочатку увімкніть LIVE-сцену, потім призначайте токени гравцям.", assigned: "ПРИЗНАЧЕНО", creating: "СТВОРЕННЯ...", failed: "НЕ ВДАЛОСЯ СТВОРИТИ", one: "ПРИЗНАЧИТИ 1×1", two: "ПРИЗНАЧИТИ 2×2", size1: "1×1", size2: "2×2", remove: "ВИДАЛИТИ", hint: "ГМ створює токен прямо в LIVE-сцені та надає керування гравцю." },
  pl: { title: "KONTROLA TOKENÓW GRACZY", empty: "Brak połączonych graczy", noLive: "Najpierw włącz scenę LIVE, a potem przydziel tokeny graczom.", assigned: "PRZYDZIELONY", creating: "TWORZENIE...", failed: "NIE UDAŁO SIĘ UTWORZYĆ", one: "PRZYDZIEL 1×1", two: "PRZYDZIEL 2×2", size1: "1×1", size2: "2×2", remove: "USUŃ", hint: "GM tworzy token bezpośrednio w scenie LIVE i przydziela sterowanie graczowi." },
};

function languageCode() {
  if (typeof document === "undefined") return "en";
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function tokenSize(token) { return Number(token?.size) === 2 ? 2 : 1; }

export default function GmPlayerTokenAssignments({ session }) {
  const text = COPY[languageCode()];
  const liveScene = session?.liveTacticalScene || null;
  const players = useMemo(
    () => (Array.isArray(session?.players) ? session.players : []).filter((player) => player?.online !== false && player?.clientId),
    [session?.players]
  );
  const [pending, setPending] = useState({});
  const [failed, setFailed] = useState({});

  if (!session?.isActive || session?.mode !== "host") return null;

  const tokens = Array.isArray(liveScene?.tokens) ? liveScene.tokens : [];
  const playerToken = (clientId) => tokens.find((token) => token.kind === "player" && token.ownerClientId === clientId) || null;

  const assign = async (player, size) => {
    if (!liveScene?.sceneId || pending[player.clientId]) return;
    setPending((current) => ({ ...current, [player.clientId]: true }));
    setFailed((current) => ({ ...current, [player.clientId]: false }));
    const name = player?.character?.name || player?.name || "Player";
    const response = await session.createAssignedPlayerToken?.({
      targetClientId: player.clientId,
      name,
      size,
    });
    setPending((current) => ({ ...current, [player.clientId]: false }));
    if (!response?.ok) setFailed((current) => ({ ...current, [player.clientId]: true }));
  };

  return (
    <section className="pip-panel gm-player-assignments">
      <div className="gm-player-assignments__head">
        <strong>[ {text.title} ]</strong>
        <span>{text.hint}</span>
      </div>
      {!liveScene ? <div className="gm-player-assignments__empty">{text.noLive}</div> : !players.length ? <div className="gm-player-assignments__empty">{text.empty}</div> : (
        <div className="gm-player-assignments__list">
          {players.map((player) => {
            const token = playerToken(player.clientId);
            const isPending = Boolean(pending[player.clientId]);
            const name = player?.character?.name || player?.name || "Player";
            return (
              <div className="gm-player-assignment" key={player.clientId}>
                <div className="gm-player-assignment__identity">
                  <span className="session-status-dot is-online" />
                  <strong>{name}</strong>
                  {token ? <small>{text.assigned} · {tokenSize(token) === 2 ? text.size2 : text.size1}</small> : isPending ? <small>{text.creating}</small> : failed[player.clientId] ? <small>{text.failed}</small> : null}
                </div>
                <div className="gm-player-assignment__actions">
                  {!token ? <>
                    <button type="button" className="pip-btn" disabled={isPending} onClick={() => assign(player, 1)}>{text.one}</button>
                    <button type="button" className="pip-btn" disabled={isPending} onClick={() => assign(player, 2)}>{text.two}</button>
                  </> : <>
                    <button type="button" className={`pip-btn${tokenSize(token) === 1 ? " is-primary" : ""}`} onClick={() => session.updateAssignedPlayerToken?.(player.clientId, { size: 1 })}>{text.size1}</button>
                    <button type="button" className={`pip-btn${tokenSize(token) === 2 ? " is-primary" : ""}`} onClick={() => session.updateAssignedPlayerToken?.(player.clientId, { size: 2 })}>{text.size2}</button>
                    <button type="button" className="pip-btn" onClick={() => session.removeAssignedPlayerToken?.(player.clientId)}>{text.remove}</button>
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
