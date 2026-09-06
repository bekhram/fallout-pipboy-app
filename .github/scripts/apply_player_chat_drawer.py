from pathlib import Path

app = Path('src/App.jsx')
s = app.read_text()
old = 'import SessionScreen, { SessionFloatingButton } from "./components/session/SessionScreen.jsx";\n'
new = 'import SessionScreen from "./components/session/SessionScreen.jsx";\nimport SessionChatDrawer from "./components/session/SessionChatDrawer.jsx";\n'
if old not in s:
    raise SystemExit('App session import anchor not found')
s = s.replace(old, new, 1)

anchor = '  const sharedSession = useSharedSession(form);\n'
insert = '''  const sharedSession = useSharedSession(form);\n\n  useEffect(() => {\n    if (\n      screen === "session"\n      && sharedSession.mode === "player"\n      && sharedSession.status === "online"\n    ) {\n      setScreen("sheet");\n      setActiveTab("status");\n    }\n  }, [screen, sharedSession.mode, sharedSession.status]);\n'''
if anchor not in s:
    raise SystemExit('sharedSession anchor not found')
s = s.replace(anchor, insert, 1)

old_block = '''      {screen === "sheet" && !isDiceOpen && sharedSession.isActive && (\n        <SessionFloatingButton\n          session={sharedSession}\n          onOpen={() => setScreen("session")}\n        />\n      )}\n'''
new_block = '''      {screen === "sheet" && sharedSession.isActive && sharedSession.mode === "player" && (\n        <SessionChatDrawer session={sharedSession} />\n      )}\n'''
if old_block not in s:
    raise SystemExit('floating session block not found')
s = s.replace(old_block, new_block, 1)
app.write_text(s)

css = Path('src/components/session/session.css')
c = css.read_text()
marker = '/* ===== PLAYER GROUP CHAT DRAWER ===== */'
if marker not in c:
    c += r'''

/* ===== PLAYER GROUP CHAT DRAWER ===== */
.session-chat-drawer-shell {
  --session-chat-drawer-width: min(390px, calc(100vw - 54px));
  position: fixed;
  inset: 0;
  z-index: 999996;
  pointer-events: none;
}

.session-chat-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--session-chat-drawer-width);
  height: 100dvh;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px;
  border-left: 1px solid currentColor;
  background: rgba(7, 16, 9, 0.985);
  color: var(--pip-accent);
  box-shadow: -10px 0 28px rgba(0, 0, 0, 0.45);
  transform: translateX(100%);
  transition: transform 180ms ease;
  pointer-events: auto;
}

.session-chat-drawer-shell.is-open .session-chat-drawer {
  transform: translateX(0);
}

.session-chat-drawer-toggle {
  position: absolute;
  top: 44%;
  right: 0;
  width: 48px;
  min-height: 142px;
  padding: 8px 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid currentColor;
  border-right: 0;
  border-radius: 7px 0 0 7px;
  background: rgba(7, 16, 9, 0.97);
  color: var(--pip-accent);
  font: inherit;
  cursor: pointer;
  box-shadow: -4px 0 14px rgba(0, 0, 0, 0.35);
  transition: right 180ms ease;
  pointer-events: auto;
}

.session-chat-drawer-shell.is-open .session-chat-drawer-toggle {
  right: var(--session-chat-drawer-width);
}

.session-chat-toggle-label {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.session-chat-toggle-code {
  max-width: 42px;
  overflow: hidden;
  font-size: 0.55rem;
  opacity: 0.72;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.session-chat-drawer-head,
.session-chat-connection-strip,
.session-drawer-message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.session-chat-drawer-head h2 {
  margin: 2px 0 0;
  font-size: 1rem;
}

.session-chat-connection-strip {
  padding: 8px 9px;
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
  background: color-mix(in srgb, currentColor 5%, transparent);
  font-size: 0.74rem;
  letter-spacing: 0.06em;
}

.session-chat-connection-strip > div {
  display: flex;
  align-items: center;
  gap: 7px;
}

.session-chat-scene-banner {
  display: grid;
  gap: 4px;
  padding: 8px 9px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 8%, transparent);
  font-size: 0.78rem;
}

.session-chat-scene-banner strong {
  font-size: 0.67rem;
  letter-spacing: 0.08em;
}

.session-chat-drawer-list {
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-right: 3px;
  overscroll-behavior: contain;
}

.session-drawer-message {
  padding: 8px 9px;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  background: color-mix(in srgb, currentColor 3%, transparent);
  overflow-wrap: anywhere;
  font-size: 0.82rem;
}

.session-drawer-message.is-scene {
  border-width: 2px;
}

.session-drawer-message-meta {
  margin-bottom: 5px;
  font-size: 0.66rem;
  opacity: 0.75;
  text-transform: uppercase;
}

.session-drawer-system {
  display: flex;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  font-size: 0.68rem;
  opacity: 0.65;
  text-align: center;
}

.session-chat-drawer-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
  padding-top: 9px;
  border-top: 1px solid color-mix(in srgb, currentColor 25%, transparent);
}

.session-chat-drawer-form .pip-input {
  min-width: 0;
}

@media (max-width: 620px) {
  .session-chat-drawer-shell {
    --session-chat-drawer-width: calc(100vw - 42px);
  }

  .session-chat-drawer {
    padding: 9px;
  }

  .session-chat-drawer-toggle {
    width: 42px;
    min-height: 126px;
  }

  .session-chat-drawer-form {
    grid-template-columns: 1fr;
  }
}
'''
    css.write_text(c)
