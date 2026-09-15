const LANG_INDEX = { ru: 0, uk: 1, pl: 2 };

export const LEGENDARY_NAMES = {
  "Assassin's": ["Убийцы", "Убивці", "Zabójcy"], "Berserker's": ["Берсерка", "Берсерка", "Berserkera"],
  "Blazing": ["Пылающее", "Палаюче", "Płonąca"], "Bloodied": ["Кровавое", "Криваве", "Krwawa"],
  "Cavalier's": ["Кавалериста", "Кавалериста", "Kawalerzysty"], "Charged": ["Заряженное", "Заряджене", "Naładowana"],
  "Crippling": ["Калечащее", "Калічне", "Okaleczająca"], "Deadeye": ["Меткий стрелок", "Влучне", "Sokole oko"],
  "Defiant": ["Непокорное", "Непокірне", "Nieugięta"], "Duelist's": ["Дуэлянта", "Дуелянта", "Pojedynkowicza"],
  "Enraging": ["Яростное", "Розлючуюче", "Rozwścieczająca"], "Explosive": ["Взрывное", "Вибухове", "Wybuchowa"],
  "Exterminator's": ["Истребителя", "Винищувача", "Tępiciela"], "Freezing": ["Замораживающее", "Заморожувальне", "Mrożąca"],
  "Frigid": ["Ледяное", "Крижане", "Lodowa"], "Furious": ["Яростное", "Люте", "Furia"],
  "Ghoul Slayer's": ["Убийцы гулей", "Убивці гулів", "Pogromcy ghuli"], "Hitman's": ["Киллерское", "Кілерське", "Zabójcza"],
  "Hunter's": ["Охотника", "Мисливця", "Łowcy"], "Incendiary": ["Зажигательное", "Запалювальне", "Zapalająca"],
  "Instigating": ["Провоцирующее", "Провокуюче", "Inicjująca"], "Irradiated": ["Облучённое", "Опромінене", "Napromieniowana"],
  "Junkie's": ["Наркомана", "Наркомана", "Ćpuna"], "Kneecapper": ["Подсекатель", "Підсікач", "Podcinająca"],
  "Lucky": ["Удачливое", "Щасливе", "Szczęśliwa"], "Mighty": ["Могучее", "Могутнє", "Potężna"],
  "Mutant Slayer's": ["Убийцы мутантов", "Убивці мутантів", "Pogromcy mutantów"], "Nimble": ["Проворное", "Спритне", "Zwinna"],
  "Nocturnal": ["Ночное", "Нічне", "Nocna"], "Penetrating": ["Пробивающее", "Пробивне", "Penetrująca"],
  "Plasma Infused": ["Плазменное", "Плазмове", "Plazmowa"], "Poisoner's": ["Отравителя", "Отруйника", "Truciciela"],
  "Powerful": ["Мощное", "Потужне", "Mocna"], "Quickdraw": ["Быстрое извлечение", "Швидке вихоплення", "Szybkie dobycie"],
  "Rapid": ["Скорострельное", "Скорострільне", "Szybkostrzelna"], "Relentless": ["Неумолимое", "Невблаганне", "Nieustępliwa"],
  "Sentinel's": ["Стража", "Вартового", "Strażnika"], "Staggering": ["Ошеломляющее", "Приголомшливе", "Ogłuszająca"],
  "Stalker's": ["Преследователя", "Переслідувача", "Tropiciela"], "Steadfast": ["Стойкое", "Стійке", "Niezachwiana"],
  "Troubleshooter's": ["Роботоборца", "Роботоборця", "Pogromcy robotów"], "Two-Shot": ["Двухзарядное", "Двопострільне", "Dwustrzałowa"],
  "Violent": ["Жестокое", "Жорстоке", "Brutalna"], "Wounding": ["Ранящее", "Раняче", "Raniąca"],
  "Acrobat's": ["Акробата", "Акробата", "Akrobaty"], "Auto Stim": ["Автостим", "Автостим", "Autostym"],
  "Bolstering": ["Укрепляющее", "Зміцнювальне", "Wzmacniający"], "Chameleon": ["Хамелеон", "Хамелеон", "Kameleon"],
  "Champion": ["Чемпиона", "Чемпіона", "Czempiona"], "Cloaking": ["Маскирующее", "Маскувальне", "Maskujący"],
  "Cryogenic": ["Криогенное", "Кріогенне", "Kriogeniczny"], "Cunning": ["Хитрое", "Хитре", "Przebiegły"],
  "Martyr's": ["Мученика", "Мученика", "Męczennika"], "Powered": ["Энергетическое", "Енергетичне", "Zasilany"],
  "Punishing": ["Карающее", "Каральне", "Karzący"], "Rad Powered": ["Радиационно-заряженное", "Радіаційно-заряджене", "Napędzany radiacją"],
  "Safecracker's": ["Медвежатника", "Зломщика", "Włamywacza"], "Sharp": ["Острое", "Гостре", "Bystry"],
  "Sprinter's": ["Спринтера", "Спринтера", "Sprintera"], "Unyielding": ["Несгибаемое", "Непохитне", "Nieustępliwy"]
};

