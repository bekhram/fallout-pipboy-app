function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`[pip2d20 player battlemap] Could not apply ${label}`);
  return source.replace(search, replacement);
}

export function pip2d20PlayerBattlemapControlsPlugin() {
  return {
    name: "pip2d20-player-battlemap-controls",
    enforce: "pre",
    transform(source, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];

      if (normalized.endsWith("/src/components/gm/BattlemapViewportControls.jsx")) {
        let code = source;
        code = replaceRequired(
          code,
          `  const [zoom, setZoom] = useState(() => readZoom(role));`,
          `  const [zoom, setZoom] = useState(() => readZoom(role));\n  const [controlsCollapsed, setControlsCollapsed] = useState(() => {\n    try { return localStorage.getItem(\`pip2d20_battlemap_controls_collapsed_\${role}\`) === "1"; } catch { return false; }\n  });`,
          "zoom collapsed state"
        );

        code = replaceRequired(
          code,
          `    <div className="battlemap-view-controls" aria-label={text.zoomControls}>`,
          `    <div className={\`battlemap-view-controls\${role === "player" ? " is-player-controls" : ""}\${controlsCollapsed ? " is-collapsed" : ""}\`} aria-label={text.zoomControls}>\n      <button\n        type="button"\n        className="battlemap-collapse-btn"\n        onClick={() => setControlsCollapsed((value) => {\n          const next = !value;\n          try { localStorage.setItem(\`pip2d20_battlemap_controls_collapsed_\${role}\`, next ? "1" : "0"); } catch {}\n          return next;\n        })}\n        aria-label={controlsCollapsed ? "Show zoom controls" : "Hide zoom controls"}\n        title={controlsCollapsed ? "Show zoom" : "Hide zoom"}\n      >\n        {controlsCollapsed ? "Z+" : "Z−"}\n      </button>\n      {!controlsCollapsed ? <>`,
          "zoom collapse toggle"
        );

        code = replaceRequired(
          code,
          `      </button>\n    </div>,\n    targets.container\n  );`,
          `      </button>\n      </> : null}\n    </div>,\n    role === "player" && typeof document !== "undefined" ? document.body : targets.container\n  );`,
          "zoom collapse body and player root portal"
        );
        return { code, map: null };
      }

      if (normalized.endsWith("/src/components/session/SessionTacticalMapV3.jsx")) {
        let code = source;
        code = replaceRequired(
          code,
          `import "../gm/gmTokenStatusLayer.css";`,
          `import "../gm/gmTokenStatusLayer.css";\nimport "./playerBattlemapQuickControls.css";`,
          "quick controls styles"
        );

        code = replaceRequired(
          code,
          `  const [error,setError]=useState("");`,
          `  const [error,setError]=useState("");\n  const [toolsCollapsed,setToolsCollapsed]=useState(()=>{try{return localStorage.getItem("pip2d20_player_tools_collapsed")==="1";}catch{return false;}});`,
          "tools collapsed state"
        );

        code = replaceRequired(
          code,
          `  </section><TacticalSessionHud session={session}/>`,
          `  </section>\n    {typeof document!=="undefined"?createPortal(<>\n      <div className={\`player-battlemap-tools\${toolsCollapsed ? " is-collapsed" : ""}\`} aria-label="Battlemap tools">\n        <button type="button" className="player-battlemap-tools__toggle" onClick={()=>setToolsCollapsed((value)=>{const next=!value;try{localStorage.setItem("pip2d20_player_tools_collapsed",next?"1":"0");}catch{}return next;})}>{toolsCollapsed?"TOOLS":"×"}</button>\n        {!toolsCollapsed ? <div className="player-battlemap-tools__body">\n          <strong>TOOLS</strong>\n          <button type="button" className="pip-btn" onClick={()=>document.querySelector(".battlemap-focus-btn")?.click()}>◎ TOKEN</button>\n          <button type="button" className="pip-btn" onClick={()=>document.querySelector(".battlemap-fit-btn")?.click()}>FIT</button>\n          <button type="button" className="pip-btn" onClick={()=>setSelectedTokenId(ownedTokens[0]?.id||"")} disabled={!ownedTokens.length}>MOVE</button>\n        </div> : null}\n      </div>\n      <div className="player-battlemap-quick-actions" aria-label="Player battlemap quick actions">\n        <button type="button" className="player-battlemap-quick-btn is-chat" onClick={() => document.querySelector(".session-utility-drawer-toggle")?.click()} aria-label="Open session chat">CHAT</button>\n        <button type="button" className="player-battlemap-quick-btn is-dice" onClick={() => document.querySelector(".floating-dice-button")?.click()} aria-label="Open dice roller">D20</button>\n      </div>\n    </>,document.body):null}\n    <TacticalSessionHud session={session}/>`,
          "root-portaled player tools chat and dice"
        );
        return { code, map: null };
      }

      return null;
    },
  };
}
