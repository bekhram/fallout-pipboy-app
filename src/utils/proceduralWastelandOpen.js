const CELL = 100;
const GRID = 24;

function clamp(v, min, max) { return Math.max(min, Math.min(max, Number(v) || 0)); }
function hashSeed(value) { const s = String(value ?? "0"); let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randint(rng, min, max) { return Math.floor(min + rng() * (max - min + 1)); }
function pick(rng, list) { return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; }
function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; }
function ellipse(cx, cy, rx, ry, fill, stroke = "none", sw = 0, extra = "") { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }

function overlaps(a, b, pad = 0) {
  return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
}

function roadProfile(rng) {
  const roll = rng();
  const type = roll < 0.35 ? "none" : roll < 0.60 ? "single" : roll < 0.85 ? "cross" : "fragments";
  return { type, surface: pick(rng, ["asphalt", "dirt", "cobblestone"]) };
}

function roadRects(profile, rng) {
  const roads = [];
  const offsetX = randint(rng, -3, 3);
  const offsetY = randint(rng, -3, 3);
  const cx = clamp(12 + offsetX, 4, 19);
  const cy = clamp(12 + offsetY, 4, 19);
  const width = profile.surface === "dirt" ? 2 : 2;

  if (profile.type === "single") {
    if (rng() < 0.5) roads.push({ x: cx, y: 0, w: width, h: GRID });
    else roads.push({ x: 0, y: cy, w: GRID, h: width });
  }
  if (profile.type === "cross") {
    roads.push({ x: cx, y: 0, w: width, h: GRID });
    roads.push({ x: 0, y: cy, w: GRID, h: width });
  }
  if (profile.type === "fragments") {
    const vertical = rng() < 0.5;
    if (vertical) {
      roads.push({ x: cx, y: 0, w: width, h: randint(rng, 5, 9) });
      roads.push({ x: cx, y: randint(rng, 13, 17), w: width, h: randint(rng, 5, 8) });
    } else {
      roads.push({ x: 0, y: cy, w: randint(rng, 5, 9), h: width });
      roads.push({ x: randint(rng, 13, 17), y: cy, w: randint(rng, 5, 8), h: width });
    }
  }
  return roads;
}

function placeLargeObjects(rng, occupied) {
  const result = [];
  const count = randint(rng, 1, 3);
  for (let i = 0; i < count; i += 1) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const type = pick(rng, ["rocks", "crater", "ravine"]);
      const w = type === "ravine" ? randint(rng, 4, 7) : randint(rng, 3, 5);
      const h = type === "ravine" ? randint(rng, 2, 4) : randint(rng, 3, 5);
      const item = { type, x: randint(rng, 1, GRID - w - 1), y: randint(rng, 1, GRID - h - 1), w, h, impassable: true };
      if (occupied.some((o) => overlaps(item, o, 1))) continue;
      occupied.push(item);
      result.push(item);
      break;
    }
  }
  return result;
}

function placeRuins(rng, occupied) {
  const result = [];
  const count = randint(rng, 1, 4);
  for (let i = 0; i < count; i += 1) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const w = randint(rng, 2, 5), h = randint(rng, 2, 5);
      const item = { type: "ruin_l", x: randint(rng, 1, GRID - w - 1), y: randint(rng, 1, GRID - h - 1), w, h, rot: randint(rng, 0, 3), impassable: false };
      if (occupied.some((o) => overlaps(item, o, 1))) continue;
      occupied.push(item);
      result.push(item);
      break;
    }
  }
  return result;
}

function placeCars(rng, occupied, roads) {
  const result = [];
  const count = randint(rng, 2, 8);
  for (let i = 0; i < count; i += 1) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      let x = randint(rng, 1, GRID - 2), y = randint(rng, 1, GRID - 2), horizontal = rng() < 0.5;
      if (roads.length && rng() < 0.65) {
        const road = pick(rng, roads);
        if (road.w >= road.h) { x = clamp(randint(rng, road.x, road.x + road.w - 1), 1, GRID - 2); y = clamp(road.y + (rng() < 0.5 ? -1 : road.h), 1, GRID - 2); horizontal = true; }
        else { y = clamp(randint(rng, road.y, road.y + road.h - 1), 1, GRID - 2); x = clamp(road.x + (rng() < 0.5 ? -1 : road.w), 1, GRID - 2); horizontal = false; }
      }
      const item = { type: "wrecked_car", x, y, w: horizontal ? 2 : 1, h: horizontal ? 1 : 2, horizontal };
      if (occupied.some((o) => overlaps(item, o, 0))) continue;
      occupied.push(item);
      result.push(item);
      break;
    }
  }
  return result;
}

function roadSvg(road, surface) {
  const x = road.x * CELL, y = road.y * CELL, w = road.w * CELL, h = road.h * CELL;
  if (surface === "dirt") return rect(x, y, w, h, "#8a7658", "#5d503e", 4, 0, 'opacity="0.95"');
  if (surface === "cobblestone") {
    let out = rect(x, y, w, h, "#77736b", "#514e48", 4);
    for (let yy = y; yy < y + h; yy += 26) out += line(x, yy, x + w, yy, "#918b80", 1);
    for (let xx = x; xx < x + w; xx += 34) out += line(xx, y, xx, y + h, "#5f5b54", 1);
    return out;
  }
  return `${rect(x, y, w, h, "#555654", "#3e403e", 4)}${w > h ? line(x, y + h / 2, x + w, y + h / 2, "#918a70", 3, "28 24") : line(x + w / 2, y, x + w / 2, y + h, "#918a70", 3, "28 24")}`;
}

