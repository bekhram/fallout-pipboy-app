import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CRAFTING_RECIPES } from "../../data/craftingRecipes.js";
import ammoCsv from "../../../public/Ammo.csv?raw";
import { buildAmmoCraftingCatalog, getCraftingRecipeCategory } from "../../data/ammoCraftingRecipes.js";
import { buildBaseArmorRecipes, buildBaseWeaponRecipes } from "../../data/baseCraftingRecipes.js";
import { parseCSV } from "../../utils/csvParser.js";
import { parseArmorDatabase } from "../../utils/armorDatabase.js";
import {
  dismantleAmmunition,
  getAmmosmithRank,
  getAmmoBatchProfile,
  getAmmoDismantleState,
  getCraftingRecipeState,
  resolveCraftingAttempt,
} from "../../utils/craftingEngine.js";
import { personalConstructionCopy } from "../campaign/personalConstructionCopy.js";
import "./crafting.css";

const AMMO_CATALOG = buildAmmoCraftingCatalog(parseCSV(ammoCsv), CRAFTING_RECIPES);
const ALL_RECIPES = [...CRAFTING_RECIPES, ...AMMO_CATALOG.recipes];

const TEXT = {
  en: {
    title: "CRAFTING", subtitle: "WORKBENCH // RECIPES",
    weapons: "WEAPON RECIPES", ammo: "AMMO", armor: "ARMOR RECIPES", mods: "MODS", explosives: "EXPLOSIVES", items: "OTHER",
    search: "Search recipes, mods, workbenches...", skill: "SKILL", complexity: "COMPLEXITY", difficulty: "DIFFICULTY", materials: "MATERIALS",
    requirements: "PERKS", rarity: "RARITY", craft: "CRAFT", learnRecipe: "LEARN RECIPE", recipeLearned: "RECIPE LEARNED", unknownRare: "RARE RECIPE NOT LEARNED",
    inventory: "INVENTORY ITEMS", source: "SOURCE", page: "p.", workbench: "WORKBENCH", benchReady: "ACCESS", benchMissing: "NO ACCESS",
    result: "LAST ATTEMPT", success: "SUCCESS", failure: "FAILURE", automatic: "AUTOMATIC SUCCESS (D0)", successes: "successes", complications: "complications",
    duration: "TIME", minutes: "min", apHint: "On success, 2 AP may halve crafting time.", failedConsumed: "Failure consumed all ingredients at this station.",
    complicationLoss: "Complications may waste ingredients; no amount is auto-invented.", missingMaterials: "Missing materials", missingPerks: "Missing required perk rank",
    needBench: "Mark the required workbench as available.", roll: "ROLL", target: "TN", known: "KNOWN", recipeCount: "recipes", all: "ALL",
    common: "Common", uncommon: "Uncommon", rare: "Rare", output: "OUTPUT", noRecipes: "No matching recipes.", ready: "READY", locked: "LOCKED",
    noBaseWeapons: "Base weapon and armor recipes are app-generated from the item archive; official modification recipes remain under MODS.",
    dismantled: "DISMANTLED", returned: "RETURNED", ammoOwned: "OWNED", needAmmo: "No ammunition to dismantle", needAmmosmith2: "Ammosmith rank 2 required",
  },
  ru: {
    title: "КРАФТ", subtitle: "ВЕРСТАК // РЕЦЕПТЫ",
    weapons: "РЕЦЕПТЫ ОРУЖИЯ", ammo: "ПАТРОНЫ", armor: "РЕЦЕПТЫ БРОНИ", mods: "МОДЫ", explosives: "ВЗРЫВЧАТКА", items: "ДРУГОЕ",
    search: "Поиск рецептов, модов, верстаков...", skill: "НАВЫК", complexity: "СЛОЖНОСТЬ", difficulty: "ТРУДНОСТЬ", materials: "МАТЕРИАЛЫ",
    requirements: "ПЕРКИ", rarity: "РЕДКОСТЬ", craft: "СОЗДАТЬ", learnRecipe: "ВЫУЧИТЬ РЕЦЕПТ", recipeLearned: "РЕЦЕПТ ИЗУЧЕН", unknownRare: "РЕДКИЙ РЕЦЕПТ НЕ ИЗУЧЕН",
    inventory: "ПРЕДМЕТОВ В ИНВЕНТАРЕ", source: "ИСТОЧНИК", page: "стр.", workbench: "ВЕРСТАК", benchReady: "ДОСТУП ЕСТЬ", benchMissing: "НЕТ ДОСТУПА",
    result: "ПОСЛЕДНЯЯ ПОПЫТКА", success: "УСПЕХ", failure: "ПРОВАЛ", automatic: "АВТОУСПЕХ (D0)", successes: "успехов", complications: "осложнений",
    duration: "ВРЕМЯ", minutes: "мин", apHint: "При успехе 2 AP могут уменьшить время вдвое.", failedConsumed: "При провале эта станция расходует все ингредиенты.",
    complicationLoss: "Осложнения могут испортить материалы; приложение не выдумывает их количество.", missingMaterials: "Не хватает материалов", missingPerks: "Не хватает ранга перка",
    needBench: "Отметьте доступ к нужному верстаку.", roll: "БРОСОК", target: "TN", known: "ИЗУЧЕН", recipeCount: "рецептов", all: "ВСЕ",
    common: "Обычный", uncommon: "Необычный", rare: "Редкий", output: "РЕЗУЛЬТАТ", noRecipes: "Подходящих рецептов нет.", ready: "ГОТОВО", locked: "НЕДОСТУПНО",
    noBaseWeapons: "Базовые рецепты оружия и брони генерируются приложением из архива предметов; официальные модификации остаются в разделе МОДЫ.",
    dismantled: "РАЗОБРАНО", returned: "ВОЗВРАЩЕНО", ammoOwned: "В НАЛИЧИИ", needAmmo: "Нет патронов для разбора", needAmmosmith2: "Требуется Ammosmith 2",
  },
  uk: {
    title: "КРАФТ", subtitle: "ВЕРСТАТ // РЕЦЕПТИ",
    weapons: "РЕЦЕПТИ ЗБРОЇ", ammo: "ПАТРОНИ", armor: "РЕЦЕПТИ БРОНІ", mods: "МОДИ", explosives: "ВИБУХІВКА", items: "ІНШЕ",
    search: "Пошук рецептів, модів, верстатів...", skill: "НАВИЧКА", complexity: "СКЛАДНІСТЬ", difficulty: "ТРУДНІСТЬ", materials: "МАТЕРІАЛИ",
    requirements: "ПЕРКИ", rarity: "РІДКІСТЬ", craft: "СТВОРИТИ", learnRecipe: "ВИВЧИТИ РЕЦЕПТ", recipeLearned: "РЕЦЕПТ ВИВЧЕНО", unknownRare: "РІДКІСНИЙ РЕЦЕПТ НЕ ВИВЧЕНО",
    inventory: "ПРЕДМЕТІВ В ІНВЕНТАРІ", source: "ДЖЕРЕЛО", page: "стор.", workbench: "ВЕРСТАТ", benchReady: "ДОСТУП Є", benchMissing: "НЕМАЄ ДОСТУПУ",
    result: "ОСТАННЯ СПРОБА", success: "УСПІХ", failure: "НЕВДАЧА", automatic: "АВТОУСПІХ (D0)", successes: "успіхів", complications: "ускладнень",
    duration: "ЧАС", minutes: "хв", apHint: "За успіху 2 AP можуть удвічі скоротити час.", failedConsumed: "За невдачі ця станція витрачає всі інгредієнти.",
    complicationLoss: "Ускладнення можуть зіпсувати матеріали; застосунок не вигадує їх кількість.", missingMaterials: "Не вистачає матеріалів", missingPerks: "Не вистачає рангу перка",
    needBench: "Позначте доступ до потрібного верстата.", roll: "КИДОК", target: "TN", known: "ВИВЧЕНО", recipeCount: "рецептів", all: "УСІ",
    common: "Звичайний", uncommon: "Незвичайний", rare: "Рідкісний", output: "РЕЗУЛЬТАТ", noRecipes: "Відповідних рецептів немає.", ready: "ГОТОВО", locked: "НЕДОСТУПНО",
    noBaseWeapons: "Базові рецепти зброї та броні генеруються застосунком з архіву предметів; офіційні модифікації залишаються у розділі МОДИ.",
    dismantled: "РОЗІБРАНО", returned: "ПОВЕРНЕНО", ammoOwned: "В НАЯВНОСТІ", needAmmo: "Немає патронів для розбирання", needAmmosmith2: "Потрібен Ammosmith 2",
  },
  pl: {
    title: "RZEMIOSŁO", subtitle: "WARSZTAT // RECEPTURY",
    weapons: "RECEPTURY BRONI", ammo: "AMUNICJA", armor: "RECEPTURY PANCERZA", mods: "MODY", explosives: "MATERIAŁY WYBUCHOWE", items: "INNE",
    search: "Szukaj receptur, modyfikacji, warsztatów...", skill: "UMIEJĘTNOŚĆ", complexity: "ZŁOŻONOŚĆ", difficulty: "TRUDNOŚĆ", materials: "MATERIAŁY",
    requirements: "ATUTY", rarity: "RZADKOŚĆ", craft: "WYTWÓRZ", learnRecipe: "NAUCZ SIĘ RECEPTURY", recipeLearned: "RECEPTURA POZNANA", unknownRare: "RZADKA RECEPTURA NIEPOZNANA",
    inventory: "PRZEDMIOTY W EKWIPUNKU", source: "ŹRÓDŁO", page: "s.", workbench: "WARSZTAT", benchReady: "DOSTĘP", benchMissing: "BRAK DOSTĘPU",
    result: "OSTATNIA PRÓBA", success: "SUKCES", failure: "PORAŻKA", automatic: "AUTOMATYCZNY SUKCES (D0)", successes: "sukcesów", complications: "komplikacji",
    duration: "CZAS", minutes: "min", apHint: "Po sukcesie 2 AP może skrócić czas o połowę.", failedConsumed: "Porażka zużywa wszystkie składniki na tej stacji.",
    complicationLoss: "Komplikacje mogą zmarnować materiały; aplikacja nie wymyśla ich liczby.", missingMaterials: "Brak materiałów", missingPerks: "Brak wymaganego poziomu atutu",
    needBench: "Zaznacz dostęp do wymaganego warsztatu.", roll: "RZUT", target: "TN", known: "ZNANA", recipeCount: "receptur", all: "WSZYSTKIE",
    common: "Pospolita", uncommon: "Niepospolita", rare: "Rzadka", output: "WYNIK", noRecipes: "Brak pasujących receptur.", ready: "GOTOWE", locked: "NIEDOSTĘPNE",
    noBaseWeapons: "Bazowe receptury broni i pancerza są generowane przez aplikację z archiwum przedmiotów; oficjalne modyfikacje pozostają w sekcji MODY.",
    dismantled: "ROZŁOŻONO", returned: "ODZYSKANO", ammoOwned: "POSIADASZ", needAmmo: "Brak amunicji do rozłożenia", needAmmosmith2: "Wymagany Ammosmith 2",
  },
};

