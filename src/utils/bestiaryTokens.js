const TOKEN_ATLASES = {"1":"https://cdn.creativeclaw.co/u/e2d59740/images/e79fae16-f296-47f9-9d62-d99f5eacf5a5.webp","2":"https://cdn.creativeclaw.co/u/e2d59740/images/490d4650-366a-4f5d-883b-498927a17803.webp","3":"https://cdn.creativeclaw.co/u/e2d59740/images/645e7a0b-1803-464e-9a01-7cdf2bd6e6c0.webp","4":"https://cdn.creativeclaw.co/u/e2d59740/images/ce2d3748-6b4c-4849-8b08-b69ab9e5f0a9.webp","5":"https://cdn.creativeclaw.co/u/e2d59740/images/efe3a0ef-0ed9-468d-b5af-aa65cf700a83.webp","6":"https://cdn.creativeclaw.co/u/e2d59740/images/515a840e-d401-40b6-8055-0495a4677ed0.webp"};
const TOKEN_FRAMES = {"bloodbug":[1,0],"bloatfly":[1,1],"brahmin":[1,2],"deathclaw":[1,3],"dog":[1,4],"hatchlings":[1,5],"mirelurk":[1,6],"mirelurk-hunter":[1,7],"mirelurk-queen":[1,8],"mole-rat":[1,9],"mutant-hound":[1,10],"radroach":[1,11],"radscorpion":[1,12],"radstag":[1,13],"stingwing":[1,14],"yao-guai":[1,15],"feral-ghoul":[1,16],"glowing-one":[1,17],"assaultron":[1,18],"eyebot":[1,19],"mister-handy":[1,20],"mister-gutsy":[1,21],"protectron":[1,22],"sentry-bot":[1,23],"super-mutant":[1,24],"super-mutant-behemoth":[1,25],"super-mutant-brute":[1,26],"super-mutant-master":[1,27],"super-mutant-suicider":[1,28],"synth":[1,29],"synth-courser":[2,0],"synth-strider":[2,1],"synth-trooper":[2,2],"machine-gun-turret-mk-i":[2,3],"machine-gun-turret-mk-iii":[2,4],"machine-gun-turret-mk-v":[2,5],"machine-gun-turret-wall":[2,6],"machine-gun-turret-3-shot-wall":[2,7],"laser-turret-wall":[2,8],"laser-turret-3-shot-wall":[2,9],"brotherhood-elder":[2,10],"brotherhood-knight":[2,11],"brotherhood-paladin":[2,12],"brotherhood-scribe":[2,13],"brotherhood-lancer":[2,14],"raider":[2,15],"raider-boss":[2,16],"raider-psycho":[2,17],"raider-scavver":[2,18],"raider-veteran":[2,19],"children-of-atom":[2,20],"gunner":[2,21],"mercenary":[2,22],"minuteman":[2,23],"railroad-agent":[2,24],"institute-scientist":[2,25],"trader-caravan-merchant":[2,26],"vault-dweller-npc":[2,27],"wastelander-npc":[2,28],"zetan":[2,29],"mongrel-dog":[3,0],"albino-radscorpion":[3,1],"angler":[3,2],"cave-cricket":[3,3],"cave-cricket-piercer":[3,4],"cazador":[3,5],"deathclaw-matriarch":[3,6],"floater":[3,7],"gatorclaw":[3,8],"gecko":[3,9],"giant-ant":[3,10],"giant-mantis":[3,11],"gulper":[3,12],"hermit-crab":[3,13],"honey-beast":[3,14],"bee-swarm":[3,15],"radrat":[3,16],"glowing-plagued-radrat":[3,17],"scorchbeast":[3,18],"grafton-monster":[3,19],"mega-sloth":[3,20],"mothman":[3,21],"vengeful-mothman":[3,22],"wise-mothman":[3,23],"sheepsquatch":[3,24],"snallygaster":[3,25],"wendigo":[3,26],"feral-ghoul-roamer":[3,27],"feral-ghoul-stalker":[3,28],"scorched-wanderer":[3,29],"scorched-berserker":[4,0],"trog-fledgling":[4,1],"trog-devourer":[4,2],"colonel-gutsy":[4,3],"cyberdog":[4,4],"liberator":[4,5],"nightkin":[4,6],"the-master":[4,7],"ancient-super-mutant-behemoth":[4,8],"swan":[4,9],"augustus-autumn":[4,10],"enclave-hellfire-trooper":[4,11],"enclave-soldier":[4,12],"enclave-tesla-soldier":[4,13],"frank-horrigan":[4,14],"gunner-sergeant":[4,15],"gunner-commander":[4,16],"clint":[4,17],"recruit-legionary":[4,18],"veteran-legionary":[4,19],"centurion":[4,20],"legate-lanius":[4,21],"caesar":[4,22],"forged":[4,23],"slag":[4,24],"trapper":[4,25],"settlers-carpenter":[4,26],"settlers-doctor":[4,27],"settlers-farmer":[4,28],"settlers-mama-murphy":[4,29],"settlers-resident-militia":[5,0],"settlers-settlement-leader":[5,1],"settlers-tinkerer":[5,2],"settlers-minuteman-general":[5,3],"settlers-minuteman-recruit":[5,4],"settlers-minuteman-veteran":[5,5],"settlers-preston-garvey":[5,6],"settlers-ncr-recruit":[5,7],"settlers-ncr-sergeant":[5,8],"settlers-ncr-trooper":[5,9],"settlers-craig-boone":[5,10],"settlers-railroad-informant":[5,11],"settlers-railroad-spy":[5,12],"settlers-deacon":[5,13],"settlers-institute-agent":[5,14],"settlers-institute-worker":[5,15],"settlers-x6-88":[5,16],"settlers-armorer":[5,17],"settlers-caravan-boss":[5,18],"settlers-caravan-guard":[5,19],"settlers-chem-dealer":[5,20],"settlers-weaponsmith":[5,21],"settlers-scavenger":[5,22],"settlers-alice-mclafferty":[5,23],"settlers-robobrain":[5,24],"settlers-assaultron-invader":[5,25],"settlers-assaultron-dominator":[5,26],"settlers-annihilator-sentry-bot":[5,27],"settlers-ada":[5,28],"settlers-tesla-turret":[5,29],"settlers-shotgun-turret":[6,0],"settlers-missile-turret":[6,1],"settlers-trap-tesla-arc":[6,2],"settlers-trap-flamethrower":[6,3],"settlers-trap-spike":[6,4],"settlers-trap-trapdoor":[6,5],"settlers-trap-spring":[6,6],"settlers-trap-grenade-bouquet":[6,7],"settlers-trap-radiation-emitter":[6,8],"settlers-trap-jury-rigged-gun":[6,9],"settlers-trap-clapping-cymbal-monkey":[6,10],"rule-mechanical-lock":[6,11],"rule-electronic-lock":[6,12],"rule-collapsed-structure":[6,13],"rule-ongoing-hazard":[6,14],"rule-occasional-hazard":[6,15],"rule-deliberate-trap":[6,16]};

