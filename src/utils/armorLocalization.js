const LANG_INDEX = { ru: 0, uk: 1, pl: 2 };

const NAMES = {
  "Brotherhood of Steel Uniform": ["Униформа Братства Стали", "Однострій Братства Сталі", "Mundur Bractwa Stali"],
  "Casual Clothing": ["Повседневная одежда", "Повсякденний одяг", "Strój codzienny"],
  Harness: ["Портупея", "Портупея", "Uprząż"],
  "Military Fatigues": ["Военная форма", "Військова форма", "Mundur polowy"],
  "Road Leathers": ["Дорожная кожаная одежда", "Дорожній шкіряний одяг", "Skórzany strój podróżny"],
  "Tough Clothing": ["Прочная одежда", "Міцний одяг", "Wytrzymała odzież"],
  "Vault Jumpsuit": ["Комбинезон Убежища", "Комбінезон Сховища", "Kombinezon Krypty"],
  "Brotherhood of Steel Fatigues": ["Полевая форма Братства Стали", "Польова форма Братства Сталі", "Mundur polowy Bractwa Stali"],
  "Brotherhood Scribe's Armour": ["Броня писца Братства", "Броня писаря Братства", "Pancerz skryby Bractwa"],
  "Cage Armour": ["Клетчатая броня", "Клітчаста броня", "Pancerz klatkowy"],
  "Drifter Outfit": ["Одежда бродяги", "Одяг волоцюги", "Strój włóczęgi"],
  "Engineer's Armour": ["Броня инженера", "Броня інженера", "Pancerz inżyniera"],
  "Formal Clothing": ["Официальная одежда", "Офіційний одяг", "Strój formalny"],
  "Hazmat Suit": ["Защитный костюм", "Захисний костюм", "Kombinezon ochronny"],
  "Heavy Coat": ["Тяжёлое пальто", "Важке пальто", "Ciężki płaszcz"],
  Hides: ["Шкуры", "Шкури", "Skóry"],
  "Lab Coat": ["Лабораторный халат", "Лабораторний халат", "Fartuch laboratoryjny"],
  "Spike Armour": ["Шипованная броня", "Шипована броня", "Pancerz kolczasty"],
  "Utility Coveralls": ["Рабочий комбинезон", "Робочий комбінезон", "Kombinezon roboczy"],
  "Army Helmet": ["Армейский шлем", "Армійський шолом", "Hełm wojskowy"],
  "Brotherhood of Steel Hood": ["Капюшон Братства Стали", "Каптур Братства Сталі", "Kaptur Bractwa Stali"],
  "Brotherhood Scribe's Hat": ["Шляпа писца Братства", "Капелюх писаря Братства", "Kapelusz skryby Bractwa"],
  "Casual Hat": ["Повседневная шляпа", "Повсякденний капелюх", "Zwykły kapelusz"],
  "Formal Hat": ["Официальная шляпа", "Офіційний капелюх", "Elegancki kapelusz"],
  "Gas Mask": ["Противогаз", "Протигаз", "Maska gazowa"],
  "Hard Hat": ["Каска", "Каска", "Kask ochronny"],
  "Hood or Cowl": ["Капюшон", "Каптур", "Kaptur"],
  "Sack Hood": ["Мешок-капюшон", "Мішок-каптур", "Kaptur z worka"],
  "Welder's Visor": ["Маска сварщика", "Маска зварювальника", "Przyłbica spawalnicza"],
  "Vault-Tec Security Helmet": ["Шлем охраны Vault-Tec", "Шолом охорони Vault-Tec", "Hełm ochrony Vault-Tec"],
  "Vault-Tec Security Armour": ["Броня охраны Vault-Tec", "Броня охорони Vault-Tec", "Pancerz ochrony Vault-Tec"],
  "Standard Plating": ["Стандартная обшивка", "Стандартна обшивка", "Standardowe poszycie"],
  "Mister Gutsy Plating": ["Обшивка Мистера Храбреца", "Обшивка Містера Хоробреця", "Poszycie Mister Gutsy"],
  "Factory Storage Armour": ["Заводской грузовой отсек", "Заводський вантажний відсік", "Fabryczny pancerz magazynowy"],
  Welded: ["Сварная", "Зварна", "Spawany"], Tempered: ["Закалённая", "Загартована", "Hartowany"], Hardened: ["Упрочнённая", "Зміцнена", "Utwardzony"], Buttressed: ["Усиленная", "Посилена", "Wzmocniony"],
  "Boiled Leather": ["Варёная кожа", "Виварена шкіра", "Skóra gotowana"], "Girded Leather": ["Укреплённая кожа", "Укріплена шкіра", "Skóra wzmocniona"], "Treated Leather": ["Обработанная кожа", "Оброблена шкіра", "Skóra impregnowana"], "Shadowed Leather": ["Теневая кожа", "Тіньова шкіра", "Skóra cieniowana"], "Studded Leather": ["Клёпаная кожа", "Клепана шкіра", "Skóra nabijana"],
  "Painted Metal": ["Окрашенный металл", "Фарбований метал", "Malowany metal"], "Enameled Metal": ["Эмалированный металл", "Емальований метал", "Emaliowany metal"], "Shadowed Metal": ["Теневой металл", "Тіньовий метал", "Metal cieniowany"], "Alloyed Metal": ["Сплавной металл", "Сплавний метал", "Metal stopowy"], "Polished Metal": ["Полированный металл", "Полірований метал", "Polerowany metal"],
  Reinforced: ["Усиленная", "Посилена", "Wzmocniony"], Shadowed: ["Теневая", "Тіньова", "Cieniowany"], Fiberglass: ["Стекловолокно", "Скловолокно", "Włókno szklane"], Polymer: ["Полимер", "Полімер", "Polimer"], Laminated: ["Ламинированная", "Ламінована", "Laminowany"], Resin: ["Смола", "Смола", "Żywica"], Microcarbon: ["Микроуглерод", "Мікровуглець", "Mikrowęgiel"], Nanofilament: ["Нановолокно", "Нановолокно", "Nanowłókno"],
  "Lighter Build": ["Облегчённая конструкция", "Полегшена конструкція", "Lżejsza konstrukcja"], Pocketed: ["С карманами", "З кишенями", "Kieszeniowy"], "Deep Pocketed": ["С глубокими карманами", "З глибокими кишенями", "Głębokie kieszenie"], "Lead Lined": ["Свинцовая подкладка", "Свинцева підкладка", "Ołowiana podszewka"], "Ultra-Light Build": ["Сверхлёгкая конструкция", "Надлегка конструкція", "Ultralekka konstrukcja"], Padded: ["Мягкая подкладка", "М'яка підкладка", "Wyściełany"], "Asbestos Lining": ["Асбестовая подкладка", "Азбестова підкладка", "Podszewka azbestowa"], Dense: ["Плотная подкладка", "Щільна підкладка", "Gęsty"], BioCommMesh: ["Биокоммуникационная сетка", "Біокомунікаційна сітка", "Siatka BioComm"], Pneumatic: ["Пневматическая", "Пневматична", "Pneumatyczny"], Brawling: ["Бойцовская", "Бійцівська", "Bojowy"], Braced: ["Скреплённая", "Скріплена", "Usztywniony"], Stabilised: ["Стабилизированная", "Стабілізована", "Stabilizowany"], Aerodynamic: ["Аэродинамическая", "Аеродинамічна", "Aerodynamiczny"], Weighted: ["Утяжелённая", "Обтяжена", "Obciążony"], Cushioned: ["Амортизирующая", "Амортизувальна", "Amortyzowany"], Muffled: ["Бесшумная", "Безшумна", "Wyciszony"],
  "Insulated Lining": ["Изолирующая подкладка", "Ізолювальна підкладка", "Podszewka izolacyjna"], "Treated Lining": ["Обработанная подкладка", "Оброблена підкладка", "Podszewka impregnowana"], "Resistant Lining": ["Стойкая подкладка", "Стійка підкладка", "Podszewka odporna"], "Protective Lining": ["Защитная подкладка", "Захисна підкладка", "Podszewka ochronna"], "Shielded Lining": ["Экранированная подкладка", "Екранована підкладка", "Podszewka ekranowana"], "Ballistic Weave": ["Баллистическое волокно", "Балістичне волокно", "Splot balistyczny"],
  "Behavioral Analysis Mod": ["Модуль анализа поведения", "Модуль аналізу поведінки", "Moduł analizy zachowania"], "Diagnosis Mod": ["Диагностический модуль", "Діагностичний модуль", "Moduł diagnostyczny"], "Hacking Module": ["Модуль взлома", "Модуль злому", "Moduł hakowania"], "Hazard detection Mod": ["Модуль обнаружения угроз", "Модуль виявлення загроз", "Moduł wykrywania zagrożeń"], "Integral Boiler Mod": ["Встроенный бойлер", "Вбудований бойлер", "Wbudowany bojler"], "Lockpick Module": ["Модуль взлома замков", "Модуль злому замків", "Moduł otwierania zamków"],
};