const AMMO_COPY = {
  en: {
    batchOutput: "OUTPUT PER BATCH", perBatch: "Materials are spent once for the whole batch.",
    batchRule: "App batch rule: dismantling the complete crafted output returns half its recipe materials, rounded down (minimum 1 per material).",
    bonus: "Ammosmith 3 also adds bonus rounds; those rounds are part of the same batch.",
    dismantle: "DISMANTLE", rounds: "rounds", needAmmoBatch: "Not enough ammunition for one dismantling batch.",
    salvagePerks: "Dismantling requires Ammosmith 2. Scrapper does not increase this return.",
    looseBatch: "Standard batch for found ammunition and old stock", returnPreview: "MATERIALS RETURNED",
    unavailable: "AMMUNITION WITH CRAFTING RESTRICTIONS", rarityLimit: "Ammosmith only crafts rarity 0–5.",
    missingData: "The archive lacks rarity or batch data; a recipe cannot be calculated.",
  },
  ru: {
    batchOutput: "ВЫХОД ЗА ПАРТИЮ", perBatch: "Материалы расходуются один раз на всю партию.",
    batchRule: "Правило пачек приложения: разбор всего результата крафта возвращает половину материалов рецепта, с округлением вниз (минимум 1 каждого материала).",
    bonus: "Ammosmith 3 дополнительно увеличивает выход; бонусные патроны входят в ту же партию.",
    dismantle: "РАЗОБРАТЬ", rounds: "патронов", needAmmoBatch: "Не хватает патронов на одну партию для разбора.",
    salvagePerks: "Для разбора нужен Ammosmith 2. Scrapper не увеличивает этот возврат.",
    looseBatch: "Стандартная партия для найденных патронов и старых запасов", returnPreview: "ВОЗВРАТ МАТЕРИАЛОВ",
    unavailable: "ПАТРОНЫ С ОГРАНИЧЕНИЯМИ КРАФТА", rarityLimit: "Ammosmith позволяет создавать патроны редкости 0–5.",
    missingData: "В каталоге нет редкости или размера партии; рецепт нельзя рассчитать.",
  },
  uk: {
    batchOutput: "ВИХІД ЗА ПАРТІЮ", perBatch: "Матеріали витрачаються один раз на всю партію.",
    batchRule: "Правило пачок застосунку: розбирання всього результату крафту повертає половину матеріалів рецепта, з округленням униз (мінімум 1 кожного матеріалу).",
    bonus: "Ammosmith 3 додатково збільшує вихід; бонусні патрони входять до тієї самої партії.",
    dismantle: "РОЗІБРАТИ", rounds: "патронів", needAmmoBatch: "Не вистачає патронів на одну партію для розбирання.",
    salvagePerks: "Для розбирання потрібен Ammosmith 2. Scrapper не збільшує це повернення.",
    looseBatch: "Стандартна партія для знайдених патронів і старих запасів", returnPreview: "ПОВЕРНЕННЯ МАТЕРІАЛІВ",
    unavailable: "ПАТРОНИ З ОБМЕЖЕННЯМИ КРАФТУ", rarityLimit: "Ammosmith дозволяє створювати патрони рідкості 0–5.",
    missingData: "У каталозі немає рідкості або розміру партії; рецепт неможливо розрахувати.",
  },
  pl: {
    batchOutput: "WYNIK JEDNEJ PARTII", perBatch: "Materiały są zużywane raz na całą partię.",
    batchRule: "Zasada partii w aplikacji: rozłożenie całej wytworzonej partii zwraca połowę materiałów receptury, zaokrągloną w dół (minimum 1 każdego materiału).",
    bonus: "Ammosmith 3 dodatkowo zwiększa wynik; dodatkowe naboje należą do tej samej partii.",
    dismantle: "ROZŁÓŻ", rounds: "nabojów", needAmmoBatch: "Za mało amunicji na jedną partię do rozłożenia.",
    salvagePerks: "Rozkładanie wymaga Ammosmith 2. Scrapper nie zwiększa tego zwrotu.",
    looseBatch: "Standardowa partia dla znalezionej amunicji i starych zapasów", returnPreview: "ZWROT MATERIAŁÓW",
    unavailable: "AMUNICJA Z OGRANICZENIAMI WYTWARZANIA", rarityLimit: "Ammosmith pozwala wytwarzać amunicję o rzadkości 0–5.",
    missingData: "W katalogu brakuje rzadkości lub wielkości partii; nie można obliczyć receptury.",
  },
};