const tokenUrls = new Map();
const atlasBitmaps = new Map();
const atlasPromises = new Map();

function normalizeId(value) { return String(value || "").trim(); }

async function loadAtlas(atlas) {
  if (atlasBitmaps.has(atlas)) return atlasBitmaps.get(atlas);
  if (atlasPromises.has(atlas)) return atlasPromises.get(atlas);
  const url = TOKEN_ATLASES[atlas];
  if (!url) throw new Error("Unknown token atlas");
  const promise = fetch(url, { cache: "force-cache" })
    .then((response) => { if (!response.ok) throw new Error(`Token atlas HTTP ${response.status}`); return response.blob(); })
    .then(async (blob) => {
      const bitmap = typeof createImageBitmap === "function" ? await createImageBitmap(blob) : await new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(blob);
        image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Token atlas decode failed")); };
        image.src = objectUrl;
      });
      atlasBitmaps.set(atlas, bitmap);
      atlasPromises.delete(atlas);
      return bitmap;
    })
    .catch((error) => { atlasPromises.delete(atlas); throw error; });
  atlasPromises.set(atlas, promise);
  return promise;
}

async function cropToken(atlas, index) {
  const bitmap = await loadAtlas(atlas);
  const cell = 256;
  const cols = 6;
  const sx = (index % cols) * cell;
  const sy = Math.floor(index / cols) * cell;
  let canvas;
  let context;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(cell, cell);
    context = canvas.getContext("2d");
    context.drawImage(bitmap, sx, sy, cell, cell, 0, 0, cell, cell);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.88 });
    return URL.createObjectURL(blob);
  }
  canvas = document.createElement("canvas");
  canvas.width = cell;
  canvas.height = cell;
  context = canvas.getContext("2d");
  context.drawImage(bitmap, sx, sy, cell, cell, 0, 0, cell, cell);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  return blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/webp", 0.88);
}

export async function getBestiaryTokenUrl(id) {
  const key = normalizeId(id);
  if (!key) return "";
  if (tokenUrls.has(key)) return tokenUrls.get(key);
  const frame = TOKEN_FRAMES[key];
  if (!frame) return "";
  const url = await cropToken(frame[0], frame[1]);
  tokenUrls.set(key, url);
  return url;
}

export function warmBestiaryToken(id) { return getBestiaryTokenUrl(id).catch(() => ""); }
export { TOKEN_ATLASES };