export const WEAPON_NAMES_SUPPLEMENTAL = {
  ".357 Magnum Revolver": ["Револьвер .357 Магнум", "Револьвер .357 Магнум", "Rewolwer .357 Magnum"],
  "12.7mm Pistol": ["Пистолет 12,7 мм", "Пістолет 12,7 мм", "Pistolet 12,7 mm"],
  "12.7mm SMG": ["Пистолет-пулемёт 12,7 мм", "Пістолет-кулемет 12,7 мм", "Pistolet maszynowy 12,7 mm"],
  "25mm Grenade APW": ["25-мм гранатомёт APW", "25-мм гранатомет APW", "Granatnik 25 mm APW"],
  "9mm Pistol": ["9-мм пистолет", "9-мм пістолет", "Pistolet 9 mm"],
  "Anti-Materiel Rifle": ["Крупнокалиберная винтовка", "Великокаліберна гвинтівка", "Karabin przeciwmateriałowy"],
  "Battle Rifle": ["Боевая винтовка", "Бойова гвинтівка", "Karabin bojowy"],
  "Black Powder Blunderbuss": ["Чёрнопороховый мушкетон", "Чорнопороховий мушкетон", "Garłacz czarnoprochowy"],
  "Black Powder Pistol": ["Чёрнопороховый пистолет", "Чорнопороховий пістолет", "Pistolet czarnoprochowy"],
  "Black Powder Rifle": ["Чёрнопороховая винтовка", "Чорнопорохова гвинтівка", "Karabin czarnoprochowy"],
  "Gauss Pistol": ["Пистолет Гаусса", "Пістолет Гауса", "Pistolet Gaussa"], "Gauss Shotgun": ["Дробовик Гаусса", "Дробовик Гауса", "Strzelba Gaussa"],
  "Lever-Action Rifle": ["Винтовка с рычажным затвором", "Гвинтівка з важільним затвором", "Karabin dźwigniowy"],
  "Light Machine Gun": ["Ручной пулемёт", "Ручний кулемет", "Lekki karabin maszynowy"], "Pump-Action Shotgun": ["Помповый дробовик", "Помповий дробовик", "Strzelba pump-action"],
  "Radium Rifle": ["Радиевая винтовка", "Радієва гвинтівка", "Karabin radowy"], "Sniper Rifle": ["Снайперская винтовка", "Снайперська гвинтівка", "Karabin snajperski"],
  "Alien Atomizer": ["Инопланетный атомизатор", "Інопланетний атомізатор", "Atomizer obcych"], "Alien Disintegrator": ["Инопланетный дезинтегратор", "Інопланетний дезінтегратор", "Dezintegrator obcych"],
  "Arc Welder": ["Дуговой сварочник", "Дуговий зварювач", "Spawarka łukowa"], "Assaultron Head": ["Голова штурмотрона", "Голова штурмотрона", "Głowa Assaultrona"],
  "Microwave Emitter": ["Микроволновый излучатель", "Мікрохвильовий випромінювач", "Emiter mikrofalowy"], "Tesla Rifle": ["Винтовка Тесла", "Гвинтівка Тесла", "Karabin Tesli"],
  ".50 Cal Machine Gun": ["Пулемёт .50 калибра", "Кулемет .50 калібру", "Karabin maszynowy .50"], "Auto Grenade Launcher": ["Автоматический гранатомёт", "Автоматичний гранатомет", "Automatyczny granatnik"],
  "Drone Cannon": ["Пушка дрона", "Гармата дрона", "Działo drona"], "Gatling Gun": ["Пулемёт Гатлинга", "Кулемет Гатлінга", "Karabin Gatlinga"],
  "Gatling Plasma": ["Плазма Гатлинга", "Плазма Гатлінга", "Plazma Gatlinga"], "Gauss Minigun": ["Миниган Гаусса", "Мініган Гауса", "Minigun Gaussa"],
  "Plasma Caster": ["Плазменный кастер", "Плазмовий кастер", "Miotacz plazmy"], "Tesla Cannon": ["Пушка Тесла", "Гармата Тесла", "Działo Tesli"],
  "Bow": ["Лук", "Лук", "Łuk"], "Crossbow": ["Арбалет", "Арбалет", "Kusza"],
  "Assaultron Blade": ["Клинок штурмотрона", "Клинок штурмотрона", "Ostrze Assaultrona"], "Auto-Axe": ["Автотопор", "Автосокира", "Auto-topór"],
  "Ballistic Fist": ["Баллистический кулак", "Балістичний кулак", "Pięść balistyczna"], "Bumper Sword": ["Меч из бампера", "Меч із бампера", "Miecz ze zderzaka"],
  "Cattle Prod": ["Электропогонялка", "Електропоганялка", "Poganiacz elektryczny"], "Chainsaw": ["Бензопила", "Бензопила", "Piła łańcuchowa"],
  "Death Tambo": ["Тамбурин смерти", "Тамбурин смерті", "Tamburyn śmierci"], "Displacer Glove": ["Перчатка-дисплейсер", "Рукавиця-дисплейсер", "Rękawica przemieszczenia"],
  "Guitar Sword": ["Гитара-меч", "Гітара-меч", "Gitara-miecz"], "Mr Handy Buzz Blade": ["Дисковый клинок мистера Помощника", "Дисковий клинок містера Помічника", "Wirujące ostrze Mr Handy"],
  "Multi-Purpose Axe": ["Многоцелевой топор", "Багатоцільова сокира", "Topór wielofunkcyjny"], "Proton Axe": ["Протонный топор", "Протонна сокира", "Topór protonowy"],
  "War Drum": ["Боевой барабан", "Бойовий барабан", "Bęben wojenny"], "Cryogenic Grenade": ["Криогенная граната", "Кріогенна граната", "Granat kriogeniczny"],
  "Cryo Mine": ["Криомина", "Кріоміна", "Mina kriogeniczna"], "Detonator": ["Детонатор", "Детонатор", "Detonator"], "Dynamite": ["Динамит", "Динаміт", "Dynamit"],
  "Dynamite Bundle": ["Связка динамита", "Зв'язка динаміту", "Wiązka dynamitu"], "Flash Bang": ["Светошумовая граната", "Світлошумова граната", "Granat hukowo-błyskowy"],
  "Frag Grenade MIRV": ["Осколочная граната MIRV", "Осколкова граната MIRV", "Granat odłamkowy MIRV"], "Plastic Explosives": ["Пластичная взрывчатка", "Пластична вибухівка", "Plastyczny materiał wybuchowy"],
  "Powder Charge": ["Пороховой заряд", "Пороховий заряд", "Ładunek prochowy"], "Smoke Grenade": ["Дымовая граната", "Димова граната", "Granat dymny"]
};

