function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`[pip2d20 session menu] Could not apply ${label}`);
  }
  return source.replace(search, replacement);
}

export function pip2d20SessionMenuPlugin() {
  return {
    name: "pip2d20-session-menu",
    enforce: "pre",
    transform(source, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];
      if (!normalized.endsWith("/src/components/session/SessionScreen.jsx")) return null;

      let code = source;
      code = replaceRequired(
        code,
        'import SessionChatDrawer from "./SessionChatDrawer.jsx";',
        'import SessionChatDrawer from "./SessionChatDrawer.jsx";\nimport SessionActionsMenu from "./SessionActionsMenu.jsx";',
        "SessionActionsMenu import"
      );

      code = replaceRequired(
        code,
        '      <section className="session-gm-host session-gm-host--single-workspace">',
        '      <section className="session-gm-host session-gm-host--single-workspace">\n        <SessionActionsMenu mode={mode} session={session} onBack={onBack} onOpenSheet={onOpenSheet} labels={copy} />',
        "GM session menu mount"
      );

      code = replaceRequired(
        code,
        '    <section className="session-screen pip-screen-grid session-player-live session-player-live--simple">',
        '    <section className="session-screen pip-screen-grid session-player-live session-player-live--simple">\n      <SessionActionsMenu mode={mode} session={session} onBack={onBack} onOpenSheet={onOpenSheet} labels={copy} />',
        "player session menu mount"
      );

      return { code, map: null };
    },
  };
}