const CATEGORIES = ["weapons", "ammo", "armor", "mods", "explosives", "items"];

const WORKBENCHES = {
  weapons: ["weapons"],
  ammo: ["weapons", "chemistry"],
  armor: ["armor", "power_armor", "robot"],
  mods: ["weapons", "armor", "power_armor", "robot"],
  explosives: ["chemistry"],
  items: ["chemistry", "cooking"],
};

const WORKBENCH_LABELS = {
  weapons: { en: "Weapons Workbench", ru: "Оружейный верстак", uk: "Збройовий верстат", pl: "Warsztat broni" },
  armor: { en: "Armor Workbench", ru: "Верстак брони", uk: "Верстат броні", pl: "Warsztat pancerza" },
  power_armor: { en: "Power Armor Station", ru: "Станция силовой брони", uk: "Станція силової броні", pl: "Stacja pancerza wspomaganego" },
  chemistry: { en: "Chemistry Station", ru: "Химическая станция", uk: "Хімічна станція", pl: "Stacja chemiczna" },
  cooking: { en: "Cooking Station", ru: "Кулинарная станция", uk: "Кулінарна станція", pl: "Stacja gotowania" },
  robot: { en: "Robot Workbench", ru: "Верстак роботов", uk: "Верстат роботів", pl: "Warsztat robotów" },
};

