import fs from "node:fs";

const languages=["en","ru","uk","pl"];
const source=Object.fromEntries(languages.map(lang=>[
  lang,
  JSON.parse(fs.readFileSync(new URL(`../src/locales/${lang}/common.json`,import.meta.url),"utf8"))
]));

function flatten(value,prefix="",out={}){
  for(const [key,item] of Object.entries(value||{})){
    const path=prefix?`${prefix}.${key}`:key;
    if(item && typeof item==="object" && !Array.isArray(item)) flatten(item,path,out);
    else out[path]=item;
  }
  return out;
}

const flat=Object.fromEntries(languages.map(lang=>[lang,flatten(source[lang])]));
const reference=new Set(Object.keys(flat.en));
let failed=false;
for(const lang of languages){
  const keys=new Set(Object.keys(flat[lang]));
  const missing=[...reference].filter(key=>!keys.has(key));
  const extra=lang==="en"?[]:[...keys].filter(key=>!reference.has(key));
  const blank=[...keys].filter(key=>typeof flat[lang][key]==="string" && !flat[lang][key].trim());
  if(missing.length||extra.length||blank.length){
    failed=true;
    console.error(`[${lang}] missing=${missing.length} extra=${extra.length} blank=${blank.length}`);
    if(missing.length) console.error(" missing:",missing.join(", "));
    if(extra.length) console.error(" extra:",extra.join(", "));
    if(blank.length) console.error(" blank:",blank.join(", "));
  }
}
if(failed) process.exit(1);
console.log(`i18n parity OK: ${reference.size} non-empty keys across ${languages.join(", ")}`);
