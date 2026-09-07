export const LOCATION_TYPES = [
  "wasteland","settlement","super_duper_mart","red_rocket","factory","mine","tunnel","amusement_park","railway_station","bus_station","police_station","hospital","substation","cave","metro_station","airport","ship","military_bunker","super_mutant_camp","raider_camp","vault",
];

export const TERRAIN_TYPES = ["wasteland","forest","swamp","ruins"];
export const ZONE_TYPES = ["normal","radioactive","toxic","anomalous","dangerous"];
export const TIME_TYPES = ["day","night"];
export const WEATHER_TYPES = ["clear","fog","rain","strong_wind"];

export const ZONE_SUBTYPES = {
  normal: [""],
  radioactive: ["radioactive_fallout","radioactive_ground"],
  toxic: ["toxic_air","toxic_rain"],
  anomalous: ["lightning_storm","fire_storm","ice_storm"],
  dangerous: ["collapses","hidden_sniper"],
};

export const DEFAULT_TACTICAL_ENVIRONMENT = {
  locationType: "wasteland",
  terrain: "wasteland",
  zoneType: "normal",
  zoneSubtype: "",
  timeOfDay: "day",
  weather: "clear",
  hazardBaseCd: 1,
  hazardGrowthCd: 1,
  mapAssetId: "",
  mapVariantSeed: "",
  lightingPreset: "auto",
};

const LABELS = {
  en: {
    locationType:{wasteland:"Wasteland",settlement:"Settlement",super_duper_mart:"Super-Duper Mart",red_rocket:"Red Rocket",factory:"Factory",mine:"Mine",tunnel:"Tunnel",amusement_park:"Amusement Park",railway_station:"Railway Station",bus_station:"Bus Station",police_station:"Police Station",hospital:"Hospital",substation:"Substation",cave:"Cave",metro_station:"Metro Station",airport:"Airport",ship:"Ship",military_bunker:"Military Bunker",super_mutant_camp:"Super Mutant Camp",raider_camp:"Raider Camp",vault:"Vault"},
    terrain:{wasteland:"Wasteland",forest:"Forest",swamp:"Swamp",ruins:"Ruins"},
    zoneType:{normal:"Normal",radioactive:"Radioactive",toxic:"Toxic",anomalous:"Anomalous",dangerous:"Dangerous"},
    zoneSubtype:{"":"None",radioactive_fallout:"Radioactive fallout",radioactive_ground:"Radioactive ground",toxic_air:"Toxic air",toxic_rain:"Toxic rain",lightning_storm:"Lightning storm",fire_storm:"Fire storm",ice_storm:"Ice storm",collapses:"Collapses",hidden_sniper:"Hidden sniper"},
    timeOfDay:{day:"Day",night:"Night"},weather:{clear:"Clear sky",fog:"Fog",rain:"Rain",strong_wind:"Strong wind"},
  },
  ru: {
    locationType:{wasteland:"Пустошь",settlement:"Поселение",super_duper_mart:"Супер-Дупер Март",red_rocket:"Красная Ракета",factory:"Завод",mine:"Шахта",tunnel:"Туннель",amusement_park:"Парк развлечений",railway_station:"Железнодорожная станция",bus_station:"Автобусная станция",police_station:"Полицейский участок",hospital:"Больница",substation:"Подстанция",cave:"Пещера",metro_station:"Станция метро",airport:"Аэропорт",ship:"Корабль",military_bunker:"Военный бункер",super_mutant_camp:"Лагерь супермутантов",raider_camp:"Лагерь рейдеров",vault:"Убежище"},
    terrain:{wasteland:"Пустошь",forest:"Лес",swamp:"Болота",ruins:"Руины"},
    zoneType:{normal:"Обычная",radioactive:"Радиоактивная",toxic:"Токсическая",anomalous:"Аномальная",dangerous:"Опасная"},
    zoneSubtype:{"":"Нет",radioactive_fallout:"Радиоактивные осадки",radioactive_ground:"Радиоактивная земля",toxic_air:"Токсичный воздух",toxic_rain:"Токсичный дождь",lightning_storm:"Аномальная гроза",fire_storm:"Огненный шторм",ice_storm:"Ледяной шторм",collapses:"Обвалы",hidden_sniper:"Невидимый снайпер"},
    timeOfDay:{day:"День",night:"Ночь"},weather:{clear:"Ясное небо",fog:"Туман",rain:"Дождь",strong_wind:"Сильный ветер"},
  },
  uk: {
    locationType:{wasteland:"Пустка",settlement:"Поселення",super_duper_mart:"Супер-Дупер Март",red_rocket:"Червона Ракета",factory:"Завод",mine:"Шахта",tunnel:"Тунель",amusement_park:"Парк розваг",railway_station:"Залізнична станція",bus_station:"Автобусна станція",police_station:"Поліцейський відділок",hospital:"Лікарня",substation:"Підстанція",cave:"Печера",metro_station:"Станція метро",airport:"Аеропорт",ship:"Корабель",military_bunker:"Військовий бункер",super_mutant_camp:"Табір супермутантів",raider_camp:"Табір рейдерів",vault:"Сховище"},
    terrain:{wasteland:"Пустка",forest:"Ліс",swamp:"Болота",ruins:"Руїни"},
    zoneType:{normal:"Звичайна",radioactive:"Радіоактивна",toxic:"Токсична",anomalous:"Аномальна",dangerous:"Небезпечна"},
    zoneSubtype:{"":"Немає",radioactive_fallout:"Радіоактивні опади",radioactive_ground:"Радіоактивна земля",toxic_air:"Токсичне повітря",toxic_rain:"Токсичний дощ",lightning_storm:"Аномальна гроза",fire_storm:"Вогняний шторм",ice_storm:"Крижаний шторм",collapses:"Обвали",hidden_sniper:"Невидимий снайпер"},
    timeOfDay:{day:"День",night:"Ніч"},weather:{clear:"Ясне небо",fog:"Туман",rain:"Дощ",strong_wind:"Сильний вітер"},
  },
  pl: {
    locationType:{wasteland:"Pustkowie",settlement:"Osada",super_duper_mart:"Super-Duper Mart",red_rocket:"Red Rocket",factory:"Fabryka",mine:"Kopalnia",tunnel:"Tunel",amusement_park:"Park rozrywki",railway_station:"Stacja kolejowa",bus_station:"Dworzec autobusowy",police_station:"Posterunek policji",hospital:"Szpital",substation:"Podstacja",cave:"Jaskinia",metro_station:"Stacja metra",airport:"Lotnisko",ship:"Statek",military_bunker:"Bunkier wojskowy",super_mutant_camp:"Obóz supermutantów",raider_camp:"Obóz raiderów",vault:"Krypta"},
    terrain:{wasteland:"Pustkowie",forest:"Las",swamp:"Bagna",ruins:"Ruiny"},
    zoneType:{normal:"Zwykła",radioactive:"Radioaktywna",toxic:"Toksyczna",anomalous:"Anomalna",dangerous:"Niebezpieczna"},
    zoneSubtype:{"":"Brak",radioactive_fallout:"Opad radioaktywny",radioactive_ground:"Radioaktywna ziemia",toxic_air:"Toksyczne powietrze",toxic_rain:"Toksyczny deszcz",lightning_storm:"Anomalna burza",fire_storm:"Burza ogniowa",ice_storm:"Burza lodowa",collapses:"Zawalenia",hidden_sniper:"Ukryty snajper"},
    timeOfDay:{day:"Dzień",night:"Noc"},weather:{clear:"Czyste niebo",fog:"Mgła",rain:"Deszcz",strong_wind:"Silny wiatr"},
  },
};