const MOD_FILTER_LABELS = {
  en: { all: "ALL MODS", weapons: "WEAPON MODS", armor: "ARMOR MODS", power_armor: "POWER ARMOR", robot: "ROBOT MODS" },
  ru: { all: "ВСЕ МОДЫ", weapons: "МОДЫ ОРУЖИЯ", armor: "МОДЫ БРОНИ", power_armor: "СИЛОВАЯ БРОНЯ", robot: "МОДЫ РОБОТОВ" },
  uk: { all: "УСІ МОДИ", weapons: "МОДИ ЗБРОЇ", armor: "МОДИ БРОНІ", power_armor: "СИЛОВА БРОНЯ", robot: "МОДИ РОБОТІВ" },
  pl: { all: "WSZYSTKIE MODY", weapons: "MODY BRONI", armor: "MODY PANCERZA", power_armor: "PANCERZ WSPOMAGANY", robot: "MODY ROBOTÓW" },
};
const MOD_FILTERS = ["all", "weapons", "armor", "power_armor", "robot"];

function languageCode(value) {
  const code = String(value || "en").split("-")[0];
  return TEXT[code] ? code : "en";
}

function benchLabel(id, language) {
  return WORKBENCH_LABELS[id]?.[language] || WORKBENCH_LABELS[id]?.en || id;
}

function rarityLabel(value, copy) {
  const key = String(value || "common").toLowerCase();
  return copy[key] || value;
}

function diceText(roll) {
  return (roll?.rolls || []).map((die) => die.value).join(", ");
}

function recipeModType(recipe) {
  const bench = String(recipe?.workbench || "").toLowerCase();
  if (["weapons", "armor", "power_armor", "robot"].includes(bench)) return bench;
  return null;
}

