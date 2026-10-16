import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: `export { computeGmGeneration } from "./src/utils/gmGenerationTasks.js";
      export { generateProceduralEncounterSummary } from "./src/utils/proceduralRoomContent.js";
      export { generateVaultEncounterPlan } from "./src/utils/proceduralVaultEncounter.js";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)),
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [{
    name: "image-urls",
    setup(builder) {
      builder.onLoad({ filter: /\.(png|webp|jpe?g|svg)$/ }, ({ path }) => ({
        contents: `export default ${JSON.stringify(path)};`, loader: "js",
      }));
      builder.onResolve({ filter: /\/i18n\.js$/ }, () => ({ path: "i18n", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: 'export default { language: "en", t: (key) => key };',
      }));
    },
  }],
});
const { computeGmGeneration, generateProceduralEncounterSummary, generateVaultEncounterPlan } =
  await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

test("GM worker task preserves current encounter balance without returning NPC objects", () => {
  const spec = {
    type: "wasteland", cols: 24, rows: 24, seed: "gm-perf",
    partySize: 5, avgPartyLevel: 12, encounterDifficulty: "hard", enemyCountOverride: 7,
  };
  const expected = generateProceduralEncounterSummary(spec);
  const result = computeGmGeneration(spec, false);
  assert.deepEqual(result.encounter, {
    totalEnemies: expected.totalEnemies ?? 0,
    targetXp: expected.targetXp ?? 0,
    xpPerPlayer: expected.xpPerPlayer ?? 0,
  });
  assert.equal(result.previewUrl, "");
  assert.deepEqual(Object.keys(result), ["encounter", "previewUrl"]);
});

test("GM worker task builds SVG preview only when explicitly opened", () => {
  const spec = { type: "wasteland", cols: 24, rows: 24, seed: "gm-preview", density: 0.55 };
  const preview = computeGmGeneration(spec, true);
  assert.match(preview.previewUrl, /^data:image\/svg\+xml;charset=UTF-8,/);
  assert.ok(preview.previewUrl.length > 100);
});

test("Vault encounters retain their count and never request an SVG map", () => {
  const spec = { type: "vault_tunnels", cols: 36, rows: 36, seed: "gm-vault", enemyCountOverride: 7 };
  const result = computeGmGeneration(spec, true);
  assert.equal(result.encounter.totalEnemies, generateVaultEncounterPlan(spec).total);
  assert.equal(result.previewUrl, "");
});
