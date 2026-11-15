import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const directories = process.argv.slice(2);
const bundles = directories.length ? directories : ["dist"];
const budget = 650 * 1024;

for (const directory of bundles) {
  const root = resolve(directory);
  const index = readFileSync(join(root, "index.html"), "utf8");
  const paths = [...new Set([...index.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((match) => match[1]))];
  if (!paths.length) throw new Error(`No initial bundle found in ${root}`);
  const files = paths.map((path) => {
    const size = gzipSync(readFileSync(join(root, path))).length;
    return { path, size };
  });
  const total = files.reduce((sum, file) => sum + file.size, 0);
  console.log(`${directory} — initial JS + CSS ${(total / 1024).toFixed(1)} KiB gzip`);
  for (const { path, size } of files) console.log(`  ${path} ${(size / 1024).toFixed(1)} KiB`);
  if (!directories.length && total > budget) {
    console.error(`Initial bundle exceeds the ${budget / 1024} KiB gzip budget.`);
    process.exitCode = 1;
  }
}
