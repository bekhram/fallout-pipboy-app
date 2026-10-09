// Pure document renderer: deliberately no React, storage, network or game mutations.
export const PRINT_COPY = {
  en: { action: 'PDF / Print', title: 'Character sheet', print: 'Print / Save as PDF', hint: 'Select “Save as PDF” or a printer in the system dialog. A4 · portrait. Disable browser headers and footers.', loading: 'Preparing character sheet…', blocked: 'Allow pop-ups for this site and try again.', error: 'The character sheet could not be prepared. Please try again.', native: 'Open the web version of the app in a browser to print or save this sheet as PDF.', close: 'Close', character: 'Character', origin: 'Origin', level: 'Level', xp: 'XP', skills: 'Skills', tag: 'Tag', rank: 'Rank', combat: 'Combat', defense: 'Defense', initiative: 'Initiative', melee: 'Melee damage bonus', health: 'HP: current / effective max / base max', luck: 'Luck points', radiation: 'Radiation damage', armor: 'Armor and hit locations', part: 'Location', physical: 'Phys.', energy: 'Energy', rad: 'Rad.', poison: 'Poison', hp: 'HP', state: 'Condition / injury', weapons: 'Weapons', name: 'Name', skill: 'Skill', damage: 'Damage', rate: 'Rate', range: 'Range', type: 'Type', effects: 'Effects / qualities', ammo: 'Ammunition', weight: 'Weight', qty: 'Qty', gear: 'Gear', caps: 'Caps', carry: 'Carry weight: current / maximum', perks: 'Perks and traits', description: 'Effect / description', conditions: 'Conditions and active effects', notes: 'Notes', backstory: 'Backstory', quests: 'Quest notes', empty: '—', snapshot: 'Current character snapshot. Situational attack options are not included.', robot: ['Optics', 'Main body', 'Arm 1', 'Arm 2', 'Arm 3', 'Thruster'], immune: 'Immune', powerArmor: 'Power armor', normalArmor: 'Normal armor', survival: 'Satiety / hydration / vigor / fatigue' },
  ru: { action: 'PDF / Печать', title: 'Лист персонажа', print: 'Печать / Сохранить PDF', hint: 'В системном окне выберите «Сохранить как PDF» или принтер. A4 · книжная ориентация. Отключите колонтитулы браузера.', loading: 'Подготовка листа персонажа…', blocked: 'Разрешите всплывающие окна для сайта и повторите попытку.', error: 'Не удалось подготовить лист персонажа. Повторите попытку.', native: 'Откройте веб-версию приложения в браузере для печати или сохранения листа в PDF.', close: 'Закрыть', character: 'Персонаж', origin: 'Происхождение', level: 'Уровень', xp: 'Опыт', skills: 'Навыки', tag: 'Тег', rank: 'Ранг', combat: 'Бой', defense: 'Защита', initiative: 'Инициатива', melee: 'Бонус урона в ближнем бою', health: 'HP: текущие / доступный макс. / базовый макс.', luck: 'Очки удачи', radiation: 'Радиационный урон', armor: 'Броня и зоны попадания', part: 'Зона', physical: 'Физ.', energy: 'Энерг.', rad: 'Рад.', poison: 'Яд', hp: 'HP', state: 'Состояние / травма', weapons: 'Оружие', name: 'Название', skill: 'Навык', damage: 'Урон', rate: 'Темп', range: 'Дист.', type: 'Тип', effects: 'Эффекты / свойства', ammo: 'Боеприпасы', weight: 'Вес', qty: 'Кол-во', gear: 'Снаряжение', caps: 'Крышки', carry: 'Вес: текущий / максимальный', perks: 'Перки и особенности', description: 'Эффект / описание', conditions: 'Состояния и активные эффекты', notes: 'Заметки', backstory: 'Предыстория', quests: 'Заметки о заданиях', empty: '—', snapshot: 'Снимок текущих значений персонажа. Ситуативные настройки атаки не включены.', robot: ['Оптика', 'Корпус', 'Манипулятор 1', 'Манипулятор 2', 'Манипулятор 3', 'Двигатель'], immune: 'Иммунитет', powerArmor: 'Силовая броня', normalArmor: 'Обычная броня', survival: 'Сытость / утоление жажды / бодрость / усталость' },
  uk: { action: 'PDF / Друк', title: 'Аркуш персонажа', print: 'Друк / Зберегти PDF', hint: 'У системному вікні виберіть «Зберегти як PDF» або принтер. A4 · книжкова орієнтація. Вимкніть колонтитули браузера.', loading: 'Підготовка аркуша персонажа…', blocked: 'Дозвольте спливні вікна для сайту та повторіть спробу.', error: 'Не вдалося підготувати аркуш персонажа. Повторіть спробу.', native: 'Відкрийте вебверсію застосунку в браузері для друку або збереження аркуша у PDF.', close: 'Закрити', character: 'Персонаж', origin: 'Походження', level: 'Рівень', xp: 'Досвід', skills: 'Навички', tag: 'Тег', rank: 'Ранг', combat: 'Бій', defense: 'Захист', initiative: 'Ініціатива', melee: 'Бонус шкоди у ближньому бою', health: 'HP: поточні / доступний макс. / базовий макс.', luck: 'Очки удачі', radiation: 'Радіаційна шкода', armor: 'Броня та зони влучання', part: 'Зона', physical: 'Фіз.', energy: 'Енерг.', rad: 'Рад.', poison: 'Отрута', hp: 'HP', state: 'Стан / травма', weapons: 'Зброя', name: 'Назва', skill: 'Навичка', damage: 'Шкода', rate: 'Темп', range: 'Дист.', type: 'Тип', effects: 'Ефекти / властивості', ammo: 'Боєприпаси', weight: 'Вага', qty: 'Кіл-ть', gear: 'Спорядження', caps: 'Кришки', carry: 'Вага: поточна / максимальна', perks: 'Перки та особливості', description: 'Ефект / опис', conditions: 'Стани та активні ефекти', notes: 'Нотатки', backstory: 'Передісторія', quests: 'Нотатки про завдання', empty: '—', snapshot: 'Знімок поточних значень персонажа. Ситуативні налаштування атаки не включено.', robot: ['Оптика', 'Корпус', 'Маніпулятор 1', 'Маніпулятор 2', 'Маніпулятор 3', 'Рушій'], immune: 'Імунітет', powerArmor: 'Силова броня', normalArmor: 'Звичайна броня', survival: 'Ситість / втамування спраги / бадьорість / втома' },
  pl: { action: 'PDF / Drukuj', title: 'Karta postaci', print: 'Drukuj / Zapisz PDF', hint: 'W oknie systemowym wybierz „Zapisz jako PDF” lub drukarkę. A4 · pionowo. Wyłącz nagłówki i stopki przeglądarki.', loading: 'Przygotowywanie karty postaci…', blocked: 'Zezwól na wyskakujące okna i spróbuj ponownie.', error: 'Nie udało się przygotować karty postaci. Spróbuj ponownie.', native: 'Otwórz wersję internetową aplikacji w przeglądarce, aby wydrukować kartę lub zapisać PDF.', close: 'Zamknij', character: 'Postać', origin: 'Pochodzenie', level: 'Poziom', xp: 'PD', skills: 'Umiejętności', tag: 'Tag', rank: 'Ranga', combat: 'Walka', defense: 'Obrona', initiative: 'Inicjatywa', melee: 'Premia obrażeń wręcz', health: 'PZ: obecne / dostępne maks. / bazowe maks.', luck: 'Punkty szczęścia', radiation: 'Obrażenia radiacyjne', armor: 'Pancerz i lokacje trafień', part: 'Lokacja', physical: 'Fiz.', energy: 'Energ.', rad: 'Rad.', poison: 'Truc.', hp: 'PZ', state: 'Stan / uraz', weapons: 'Broń', name: 'Nazwa', skill: 'Umiejętność', damage: 'Obraż.', rate: 'Szybk.', range: 'Zasięg', type: 'Typ', effects: 'Efekty / właściwości', ammo: 'Amunicja', weight: 'Waga', qty: 'Ilość', gear: 'Ekwipunek', caps: 'Kapsle', carry: 'Udźwig: obecny / maksymalny', perks: 'Perki i cechy', description: 'Efekt / opis', conditions: 'Stany i aktywne efekty', notes: 'Notatki', backstory: 'Historia postaci', quests: 'Notatki z zadań', empty: '—', snapshot: 'Bieżące wartości postaci. Sytuacyjne ustawienia ataku nie są uwzględnione.', robot: ['Optyka', 'Korpus', 'Ramię 1', 'Ramię 2', 'Ramię 3', 'Napęd'], immune: 'Odporność', powerArmor: 'Pancerz wspomagany', normalArmor: 'Zwykły pancerz', survival: 'Sytość / nawodnienie / wigor / zmęczenie' },
};

