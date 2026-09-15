const FOOD = {
  "Angler Meat": { ru:["Мясо удильщика",""], uk:["М’ясо вудильника",""], pl:["Mięso wędkarza","" ] },
  "Cave Cricket Meat": { ru:["Мясо пещерного сверчка",""], uk:["М’ясо печерного цвіркуна",""], pl:["Mięso jaskiniowego świerszcza",""] },
  "Cazador Egg": { ru:["Яйцо касадора",""], uk:["Яйце касадора",""], pl:["Jajo cazadora",""] },
  "Cazador Omelet": { ru:["Омлет из яйца касадора","Иммунитет к яду до конца сцены."], uk:["Омлет із яйця касадора","Імунітет до отрути до кінця сцени."], pl:["Omlet z jaja cazadora","Odporność na truciznę do końca sceny."] },
  "Crispy Cave Cricket": { ru:["Хрустящий пещерный сверчок","Можно перебросить один d20 в проверках AGI до конца сцены."], uk:["Хрусткий печерний цвіркун","Можна перекинути один d20 у перевірках AGI до кінця сцени."], pl:["Chrupiący jaskiniowy świerszcz","Możesz przerzucić jedną k20 w testach AGI do końca sceny."] },
  "Gecko Kebab": { ru:["Кебаб из геккона",""], uk:["Кебаб із гекона",""], pl:["Kebab z gekona",""] },
  "Gecko Meat": { ru:["Мясо геккона",""], uk:["М’ясо гекона",""], pl:["Mięso gekona",""] },
  "Giant Ant Meat": { ru:["Мясо гигантского муравья",""], uk:["М’ясо гігантської мурахи",""], pl:["Mięso olbrzymiej mrówki",""] },
  "Giant Mantis Foreleg": { ru:["Передняя лапа гигантского богомола",""], uk:["Передня лапа гігантського богомола",""], pl:["Przednia noga olbrzymiej modliszki",""] },
  "Grilled Giant Mantis": { ru:["Жареный гигантский богомол","Можно перебросить один d20 в проверках Скрытности до конца сцены."], uk:["Смажений гігантський богомол","Можна перекинути один d20 у перевірках Скритності до кінця сцени."], pl:["Grillowana olbrzymia modliszka","Możesz przerzucić jedną k20 w testach Skradania do końca sceny."] },
  "Gulper Innards": { ru:["Внутренности глотателя",""], uk:["Нутрощі ковтача",""], pl:["Wnętrzności gulpera",""] },
  "Gulper Slurry": { ru:["Похлёбка из глотателя","Энергетическое сопротивление +1 до конца следующей сцены."], uk:["Юшка з ковтача","Енергетичний опір +1 до кінця наступної сцени."], pl:["Papka z gulpera","Odporność energetyczna +1 do końca następnej sceny."] },
  "Hermit Crab Meat": { ru:["Мясо краба-отшельника",""], uk:["М’ясо краба-самітника",""], pl:["Mięso kraba pustelnika",""] },
  "Hermit Crab Steak": { ru:["Стейк из краба-отшельника","Грузоподъёмность удваивается до конца сцены."], uk:["Стейк із краба-самітника","Вантажопідйомність подвоюється до кінця сцени."], pl:["Stek z kraba pustelnika","Udźwig podwaja się do końca sceny."] },
  "Honey": { ru:["Мёд","Можно добавить к блюду; сладкое блюдо увеличивает лимит AP на 1 до конца следующей сцены."], uk:["Мед","Можна додати до страви; солодка страва збільшує ліміт AP на 1 до кінця наступної сцени."], pl:["Miód","Można dodać do potrawy; słodkie danie zwiększa limit PA o 1 do końca następnej sceny."] },
  "Honey Cake": { ru:["Медовый пирог","Радиационное сопротивление +3 до конца следующей сцены."], uk:["Медовий пиріг","Радіаційний опір +3 до кінця наступної сцени."], pl:["Ciasto miodowe","Odporność na promieniowanie +3 do końca następnej sceny."] },
  "Honeycomb": { ru:["Медовые соты",""], uk:["Медові стільники",""], pl:["Plaster miodu",""] },
  "Lamb Chops": { ru:["Бараньи отбивные","Бонус к урону ближнего боя +1 до конца сцены."], uk:["Баранячі відбивні","Бонус до шкоди ближнього бою +1 до кінця сцени."], pl:["Kotleciki jagnięce","Premia do obrażeń wręcz +1 do końca sceny."] },
  "Lure Weed": { ru:["Приманочная трава",""], uk:["Приманна трава",""], pl:["Wabikowe ziele",""] },
  "Mega Sloth Meat": { ru:["Мясо мегаленивца",""], uk:["М’ясо мегалінивця",""], pl:["Mięso megaslotha",""] },
  "Mega Sloth Mushroom": { ru:["Гриб мегаленивца",""], uk:["Гриб мегалінивця",""], pl:["Grzyb megaslotha",""] },
  "Mega Sloth Steak": { ru:["Стейк из мегаленивца","Физическое и энергетическое сопротивление +2 до конца сцены."], uk:["Стейк із мегалінивця","Фізичний та енергетичний опір +2 до кінця сцени."], pl:["Stek z megaslotha","Odporność fizyczna i energetyczna +2 do końca sceny."] },
  "Mega Sloth Mushroom Soup": { ru:["Грибной суп мегаленивца","До конца следующей сцены критические попадания наносят цели ещё +2 CD урона."], uk:["Грибний суп мегалінивця","До кінця наступної сцени критичні влучання завдають цілі ще +2 CD шкоди."], pl:["Zupa grzybowa z megaslotha","Do końca następnej sceny trafienia krytyczne zadają celowi dodatkowe +2 CD obrażeń."] },
  "Mongrel Ribs": { ru:["Рёбра дворняги","До конца сцены видите в полной темноте без штрафа от плохого освещения."], uk:["Ребра дворняги","До кінця сцени бачите в повній темряві без штрафу від поганого освітлення."], pl:["Żebra kundla","Do końca sceny widzisz w całkowitej ciemności bez kary za słabe oświetlenie."] },
  "Mutton Meat Pie": { ru:["Мясной пирог из баранины","Бонус к урону ближнего боя +1 до конца следующей сцены."], uk:["М’ясний пиріг із баранини","Бонус до шкоди ближнього бою +1 до кінця наступної сцени."], pl:["Barani placek mięsny","Premia do obrażeń wręcz +1 do końca następnej sceny."] },
  "Poached Angler": { ru:["Варёный удильщик","До конца сцены подводные атаки и передвижение не получают дополнительной сложности."], uk:["Варений вудильник","До кінця сцени підводні атаки й пересування не отримують додаткової складності."], pl:["Gotowany wędkarz","Do końca sceny ataki i ruch pod wodą nie otrzymują dodatkowej trudności."] },
  "Radrat Meat": { ru:["Мясо радкрысы",""], uk:["М’ясо радщура",""], pl:["Mięso rad-szczura",""] },
  "Roasted Radrat": { ru:["Жареная радкрыса","Общий запас группы получает +1 AP до конца сцены."], uk:["Смажений радщур","Спільний запас групи отримує +1 AP до кінця сцени."], pl:["Pieczony rad-szczur","Wspólna pula drużyny otrzymuje +1 PA do końca sceny."] },
  "Scorchbeast Meat": { ru:["Мясо зверожога",""], uk:["М’ясо звіропала",""], pl:["Mięso scorchbeasta",""] },
  "Scorchbeast Steak": { ru:["Стейк из зверожога","Восстанавливает 1 очко Удачи."], uk:["Стейк зі звіропала","Відновлює 1 очко Удачі."], pl:["Stek ze scorchbeasta","Przywraca 1 punkt Szczęścia."] },
  "Scorchbeast Stew": { ru:["Рагу из зверожога","Радиационное сопротивление +3 до конца следующей сцены."], uk:["Рагу зі звіропала","Радіаційний опір +3 до кінця наступної сцени."], pl:["Gulasz ze scorchbeasta","Odporność na promieniowanie +3 do końca następnej sceny."] },
  "Sheepsquatch Meat": { ru:["Мясо овцебеста",""], uk:["М’ясо вівцезвіра",""], pl:["Mięso sheepsquatcha",""] },
  "Snallygaster Innards": { ru:["Внутренности сналлигастера",""], uk:["Нутрощі сналлігастера",""], pl:["Wnętrzności snallygastera",""] },
  "Snallygaster Stew": { ru:["Рагу из сналлигастера","Сопротивление яду +2 до конца следующей сцены."], uk:["Рагу зі сналлігастера","Опір отруті +2 до кінця наступної сцени."], pl:["Gulasz ze snallygastera","Odporność na truciznę +2 do końca następnej sceny."] },
};

const key = (value) => String(value || "").trim();

export function getSupplementalFoodLocalization(item, language = "en") {
  const canonicalName = key(item?.canonicalName || item?.name);
  const entry = FOOD[canonicalName];
  if (!entry) return null;
  const lang = String(language || "en").split("-")[0];
  if (lang === "en") return { displayName: item?.name || canonicalName, displayEffect: item?.effect || "" };
  const pair = entry[lang] || entry.ru;
  return { displayName: pair?.[0] || item?.name || canonicalName, displayEffect: pair?.[1] || item?.effect || "" };
}

export function translateSupplementalFoodName(name, language = "en") {
  return getSupplementalFoodLocalization({ name }, language)?.displayName || "";
}

export function translateSupplementalFoodEffect(name, effect, language = "en") {
  return getSupplementalFoodLocalization({ name, effect }, language)?.displayEffect || "";
}
