import React, { useEffect } from "react";
import SessionTacticalMapV3 from "./SessionTacticalMapV3.jsx";
import wastelandBg from "../../assets/wasteland/backgrounds/wasteland-bg-1.png";
import swampBg from "../../assets/wasteland/backgrounds/wasteland-swamp-bg-1.png";
import urbanRuinsBg from "../../assets/wasteland/backgrounds/wasteland-urban-ruins-bg-1.png";
import car1 from "../../assets/wasteland/objects/car-1.png";
import car2 from "../../assets/wasteland/objects/car-2.png";
import car3 from "../../assets/wasteland/objects/car-3.png";
import cliff1 from "../../assets/wasteland/objects/cliff-1.png";
import cliff2 from "../../assets/wasteland/objects/cliff-2.png";
import cliff3 from "../../assets/wasteland/objects/cliff-3.png";
import crater1 from "../../assets/wasteland/objects/crater-1.png";
import crater2 from "../../assets/wasteland/objects/crater-2.png";
import crater3 from "../../assets/wasteland/objects/crater-3.png";
import deadTree1 from "../../assets/wasteland/objects/dead-tree-1.png";
import deadTree2 from "../../assets/wasteland/objects/dead-tree-2.png";
import hills1 from "../../assets/wasteland/objects/hills-1.png";
import lake1 from "../../assets/wasteland/objects/lake-1.png";
import ravine1 from "../../assets/wasteland/objects/ravine-1.png";
import rocks1 from "../../assets/wasteland/objects/rocks-1.png";
import rocks2 from "../../assets/wasteland/objects/rocks-2.png";
import rocks3 from "../../assets/wasteland/objects/rocks-3.png";
import ruins1 from "../../assets/wasteland/objects/ruins-1.png";
import swamp1 from "../../assets/wasteland/objects/swamp-1.png";
import truck1 from "../../assets/wasteland/objects/truck-1.png";
import truck2 from "../../assets/wasteland/objects/truck-2.png";
import truck3 from "../../assets/wasteland/objects/truck-3.png";
import "../gm/tacticalFootprint3.css";

const IMAGE_CACHE = new Map();
const COMMON_ROCKS = [rocks1, rocks2, rocks3];

function preloadImage(src, priority = "low") {
  if (!src || typeof Image === "undefined" || IMAGE_CACHE.has(src)) return;
  const image = new Image();
  image.decoding = "async";
  try { image.fetchPriority = priority; } catch { /* older browsers */ }
  image.src = src;
  IMAGE_CACHE.set(src, image);
  image.decode?.().catch(() => {});
}

function imageSetForTerrain(terrain) {
  switch (terrain) {
    case "forest":
      return [deadTree1, deadTree2, ...COMMON_ROCKS, cliff1, hills1];
    case "swamp":
      return [swamp1, lake1, deadTree1, deadTree2, ...COMMON_ROCKS, ravine1];
    case "ruins":
      return [ruins1, car1, car2, car3, truck1, truck2, truck3, ...COMMON_ROCKS, crater1];
    default:
      return [
        ...COMMON_ROCKS,
        cliff1, cliff2, cliff3,
        crater1, crater2, crater3,
        deadTree1, deadTree2,
        car1, car2, car3,
        truck1, truck2, truck3,
        ruins1, ravine1, hills1,
      ];
  }
}

function backgroundForTerrain(terrain) {
  if (terrain === "swamp") return swampBg;
  if (terrain === "ruins") return urbanRuinsBg;
  return wastelandBg;
}

export default function SessionTacticalMapV4(props) {
  const scene = props?.session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const terrain = String(spec?.terrain || scene?.environment?.terrain || "wasteland").toLowerCase();
  const isWasteland = String(spec?.type || scene?.environment?.locationType || "").toLowerCase() === "wasteland";

  useEffect(() => {
    if (!scene?.active || !isWasteland) return undefined;

    preloadImage(backgroundForTerrain(terrain), "high");
    if (scene.backgroundUrl) preloadImage(scene.backgroundUrl, "high");

    const preloadDecor = () => imageSetForTerrain(terrain).forEach((src) => preloadImage(src, "low"));
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preloadDecor, { timeout: 700 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(preloadDecor, 120);
    return () => window.clearTimeout(timer);
  }, [scene?.active, scene?.sceneId, scene?.backgroundUrl, isWasteland, terrain]);

  return <SessionTacticalMapV3 {...props} />;
}