export function languageCode(){
  if(typeof document==="undefined")return "en";
  const code=String(document.documentElement.lang||"en").toLowerCase().split("-")[0];
  return LABELS[code]?code:"en";
}

export function labelFor(group,key,language=languageCode()){
  return LABELS[language]?.[group]?.[key] ?? LABELS.en?.[group]?.[key] ?? String(key||"");
}

export function normalizeTacticalEnvironment(value={}){
  const source=value&&typeof value==="object"?value:{};
  const locationType=LOCATION_TYPES.includes(source.locationType)?source.locationType:DEFAULT_TACTICAL_ENVIRONMENT.locationType;
  const terrain=TERRAIN_TYPES.includes(source.terrain)?source.terrain:DEFAULT_TACTICAL_ENVIRONMENT.terrain;
  const zoneType=ZONE_TYPES.includes(source.zoneType)?source.zoneType:DEFAULT_TACTICAL_ENVIRONMENT.zoneType;
  const subtypes=ZONE_SUBTYPES[zoneType]||[""];
  const zoneSubtype=subtypes.includes(source.zoneSubtype)?source.zoneSubtype:(subtypes[0]||"");
  const timeOfDay=TIME_TYPES.includes(source.timeOfDay)?source.timeOfDay:DEFAULT_TACTICAL_ENVIRONMENT.timeOfDay;
  const weather=WEATHER_TYPES.includes(source.weather)?source.weather:DEFAULT_TACTICAL_ENVIRONMENT.weather;
  return {
    ...DEFAULT_TACTICAL_ENVIRONMENT,
    ...source,
    locationType,terrain,zoneType,zoneSubtype,timeOfDay,weather,
    hazardBaseCd:Math.max(1,Math.min(12,Number(source.hazardBaseCd||1))),
    hazardGrowthCd:Math.max(0,Math.min(6,Number(source.hazardGrowthCd??1))),
    mapAssetId:String(source.mapAssetId||""),
    mapVariantSeed:String(source.mapVariantSeed||"").slice(0,80),
    lightingPreset:String(source.lightingPreset||"auto"),
  };
}

