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

      if (normalized.endsWith("/src/components/gm/GmBattlemapTools.jsx")) {
        let code = source;
        code = replaceRequired(
          code,
          `function readOpen() {\n  try { return localStorage.getItem(STORAGE_KEY) !== "0"; } catch { return true; }\n}`,
          `function readOpen(role = "gm") {\n  const key = role === "player" ? "pip2d20_player_tools_open_v1" : STORAGE_KEY;\n  try { return localStorage.getItem(key) !== "0"; } catch { return true; }\n}`,
          "role-aware tools storage"
        );
        code = replaceRequired(
          code,
          `export default function GmBattlemapTools({ session }) {`,
          `export default function GmBattlemapTools({ session, role = "gm" }) {`,
          "role-aware tools signature"
        );
        code = replaceRequired(
          code,
          `  const [open, setOpen] = useState(readOpen);`,
          `  const [open, setOpen] = useState(() => readOpen(role));`,
          "role-aware open state"
        );
        code = replaceRequired(
          code,
          `  const [ruler, setRuler] = useState(null);`,
          `  const [ruler, setRuler] = useState(null);\n  const [localMarkup, setLocalMarkup] = useState({ strokes: [], ping: null });`,
          "local player markup"
        );
        code = replaceRequired(
          code,
          `      const nextContainer = document.querySelector(".gm-tactical-map-core .gm-session-map.tactical-map");\n      const nextGrid = document.querySelector(".gm-tactical-map-core .gm-session-map__grid.tactical-grid");`,
          `      const nextContainer = document.querySelector(role === "player" ? ".session-tactical-player" : ".gm-tactical-map-core .gm-session-map.tactical-map");\n      const nextGrid = document.querySelector(role === "player" ? ".session-tactical-player .gm-session-map__grid.tactical-grid" : ".gm-tactical-map-core .gm-session-map__grid.tactical-grid");`,
          "player tools selectors"
        );
        code = replaceRequired(
          code,
          `  }, [scene?.sceneId]);`,
          `  }, [scene?.sceneId, role]);`,
          "tools role dependency"
        );
        code = replaceRequired(
          code,
          `  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, open ? "1" : "0"); } catch {} }, [open]);`,
          `  useEffect(() => {\n    const key = role === "player" ? "pip2d20_player_tools_open_v1" : STORAGE_KEY;\n    try { localStorage.setItem(key, open ? "1" : "0"); } catch {}\n  }, [open, role]);`,
          "role-aware tools persistence"
        );
        code = replaceRequired(
          code,
          `  const markup = scene?.mapMarkup && typeof scene.mapMarkup === "object" ? scene.mapMarkup : {};\n  const strokes = Array.isArray(markup.strokes) ? markup.strokes : [];\n  const saveMarkup = (patch) => session?.updateTacticalScene?.({ mapMarkup: { ...markup, ...patch } });`,
          `  const sharedMarkup = scene?.mapMarkup && typeof scene.mapMarkup === "object" ? scene.mapMarkup : {};\n  const markup = role === "player" ? localMarkup : sharedMarkup;\n  const strokes = Array.isArray(markup.strokes) ? markup.strokes : [];\n  const saveMarkup = (patch) => {\n    if (role === "player") {\n      setLocalMarkup((current) => ({ ...current, ...patch }));\n      return;\n    }\n    session?.updateTacticalScene?.({ mapMarkup: { ...markup, ...patch } });\n  };`,
          "local-only player drawing"
        );
        code = replaceRequired(
          code,
          `    <div className={\`battlemap-tools-drawer\${open ? " is-open" : ""}\`}>`,
          `    <div className={\`battlemap-tools-drawer\${role === "player" ? " is-player-tools" : ""}\${open ? " is-open" : ""}\`}>`,
          "player tools class"
        );
        code = replaceRequired(
          code,
          `    container\n  );\n\n  const overlay = createPortal(`,
          `    role === "player" && typeof document !== "undefined" ? document.body : container\n  );\n\n  const overlay = createPortal(`,
          "player tools body portal"
        );
        return { code, map: null };
      }

      if (normalized.endsWith("/src/components/session/SessionTacticalMapV3.jsx")) {
        let code = source;
        code = replaceRequired(
          code,
          `import TacticalSessionHud from "./TacticalSessionHud.jsx";`,
          `import TacticalSessionHud from "./TacticalSessionHud.jsx";\nimport GmBattlemapTools from "../gm/GmBattlemapTools.jsx";`,
          "shared GM tools import"
        );
        code = replaceRequired(
          code,
          `import "../gm/gmTokenStatusLayer.css";`,
          `import "../gm/gmTokenStatusLayer.css";\nimport "./playerBattlemapQuickControls.css";`,
          "quick controls styles"
        );

        code = replaceRequired(
          code,
          `  const previousSceneActiveRef=useRef(Boolean(scene?.active));`,
          `  const previousSceneActiveRef=useRef(Boolean(scene?.active));\n\n  useEffect(()=>{\n    if(typeof window==="undefined")return undefined;\n    const hardResetDrag=()=>{\n      const drag=dragRef.current;\n      if(drag){try{drag.captureTarget?.releasePointerCapture?.(drag.pointerId);}catch{}}\n      dragRef.current=null;\n      setDragState(null);\n    };\n    const onPointerUp=(event)=>{\n      window.requestAnimationFrame?.(()=>{\n        const drag=dragRef.current;\n        if(drag&&Number(drag.pointerId)===Number(event.pointerId))hardResetDrag();\n      });\n    };\n    const onVisibility=()=>{if(document.visibilityState!=="visible")hardResetDrag();};\n    window.addEventListener("pointerup",onPointerUp,true);\n    window.addEventListener("pointercancel",hardResetDrag,true);\n    window.addEventListener("touchcancel",hardResetDrag,true);\n    window.addEventListener("blur",hardResetDrag,true);\n    document.addEventListener("visibilitychange",onVisibility);\n    return()=>{\n      window.removeEventListener("pointerup",onPointerUp,true);\n      window.removeEventListener("pointercancel",hardResetDrag,true);\n      window.removeEventListener("touchcancel",hardResetDrag,true);\n      window.removeEventListener("blur",hardResetDrag,true);\n      document.removeEventListener("visibilitychange",onVisibility);\n      hardResetDrag();\n    };\n  },[]);`,
          "hard drag reset"
        );

        code = replaceRequired(
          code,
          `  </section><TacticalSessionHud session={session}/>`,
          `  </section>\n    <GmBattlemapTools session={session} role="player" />\n    {typeof document!=="undefined"?createPortal(\n      <div className="player-battlemap-quick-actions" aria-label="Player battlemap quick actions">\n        <button type="button" className="player-battlemap-quick-btn is-chat" onClick={() => {\n          const buttons=[...document.querySelectorAll(".session-utility-drawer-toggle")];\n          const target=buttons.find((button)=>button.offsetParent!==null&&!button.disabled)||buttons[buttons.length-1];\n          target?.click();\n        }} aria-label="Open session chat">CHAT</button>\n        <button type="button" className="player-battlemap-quick-btn is-dice" onClick={() => {\n          const buttons=[...document.querySelectorAll(".floating-dice-button")];\n          const target=buttons.find((button)=>button.offsetParent!==null&&!button.disabled)||buttons[buttons.length-1];\n          target?.click();\n        }} aria-label="Open dice roller">D20</button>\n      </div>,document.body):null}\n    <TacticalSessionHud session={session}/>`,
          "shared tools and robust quick actions"
        );
        return { code, map: null };
      }

      return null;
    },
  };
}
