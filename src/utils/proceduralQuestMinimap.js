const QUEST_COLOR = "#ff9800";

const SYMBOLS = {
  holdout: "!",
  rescue: "!",
  escort: "→",
  elimination: "×",
  hunt: "◎",
  investigation: "?",
  search: "?",
  repair: "⚙",
  defense: "◆",
  infiltration: "↘",
  sabotage: "!",
  escape: "→",
  discover: "?",
  optional: "·",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function centerOfBounds(bounds) {
  if (!bounds || typeof bounds !== "object") return null;
  const x = Number(bounds.x ?? bounds.left);
  const y = Number(bounds.y ?? bounds.top);
  const width = Number(bounds.width ?? bounds.w ?? 0);
  const height = Number(bounds.height ?? bounds.h ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: x + (Number.isFinite(width) ? width / 2 : 0),
    y: y + (Number.isFinite(height) ? height / 2 : 0),
  };
}

function markerAnchor(marker) {
  if (!marker || typeof marker !== "object") return null;
  if (Number.isFinite(Number(marker.x)) && Number.isFinite(Number(marker.y))) {
    return { x: Number(marker.x), y: Number(marker.y), markerId: String(marker.id || marker.roomId || marker.number || "") };
  }
  const centered = centerOfBounds(marker.bounds);
  return centered ? { ...centered, markerId: String(marker.id || marker.roomId || marker.number || "") } : null;
}

function areaAnchor(area) {
  if (!area || typeof area !== "object") return null;
  const numbered = markerAnchor(area.numberedMarker);
  if (numbered) return { ...numbered, areaId: String(area.id || "") };
  if (Number.isFinite(Number(area.position?.x)) && Number.isFinite(Number(area.position?.y))) {
    return { x: Number(area.position.x), y: Number(area.position.y), areaId: String(area.id || "") };
  }
  const centered = centerOfBounds(area.bounds);
  return centered ? { ...centered, areaId: String(area.id || "") } : null;
}

function uniqueAnchors(encounterContext = {}) {
  const seen = new Set();
  const result = [];
  const add = (anchor) => {
    if (!anchor || !Number.isFinite(Number(anchor.x)) || !Number.isFinite(Number(anchor.y))) return;
    const key = `${Math.round(Number(anchor.x) * 10)}:${Math.round(Number(anchor.y) * 10)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(anchor);
  };

  (encounterContext.markers || []).forEach((marker) => add(markerAnchor(marker)));
  (encounterContext.areas || []).forEach((area) => add(areaAnchor(area)));
  return result;
}

function hash(value) {
  let h = 2166136261;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeToScene(anchor, scene = {}) {
  const cols = Math.max(1, Number(scene.cols || 24));
  const rows = Math.max(1, Number(scene.rows || 24));
  const sourceCols = 24;
  const sourceRows = 24;
  return {
    x: clamp((Number(anchor.x) / sourceCols) * cols, 0, Math.max(0, cols - 1)),
    y: clamp((Number(anchor.y) / sourceRows) * rows, 0, Math.max(0, rows - 1)),
  };
}

function visibleObjectives(quest = {}) {
  const optionalIds = new Set(Array.isArray(quest.optionalObjectiveIds) ? quest.optionalObjectiveIds : []);
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [];
  const primaryIds = new Set(Array.isArray(quest.primaryObjectiveIds) ? quest.primaryObjectiveIds : []);

  const main = objectives.filter((objective) => !objective?.optional && !optionalIds.has(objective?.id));
  if (!main.length) return [];

  const prioritized = [...main].sort((a, b) => {
    const aPrimary = primaryIds.has(a?.id) ? 0 : 1;
    const bPrimary = primaryIds.has(b?.id) ? 0 : 1;
    return aPrimary - bPrimary;
  });

  // Keep the first stage compact: a maximum of four orange quest markers.
  return prioritized.slice(0, 4);
}

export function generateQuestMinimapTokens({ quest = null, encounterContext = {}, scene = {} } = {}) {
  if (!quest?.id) return [];
  const objectives = visibleObjectives(quest);
  if (!objectives.length) return [];

  const anchors = uniqueAnchors(encounterContext);
  const fallback = {
    x: Math.max(0, Number(scene.cols || 24) / 2),
    y: Math.max(0, Number(scene.rows || 24) / 2),
  };

  return objectives.map((objective, index) => {
    const anchor = anchors.length
      ? anchors[(hash(`${quest.id}:${objective.id}`) + index) % anchors.length]
      : null;
    const position = anchor ? normalizeToScene(anchor, scene) : fallback;
    const objectiveType = String(objective?.type || quest.primaryType || "quest");

    return {
      id: `quest-token-${quest.id}-${objective.id || index + 1}`,
      kind: "quest",
      type: "quest",
      questId: String(quest.id),
      objectiveId: String(objective?.id || `objective-${index + 1}`),
      objectiveType,
      label: String(objective?.description || quest.title || "Quest objective"),
      title: String(quest.title || "Quest"),
      status: String(objective?.status || "active"),
      primary: Array.isArray(quest.primaryObjectiveIds) && quest.primaryObjectiveIds.includes(objective?.id),
      color: QUEST_COLOR,
      symbol: SYMBOLS[objectiveType] || SYMBOLS[quest.primaryType] || "!",
      x: position.x,
      y: position.y,
      linkedAreaId: String(anchor?.areaId || ""),
      linkedMarkerId: String(anchor?.markerId || ""),
    };
  });
}

export function questTokenColor() {
  return QUEST_COLOR;
}
