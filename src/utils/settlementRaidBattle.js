function factionName(faction) {
  if (faction === "feral_ghouls") return "Feral Ghoul";
  if (faction === "super_mutants") return "Super Mutant";
  return "Raider";
}

export function settlementRaidEnemyCount(strength) {
  return Math.max(2, Math.min(8, Math.ceil(Math.max(1, Number(strength) || 1) / 3)));
}

export function buildSettlementRaidRoster(settlement, attack, defenderIds = [], players = []) {
  const selected = new Set(Array.isArray(defenderIds) ? defenderIds : []);
  const defenders = (settlement?.settlers || [])
    .filter((settler) => selected.has(settler.id) && Number(settler.health ?? 100) > 1)
    .map((settler) => ({
      id: settler.id,
      name: settler.name || "Settler",
      health: Math.max(1, Number(settler.health ?? 100)),
    }));

  const heroes = (Array.isArray(players) ? players : [])
    .filter((player) => player?.online !== false && player?.clientId)
    .map((player) => ({
      clientId: String(player.clientId),
      name: String(player.character?.name || player.name || "Player").slice(0, 80),
    }));

  const enemyCount = settlementRaidEnemyCount(attack?.strength);
  const enemyName = factionName(attack?.faction);
  const enemies = Array.from({ length: enemyCount }, (_, index) => ({
    name: enemyCount > 1 ? `${enemyName} ${index + 1}` : enemyName,
    faction: attack?.faction || "raiders",
  }));

  return { defenders, heroes, enemies };
}

export async function startSettlementRaidBattle(session, settlement, attack, defenderIds = []) {
  if (!session || session.mode !== "host" || session.status !== "online") {
    return { ok: false, error: "GM_SESSION_REQUIRED" };
  }
  if (!attack || !["warning", "active"].includes(attack.state)) {
    return { ok: false, error: "ATTACK_NOT_ACTIVE" };
  }

  const existingId = String(attack.tacticalSceneId || "");
  const existing = (session.tacticalScenes || []).find((scene) => scene.sceneId === existingId);
  if (existing) {
    const switched = await session.switchTacticalScene?.(existing.sceneId);
    if (switched?.ok === false) return switched;
    if (session.liveSceneId !== existing.sceneId) {
      const enabled = await session.enableTacticalScene?.({
        cols: existing.cols || 24,
        rows: existing.rows || 24,
        startZone: existing.startZone,
      });
      if (enabled?.ok === false) return enabled;
    }
    return { ok: true, sceneId: existing.sceneId, resumed: true };
  }

  const roster = buildSettlementRaidRoster(settlement, attack, defenderIds, session.players || []);
  const created = await session.createTacticalScene?.({
    name: `${String(settlement?.name || "Settlement").slice(0, 52)} // DEFENSE`,
    cols: 24,
    rows: 24,
  });
  if (!created?.ok || !created?.scene?.sceneId) {
    return created || { ok: false, error: "SCENE_CREATE_FAILED" };
  }

  const sceneId = created.scene.sceneId;
  const startZone = [];
  for (let y = 20; y < 24; y += 1) for (let x = 1; x < 7; x += 1) startZone.push({ x, y });
  const enabled = await session.enableTacticalScene?.({ cols: 24, rows: 24, startZone });
  if (enabled?.ok === false) return enabled;

  for (const hero of roster.heroes) {
    await session.createAssignedPlayerToken?.({
      targetClientId: hero.clientId,
      name: hero.name,
      size: 1,
    });
  }

  for (let index = 0; index < roster.defenders.length; index += 1) {
    const defender = roster.defenders[index];
    await session.createNpcToken?.({
      name: defender.name,
      size: 1,
      x: 8 + (index % 6),
      y: 19 + Math.floor(index / 6),
      npcId: `settlement-defender:${defender.id}`,
      stats: {
        visibleToPlayers: true,
        settlementDefender: true,
        settlementId: settlement.id,
        attackId: attack.id,
        hp: defender.health,
        maxHp: defender.health,
      },
    });
  }

  for (let index = 0; index < roster.enemies.length; index += 1) {
    const enemy = roster.enemies[index];
    await session.createNpcToken?.({
      name: enemy.name,
      size: enemy.faction === "super_mutants" && Number(attack.strength || 0) >= 12 ? 2 : 1,
      x: 2 + (index % 8) * 2,
      y: 2 + Math.floor(index / 8) * 2,
      npcId: `settlement-raider:${attack.id}:${index}`,
      stats: {
        visibleToPlayers: true,
        settlementAttacker: true,
        settlementId: settlement.id,
        attackId: attack.id,
        faction: enemy.faction,
      },
    });
  }

  return { ok: true, sceneId, roster };
}