function largeObjectSvg(obj, rng) {
  const x = obj.x * CELL, y = obj.y * CELL, w = obj.w * CELL, h = obj.h * CELL;
  if (obj.type === "crater") {
    return `${ellipse(x + w / 2, y + h / 2, w * 0.43, h * 0.38, "#544a3d", "#302b25", 8)}${ellipse(x + w / 2, y + h / 2, w * 0.27, h * 0.22, "#332f2a", "#6b5b46", 4)}`;
  }
  if (obj.type === "ravine") {
    const p1 = `${x + 15},${y + h * 0.2}`; const p2 = `${x + w * 0.28},${y + h * 0.42}`; const p3 = `${x + w * 0.58},${y + h * 0.3}`; const p4 = `${x + w - 15},${y + h * 0.72}`; const p5 = `${x + w * 0.54},${y + h - 12}`; const p6 = `${x + w * 0.22},${y + h * 0.72}`;
    return `<polygon points="${p1} ${p2} ${p3} ${p4} ${p5} ${p6}" fill="#3d3933" stroke="#26231f" stroke-width="10"/>`;
  }
  let out = "";
  const count = randint(rng, 5, 10);
  for (let i = 0; i < count; i += 1) {
    const cx = x + 25 + rng() * Math.max(20, w - 50), cy = y + 25 + rng() * Math.max(20, h - 50), r = 20 + rng() * 42;
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rng() > 0.5 ? "#625b50" : "#756d60"}" stroke="#403b34" stroke-width="5"/>`;
  }
  return out;
}

function ruinSvg(obj) {
  const x = obj.x * CELL, y = obj.y * CELL, w = obj.w * CELL, h = obj.h * CELL;
  const sw = 18;
  const variants = [
    [line(x, y, x + w, y, "#4e4940", sw), line(x, y, x, y + h, "#4e4940", sw)],
    [line(x, y, x + w, y, "#4e4940", sw), line(x + w, y, x + w, y + h, "#4e4940", sw)],
    [line(x, y + h, x + w, y + h, "#4e4940", sw), line(x, y, x, y + h, "#4e4940", sw)],
    [line(x, y + h, x + w, y + h, "#4e4940", sw), line(x + w, y, x + w, y + h, "#4e4940", sw)],
  ];
  return variants[obj.rot % 4].join("");
}

function carSvg(car, rng) {
  const x = (car.x + car.w / 2) * CELL, y = (car.y + car.h / 2) * CELL;
  const rot = car.horizontal ? 0 : 90;
  const fill = pick(rng, ["#705348", "#56625d", "#6b6049", "#55585a"]);
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${rect(-58, -25, 116, 50, fill, "#302d29", 5, 10)}${rect(-22, -18, 44, 36, "#303638", "#202426", 2, 5)}${line(-50, 0, 50, 0, "#3e3933", 3)}</g>`;
}

function scatterSvg(rng, blocked) {
  let out = "";
  for (let i = 0; i < 80; i += 1) {
    const gx = randint(rng, 0, GRID - 1), gy = randint(rng, 0, GRID - 1);
    if (blocked.some((o) => gx >= o.x && gx < o.x + o.w && gy >= o.y && gy < o.y + o.h)) continue;
    const cx = (gx + 0.25 + rng() * 0.5) * CELL, cy = (gy + 0.25 + rng() * 0.5) * CELL, r = 3 + rng() * 8;
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rng() > 0.5 ? "#5b5549" : "#817660"}" opacity="0.75"/>`;
  }
  return out;
}

export function buildOpenWastelandSite(spec = {}) {
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:24x24:open-wasteland-v1`));
  const profile = roadProfile(rng);
  const roads = roadRects(profile, rng);
  const occupied = [...roads];
  const obstacles = placeLargeObjects(rng, occupied);
  const ruins = placeRuins(rng, occupied);
  const cars = placeCars(rng, occupied, roads);
  return { cols: GRID, rows: GRID, profile, roads, obstacles, ruins, cars };
}

export function buildOpenWastelandRoomLayout() { return []; }
export function buildOpenWastelandRoomBlueprints() { return []; }

export function generateOpenWastelandSvg(input = {}) {
  const site = buildOpenWastelandSite(input);
  const rng = mulberry32(hashSeed(`${input.seed || "1"}:24x24:open-wasteland-render-v1`));
  const width = GRID * CELL, height = GRID * CELL;
  const blocked = [...site.roads, ...site.obstacles, ...site.ruins, ...site.cars];
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  out.push(rect(0, 0, width, height, "#756b58"));
  out.push(scatterSvg(rng, blocked));
  site.roads.forEach((road) => out.push(roadSvg(road, site.profile.surface)));
  site.obstacles.forEach((obj) => out.push(largeObjectSvg(obj, rng)));
  site.ruins.forEach((obj) => out.push(ruinSvg(obj)));
  site.cars.forEach((car) => out.push(carSvg(car, rng)));
  out.push(rect(18, 18, 420, 42, "#d2c3a2", "#40372e", 2, 4, 'opacity="0.93"'));
  out.push(`<text x="34" y="40" text-anchor="start" dominant-baseline="middle" fill="#332d27" font-family="monospace" font-size="11" font-weight="900">WASTELAND // 24x24 // ${site.profile.type.toUpperCase()}${site.profile.type !== "none" ? ` // ${site.profile.surface.toUpperCase()}` : ""}</text>`);
  out.push("</svg>");
  return out.join("");
}
