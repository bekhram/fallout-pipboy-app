from pathlib import Path

# --- CraftingScreen compact/expandable recipe list ---
path = Path("src/components/crafting/CraftingScreen.jsx")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        '  const [lastResult, setLastResult] = useState(null);',
        '  const [lastResult, setLastResult] = useState(null);\n  const [expandedRecipeId, setExpandedRecipeId] = useState(null);'
    ),
    (
        '    common: "Common", uncommon: "Uncommon", rare: "Rare", output: "OUTPUT", noRecipes: "No matching recipes.",',
        '    common: "Common", uncommon: "Uncommon", rare: "Rare", output: "OUTPUT", noRecipes: "No matching recipes.", ready: "READY", locked: "LOCKED",'
    ),
    (
        '    common: "Обычный", uncommon: "Необычный", rare: "Редкий", output: "РЕЗУЛЬТАТ", noRecipes: "Подходящих рецептов нет.",',
        '    common: "Обычный", uncommon: "Необычный", rare: "Редкий", output: "РЕЗУЛЬТАТ", noRecipes: "Подходящих рецептов нет.", ready: "ГОТОВО", locked: "НЕДОСТУПНО",'
    ),
    (
        '    common: "Звичайний", uncommon: "Незвичайний", rare: "Рідкісний", output: "РЕЗУЛЬТАТ", noRecipes: "Відповідних рецептів немає.",',
        '    common: "Звичайний", uncommon: "Незвичайний", rare: "Рідкісний", output: "РЕЗУЛЬТАТ", noRecipes: "Відповідних рецептів немає.", ready: "ГОТОВО", locked: "НЕДОСТУПНО",'
    ),
    (
        '    common: "Pospolita", uncommon: "Niepospolita", rare: "Rzadka", output: "WYNIK", noRecipes: "Brak pasujących receptur.",',
        '    common: "Pospolita", uncommon: "Niepospolita", rare: "Rzadka", output: "WYNIK", noRecipes: "Brak pasujących receptur.", ready: "GOTOWE", locked: "NIEDOSTĘPNE",'
    ),
    (
        '              const canCraft = Boolean(setCharacter && benchReady && state.hasMaterials && state.hasPerks && state.knownRare);\n              return (\n                <article key={recipe.id} className="pip-panel crafting-recipe-card">',
        '              const canCraft = Boolean(setCharacter && benchReady && state.hasMaterials && state.hasPerks && state.knownRare);\n              const expanded = expandedRecipeId === recipe.id;\n              return (\n                <article key={recipe.id} className={`pip-panel crafting-recipe-card ${expanded ? "is-expanded" : ""}`}> '
    ),
    (
'''                  <div className="crafting-recipe-card__heading">
                    <div>
                      <span className="crafting-recipe-card__group">{recipe.group}</span>
                      <h3>{recipe.name}</h3>
                    </div>
                    <span className={`craft-rarity is-${String(recipe.rarity).toLowerCase()}`}>{rarityLabel(recipe.rarity, copy)}</span>
                  </div>

                  <div className="crafting-recipe-card__stats">''',
'''                  <button
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
                    <span className={`craft-rarity is-${String(recipe.rarity).toLowerCase()}`}>{rarityLabel(recipe.rarity, copy)}</span>
                  </button>

                  <div className="crafting-recipe-card__quick">
                    <span className="craft-chip">{recipe.skill} {state.skill.effectiveRank}</span>
                    <span className="craft-chip">TN {state.skill.targetNumber}</span>
                    <span className="craft-chip">D{state.difficulty}</span>
                    <span className={`craft-chip ${canCraft ? "is-ready" : "is-locked"}`}>{canCraft ? copy.ready : copy.locked}</span>
                  </div>

                  {expanded ? (
                    <div className="crafting-recipe-card__details">
                  <div className="crafting-recipe-card__stats">'''
    ),
    (
'''                  {renderResult(recipe)}
                </article>''',
'''                  {renderResult(recipe)}
                    </div>
                  ) : null}
                </article>'''
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"CraftingScreen anchor not found:\n{old[:180]}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")

# --- Migrate already-saved crafting materials from Misc to Junk ---
app_path = Path("src/App.jsx")
app = app_path.read_text(encoding="utf-8")
anchor = '''  } = useCharacterStorage(buildDefaultForm());

  useEffect(() => {
    if (globalWeapons.length === 0) return;'''
replacement = '''  } = useCharacterStorage(buildDefaultForm());

  useEffect(() => {
    setForm((prev) => {
      let changed = false;
      const inventoryItems = (prev.inventoryItems || []).map((item) => {
        if (item?.sourceType !== "crafting_material" || item?.category === "junk") return item;
        changed = true;
        return { ...item, category: "junk" };
      });
      return changed ? { ...prev, inventoryItems } : prev;
    });
  }, [setForm]);

  useEffect(() => {
    if (globalWeapons.length === 0) return;'''
if anchor not in app:
    raise SystemExit("App crafting-material migration anchor not found")
app = app.replace(anchor, replacement, 1)
app_path.write_text(app, encoding="utf-8")

# trigger