export default function CraftingScreen({ character = null, setCharacter = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const copy = { ...TEXT[language], ...AMMO_COPY[language] };
  const [category, setCategory] = useState("mods");
  const [modFilter, setModFilter] = useState("all");
  const [workbench, setWorkbench] = useState("all");
  const [search, setSearch] = useState("");
  const [benchAccess, setBenchAccess] = useState({});
  const [lastResult, setLastResult] = useState(null);
  const saving = useRef(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState(null);
  const [baseRecipes, setBaseRecipes] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/weapons.csv").then((response) => {
        if (!response.ok) throw new Error("Weapon archive unavailable");
        return response.text();
      }),
      fetch("/Armor.csv").then((response) => {
        if (!response.ok) throw new Error("Armor archive unavailable");
        return response.text();
      }),
    ])
      .then(([weaponCsv, armorCsv]) => {
        if (!active) return;
        const weaponRecipes = buildBaseWeaponRecipes(parseCSV(weaponCsv));
        const armorRecipes = buildBaseArmorRecipes(parseArmorDatabase(armorCsv).items);
        setBaseRecipes([...weaponRecipes, ...armorRecipes]);
      })
      .catch((error) => {
        console.error("Base crafting recipe archive could not be loaded:", error);
        if (active) setBaseRecipes([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const materialCount = useMemo(
    () => (character?.inventoryItems || []).filter((item) => Number(item?.quantity || 0) > 0).length,
    [character?.inventoryItems]
  );

  const visibleRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...baseRecipes, ...ALL_RECIPES].filter((recipe) => {
      if (getCraftingRecipeCategory(recipe) !== category) return false;
      if (category === "mods" && modFilter !== "all" && recipeModType(recipe) !== modFilter) return false;
      if (workbench !== "all" && recipe.workbench !== workbench) return false;
      if (!query) return true;
      return [recipe.name, recipe.group, recipe.skill, recipe.perks, recipe.rarity, benchLabel(recipe.workbench, language)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [baseRecipes, category, modFilter, workbench, search, language]);

  const learnRareRecipe = (recipe) => {
    if (!setCharacter) return;
    setCharacter((prev) => {
      const known = new Set(prev?.craftingKnownRecipes || []);
      known.add(recipe.id);
      return { ...prev, craftingKnownRecipes: [...known] };
    });
  };

  const handleCraft = async (recipe) => {
    if (saving.current) return;
    const state = getCraftingRecipeState(character, recipe);
    const needsWorkbench = !(recipe.workbench === "cooking" && recipe.name === "Cooking Station");
    if (needsWorkbench && !benchAccess[recipe.workbench]) {
      setLastResult({ recipeId: recipe.id, error: "bench" });
      return;
    }
    if (!state.hasMaterials) {
      setLastResult({ recipeId: recipe.id, error: "materials" });
      return;
    }
    if (!state.hasPerks) {
      setLastResult({ recipeId: recipe.id, error: "perks" });
      return;
    }
    if (!state.knownRare) {
      setLastResult({ recipeId: recipe.id, error: "recipe_unknown" });
      return;
    }

    const result = resolveCraftingAttempt(character, recipe);
    if (result?.error) {
      setLastResult({ recipeId: recipe.id, error: result.error });
      return;
    }

    if (setCharacter) {
      saving.current = true; setSaveBusy(true);
      try {
      const saved = await setCharacter((prev) => {
        let weapons = prev?.weapons || [];
        if (result.success && recipe?.outputTemplate?.sourceType === "crafted_weapon" && result.output) {
          const {
            category: _category,
            quantity: _quantity,
            canonicalName: _canonicalName,
            crafted: _crafted,
            craftingRecipeId: _craftingRecipeId,
            craftingWorkbench: _craftingWorkbench,
            ...weaponData
          } = result.output;
          weapons = [...weapons, { ...weaponData, sourceType: "crafted_weapon" }];
        }

        return {
          ...prev,
          weapons,
          inventoryItems: result.inventory,
          craftingHistory: [
            ...(prev?.craftingHistory || []),
            {
              id: `${recipe.id}-${Date.now()}`,
              recipeId: recipe.id,
              name: recipe.name,
              success: result.success,
              difficulty: result.state.difficulty,
              targetNumber: result.state.skill.targetNumber,
              rolls: recipe.ammoCrafting ? [] : (result.roll?.rolls || []).map((die) => die.value),
              complications: result.complications,
              durationMinutes: result.durationMinutes,
              outputQuantity: Number(result.output?.quantity || 0),
              timestamp: new Date().toISOString(),
            },
          ].slice(-50),
        };
      });
      if (saved === null) { setLastResult({ recipeId:recipe.id,error:"save" }); return; }
      } catch { setLastResult({ recipeId:recipe.id,error:"save" }); return; }
      finally { saving.current = false; setSaveBusy(false); }
    }
    setLastResult({ recipeId: recipe.id, ...result });
  };

  const handleDismantle = async (recipe) => {
    if (saving.current) return;
    if (!benchAccess[recipe.workbench]) {
      setLastResult({ recipeId: recipe.id, error: "bench", action: "dismantle" });
      return;
    }
    const result = dismantleAmmunition(character, recipe);
    if (result?.error) {
      setLastResult({ recipeId: recipe.id, error: result.error, action: "dismantle" });
      return;
    }
    if (setCharacter) {
      saving.current = true; setSaveBusy(true);
      try {
      const saved = await setCharacter((prev) => ({
        ...prev,
        inventoryItems: result.inventory,
        craftingHistory: [
          ...(prev?.craftingHistory || []),
          {
            id: `${recipe.id}-dismantle-${Date.now()}`,
            recipeId: recipe.id,
            name: recipe.name,
            action: "dismantle",
            consumedQuantity: result.consumedQuantity,
            returnedMaterials: result.returnedMaterials,
            timestamp: new Date().toISOString(),
          },
        ].slice(-50),
      }));
      if (saved === null) { setLastResult({ recipeId:recipe.id,error:"save" }); return; }
      } catch { setLastResult({ recipeId:recipe.id,error:"save" }); return; }
      finally { saving.current = false; setSaveBusy(false); }
    }
    setLastResult({ recipeId: recipe.id, ...result });
  };

  const renderResult = (recipe) => {
    if (!lastResult || lastResult.recipeId !== recipe.id) return null;
    if (lastResult.error) {
      const message = lastResult.error === "save" ? personalConstructionCopy(language).errors.STALE_CHARACTER_UPDATE
        : lastResult.error === "bench" ? copy.needBench
        : lastResult.error === "materials" ? copy.missingMaterials
          : lastResult.error === "perks" ? copy.missingPerks
            : lastResult.error === "ammosmith_rank" ? copy.needAmmosmith2
              : lastResult.error === "ammo_batch_missing" ? copy.needAmmoBatch
                : copy.unknownRare;
      return <div className="craft-result is-failure">[ {message} ]</div>;
    }
    if (lastResult.action === "dismantle") {
      return (
        <div className="craft-result is-success">
          <strong>[ {copy.dismantled}: {recipe.name} ×{lastResult.consumedQuantity} ]</strong>
          <div>{copy.returned}: {Object.entries(lastResult.returnedMaterials || {}).map(([name, amount]) => `${name} ×${amount}`).join(" // ")}</div>
        </div>
      );
    }
    return (
      <div className={`craft-result ${lastResult.success ? "is-success" : "is-failure"}`}>
        <strong>[ {copy.result}: {lastResult.success ? copy.success : copy.failure} ]</strong>
        {recipe.ammoCrafting ? (
          lastResult.success
            ? <div>{copy.output}: {lastResult.output?.name || recipe.name} ×{lastResult.output?.quantity || 1}</div>
            : null
        ) : (
          <>
            <div>
              {lastResult.automatic
                ? copy.automatic
                : `${copy.roll}: [${diceText(lastResult.roll)}] // ${copy.target} ${lastResult.state.skill.targetNumber} // D${lastResult.state.difficulty} // ${lastResult.roll?.totalSuccesses || 0} ${copy.successes}`}
            </div>
            <div>{copy.complications}: {lastResult.complications}</div>
          </>
        )}
        <div>{copy.duration}: {lastResult.durationMinutes} {copy.minutes}</div>
        {!recipe.ammoCrafting && lastResult.success ? <div>{copy.output}: {lastResult.output?.name || recipe.outputName || recipe.name}</div> : null}
        {lastResult.success ? <div className="craft-note">{copy.apHint}</div> : null}
        {!lastResult.success && lastResult.consumedMaterials ? <div className="craft-note">{copy.failedConsumed}</div> : null}
        {lastResult.complicationMaterialLossNeedsGm ? <div className="craft-note">{copy.complicationLoss}</div> : null}
      </div>
    );
  };

  return (
    <div className="pip-screen crafting-screen">
      <section className="pip-panel crafting-screen__header">
        <div>
          <h2>[ {copy.title} ]</h2>
          <span>{copy.subtitle}</span>
        </div>
        <div className="crafting-screen__inventory-count">
          <span>{copy.inventory}</span>
          <strong>{materialCount}</strong>
        </div>
      </section>

      <section className="pip-panel crafting-screen__workbench">
        <div className="crafting-screen__tabs" role="tablist">
          {CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={category === key}
              className={`pip-btn ${category === key ? "is-primary" : ""}`}
              onClick={() => {
                setCategory(key);
                setModFilter("all");
                setWorkbench("all");
                setExpandedRecipeId(null);
              }}
            >
              {copy[key]}
            </button>
          ))}
        </div>

        <div className="crafting-screen__bench-row">
          {category === "mods" ? (
            MOD_FILTERS.map((id) => (
              <button
                key={id}
                type="button"
                className={`pip-btn ${modFilter === id ? "is-primary" : ""}`}
                onClick={() => {
                  setModFilter(id);
                  setWorkbench("all");
                  setExpandedRecipeId(null);
                }}
              >
                {(MOD_FILTER_LABELS[language] || MOD_FILTER_LABELS.en)[id]}
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                className={`pip-btn ${workbench === "all" ? "is-primary" : ""}`}
                onClick={() => setWorkbench("all")}
              >
                {copy.all}
              </button>
              {(WORKBENCHES[category] || []).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`pip-btn ${workbench === id ? "is-primary" : ""}`}
                  onClick={() => setWorkbench(id)}
                >
                  {benchLabel(id, language)}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="crafting-screen__bench-access">
          {(WORKBENCHES[category] || []).map((id) => (
            <button
              key={id}
              type="button"
              className={`craft-bench-toggle ${benchAccess[id] ? "is-ready" : ""}`}
              onClick={() => setBenchAccess((prev) => ({ ...prev, [id]: !prev[id] }))}
            >
              <span>{benchLabel(id, language)}</span>
              <strong>{benchAccess[id] ? copy.benchReady : copy.benchMissing}</strong>
            </button>
          ))}
        </div>

        <input
          className="pip-input crafting-screen__search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.search}
        />

        <div className="crafting-screen__count">{visibleRecipes.length} {copy.recipeCount}</div>

        {category === "ammo" && AMMO_CATALOG.unavailable.length > 0 ? (
          <details className="craft-section">
            <summary>{copy.unavailable}</summary>
            {AMMO_CATALOG.unavailable.map((item) => (
              <p key={item.name} className="craft-note">
                <strong>{item.name}{item.rarity != null ? ` (R${item.rarity})` : ""}</strong>
                {": "}{item.reason === "rarity" ? copy.rarityLimit : copy.missingData}
              </p>
            ))}
          </details>
        ) : null}

        {visibleRecipes.length ? (
          <div className="crafting-screen__recipes">
            {visibleRecipes.map((recipe) => {
              const state = getCraftingRecipeState(character, recipe);
              const needsWorkbench = !(recipe.workbench === "cooking" && recipe.name === "Cooking Station");
              const benchReady = !needsWorkbench || Boolean(benchAccess[recipe.workbench]);
              const canCraft = Boolean(setCharacter && benchReady && state.hasMaterials && state.hasPerks && state.knownRare);
              const dismantleState = recipe.ammoCrafting ? getAmmoDismantleState(character, recipe) : null;
              const batch = recipe.ammoCrafting ? getAmmoBatchProfile(recipe) : null;
              const ammosmithRank = recipe.ammoCrafting ? getAmmosmithRank(character) : 0;
              const canDismantle = Boolean(setCharacter && recipe.ammoCrafting && benchReady && dismantleState?.hasPerk && dismantleState?.hasBatch);
              const expanded = expandedRecipeId === recipe.id;
              return (
                <article key={recipe.id} className={`pip-panel crafting-recipe-card ${expanded ? "is-expanded" : ""}`}>
                  <button
                    type="button"
                    className="crafting-recipe-card__heading"
                    aria-expanded={expanded}
                    onClick={() => setExpandedRecipeId((current) => current === recipe.id ? null : recipe.id)}
                  >
                    <div className="crafting-recipe-card__heading-main">
                      <span className="crafting-recipe-card__chevron" aria-hidden="true">{expanded ? "▼" : "▶"}</span>
                      <div>
                        <span className="crafting-recipe-card__group">{recipe.group}</span>
                        <h3>{recipe.name}</h3>
                      </div>
                    </div>
                    <span className={`craft-rarity is-${String(recipe.rarity).toLowerCase()}`}>
                      {recipe.appGeneratedBaseRecipe
                        ? `R${recipe.itemRarity ?? recipe.outputTemplate?.rarity ?? 0}`
                        : recipe.ammoCrafting
                          ? `R${recipe.ammoRarity}`
                          : rarityLabel(recipe.rarity, copy)}
                    </span>
                  </button>

                  <div className="crafting-recipe-card__quick">
                    <span className="craft-chip">{recipe.skill} {state.skill.effectiveRank}</span>
                    <span className="craft-chip">TN {state.skill.targetNumber}</span>
                    <span className="craft-chip">D{state.difficulty}</span>
                    <span className={`craft-chip ${canCraft ? "is-ready" : "is-locked"}`}>{canCraft ? copy.ready : copy.locked}</span>
                  </div>

                  {expanded ? (
                    <div className="crafting-recipe-card__details">
                      <div className="crafting-recipe-card__stats">
                        <div><span>{copy.workbench}</span><strong>{benchLabel(recipe.workbench, language)}</strong></div>
                        <div><span>{copy.skill}</span><strong>{recipe.skill} {state.skill.effectiveRank}</strong></div>
                        <div><span>{copy.target}</span><strong>{state.skill.targetNumber}</strong></div>
                        <div><span>{copy.complexity}</span><strong>{recipe.complexity}</strong></div>
                        <div><span>{copy.difficulty}</span><strong>D{state.difficulty}</strong></div>
                        <div><span>{copy.source}</span><strong>{recipe.sourceBook ? `${recipe.sourceBook}, ` : ""}{copy.page}{recipe.sourcePage}</strong></div>
                      </div>

                      {batch ? (
                        <div className="craft-section">
                          <strong>[ {copy.batchOutput}: {batch.formula} ]</strong>
                          <div className="craft-note">{copy.perBatch}</div>
                          {ammosmithRank >= 3 ? <div className="craft-note">{copy.bonus}</div> : null}
                        </div>
                      ) : null}

                      <div className="craft-section">
                        <strong>[ {copy.materials} ]</strong>
                        <div className="craft-material-list">
                          {state.materialState.map((entry) => (
                            <span key={entry.name} className={entry.enough ? "is-ok" : "is-missing"}>
                              {entry.name}: {entry.available}/{entry.required}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="craft-section">
                        <strong>[ {copy.requirements} ]</strong>
                        {state.perkState.length ? (
                          <div className="craft-material-list">
                            {state.perkState.map((perk) => (
                              <span key={`${perk.id}-${perk.rank}`} className={perk.met ? "is-ok" : "is-missing"}>
                                {perk.label} {perk.rank}: {perk.currentRank}/{perk.rank}
                              </span>
                            ))}
                          </div>
                        ) : <span>—</span>}
                      </div>

                      {String(recipe.rarity).toLowerCase() === "rare" ? (
                        <button
                          type="button"
                          className={`pip-btn ${state.knownRare ? "is-primary" : ""}`}
                          onClick={() => learnRareRecipe(recipe)}
                          disabled={!setCharacter || state.knownRare}
                        >
                          {state.knownRare ? copy.recipeLearned : copy.learnRecipe}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="pip-btn is-primary crafting-recipe-card__craft"
                        onClick={() => handleCraft(recipe)}
                        disabled={!canCraft || saveBusy}
                      >
                        {recipe.ammoCrafting
                          ? `${copy.craft} // ${batch.formula}`
                          : `${copy.craft} // ${copy.target} ${state.skill.targetNumber} // D${state.difficulty}`}
                      </button>

                      {recipe.ammoCrafting ? (
                        <>
                          <div className="craft-note">{copy.ammoOwned}: {dismantleState.available}</div>
                          <div className="craft-section">
                            <strong>[ {copy.returnPreview} ]</strong>
                            <div className="craft-material-list">
                              {Object.entries(dismantleState.returnedMaterials).map(([name, amount]) => (
                                <span key={name}>{name} ×{amount}</span>
                              ))}
                            </div>
                            <div className="craft-note">{copy.salvagePerks}</div>
                            <div className="craft-note">{copy.batchRule}</div>
                            <div className="craft-note">{copy.looseBatch}: {batch.looseBatchSize}.</div>
                          </div>
                          <button
                            type="button"
                            className="pip-btn crafting-recipe-card__craft"
                            onClick={() => handleDismantle(recipe)}
                            disabled={!canDismantle || saveBusy}
                          >
                            {copy.dismantle} {dismantleState.requiredQuantity} {copy.rounds}
                          </button>
                          {!dismantleState.hasPerk ? <div className="craft-warning">{copy.needAmmosmith2}</div> : null}
                          {!dismantleState.hasBatch ? <div className="craft-warning">{copy.needAmmoBatch}</div> : null}
                        </>
                      ) : null}

                      {!benchReady ? <div className="craft-warning">{copy.needBench}</div> : null}
                      {!state.hasMaterials ? <div className="craft-warning">{copy.missingMaterials}</div> : null}
                      {!state.hasPerks ? <div className="craft-warning">{copy.missingPerks}</div> : null}
                      {!state.knownRare ? <div className="craft-warning">{copy.unknownRare}</div> : null}

                      {renderResult(recipe)}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="crafting-screen__empty">
            {category === "weapons" ? copy.noBaseWeapons : copy.noRecipes}
          </div>
        )}
      </section>
    </div>
  );
}
