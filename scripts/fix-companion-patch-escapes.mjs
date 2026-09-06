import fs from 'node:fs';
const path = 'scripts/patch-companion-card-dice.mjs';
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/(?<!\\)\$\{active\.id\}/g, '\\${active.id}');
text = text.replace(/(?<!\\)\$\{active\.name \|\| copy\.unnamed\}/g, '\\${active.name || copy.unnamed}');
fs.writeFileSync(path, text);
console.log('Fixed companion patch template escaping.');
