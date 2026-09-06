from pathlib import Path

hook = Path('src/hooks/useSharedSession.js')
text = hook.read_text()

repls = [
(
'''function makePlayerPacket(name, form, full = true) {
  return {
    name: String(name || "Player").trim().slice(0, 40) || "Player",
    character: full ? createCharacterSnapshot(form) : createLiveCharacterSnapshot(form),
  };
}''',
'''function makePlayerPacket(name, form, full = true, clientId = "") {
  return {
    clientId: cleanText(clientId, 140),
    name: String(name || "Player").trim().slice(0, 40) || "Player",
    character: full ? createCharacterSnapshot(form) : createLiveCharacterSnapshot(form),
  };
}'''
),
(
'''    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * Math.pow(1.65, Math.max(0, reconnectAttemptRef.current - 1))
    );''',
'''    const reconnectBaseMs = desiredModeRef.current === "host" ? 7000 : RECONNECT_BASE_MS;
    const delay = Math.min(
      RECONNECT_MAX_MS,
      reconnectBaseMs * Math.pow(1.65, Math.max(0, reconnectAttemptRef.current - 1))
    );'''
),
(
'''  function bindHostConnection(connection) {
    const previous = connectionsRef.current.get(connection.peer);
    if (previous && previous !== connection) safeClose(previous);
    connectionsRef.current.set(connection.peer, connection);
    clearDisconnectTimer(connection.peer);''',
'''  function bindHostConnection(connection) {
    const previous = connectionsRef.current.get(connection.peer);
    if (previous && previous !== connection) safeClose(previous);
    connectionsRef.current.set(connection.peer, connection);
    clearDisconnectTimer(connection.peer);

    const assignLogicalPlayerId = (packet) => {
      const logicalId = cleanText(packet?.clientId, 140) || connection.peer;
      const previousLogicalConnection = connectionsRef.current.get(logicalId);
      if (previousLogicalConnection && previousLogicalConnection !== connection) {
        safeClose(previousLogicalConnection);
      }
      if (logicalId !== connection.peer && connectionsRef.current.get(connection.peer) === connection) {
        connectionsRef.current.delete(connection.peer);
      }
      connection.__pipPlayerId = logicalId;
      connectionsRef.current.set(logicalId, connection);
      clearDisconnectTimer(logicalId);
      return logicalId;
    };'''
),
(
'''      if (data.type === "join" || data.type === "player_update") {
        upsertPlayer(connection.peer, data.player);
        return;
      }
      const player = playersRef.current.find((item) => item.peerId === connection.peer);''',
'''      if (data.type === "join" || data.type === "player_update") {
        const logicalPlayerId = assignLogicalPlayerId(data.player);
        upsertPlayer(logicalPlayerId, data.player);
        return;
      }
      const logicalPlayerId = connection.__pipPlayerId || connection.peer;
      const player = playersRef.current.find((item) => item.peerId === logicalPlayerId);'''
),
(
'''    const handleClosed = () => {
      if (connectionsRef.current.get(connection.peer) === connection) {
        connectionsRef.current.delete(connection.peer);
        markPlayerDisconnected(connection.peer);
      }
    };''',
'''    const handleClosed = () => {
      const logicalPlayerId = connection.__pipPlayerId || connection.peer;
      if (connectionsRef.current.get(logicalPlayerId) === connection) {
        connectionsRef.current.delete(logicalPlayerId);
        if (connection.__pipPlayerId) markPlayerDisconnected(logicalPlayerId);
      }
      if (logicalPlayerId !== connection.peer && connectionsRef.current.get(connection.peer) === connection) {
        connectionsRef.current.delete(connection.peer);
      }
    };'''
),
(
'''    const peer = new Peer(getPlayerPeerId(playerClientIdRef.current), PEER_OPTIONS);''',
'''    // Let PeerServer allocate a fresh signalling ID for every connection attempt.
    // The app-level clientId remains stable and is what the GM uses to identify the player.
    const peer = new Peer(undefined, PEER_OPTIONS);'''
),
(
'''          connection.send({ type: "join", player: makePlayerPacket(playerNameRef.current, formRef.current, true) });''',
'''          connection.send({
            type: "join",
            player: makePlayerPacket(playerNameRef.current, formRef.current, true, playerClientIdRef.current),
          });'''
),
(
'''        player: makePlayerPacket(playerNameRef.current, formRef.current, full),''',
'''        player: makePlayerPacket(playerNameRef.current, formRef.current, full, playerClientIdRef.current),'''
),
]

for old, new in repls:
    if old not in text:
        raise SystemExit(f'Expected block not found:\n{old[:160]}')
    text = text.replace(old, new, 1)

hook.write_text(text)

chat = Path('src/components/session/SessionChatDrawer.jsx')
ct = chat.read_text()
repls2 = [
('''    reconnect: "RECONNECT",''', '''    reconnect: "RECONNECT",\n    hostNotFound: "GM session not found or is offline.",\n    networkError: "Network connection error.",'''),
('''    reconnect: "ПЕРЕПОДКЛЮЧИТЬСЯ",''', '''    reconnect: "ПЕРЕПОДКЛЮЧИТЬСЯ",\n    hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.",\n    networkError: "Ошибка сетевого соединения.",'''),
('''    reconnect: "ПЕРЕПІДКЛЮЧИТИСЯ",''', '''    reconnect: "ПЕРЕПІДКЛЮЧИТИСЯ",\n    hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.",\n    networkError: "Помилка мережевого з’єднання.",'''),
('''    reconnect: "POŁĄCZ PONOWNIE",''', '''    reconnect: "POŁĄCZ PONOWNIE",\n    hostNotFound: "Sesja GM nie istnieje lub GM jest offline.",\n    networkError: "Błąd połączenia sieciowego.",'''),
(
'''  const connectionState = getConnectionState(session?.status);
  const connectionLabel = copy[connectionState];''',
'''  const connectionState = getConnectionState(session?.status);
  const connectionLabel = copy[connectionState];
  const errorText = session?.error?.key
    ? (copy[session.error.key] || session.error.message || "")
    : (session?.error?.message || "");'''
),
(
'''        {connectionState !== "online" && (
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={() => session.reconnectNow?.()}
          >
            ↻ {copy.reconnect}
          </button>
        )}''',
'''        {connectionState !== "online" && (
          <>
            {errorText && <div className="session-error">{errorText}</div>}
            <button
              type="button"
              className="pip-btn is-primary"
              onClick={() => session.reconnectNow?.()}
            >
              ↻ {copy.reconnect}
            </button>
          </>
        )}'''
),
]
for old, new in repls2:
    if old not in ct:
        raise SystemExit(f'Expected chat block not found:\n{old[:160]}')
    ct = ct.replace(old, new, 1)
chat.write_text(ct)
