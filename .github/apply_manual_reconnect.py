from pathlib import Path

hook = Path('src/hooks/useSharedSession.js')
s = hook.read_text()

needle = '''  const exitSession = () => {
    destroyNetwork();'''
replacement = '''  const reconnectNow = () => {
    if (
      desiredModeRef.current !== "player"
      || !codeRef.current
      || !playerClientIdRef.current
    ) return false;

    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    setError(null);
    setStatus("connecting");

    // Invalidate callbacks from the old channel before closing it so a stale
    // close/error event cannot schedule a second reconnect in parallel.
    destroyCurrentPeer();

    window.setTimeout(() => {
      if (desiredModeRef.current === "player") createPlayerPeer(false);
    }, 150);
    return true;
  };

  const exitSession = () => {
    destroyNetwork();'''
if needle not in s:
    raise SystemExit('hook reconnect insertion anchor not found')
s = s.replace(needle, replacement, 1)

needle = '''    joinSession,
    exitSession,'''
replacement = '''    joinSession,
    reconnectNow,
    exitSession,'''
if needle not in s:
    raise SystemExit('hook return insertion anchor not found')
s = s.replace(needle, replacement, 1)
hook.write_text(s)


drawer = Path('src/components/session/SessionChatDrawer.jsx')
s = drawer.read_text()

replacements = {
'''    close: "CLOSE",
''': '''    close: "CLOSE",
    reconnect: "RECONNECT",
''',
'''    close: "ЗАКРЫТЬ",
''': '''    close: "ЗАКРЫТЬ",
    reconnect: "ПЕРЕПОДКЛЮЧИТЬСЯ",
''',
'''    close: "ЗАКРИТИ",
''': '''    close: "ЗАКРИТИ",
    reconnect: "ПЕРЕПІДКЛЮЧИТИСЯ",
''',
'''    close: "ZAMKNIJ",
''': '''    close: "ZAMKNIJ",
    reconnect: "POŁĄCZ PONOWNIE",
''',
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit(f'drawer copy anchor not found: {old!r}')
    s = s.replace(old, new, 1)

needle = '''        <div className="session-chat-connection-strip">
          <div>
            <span className={`session-status-dot is-${session.status}`} />
            <strong>{connectionLabel}</strong>
          </div>
          <span>{session.sessionCode}</span>
        </div>

        {session.sceneMessage && ('''
replacement = '''        <div className="session-chat-connection-strip">
          <div>
            <span className={`session-status-dot is-${session.status}`} />
            <strong>{connectionLabel}</strong>
          </div>
          <span>{session.sessionCode}</span>
        </div>

        {connectionState !== "online" && (
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={() => session.reconnectNow?.()}
          >
            ↻ {copy.reconnect}
          </button>
        )}

        {session.sceneMessage && ('''
if needle not in s:
    raise SystemExit('drawer reconnect button anchor not found')
s = s.replace(needle, replacement, 1)
drawer.write_text(s)
