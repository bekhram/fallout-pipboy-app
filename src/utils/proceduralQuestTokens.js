function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function centerFromBounds(bounds) {
  if (!bounds || typeof bounds !== "object") return null;
  const x = finite(bounds.x ?? bounds.left);
  const y = finite(bounds.y ?? bounds.top);
  const width = finite(bounds.w ?? bounds.width);
  const height = finite(bounds.h ?? bounds.height);
  if (x === null || y === null) return null;
  return {
    x: x + Math.max(0, width ?? 1) / 2,
    y: y + Math.max(0, height ?? 1) / 2,
  };
}

function anchorForArea(area) {
  const marker = area?.numberedMarker;
  const markerX = finite(marker?.x);
  const markerY = finite(marker?.y);
  if (markerX !== null && markerY !== null) {
    return { x: markerX, y: markerY, areaId: String(area?.id || ""), markerId: String(marker?.id || marker?.roomId || "") };
  }

  const positionX = finite(area?.position?.x);
  const positionY = finite(area?.position?.y);
  if (positionX !== null && positionY !== null) {
    return { x: positionX, y: positionY, areaId: String(area?.id || ""), markerId: "" };
  }

  const center = centerFromBounds(area?.bounds);
  if (center) return { ...center, areaId: String(area?.id || ""), markerId: "" };
  return null;
}

function fallbackAnchors(scene = {}) {
  const cols = Math.max(4, Number(scene?.cols || 24));
  const rows = Math.max(4, Number(scene?.rows || 24));
  return [
    { x: cols * 0.5, y: rows * 0.35, areaId: "", markerId: "" },
    { x: cols * 0.7, y: rows * 0.5, areaId: "", markerId: "" },
    { x: cols * 0.35, y: rows * 0.6, areaId: "", markerId: "" },
    { x: cols * 0.55, y: rows * 0.75, areaId: "", markerId: "" },
  ];
}

function activeObjectives(quest = {}) {
  const all = Array.isArray(quest?.objectives) ? quest.objectives : [];
  const primaryIds = new Set(Array.isArray(quest?.primaryObjectiveIds) ? quest.primaryObjectiveIds : []);
  const active = all.filter((objective) => objective && objective.optional !== true && String(objective.status || "active") !== "completed");
  return active
    .sort((a, b) => Number(primaryIds.has(b.id)) - Number(primaryIds.has(a.id)))
    .slice(0, 4);
}

export function generateProceduralQuestTokens({ quest = null, areas = [], scene = {} } = {}) {
  if (!quest?.id) return [];
  const objectives = activeObjectives(quest);
  if (!objectives.length) return [];

  const anchors = (Array.isArray(areas) ? areas : []).map(anchorForArea).filter(Boolean);
  const usableAnchors = anchors.length ? anchors : fallbackAnchors(scene);
  const primaryIds = new Set(Array.isArray(quest?.primaryObjectiveIds) ? quest.primaryObjectiveIds : []);

  return objectives.map((objective, index) => {
    const anchor = usableAnchors[index % usableAnchors.length];
    return {
      id: `quest-token:${quest.id}:${objective.id || index}`,
      type: "quest",
      questId: String(quest.id),
      objectiveId: String(objective.id || `objective-${index + 1}`),
      objectiveType: String(objective.type || quest.primaryType || "quest"),
      label: String(objective.description || quest.title || "Quest objective"),
      status: String(objective.status || "active"),
      primary: primaryIds.has(objective.id) || index === 0,
      x: Number(anchor.x),
      y: Number(anchor.y),
      areaId: anchor.areaId || "",
      markerId: anchor.markerId || "",
      color: "orange",
    };
  });
}