const FAMILY = {
  ru: { Raider: "Рейдерская", Leather: "Кожаная", Metal: "Металлическая", Combat: "Боевая", Synth: "Синтетическая", Helmet: "шлем", "Chest Piece": "броня — торс", Leg: "броня — нога", Arm: "броня — рука", Sturdy: "усиленная", Heavy: "тяжёлая" },
  uk: { Raider: "Рейдерська", Leather: "Шкіряна", Metal: "Металева", Combat: "Бойова", Synth: "Синтетична", Helmet: "шолом", "Chest Piece": "броня — тулуб", Leg: "броня — нога", Arm: "броня — рука", Sturdy: "посилена", Heavy: "важка" },
  pl: { Raider: "Bandytów", Leather: "Skórzany", Metal: "Metalowy", Combat: "Bojowy", Synth: "Syntetyczny", Helmet: "hełm", "Chest Piece": "pancerz — tułów", Leg: "pancerz — noga", Arm: "pancerz — ramię", Sturdy: "wzmocniony", Heavy: "ciężki" },
};

const ROBOT = {
  ru: { Factory: "Заводская броня", Primal: "Первобытная пластина", Serrated: "Зазубренная пластина", Noxious: "Ядовитая пластина", Toxic: "Токсичная пластина", Actuated: "Приводная рама", Voltaic: "Электрическая рама", Hydraulic: "Гидравлическая рама", Optics: "оптика", "Main Body": "корпус", Arms: "манипуляторы", Thruster: "двигатель" },
  uk: { Factory: "Заводська броня", Primal: "Первісна пластина", Serrated: "Зазубрена пластина", Noxious: "Отруйна пластина", Toxic: "Токсична пластина", Actuated: "Приводна рама", Voltaic: "Електрична рама", Hydraulic: "Гідравлічна рама", Optics: "оптика", "Main Body": "корпус", Arms: "маніпулятори", Thruster: "двигун" },
  pl: { Factory: "Pancerz fabryczny", Primal: "Płyta pierwotna", Serrated: "Płyta ząbkowana", Noxious: "Płyta trująca", Toxic: "Płyta toksyczna", Actuated: "Rama napędzana", Voltaic: "Rama elektryczna", Hydraulic: "Rama hydrauliczna", Optics: "optyka", "Main Body": "korpus", Arms: "ramiona", Thruster: "silnik" },
};

