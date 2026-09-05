import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./crafting.css";

const TEXT = {
  en: {
    title: "CRAFTING",
    subtitle: "WORKBENCH // RECIPE DATABASE",
    weapons: "WEAPONS",
    armor: "ARMOR",
    items: "OTHER ITEMS",
    search: "Search recipes...",
    skill: "REQUIRED SKILL",
    complexity: "COMPLEXITY",
    materials: "MATERIALS",
    requirements: "REQUIREMENTS",
    craft: "CRAFT",
    unavailable: "CRAFTING RULES NOT LOADED",
    empty: "Recipe database is empty. Add the crafting rules to begin.",
    inventory: "INVENTORY MATERIALS",
  },
  ru: {
    title: "КРАФТ",
    subtitle: "ВЕРСТАК // БАЗА РЕЦЕПТОВ",
    weapons: "ОРУЖИЕ",
    armor: "БРОНЯ",
    items: "ДРУГИЕ ПРЕДМЕТЫ",
    search: "Поиск рецептов...",
    skill: "НУЖНЫЙ НАВЫК",
    complexity: "СЛОЖНОСТЬ",
    materials: "МАТЕРИАЛЫ",
    requirements: "ТРЕБОВАНИЯ",
    craft: "СОЗДАТЬ",
    unavailable: "ПРАВИЛА КРАФТА ЕЩЁ НЕ ЗАГРУЖЕНЫ",
    empty: "База рецептов пока пуста. Добавьте правила крафта, чтобы начать.",
    inventory: "МАТЕРИАЛЫ В ИНВЕНТАРЕ",
  },
  uk: {
    title: "КРАФТ",
    subtitle: "ВЕРСТАТ // БАЗА РЕЦЕПТІВ",
    weapons: "ЗБРОЯ",
    armor: "БРОНЯ",
    items: "ІНШІ ПРЕДМЕТИ",
    search: "Пошук рецептів...",
    skill: "ПОТРІБНА НАВИЧКА",
    complexity: "СКЛАДНІСТЬ",
    materials: "МАТЕРІАЛИ",
    requirements: "ВИМОГИ",
    craft: "СТВОРИТИ",
    unavailable: "ПРАВИЛА КРАФТУ ЩЕ НЕ ЗАВАНТАЖЕНІ",
    empty: "База рецептів поки порожня. Додайте правила крафту, щоб почати.",
    inventory: "МАТЕРІАЛИ В ІНВЕНТАРІ",
  },
  pl: {
    title: "RZEMIOSŁO",
    subtitle: "WARSZTAT // BAZA RECEPTUR",
    weapons: "BROŃ",
    armor: "PANCERZ",
    items: "INNE PRZEDMIOTY",
    search: "Szukaj receptur...",
    skill: "WYMAGANA UMIEJĘTNOŚĆ",
    complexity: "ZŁOŻONOŚĆ",
    materials: "MATERIAŁY",
    requirements: "WYMAGANIA",
    craft: "WYTWÓRZ",
    unavailable: "ZASADY RZEMIOSŁA NIE SĄ JESZCZE WCZYTANE",
    empty: "Baza receptur jest pusta. Dodaj zasady rzemiosła, aby rozpocząć.",
    inventory: "MATERIAŁY W EKWIPUNKU",
  },
};

const CATEGORIES = ["weapons", "armor", "items"];

function languageCode(value) {
  const code = String(value || "en").split("-")[0];
  return TEXT[code] ? code : "en";
}

export default function CraftingScreen({ character = null, setCharacter = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const copy = TEXT[language];
  const [category, setCategory] = useState("weapons");
  const [search, setSearch] = useState("");

  const materialCount = useMemo(
    () => (character?.inventoryItems || []).filter((item) => Number(item?.quantity || 0) > 0).length,
    [character?.inventoryItems]
  );

  // Recipes and mechanics are intentionally empty until the user-provided rules are loaded.
  const recipes = [];
  const visibleRecipes = recipes.filter((recipe) => {
    if (recipe.category !== category) return false;
    if (!search.trim()) return true;
    return String(recipe.name || "").toLowerCase().includes(search.trim().toLowerCase());
  });

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
              onClick={() => setCategory(key)}
            >
              {copy[key]}
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

        {visibleRecipes.length ? (
          <div className="crafting-screen__recipes">
            {visibleRecipes.map((recipe) => (
              <article key={recipe.id} className="pip-panel crafting-recipe-card">
                <h3>{recipe.name}</h3>
                <div>{copy.skill}: {recipe.skill || "-"}</div>
                <div>{copy.complexity}: {recipe.complexity ?? "-"}</div>
                <div>{copy.materials}: {recipe.materials || "-"}</div>
                <div>{copy.requirements}: {recipe.requirements || "-"}</div>
                <button type="button" className="pip-btn is-primary" disabled>
                  {copy.craft}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="crafting-screen__empty">
            <strong>[ {copy.unavailable} ]</strong>
            <p>{copy.empty}</p>
          </div>
        )}
      </section>
    </div>
  );
}