export function environmentEffects(environment,language=languageCode()){
  const env=normalizeTacticalEnvironment(environment);
  const ru=language==="ru",uk=language==="uk",pl=language==="pl";
  const text=(en,ruText,ukText,plText)=>ru?ruText:uk?ukText:pl?plText:en;
  const effects=[];

  if(env.terrain==="wasteland") effects.push(text("Movement: normal.","Перемещение: обычное.","Переміщення: звичайне.","Ruch: normalny."));
  if(env.terrain==="forest") effects.push(text("Movement: difficult terrain; more cover.","Перемещение: сложный ландшафт; больше укрытий.","Переміщення: складний ландшафт; більше укриттів.","Ruch: trudny teren; więcej osłon."));
  if(env.terrain==="swamp") effects.push(text("Movement: difficult terrain; slowed movement.","Перемещение: сложный ландшафт; движение замедлено.","Переміщення: складний ландшафт; рух сповільнено.","Ruch: trudny teren; spowolniony ruch."));
  if(env.terrain==="ruins") effects.push(text("Movement: difficult terrain; obstacles and narrow routes.","Перемещение: сложный ландшафт; препятствия и узкие проходы.","Переміщення: складний ландшафт; перешкоди та вузькі проходи.","Ruch: trudny teren; przeszkody i wąskie przejścia."));

  if(env.timeOfDay==="night") effects.push(text("Night: Stealth easier; ranged attacks harder.","Ночь: скрытность легче; дальнобойные атаки сложнее.","Ніч: приховування легше; дальні атаки складніше.","Noc: skradanie łatwiejsze; ataki dystansowe trudniejsze."));
  else effects.push(text("Day: Stealth harder; ranged attacks easier.","День: скрытность сложнее; дальнобойные атаки легче.","День: приховування складніше; дальні атаки легше.","Dzień: skradanie trudniejsze; ataki dystansowe łatwiejsze."));

  if(env.weather==="fog") effects.push(text("Fog: ranged attacks and detection harder; Stealth easier.","Туман: дальнобойные проверки и обнаружение сложнее; скрытность легче.","Туман: дальні перевірки та виявлення складніше; приховування легше.","Mgła: ataki dystansowe i wykrywanie trudniejsze; skradanie łatwiejsze."));
  if(env.weather==="rain") effects.push(text("Rain: ranged attacks harder.","Дождь: дальнобойные проверки сложнее.","Дощ: дальні перевірки складніше.","Deszcz: ataki dystansowe trudniejsze."));
  if(env.weather==="clear") effects.push(text("Clear sky: no weather modifier.","Ясное небо: без погодного эффекта.","Ясне небо: без погодного ефекту.","Czyste niebo: bez modyfikatora pogody."));
  if(env.weather==="strong_wind") effects.push(text("Strong wind: ranged attacks harder.","Сильный ветер: дальнобойные проверки сложнее.","Сильний вітер: дальні перевірки складніше.","Silny wiatr: ataki dystansowe trudniejsze."));

  const damage={radioactive:text("radiation","радиационный","радіаційний","radiacyjny"),toxic:text("poison","яд","отрута","trucizna"),anomalous:text("energy","энергетический","енергетичний","energetyczny"),dangerous:text("physical","физический","фізичний","fizyczny")};
  if(env.zoneType!=="normal") effects.push(text(
    `Zone hazard: ${damage[env.zoneType]} damage at the start of each round, ${env.hazardBaseCd} CD initially, +${env.hazardGrowthCd} CD each round.`,
    `Опасность зоны: ${damage[env.zoneType]} урон в начале каждого раунда, старт ${env.hazardBaseCd} КУ, +${env.hazardGrowthCd} КУ каждый раунд.`,
    `Небезпека зони: ${damage[env.zoneType]} урон на початку кожного раунду, старт ${env.hazardBaseCd} КУ, +${env.hazardGrowthCd} КУ щораунду.`,
    `Zagrożenie strefy: obrażenia ${damage[env.zoneType]} na początku każdej rundy, start ${env.hazardBaseCd} CD, +${env.hazardGrowthCd} CD co rundę.`
  ));
  else effects.push(text("Zone: safe; no periodic damage.","Зона: безопасная; периодического урона нет.","Зона: безпечна; періодичної шкоди немає.","Strefa: bezpieczna; brak obrażeń okresowych."));

  return effects;
}
