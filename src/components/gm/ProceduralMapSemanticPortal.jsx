import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ProceduralMapSemanticLayer from "./ProceduralMapSemanticLayer.jsx";

export default function ProceduralMapSemanticPortal({ scene }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const find = () => setTarget(document.querySelector(".gm-tactical-map-core .gm-session-map__grid"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene?.sceneId]);

  if (!target || !scene?.environment?.proceduralMap) return null;
  return createPortal(<ProceduralMapSemanticLayer scene={scene} />, target);
}