export const ARMOR_NAMES_SUPPLEMENTAL = {
  "Beer Hat": ["Пивная шляпа", "Пивний капелюх", "Piwna czapka"], "Marine Tactical Helmet": ["Тактический шлем морпеха", "Тактичний шолом морпіха", "Hełm taktyczny piechoty morskiej"],
  "Spacesuit Helmet": ["Шлем скафандра", "Шолом скафандра", "Hełm skafandra"], "Marine Wetsuit": ["Гидрокостюм морпеха", "Гідрокостюм морпіха", "Pianka piechoty morskiej"],
  "Underarmor Suit": ["Подброневый костюм", "Підброньовий костюм", "Kombinezon pod pancerz"], "Brotherhood Armored Battlecoat": ["Бронированный боевой плащ Братства", "Броньований бойовий плащ Братства", "Opancerzony płaszcz bojowy Bractwa"],
  "Brotherhood Bomber Jacket": ["Куртка-бомбер Братства", "Куртка-бомбер Братства", "Kurtka bomberka Bractwa"], "Cleanroom Suit": ["Костюм чистой комнаты", "Костюм чистої кімнати", "Kombinezon do pomieszczeń czystych"],
  "Hunter's Pelt Outfit": ["Костюм из шкуры охотника", "Костюм зі шкури мисливця", "Strój z futra łowcy"], "Hunter's Hood": ["Капюшон охотника", "Каптур мисливця", "Kaptur łowcy"],
  "Spacesuit Costume": ["Костюм скафандра", "Костюм скафандра", "Kostium skafandra"], "Chinese Stealth Armor": ["Китайская стелс-броня", "Китайська стелс-броня", "Chiński pancerz maskujący"],
  "Diving Suit": ["Водолазный костюм", "Водолазний костюм", "Skafander nurkowy"], "Recon Armor": ["Разведывательная броня", "Розвідувальна броня", "Pancerz zwiadowczy"],
  "Legatus Helmet": ["Шлем легата", "Шолом легата", "Hełm legata"]
};

