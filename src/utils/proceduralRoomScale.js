const TYPE_SEQUENCES = {
  wasteland: ["ruins", "wreck", "camp"],
  red_rocket: ["store", "garage", "office", "storage", "wc"],
  super_duper_mart: ["sales", "storage", "office"],
  raider_camp: ["courtyard", "barrack", "boss", "storage", "workshop"],
  military_bunker: ["control", "armory", "barracks", "medical", "storage", "generator"],
};

export const PROCEDURAL_GRID_PRESETS = [8, 12, 18, 24, 30, 42, 54, 66];

const TARGET_ROOM_COUNTS = [
  [8, 4],
  [12, 6],
  [18, 9],
  [24, 12],
  [30, 16],
  [42, 24],
  [54, 32],
  [66, 40],
];

const BASE_LABELS = {
  ruins: "RUINS",
  wreck: "WRECK",
  camp: "CAMP",
  store: "STORE",
  garage: "GARAGE",
  office: "OFFICE",
  storage: "STORAGE",
  wc: "WC",
  sales: "SALES",
  courtyard: "COURTYARD",
  barrack: "BARRACKS",
  boss: "BOSS",
  workshop: "WORKSHOP",
  control: "CONTROL",
  armory: "ARMORY",
  barracks: "BARRACKS",
  medical: "MEDICAL",
  generator: "GENERATOR",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function typeSequence(type) {
  return TYPE_SEQUENCES[type] || TYPE_SEQUENCES.wasteland;
}

export function proceduralRoomTargetCount(spec = {}) {
  const size = Math.max(Number(spec.cols) || 12, Number(spec.rows) || 12);
  for (const [maxSize, roomCount] of TARGET_ROOM_COUNTS) {
    if (size <= maxSize) return roomCount;
  }
  return TARGET_ROOM_COUNTS[TARGET_ROOM_COUNTS.length - 1][1];
}

export function buildProceduralRoomBlueprints(spec = {}) {
  const count = proceduralRoomTargetCount(spec);
  const sequence = typeSequence(String(spec.type || "wasteland"));
  const occurrences = new Map();
  const result = [];

  for (let index = 0; index < count; index += 1) {
    const baseRoomId = sequence[index % sequence.length];
    const instance = (occurrences.get(baseRoomId) || 0) + 1;
    occurrences.set(baseRoomId, instance);
    result.push({
      id: instance === 1 ? baseRoomId : `${baseRoomId}__${instance}`,
      baseRoomId,
      instance,
      sourceSet: Math.floor(index / sequence.length),
      slot: index,
      label: `${BASE_LABELS[baseRoomId] || baseRoomId.toUpperCase()}${instance > 1 ? ` ${instance}` : ""}`,
    });
  }

  return result;
}

function chooseMatrix(count, cols, rows) {
  const ratio = Math.max(0.25, cols / Math.max(1, rows));
  let best = null;
  for (let gridCols = 1; gridCols <= count; gridCols += 1) {
    const gridRows = Math.ceil(count / gridCols);
    const cellRatio = gridCols / Math.max(1, gridRows);
    const score = Math.abs(Math.log(Math.max(0.01, cellRatio / ratio))) + Math.abs(gridCols * gridRows - count) * 0.035;
    if (!best || score < best.score) best = { gridCols, gridRows, score };
  }
  return best || { gridCols: 1, gridRows: count };
}

function splitSpan(total, parts, gap) {
  const usable = Math.max(parts, total - gap * Math.max(0, parts - 1));
  const base = Math.max(1, Math.floor(usable / parts));
  let remainder = Math.max(0, usable - base * parts);
  const result = [];
  let cursor = 0;
  for (let index = 0; index < parts; index += 1) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    result.push({ start: cursor, size });
    cursor += size + gap;
  }
  return result;
}

export function buildProceduralRoomLayout(spec = {}) {
  const cols = clamp(spec.cols || 12, 6, 66);
  const rows = clamp(spec.rows || 12, 6, 66);
  const blueprints = buildProceduralRoomBlueprints({ ...spec, cols, rows });
  const count = blueprints.length;
  const margin = cols <= 8 || rows <= 8 ? 1 : 1;
  const gap = 1;
  const innerCols = Math.max(2, cols - margin * 2);
  const innerRows = Math.max(2, rows - margin * 2);
  const matrix = chooseMatrix(count, innerCols, innerRows);
  const xParts = splitSpan(innerCols, matrix.gridCols, gap);
  const yParts = splitSpan(innerRows, matrix.gridRows, gap);

  return blueprints.map((blueprint, index) => {
    const row = Math.floor(index / matrix.gridCols);
    const col = index % matrix.gridCols;
    const xPart = xParts[col];
    const yPart = yParts[row];
    return {
      ...blueprint,
      x: margin + (xPart?.start || 0),
      y: margin + (yPart?.start || 0),
      w: Math.max(1, xPart?.size || 1),
      h: Math.max(1, yPart?.size || 1),
      gridCol: col,
      gridRow: row,
      matrixCols: matrix.gridCols,
      matrixRows: matrix.gridRows,
    };
  });
}

export function proceduralRoomLabel(baseRoomId, instance = 1) {
  const base = BASE_LABELS[baseRoomId] || String(baseRoomId || "ROOM").toUpperCase();
  return `${base}${Number(instance) > 1 ? ` ${instance}` : ""}`;
}
