import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ProceduralMapSemanticLayer from "../gm/ProceduralMapSemanticLayer.jsx";

export default function PlayerProceduralMapSemanticPortal({ scene }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const find = () => setTarget(document.querySelector(".session-tactical-player .gm-session-map__grid"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene?.sceneId, scene?.active]);

  const proceduralActive = String(scene?.backgroundName || "").startsWith("PROC //");
  if (!target || !proceduralActive || !scene?.environment?.proceduralMap) return null;
  return createPortal(<ProceduralMapSemanticLayer scene={scene} readOnly />, target);
}