export const MOD_NAMES_SUPPLEMENTAL = {
  "Capacitor Mk III": ["Конденсатор Mk III", "Конденсатор Mk III", "Kondensator Mk III"], "Capacitor Mk IV": ["Конденсатор Mk IV", "Конденсатор Mk IV", "Kondensator Mk IV"],
  "Capacitor Mk V": ["Конденсатор Mk V", "Конденсатор Mk V", "Kondensator Mk V"], "Capacitor Mk VI": ["Конденсатор Mk VI", "Конденсатор Mk VI", "Kondensator Mk VI"],
  "Heavy Barrel": ["Тяжёлый ствол", "Важкий ствол", "Ciężka lufa"], "25mm Grenade Receiver": ["Ствольная коробка под 25-мм гранаты", "Ствольна коробка під 25-мм гранати", "Komora na granaty 25 mm"],
  "Speedy Receiver": ["Скоростная ствольная коробка", "Швидкісна ствольна коробка", "Szybka komora"], "Extra-Large Magazine": ["Сверхбольшой магазин", "Надвеликий магазин", "Bardzo duży magazynek"],
  "Front Sight Ring": ["Кольцевая мушка", "Кільцева мушка", "Muszka pierścieniowa"], "Large Bayonet": ["Большой штык", "Великий багнет", "Duży bagnet"],
  "Ported Barrel": ["Портированный ствол", "Портований ствол", "Lufa portowana"], "Tesla Coil Capacitor": ["Конденсатор катушки Тесла", "Конденсатор котушки Тесла", "Kondensator cewki Tesli"],
  "Tesla Coil Dynamo": ["Динамо катушки Тесла", "Динамо котушки Тесла", "Dynamo cewki Tesli"], "Calibrated Capacitor": ["Калиброванный конденсатор", "Калібрований конденсатор", "Kalibrowany kondensator"],
  "Pulse Capacitor": ["Импульсный конденсатор", "Імпульсний конденсатор", "Kondensator impulsowy"], "High Speed Electrode": ["Высокоскоростной электрод", "Високошвидкісний електрод", "Elektroda wysokiej prędkości"],
  "Compound Frame": ["Составная рама", "Складена рама", "Rama kompozytowa"], "Iron Sights": ["Механический прицел", "Механічний приціл", "Przyrządy mechaniczne"],
  "Glow Sights": ["Светящиеся прицелы", "Світні приціли", "Świecące przyrządy"], "Heavy Frame": ["Тяжёлая рама", "Важка рама", "Ciężka rama"],
  "Repeating Frame": ["Многозарядная рама", "Багатозарядна рама", "Rama powtarzalna"], "Multiple Launch Frame": ["Рама множественного запуска", "Рама множинного запуску", "Rama wielostrzałowa"],
  "Dual Bar": ["Двойная шина", "Подвійна шина", "Podwójna prowadnica"], "Bow Bar": ["Изогнутая шина", "Вигнута шина", "Prowadnica łukowa"], "Long Bow Bar": ["Длинная изогнутая шина", "Довга вигнута шина", "Długa prowadnica łukowa"],
  "Gamma Wave Emitter": ["Излучатель гамма-волн", "Випромінювач гамма-хвиль", "Emiter fal gamma"], "Maximized Capacitor": ["Максимизированный конденсатор", "Максимізований конденсатор", "Maksymalny kondensator"],
  "Boosted Photon Agitator": ["Усиленный фотонный агитатор", "Посилений фотонний агітатор", "Wzmocniony agitator fotonowy"], "Boosted Gamma Wave Emitter": ["Усиленный излучатель гамма-волн", "Посилений випромінювач гамма-хвиль", "Wzmocniony emiter fal gamma"],
  "Overcharged Capacitor": ["Перезаряженный конденсатор", "Перезаряджений конденсатор", "Przeładowany kondensator"], "Improved Long Barrel": ["Улучшенный длинный ствол", "Покращений довгий ствол", "Ulepszona długa lufa"],
  "Improved Automatic Barrel": ["Улучшенный автоматический ствол", "Покращений автоматичний ствол", "Ulepszona lufa automatyczna"], "Improved Sniper Barrel": ["Улучшенный снайперский ствол", "Покращений снайперський ствол", "Ulepszona lufa snajperska"],
  "Improved Splitter": ["Улучшенный расщепитель", "Покращений розщеплювач", "Ulepszony rozdzielacz"], "Amplified Beam Splitter": ["Усиленный расщепитель луча", "Посилений розщеплювач променя", "Wzmocniony rozdzielacz wiązki"],
  "Fine-Tuned Beam Focuser": ["Точно настроенный фокусировщик луча", "Точно налаштований фокусувальник променя", "Precyzyjny ogniskownik wiązki"], "Quantum Gyro-Compensating Lens": ["Квантовая гирокомпенсирующая линза", "Квантова гірокомпенсувальна лінза", "Kwantowa soczewka żyrokompensacyjna"],
  "Armor Piercing Receiver": ["Бронебойная ствольная коробка", "Бронебійна ствольна коробка", "Komora przeciwpancerna"], "Armor Piercing Automatic Receiver": ["Автоматическая бронебойная коробка", "Автоматична бронебійна коробка", "Automatyczna komora przeciwpancerna"],
  "Hardened Automatic Receiver": ["Закалённая автоматическая коробка", "Загартована автоматична коробка", "Utwardzona komora automatyczna"], "Rapid Automatic Receiver": ["Скоростная автоматическая коробка", "Швидкісна автоматична коробка", "Szybka komora automatyczna"],
  "Calibrated Powerful Receiver": ["Калиброванная мощная коробка", "Калібрована потужна коробка", "Kalibrowana mocna komora"], "Powerful Automatic Receiver": ["Мощная автоматическая коробка", "Потужна автоматична коробка", "Mocna komora automatyczna"],
  "Hardened Piercing Auto Receiver": ["Закалённая бронебойная автоматическая коробка", "Загартована бронебійна автоматична коробка", "Utwardzona automatyczna komora ppanc."], "9mm Receiver": ["Ствольная коробка 9 мм", "Ствольна коробка 9 мм", "Komora 9 mm"],
  ".357 Receiver": ["Ствольная коробка .357", "Ствольна коробка .357", "Komora .357"]
};

function localizeFrom(map, name, language) {
  const lang = String(language || "en").toLowerCase().split("-")[0];
  const idx = LANG_INDEX[lang];
  return idx === undefined ? (name || "") : (map[name]?.[idx] || name || "");
}

export const localizeLegendaryName = (name, language) => localizeFrom(LEGENDARY_NAMES, name, language);
export const localizeSupplementalWeaponName = (name, language) => localizeFrom(WEAPON_NAMES_SUPPLEMENTAL, name, language);
export const localizeSupplementalArmorName = (name, language) => localizeFrom(ARMOR_NAMES_SUPPLEMENTAL, name, language);
export const localizeSupplementalModName = (name, language) => localizeFrom(MOD_NAMES_SUPPLEMENTAL, name, language);