export function getPrintLanguage(language) {
  const code = String(language || 'en').toLowerCase().split('-')[0];
  return Object.hasOwn(PRINT_COPY, code) ? code : 'en';
}

export function escapePrintText(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function makePrintFileName(name) {
  const clean = String(name || 'Character').normalize('NFC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').replace(/[. ]+$/g, '').trim();
  return `PIP-2D20_${clean || 'Character'}`;
}

const STYLE = `
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body { margin:0; background:#e9e9e5; color:#191b17; font:10pt/1.35 Arial,Helvetica,sans-serif; }
.toolbar { padding:16px; background:white; border-bottom:1px solid #bbb; }
.toolbar p { margin:8px 0 0; }
button { font:inherit; padding:9px 14px; margin-right:8px; cursor:pointer; }
main { max-width:210mm; margin:18px auto; background:white; padding:12mm; }
header { border-bottom:2px solid #252c20; padding-bottom:8px; margin-bottom:10px; }
.brand { font-size:10pt; letter-spacing:2px; font-weight:bold; }
h1 { font-size:22pt; margin:4px 0; overflow-wrap:anywhere; }
h2 { font-size:11pt; text-transform:uppercase; letter-spacing:.6px; margin:12px 0 5px; padding:5px 7px; border-left:4px solid #677855; background:#f0f2ed; break-after:avoid; }
h3 { font-size:10pt; margin:9px 0 4px; break-after:avoid; }
p { margin:4px 0; } .muted { color:#555; font-size:8pt; }
.identity, .special, .stat-grid { display:grid; gap:6px; }
.identity { grid-template-columns:2fr 1fr 1fr; }
.special { grid-template-columns:repeat(7,minmax(0,1fr)); margin:12px 0; }
.special div { border:1px solid #777; text-align:center; padding:6px 1px; }
.special strong { display:block; font-size:21pt; }
.stat-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
.stat { border:1px solid #aaa; padding:6px; overflow-wrap:anywhere; }
.stat span { display:block; font-size:8pt; } .stat strong { display:block; font-size:13pt; }
.overview { display:grid; grid-template-columns:34% minmax(0,1fr); gap:12px; align-items:start; }
table { border-collapse:collapse; table-layout:fixed; width:100%; font-size:8pt; }
th,td { border:1px solid #999; padding:4px 5px; vertical-align:top; overflow-wrap:anywhere; white-space:pre-wrap; }
th { background:#f0f2ed; text-align:left; font-weight:bold; }
thead { display:table-header-group; } tfoot { display:table-footer-group; }
tr { break-inside:avoid; page-break-inside:avoid; } tr.long-row { break-inside:auto; page-break-inside:auto; }
.narrow th,.narrow td { padding:4px 3px; font-size:7.5pt; }
.page-section { break-before:page; page-break-before:always; }
.text-block { white-space:pre-wrap; overflow-wrap:anywhere; orphans:3; widows:3; }
section { margin-bottom:10px; } footer { margin-top:15px; padding-top:6px; border-top:1px solid #aaa; }
@media print {
 body { background:white; color:black; }
 .toolbar { display:none!important; }
 main { max-width:none; margin:0; padding:0; }
 .overview, .special, header { break-inside:avoid; page-break-inside:avoid; }
 h2 { background:white; border-bottom:1px solid #888; }
 th { background:white; }
}
@media screen and (max-width:600px) {
 main { margin:0; padding:16px; min-width:0; }
 .overview { display:block; } .identity { grid-template-columns:1fr 1fr; }
 .stat-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
 .special { gap:3px; } .special strong { font-size:17pt; }
}
`;

export function buildCharacterPrintDocument(model, language = 'en') {
  const lang = getPrintLanguage(language), c = PRINT_COPY[lang], e = escapePrintText;
  const text = value => e(value === '' || value == null ? c.empty : value);
  const table = (headers, rows = [], widths, narrow = false) => `<table${narrow ? ' class="narrow"' : ''}>${widths ? `<colgroup>${widths.map(w => `<col style="width:${w}%">`).join('')}</colgroup>` : ''}<thead><tr>${headers.map(h => `<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr${row.some(v => String(v ?? '').length > 700) ? ' class="long-row"' : ''}>${row.map(v => `<td>${text(v)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">${e(c.empty)}</td></tr>`}</tbody></table>`;
  const section = (title, content) => `<section><h2>${e(title)}</h2>${content}</section>`;
  const stat = (label, value) => `<div class="stat"><span>${e(label)}</span><strong>${text(value)}</strong></div>`;
  const list = rows => (rows || []).map(row => `<p class="text-block">${text(row)}</p>`).join('') || e(c.empty);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(makePrintFileName(model.name))}</title><style>${STYLE}</style></head><body>
<div class="toolbar"><button id="print-sheet" type="button">${e(c.print)}</button><button id="close-sheet" type="button">${e(c.close)}</button><p>${e(c.hint)}</p></div>
<main><header><div class="brand">PIP-2D20 · ${e(c.title)}</div><h1>${text(model.name)}</h1><div class="identity"><span>${e(c.origin)}: <b>${text(model.origin)}</b></span><span>${e(c.level)}: <b>${text(model.level)}</b></span><span>${e(c.xp)}: <b>${text(model.xp)}</b></span></div></header>
<div class="special">${(model.special || []).map(([key,value]) => `<div>${e(key)}<strong>${text(value)}</strong></div>`).join('')}</div>
<div class="overview"><div>${section(c.skills, table([c.name,c.tag,c.rank], model.skills, [68,14,18]))}</div><div>
${section(c.combat, `<div class="stat-grid">${stat(c.defense,model.defense)}${stat(c.initiative,model.initiative)}${stat(c.melee,model.melee)}${stat(c.luck,model.luck)}${stat(c.radiation,model.radiation)}${stat(c.caps,model.caps)}</div><p><b>${e(c.health)}:</b> ${text(model.health)}</p>`)}
${section(c.armor, `<p class="muted">${text(model.armorMode)}</p>${table([c.part,c.physical,c.energy,c.rad,c.poison,c.hp,c.state],model.armor,[25,10,10,10,10,10,25],true)}`)}
</div></div>
${section(c.weapons, table([c.name,c.skill,c.damage,c.type,c.rate,c.range,({ru:'Боепр.',uk:'Боєпр.',pl:'Amun.',en:'Ammo'}[lang]),c.weight,c.effects],model.weapons,[18,12,7,8,6,8,9,6,26],true))}
<div class="page-section"><header><div class="brand">PIP-2D20 · ${e(c.gear)}</div><h1>${text(model.name)}</h1></header>
<p><b>${e(c.caps)}:</b> ${text(model.caps)} · <b>${e(c.carry)}:</b> ${text(model.carry)}</p>
${section(c.ammo,table([c.name,c.qty,c.weight],model.ammo,[66,17,17]))}
${section(c.gear,table([c.name,c.qty,c.weight,c.description],model.gear,[35,10,10,45]))}
${section(c.perks,table([c.name,c.rank,c.description],model.perks,[28,9,63]))}
</div>
${model.conditions?.length ? section(c.conditions, `<p>${e(c.survival)}: ${text(model.survival)}</p>${list(model.conditions)}`) : section(c.conditions, `<p>${e(c.survival)}: ${text(model.survival)}</p>`)}
${model.backstory || model.quests ? section(c.notes, `${model.backstory ? `<h3>${e(c.backstory)}</h3><div class="text-block">${text(model.backstory)}</div>` : ''}${model.quests ? `<h3>${e(c.quests)}</h3><div class="text-block">${text(model.quests)}</div>` : ''}`) : ''}
<footer class="muted">${e(c.snapshot)}</footer></main></body></html>`;
}