export function localizeArmorName(name = "", language = "en") {
  const index = LANG_INDEX[language];
  if (index === undefined) return name;
  const ballistic = name.match(/^Ballistic Weave( Mk .+)?$/);
  if (ballistic) return `${NAMES["Ballistic Weave"][index]}${ballistic[1] || ""}`;
  if (NAMES[name]) return NAMES[name][index];

  const armor = name.match(/^(?:(Sturdy|Heavy) )?(Raider|Leather|Metal|Combat|Synth) (Helmet|Chest Piece|Leg|Arm)$/);
  if (armor) {
    const words = FAMILY[language];
    return [armor[1] && words[armor[1]], words[armor[2]], words[armor[3]]].filter(Boolean).join(" ");
  }

  const robot = name.match(/^(Factory Armour|Primal Plate|Serrated Plate|Noxious Plate|Toxic Plate|Actuated Frame|Voltaic Frame|Hydraulic Frame) (Optics|Main Body|Arms|Thruster)$/);
  if (robot) {
    const prefix = robot[1].split(" ")[0];
    return `${ROBOT[language][prefix]} — ${ROBOT[language][robot[2]]}`;
  }
  return name;
}

export function localizeArmorEffect(effect = "", language = "en") {
  if (!effect || language === "en") return effect;
  const text = effect.replace(/\s+/g, " ").trim().toLowerCase();
  const translations = {
    ru: ["Позволяет один раз за сцену перебросить 1d20 в указанной проверке.", "Увеличивает максимальный переносимый вес на 5.", "Игнорирует увеличение сложности из-за очень яркого света.", "Даёт +3 к сопротивлению яду против газов и защищает от газа и пыли; сложность проверок Красноречия увеличивается на 1.", "+2 ко всем сопротивлениям урону против оружия с эффектом «Взрыв».", "Игнорируйте энергетический урон от эффекта «Продолжительный».", "+4 ко всем сопротивлениям урону против оружия с эффектом «Взрыв».", "Химикаты действуют вдвое дольше.", "Для срабатывания эффекта «Оглушение» требуется 2+ эффекта.", "Безоружные атаки наносят +1 КБ урона.", "+2 к сопротивлению урону против атак ближнего боя.", "После прицеливания дистанционная атака наносит +1 КБ урона.", "Можно потратить до 4 ОД на дополнительный урон в ближнем бою.", "Атаки ближнего боя и без оружия получают «Пробивание 1».", "+2 к физическому сопротивлению против урона от падения.", "Перебросьте 1d20 в проверках Скрытности.", "Сложность соответствующих проверок уменьшается на 1, минимум до 0.", "Раз за сцену вне боя превращает 2 порции грязной воды в 1 очищенную за десять минут.", "Сложность Взлома замков уменьшается на 1; шпильки и инструменты не требуются."],
    uk: ["Дозволяє один раз за сцену перекинути 1d20 у вказаній перевірці.", "Збільшує максимальну вагу перенесення на 5.", "Ігнорує збільшення складності через дуже яскраве світло.", "Дає +3 до опору отруті проти газів і захищає від газу та пилу; складність перевірок Красномовства збільшується на 1.", "+2 до всіх опорів ушкодженням проти зброї з ефектом «Вибух».", "Ігноруйте енергетичні ушкодження від ефекту «Тривалий».", "+4 до всіх опорів ушкодженням проти зброї з ефектом «Вибух».", "Хімікати діють удвічі довше.", "Для спрацювання ефекту «Оглушення» потрібно 2+ ефекти.", "Беззбройні атаки завдають +1 КБ ушкоджень.", "+2 до опору ушкодженням проти атак ближнього бою.", "Після прицілювання дистанційна атака завдає +1 КБ ушкоджень.", "Можна витратити до 4 ОД на додаткові ушкодження в ближньому бою.", "Атаки ближнього бою та без зброї отримують «Пробивання 1».", "+2 до фізичного опору проти ушкоджень від падіння.", "Перекиньте 1d20 у перевірках Скритності.", "Складність відповідних перевірок зменшується на 1, мінімум до 0.", "Раз за сцену поза боєм перетворює 2 порції брудної води на 1 очищену за десять хвилин.", "Складність Злому замків зменшується на 1; шпильки та інструменти не потрібні."],
    pl: ["Pozwala raz na scenę przerzucić 1k20 we wskazanym teście.", "Zwiększa maksymalny udźwig o 5.", "Ignoruje wzrost trudności spowodowany bardzo jasnym światłem.", "Zapewnia +3 odporności na trucizny przeciw gazom i chroni przed gazem oraz pyłem; trudność testów Mowy wzrasta o 1.", "+2 do wszystkich odporności przeciw broni z efektem Wybuch.", "Ignoruj obrażenia energetyczne z efektu Trwałe.", "+4 do wszystkich odporności przeciw broni z efektem Wybuch.", "Chemikalia działają dwa razy dłużej.", "Efekt Ogłuszenie wymaga wyrzucenia co najmniej 2 efektów.", "Ataki bez broni zadają +1 KB obrażeń.", "+2 odporności przeciw atakom wręcz.", "Po celowaniu atak dystansowy zadaje +1 KB obrażeń.", "Możesz wydać do 4 PA na dodatkowe obrażenia w walce wręcz.", "Ataki wręcz i bez broni zyskują Przebicie 1.", "+2 odporności fizycznej przeciw obrażeniom od upadku.", "Przerzuć 1k20 w testach Skradania.", "Trudność odpowiednich testów zmniejsza się o 1, minimum do 0.", "Raz na scenę poza walką zamienia 2 porcje brudnej wody w 1 oczyszczoną w ciągu dziesięciu minut.", "Trudność Otwierania zamków zmniejsza się o 1; spinki ani narzędzia nie są potrzebne."],
  }[language];
  if (!translations) return effect;
  if (text.includes("re-roll a single d20")) return translations[0];
  if (text.includes("maximum carry weight")) return translations[1];
  if (text.includes("extremely bright light")) return translations[2];
  if (text.includes("gas mask provides")) return translations[3];
  if (text.includes("plus 2 to all damage resistances vs blast")) return translations[4];
  if (text.includes("ignore energy damage")) return translations[5];
  if (text.includes("plus 4 to all dammage")) return translations[6];
  if (text.includes("chems last twice")) return translations[7];
  if (text.includes("stun damage effect")) return translations[8];
  if (text.includes("unarmed attacks inflict +1d6")) return translations[9];
  if (text.includes("vs melee attacks")) return translations[10];
  if (text.includes("when you aim")) return translations[11];
  if (text.includes("spend up to 4 ap")) return translations[12];
  if (text.includes("gain piercing 1")) return translations[13];
  if (text.includes("falling damage")) return translations[14];
  if (text.includes("stealth checks")) return translations[15];
  if (text.includes("reduce") && text.includes("difficulty")) return translations[16];
  if (text.includes("dirty waters")) return translations[17];
  if (text.includes("does not need bobby pins")) return translations[18];
  return effect;
}
