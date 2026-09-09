function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function getProceduralRoomBounds(spec = {}) {
  const cols = Math.max(6, Number(spec.cols) || 12);
  const rows = Math.max(6, Number(spec.rows) || 12);
  const type = String(spec.type || "wasteland");

  if (type === "red_rocket") {
    const roadRows = rows >= 10 ? 2 : 1;
    const roadStart = rows - roadRows;
    const left = clamp(Math.floor(cols * 0.36), 2, Math.max(2, cols - 5));
    const right = cols - 1;
    const top = 1;
    const bottom = Math.max(top + 4, roadStart - 1);
    const width = right - left;
    const height = bottom - top;
    const midX = left + Math.max(2, Math.floor(width * 0.57));
    const splitY = top + Math.max(2, Math.floor(height * 0.62));
    const lowerH = Math.max(1, bottom - splitY);
    const lowerW = right - left;
    const officeW = Math.max(1, Math.floor(lowerW * 0.32));
    const storageW = Math.max(1, Math.floor(lowerW * 0.36));
    const wcW = Math.max(1, lowerW - officeW - storageW);
    return {
      store: { x: left, y: top, w: midX - left, h: splitY - top },
      garage: { x: midX, y: top, w: right - midX, h: splitY - top },
      office: { x: left, y: splitY, w: officeW, h: lowerH },
      storage: { x: left + officeW, y: splitY, w: storageW, h: lowerH },
      wc: { x: left + officeW + storageW, y: splitY, w: wcW, h: lowerH },
    };
  }

  if (type === "super_duper_mart") {
    const parkingRows = rows >= 10 ? 3 : 2;
    const parkingStart = rows - parkingRows;
    const left = 1;
    const right = cols - 1;
    const top = 1;
    const bottom = Math.max(top + 4, parkingStart - 1);
    const storageStart = Math.max(left + 3, right - Math.max(2, Math.floor((right - left) * 0.28)));
    const officeSplit = top + Math.max(2, Math.floor((bottom - top) * 0.62));
    return {
      sales: { x: left, y: top, w: storageStart - left, h: bottom - top },
      storage: { x: storageStart, y: top, w: right - storageStart, h: officeSplit - top },
      office: { x: storageStart, y: officeSplit, w: right - storageStart, h: Math.max(1, bottom - officeSplit) },
    };
  }

  if (type === "raider_camp") {
    const left = 1;
    const right = cols - 1;
    const top = 1;
    const bottom = rows - 1;
    const roomW = Math.max(2, Math.floor((right - left - 1) / 2));
    const roomH = Math.max(2, Math.floor((bottom - top - 1) / 2));
    const centerCol = clamp(Math.floor(cols / 2), 0, cols - 1);
    const centerRow = clamp(Math.floor(rows / 2), 0, rows - 1);
    return {
      barrack: { x: left, y: top, w: Math.min(roomW, right - left), h: Math.min(roomH, bottom - top) },
      boss: { x: Math.max(left, right - roomW), y: top, w: roomW, h: roomH },
      storage: { x: left, y: Math.max(top, bottom - roomH), w: roomW, h: roomH },
      workshop: { x: Math.max(left, right - roomW), y: Math.max(top, bottom - roomH), w: roomW, h: roomH },
      courtyard: { x: Math.max(0, centerCol - 1), y: Math.max(0, centerRow - 1), w: 2, h: 2 },
    };
  }

  if (type === "military_bunker") {
    const left = 1;
    const right = cols - 1;
    const top = 1;
    const bottom = rows - 2;
    const corridorRow = clamp(top + Math.floor((bottom - top) / 2), top + 1, bottom - 1);
    const width = right - left;
    const baseRoomW = Math.max(1, Math.floor(width / 3));
    const idsTop = ["armory", "control", "barracks"];
    const idsBottom = ["storage", "generator", "medical"];
    const result = {};
    let x = left;
    for (let i = 0; i < 3; i += 1) {
      const remaining = right - x;
      const w = i === 2 ? remaining : Math.min(baseRoomW, remaining - (2 - i));
      if (w <= 0) break;
      result[idsTop[i]] = { x, y: top, w, h: Math.max(1, corridorRow - top) };
      result[idsBottom[i]] = { x, y: corridorRow + 1, w, h: Math.max(1, bottom - (corridorRow + 1)) };
      x += w;
    }
    return result;
  }

  return {
    ruins: { x: 1, y: 1, w: 2, h: 2 },
    wreck: { x: Math.max(1, cols - 3), y: 1, w: 2, h: 2 },
    camp: { x: Math.max(1, cols - 3), y: Math.max(1, rows - 3), w: 2, h: 2 },
  };
}

export function cellsInsideRoom(bounds) {
  if (!bounds) return [];
  const cells = [];
  for (let y = bounds.y; y < bounds.y + bounds.h; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.w; x += 1) cells.push({ x, y });
  }
  return cells;
}
