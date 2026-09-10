const TYPE_SEQUENCES = {
  wasteland: ["ruins", "wreck", "camp"],
  red_rocket: ["garage", "sales", "office", "security", "storage", "coffee_area"],
  super_duper_mart: ["sales", "wc", "office", "storage", "break_room", "janitor", "security"],
  raider_camp: ["courtyard", "barrack", "boss", "storage", "workshop"],
  military_bunker: ["control", "armory", "barracks", "medical", "storage", "generator"],
};

export const PROCEDURAL_GRID_PRESETS = [8, 12, 18, 24, 30, 42, 54, 66];

const TARGET_ROOM_COUNTS = [
  [8, 4], [12, 6], [18, 9], [24, 12], [30, 16], [42, 24], [54, 32], [66, 40],
];

const COMMERCIAL_INTERIOR_COUNTS = [
  [8, 3], [12, 4], [18, 5], [24, 6], [66, 6],
];

const OUTSKIRT_HOUSE_COUNTS = [
  [12, 0], [18, 1], [24, 2], [30, 3], [42, 5], [54, 7], [66, 9],
];

const BASE_LABELS = {
  ruins: "RUINS", wreck: "WRECK", camp: "CAMP",
  store: "STORE", garage: "GARAGE", office: "OFFICE", storage: "STORAGE", wc: "WC", sales: "SALES FLOOR",
  security: "SECURITY", break_room: "BREAK ROOM", janitor: "JANITOR", coffee_area: "COFFEE AREA",
  house: "HOUSE",
  courtyard: "COURTYARD", barrack: "BARRACKS", boss: "BOSS", workshop: "WORKSHOP",
  control: "CONTROL", armory: "ARMORY", barracks: "BARRACKS", medical: "MEDICAL", generator: "GENERATOR",
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function hashSeed(value) { const text = String(value ?? "0"); let hash = 2166136261; for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function typeSequence(type) { return TYPE_SEQUENCES[type] || TYPE_SEQUENCES.wasteland; }
function tierValue(size, table) { for (const [maxSize, value] of table) if (size <= maxSize) return value; return table[table.length - 1][1]; }
function isCommercial(type) { return type === "red_rocket" || type === "super_duper_mart"; }

export function proceduralRoomTargetCount(spec = {}) {
  const size = Math.max(Number(spec.cols) || 12, Number(spec.rows) || 12);
  const type = String(spec.type || "wasteland");
  if (isCommercial(type)) return tierValue(size, COMMERCIAL_INTERIOR_COUNTS) + tierValue(size, OUTSKIRT_HOUSE_COUNTS);
  return tierValue(size, TARGET_ROOM_COUNTS);
}

function commercialBlueprints(spec = {}) {
  const type = String(spec.type || "red_rocket");
  const size = Math.max(Number(spec.cols) || 12, Number(spec.rows) || 12);
  const sequence = typeSequence(type);
  const interiorCount = tierValue(size, COMMERCIAL_INTERIOR_COUNTS);
  const houseCount = tierValue(size, OUTSKIRT_HOUSE_COUNTS);
  const offset = hashSeed(`${spec.seed || "1"}:${type}:interior-choice`) % sequence.length;
  const interiors = [];
  for (let i = 0; i < interiorCount; i += 1) {
    const baseRoomId = sequence[(offset + i) % sequence.length];
    interiors.push({ id: baseRoomId, baseRoomId, instance: 1, sourceSet: 0, slot: i, zone: "main", label: BASE_LABELS[baseRoomId] || baseRoomId.toUpperCase() });
  }
  const houses = Array.from({ length: houseCount }, (_, index) => ({
    id: `house__${index + 1}`,
    baseRoomId: "house",
    instance: index + 1,
    sourceSet: index,
    slot: interiorCount + index,
    zone: "outskirts",
    label: `${BASE_LABELS.house} ${index + 1}`,
  }));
  return [...interiors, ...houses];
}

export function buildProceduralRoomBlueprints(spec = {}) {
  const type = String(spec.type || "wasteland");
  if (isCommercial(type)) return commercialBlueprints(spec);
  const count = proceduralRoomTargetCount(spec);
  const sequence = typeSequence(type);
  const occurrences = new Map();
  const result = [];
  for (let index = 0; index < count; index += 1) {
    const baseRoomId = sequence[index % sequence.length];
    const instance = (occurrences.get(baseRoomId) || 0) + 1;
    occurrences.set(baseRoomId, instance);
    result.push({ id: instance === 1 ? baseRoomId : `${baseRoomId}__${instance}`, baseRoomId, instance, sourceSet: Math.floor(index / sequence.length), slot: index, zone: "main", label: `${BASE_LABELS[baseRoomId] || baseRoomId.toUpperCase()}${instance > 1 ? ` ${instance}` : ""}` });
  }
  return result;
}

function chooseMatrix(count, cols, rows) {
  const ratio = Math.max(0.25, cols / Math.max(1, rows)); let best = null;
  for (let gridCols = 1; gridCols <= count; gridCols += 1) {
    const gridRows = Math.ceil(count / gridCols); const cellRatio = gridCols / Math.max(1, gridRows);
    const score = Math.abs(Math.log(Math.max(0.01, cellRatio / ratio))) + Math.abs(gridCols * gridRows - count) * 0.035;
    if (!best || score < best.score) best = { gridCols, gridRows, score };
  }
  return best || { gridCols: 1, gridRows: count };
}

function splitSpan(total, parts, gap) {
  const usable = Math.max(parts, total - gap * Math.max(0, parts - 1)); const base = Math.max(1, Math.floor(usable / parts)); let remainder = Math.max(0, usable - base * parts); const result = []; let cursor = 0;
  for (let index = 0; index < parts; index += 1) { const size = base + (remainder > 0 ? 1 : 0); if (remainder > 0) remainder -= 1; result.push({ start: cursor, size }); cursor += size + gap; }
  return result;
}

function matrixLayout(blueprints, bounds) {
  const { x, y, w, h } = bounds; const gap = 1; const matrix = chooseMatrix(blueprints.length, w, h); const xParts = splitSpan(w, matrix.gridCols, gap); const yParts = splitSpan(h, matrix.gridRows, gap);
  return blueprints.map((blueprint, index) => { const row = Math.floor(index / matrix.gridCols); const col = index % matrix.gridCols; const xp = xParts[col]; const yp = yParts[row]; return { ...blueprint, x: x + (xp?.start || 0), y: y + (yp?.start || 0), w: Math.max(1, xp?.size || 1), h: Math.max(1, yp?.size || 1), gridCol: col, gridRow: row, matrixCols: matrix.gridCols, matrixRows: matrix.gridRows }; });
}

function commercialLayout(spec, blueprints, cols, rows) {
  const interiors = blueprints.filter((item) => item.zone !== "outskirts");
  const houses = blueprints.filter((item) => item.zone === "outskirts");
  if (Math.max(cols, rows) <= 12 || !houses.length) return matrixLayout(interiors, { x: 1, y: 1, w: Math.max(2, cols - 2), h: Math.max(2, rows - 2) });

  const coreW = clamp(Math.round(cols * 0.5), 8, Math.max(8, cols - 8));
  const coreH = clamp(Math.round(rows * 0.46), 7, Math.max(7, rows - 8));
  const coreX = Math.floor((cols - coreW) / 2);
  const coreY = Math.floor((rows - coreH) / 2);
  const result = matrixLayout(interiors, { x: coreX, y: coreY, w: coreW, h: coreH });

  const houseSize = clamp(Math.floor(Math.min(cols, rows) / 10), 2, 4);
  const slots = [
    [1, 1], [Math.max(1, cols - houseSize - 1), 1], [1, Math.max(1, rows - houseSize - 1)], [Math.max(1, cols - houseSize - 1), Math.max(1, rows - houseSize - 1)],
    [Math.floor(cols / 2 - houseSize / 2), 1], [Math.floor(cols / 2 - houseSize / 2), Math.max(1, rows - houseSize - 1)],
    [1, Math.floor(rows / 2 - houseSize / 2)], [Math.max(1, cols - houseSize - 1), Math.floor(rows / 2 - houseSize / 2)],
    [Math.max(1, Math.floor(cols * 0.2)), Math.max(1, rows - houseSize - 1)],
  ];
  houses.forEach((house, index) => { const [x, y] = slots[index % slots.length]; result.push({ ...house, x, y, w: houseSize, h: houseSize, gridCol: -1, gridRow: -1, matrixCols: 0, matrixRows: 0 }); });
  return result;
}

export function buildProceduralRoomLayout(spec = {}) {
  const cols = clamp(spec.cols || 12, 6, 66); const rows = clamp(spec.rows || 12, 6, 66); const blueprints = buildProceduralRoomBlueprints({ ...spec, cols, rows }); const type = String(spec.type || "wasteland");
  if (isCommercial(type)) return commercialLayout(spec, blueprints, cols, rows);
  return matrixLayout(blueprints, { x: 1, y: 1, w: Math.max(2, cols - 2), h: Math.max(2, rows - 2) });
}

export function proceduralRoomLabel(baseRoomId, instance = 1) {
  const base = BASE_LABELS[baseRoomId] || String(baseRoomId || "ROOM").toUpperCase(); return `${base}${Number(instance) > 1 ? ` ${instance}` : ""}`;
}
