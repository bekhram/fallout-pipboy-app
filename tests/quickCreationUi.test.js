import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

test("quick-create copy has identical keys in all four languages",()=>{
  const source=read("src/components/characterCreation/QuickCharacterWizard.jsx");
  const match=source.match(/export const CREATION_COPY = (\{[\s\S]*?\n\});\n\nexport function getCreationCopy/);
  assert.ok(match,"CREATION_COPY block must remain statically testable");
  const copy=Function(`"use strict"; return (${match[1]});`)();
  const reference=Object.keys(copy.en).sort();
  for(const lang of ["ru","uk","pl"]){
    assert.deepEqual(Object.keys(copy[lang]).sort(),reference,`${lang} quick-create keys must match English`);
    for(const key of reference) assert.ok(String(copy[lang][key]??"").trim(),`${lang}.${key} must not be blank`);
  }
});

test("quick-create modal overrides the generic 500px modal cap",()=>{
  const css=read("src/components/characterCreation/characterCreation.css");
  assert.match(css,/\.pip-modal\.quick-create-modal\s*\{[^}]*max-width:\s*960px/s);
  assert.match(css,/\.quick-special-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(92px,\s*1fr\)\)/s);
});
