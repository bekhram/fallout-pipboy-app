// Tiny Swords legacy Pawn_Blue: 6 columns x 6 rows, 192 px per frame.
// The Aseprite tags are Idle, Run, Build, Chop, Carry/Idle, Carry/Run.
export const WORKER_TEXTURE = 'settlement-tiny-swords-pawn-blue-v1';
export const WORKER_FRAME_SIZE = 192;
export const WORKER_COLUMNS = 6;
export const WORKER_FRAME_MS = 100;
export const WORKER_ROWS = Object.freeze({ idle: 0, walk: 1, build: 2, chop: 3, carry_idle: 4, carry_walk: 5 });

/** Presentation only: never changes assignments, stockpiles or campaign state. */
export function workerSpritePose(state, action, { time = 0, index = 0, reduced = false } = {}) {
  const moving = !reduced && Boolean(state?.path?.length);
  const working = state?.phase === 'working' && !state?.reason;
  let mode = 'idle';
  if (state?.cargo) mode = moving ? 'carry_walk' : 'carry_idle';
  else if (moving) mode = 'walk';
  else if (working && ['build', 'scavenging'].includes(action)) mode = 'build';
  else if (working && action === 'hunting_gathering') mode = 'chop';
  // No farming, shopkeeping or combat tool animation exists in this legacy sheet.
  // Keep those workers idle at the site, with the existing truthful activity badge.
  const clock = Number.isFinite(time) ? Math.max(0, time) : 0;
  const offset = Number.isFinite(index) ? Math.max(0, Math.floor(index)) * 137 : 0;
  const column = reduced ? 0 : Math.floor((clock + offset) / WORKER_FRAME_MS) % WORKER_COLUMNS;
  return { mode, frame: WORKER_ROWS[mode] * WORKER_COLUMNS + column };
}

export function workerFacesLeft(state, job, buildings = [], previous = false) {
  let x = state?.path?.[0]?.x;
  if (!Number.isFinite(x) && state?.phase === 'working') {
    const target = buildings.find(building => building.id === job?.targetId);
    if (target) x = target.x + (target.footprint?.width || 1) / 2 - .5;
  }
  const dx = x - state?.x;
  return Number.isFinite(dx) && Math.abs(dx) > .01 ? dx < 0 : previous;
}
