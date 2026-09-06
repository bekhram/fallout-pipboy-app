import fs from 'node:fs';

const path = 'src/components/crafting/CraftingScreen.jsx';
let text = fs.readFileSync(path, 'utf8');
const from = '  items: ["chemistry", "cooking", "robot"],';
const to = '  items: ["chemistry", "cooking"],';
if (!text.includes(from)) throw new Error('Robot workbench items filter anchor not found');
text = text.replace(from, to);
fs.writeFileSync(path, text);
console.log('Removed Robot Workbench from OTHER category; robot recipes remain under MODS.');
