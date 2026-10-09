import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Exercise the real save normalizer and generators; image URLs need no browser.
const bundle = await build({
  stdin: {
    contents: `export { normalizeProceduralMapSpec } from "./src/utils/proceduralMapGenerator.js";
      export { generateProceduralEncounterSummary } from "./src/utils/proceduralRoomContent.js";
      export { generateVaultEncounterPlan } from "./src/utils/proceduralVaultEncounter.js";`,
    resolveDir: fileURLToPath(new URL("../", import.meta.url)),
  },
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "image-urls", setup(builder) {
    builder.onLoad({ filter: /\.(png|webp|jpe?g|svg)$/ }, ({ path }) => ({
      contents: `export default ${JSON.stringify(path)};`, loader: "js",
    }));
    builder.onResolve({ filter: /\/i18n\.js$/ }, () => ({ path: "i18n", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
      contents: 'export default { language: "en", t: (key) => key };',
    }));
  } }],
});
const { normalizeProceduralMapSpec, generateProceduralEncounterSummary, generateVaultEncounterPlan } =
  await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`)
    .catch(error => { throw new Error(error.message); });

test("saved scene retains party and encounter settings through reload and repeated normalization", () => {
  for (const type of ["wasteland", "settlement", "red_rocket", "super_duper_mart", "vault_tunnels"]) {
    const draft = { type, seed: "1508851474", cols: 24, rows: 24, partySize: 5, avgPartyLevel: 12,
      enemyCountOverride: 7, encounterDifficulty: "hard", enemyFaction: "raider", trapCount: 5, trapLethality: "high" };
    const restored = normalizeProceduralMapSpec(JSON.parse(JSON.stringify(normalizeProceduralMapSpec(draft))));
    for (const key of ["partySize", "avgPartyLevel", "enemyCountOverride", "encounterDifficulty", "enemyFaction", "trapCount", "trapLethality"]) {
      assert.equal(restored[key], draft[key], `${type}: ${key}`);
    }
    const enemyCount = spec => type === "vault_tunnels"
      ? generateVaultEncounterPlan(spec).total
      : generateProceduralEncounterSummary(spec).totalEnemies;
    assert.equal(enemyCount(draft), 7, `${type}: draft`);
    assert.equal(enemyCount(restored), 7, `${type}: restored`);
  }
});

test("invalid encounter settings use the generator's existing limits", () => {
  const max = normalizeProceduralMapSpec({ enemyCountOverride: 999, trapCount: 999, trapLethality: "unknown" });
  assert.equal(max.enemyCountOverride, 50);
  assert.equal(max.trapCount, 8);
  assert.equal(max.trapLethality, "standard");
  const auto = normalizeProceduralMapSpec({ enemyCountOverride: -1 });
  assert.equal(auto.enemyCountOverride, 0);
  assert.equal(normalizeProceduralMapSpec({}).enemyCountOverride, 0);
});
