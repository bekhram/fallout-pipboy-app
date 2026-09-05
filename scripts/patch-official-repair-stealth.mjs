import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Anchor not found: ${label}`);
  return text.replace(from, to);
}

// Crafting recipes: one Robot Repair Kit for both robots and power armor.
{
  const path = 'src/data/craftingRecipes.js';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    '      effect: "Repair consumable for robots.",\n',
    '      effect: "Heals 4 HP to a Robot or Power Armor.",\n',
    'Robot Repair Kit effect'
  );
  text = replaceOnce(
    text,
    '      localizedEffect: { en: "Repair consumable for robots.", ru: "Расходник для ремонта роботов.", uk: "Витратний предмет для ремонту роботів.", pl: "Przedmiot do naprawy robotów." },\n',
    '      localizedEffect: { en: "Heals 4 HP to a Robot or Power Armor.", ru: "Восстанавливает 4 HP роботу или силовой броне.", uk: "Відновлює 4 HP роботу або силовій броні.", pl: "Przywraca 4 HP robotowi lub pancerzowi wspomaganemu." },\n',
    'Robot Repair Kit localized effect'
  );

  const paStart = text.indexOf('  {\n    id: "power-armor-repair-kits-power-armor-repair-kit",');
  const stealthStart = text.indexOf('  {\n    id: "chemistry-utility-stealth-boy-consumable",', paStart);
  if (paStart < 0 || stealthStart < 0) throw new Error('Power Armor Repair Kit block not found');
  text = text.slice(0, paStart) + text.slice(stealthStart);

  fs.writeFileSync(path, text);
}

// App: rules-correct repair amount, combined targets, Stealth Boy effect + turn counter.
{
  const path = 'src/App.jsx';
  let text = fs.readFileSync(path, 'utf8');

  const copyStart = text.indexOf('const ITEM_USE_COPY = {');
  const copyEnd = text.indexOf('\n\nfunction normalizeUtilityName', copyStart);
  if (copyStart < 0 || copyEnd < 0) throw new Error('ITEM_USE_COPY block not found');
  const copy = `const ITEM_USE_COPY = {
  en: { noRepairTarget: "No damaged robot or power armor part found.", chooseRepairTarget: "Choose a repair target", invalid: "Invalid selection.", robot: "ROBOT", powerArmor: "POWER ARMOR" },
  ru: { noRepairTarget: "Нет поврежденного робота или части силовой брони.", chooseRepairTarget: "Выберите цель ремонта", invalid: "Неверный выбор.", robot: "РОБОТ", powerArmor: "СИЛОВАЯ БРОНЯ" },
  uk: { noRepairTarget: "Немає пошкодженого робота або частини силової броні.", chooseRepairTarget: "Оберіть ціль ремонту", invalid: "Невірний вибір.", robot: "РОБОТ", powerArmor: "СИЛОВА БРОНЯ" },
  pl: { noRepairTarget: "Brak uszkodzonego robota lub części pancerza wspomaganego.", chooseRepairTarget: "Wybierz cel naprawy", invalid: "Nieprawidłowy wybór.", robot: "ROBOT", powerArmor: "PANCERZ WSPOMAGANY" },
};`;
  text = text.slice(0, copyStart) + copy + text.slice(copyEnd);

  text = replaceOnce(
    text,
    '    return ["hp", "physical", "energy", "radiation", "poison"].some(\n      (field) => Number(now[field] || 0) < Number(max[field] || 0)\n    );\n',
    '    return Number(now.hp || 0) < Number(max.hp || 0);\n',
    'power armor HP target logic'
  );

  const useStart = text.indexOf('      if (name === "stealth boy") {');
  const useEnd = text.indexOf('      const plan = getConsumableUsePlan(item);', useStart);
  if (useStart < 0 || useEnd < 0) throw new Error('utility use block not found');

  const utilityUseBlock = `      if (name === "stealth boy") {
        setForm((prev) => {
          const effectId = "consumable:stealth-boy";
          const activeConsumableEffects = (prev.activeConsumableEffects || [])
            .filter((effect) => effect?.id !== effectId)
            .concat({
              id: effectId,
              sourceName: item.name || "Stealth Boy",
              effectText: "Invisibility: +2 Defense; enemies add +2 difficulty to tests to spot you.",
              canonicalSourceName: "Stealth Boy",
              canonicalEffect: "Invisibility",
              duration: "3 turns",
              category: "misc",
              modifiers: {
                derived: { defenseBonus: 2 },
                tests: [],
                combat: {},
                flags: { invisible: true, stealthSpotDifficultyBonus: 2 },
              },
            });

          return {
            ...prev,
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
            activeConsumableEffects,
            statuses: { ...(prev.statuses || {}), invisible: true },
            stealthBoyState: {
              active: true,
              remainingTurns: 3,
              spotDifficultyBonus: 2,
              defenseBonus: 2,
              activatedAt: new Date().toISOString(),
            },
          };
        });
        return;
      }

      if (name === "robot repair kit" || name === "power armor repair kit") {
        const companionState = readCompanionState();
        const robotTargets = (companionState.items || [])
          .filter((companion) => {
            const currentHp = Math.max(0, Number(companion?.currentHp || 0));
            const maxHp = Math.max(0, Number(companion?.maxHp || 0));
            return isRobotCompanion(companion) && maxHp > 0 && currentHp < maxHp;
          })
          .map((companion) => ({ kind: "robot", companion }));
        const powerArmorTargets = getDamagedPowerArmorParts(form)
          .map((target) => ({ kind: "powerArmor", ...target }));
        const targets = [...robotTargets, ...powerArmorTargets];

        if (!targets.length) {
          window.alert(copy.noRepairTarget);
          return;
        }

        const selected = chooseNumberedTarget(
          copy.chooseRepairTarget,
          targets,
          (target) => target.kind === "robot"
            ? \`[\${copy.robot}] \${target.companion.name || target.companion.creatureType || "Robot"}: \${target.companion.currentHp}/\${target.companion.maxHp} HP\`
            : \`[\${copy.powerArmor}] \${target.part}: \${target.current.hp}/\${target.maximum.hp} HP\`
        );
        if (selected === null) return;
        if (!selected) {
          window.alert(copy.invalid);
          return;
        }

        if (selected.kind === "robot") {
          writeCompanionState({
            ...companionState,
            items: companionState.items.map((companion) => {
              if (companion.id !== selected.companion.id) return companion;
              const currentHp = Math.max(0, Number(companion.currentHp || 0));
              const maxHp = Math.max(0, Number(companion.maxHp || 0));
              return { ...companion, currentHp: String(Math.min(maxHp, currentHp + 4)) };
            }),
          });
          setForm((prev) => ({
            ...prev,
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
          }));
          return;
        }

        setForm((prev) => {
          const loadout = prev?.armor?._power?.loadout || {};
          const slots = { ...(loadout.slots || {}) };
          const currentSlot = { ...(slots[selected.part] || {}) };
          const healedHp = Math.min(
            Number(selected.maximum.hp || 0),
            Number(selected.current.hp || 0) + 4
          );
          slots[selected.part] = { ...currentSlot, currentHp: healedHp };
          return {
            ...prev,
            inventoryItems: consumeInventoryItemAt(prev.inventoryItems || [], index),
            armor: {
              ...(prev.armor || {}),
              _power: {
                ...(prev.armor?._power || {}),
                loadout: { ...loadout, slots },
              },
            },
          };
        });
        return;
      }

`;
  text = text.slice(0, useStart) + utilityUseBlock + text.slice(useEnd);

  const nextEffectAnchor = '  useEffect(() => {\n    if (globalWeapons.length === 0) return;\n';
  if (!text.includes(nextEffectAnchor)) throw new Error('post-use effect anchor not found');
  const stealthControls = `  const endStealthBoy = () => {
    setForm((prev) => ({
      ...prev,
      statuses: { ...(prev.statuses || {}), invisible: false },
      stealthBoyState: { ...(prev.stealthBoyState || {}), active: false, remainingTurns: 0 },
      activeConsumableEffects: (prev.activeConsumableEffects || [])
        .filter((effect) => effect?.id !== "consumable:stealth-boy"),
    }));
  };

  const advanceStealthBoyTurn = () => {
    setForm((prev) => {
      const current = Math.max(0, Number(prev.stealthBoyState?.remainingTurns || 0));
      const remainingTurns = Math.max(0, current - 1);
      if (remainingTurns <= 0) {
        return {
          ...prev,
          statuses: { ...(prev.statuses || {}), invisible: false },
          stealthBoyState: { ...(prev.stealthBoyState || {}), active: false, remainingTurns: 0 },
          activeConsumableEffects: (prev.activeConsumableEffects || [])
            .filter((effect) => effect?.id !== "consumable:stealth-boy"),
        };
      }
      return {
        ...prev,
        stealthBoyState: { ...(prev.stealthBoyState || {}), active: true, remainingTurns },
      };
    });
  };

`;
  text = text.replace(nextEffectAnchor, stealthControls + nextEffectAnchor);

  text = replaceOnce(
    text,
    '            onStatusToggle={(status) =>\n              updateStatus(status, !form.statuses[status])\n            }\n',
    '            onStatusToggle={(status) => {\n              if (status === "invisible" && form.stealthBoyState?.active) {\n                endStealthBoy();\n                return;\n              }\n              updateStatus(status, !form.statuses[status]);\n            }}\n            onStealthBoyAdvance={advanceStealthBoyTurn}\n            onStealthBoyEnd={endStealthBoy}\n',
    'StatusScreen Stealth Boy callbacks'
  );

  fs.writeFileSync(path, text);
}

// Status screen: show remaining turns and manual turn controls.
{
  const path = 'src/components/status/StatusScreen.jsx';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    'function formatSigned(value) {\n',
    'const STEALTH_COPY = {\n  en: { title: "STEALTH BOY", turns: "TURNS", next: "NEXT TURN", end: "END", spot: "SPOT DIFF" },\n  ru: { title: "СТЕЛС-БОЙ", turns: "ХОДОВ", next: "СЛЕД. ХОД", end: "ЗАВЕРШИТЬ", spot: "СЛОЖН. ОБНАР." },\n  uk: { title: "СТЕЛС-БОЙ", turns: "ХОДІВ", next: "НАСТ. ХІД", end: "ЗАВЕРШИТИ", spot: "СКЛАДН. ВИЯВЛ." },\n  pl: { title: "STEALTH BOY", turns: "TURY", next: "NAST. TURA", end: "ZAKOŃCZ", spot: "TRUDN. WYKRYCIA" },\n};\n\nfunction formatSigned(value) {\n',
    'Stealth Boy status copy'
  );

  text = replaceOnce(
    text,
    '  onStatusToggle,\n  onInjuryToggle,\n',
    '  onStatusToggle,\n  onStealthBoyAdvance,\n  onStealthBoyEnd,\n  onInjuryToggle,\n',
    'StatusScreen props'
  );

  text = replaceOnce(
    text,
    '  const { t } = useTranslation();\n',
    '  const { t, i18n } = useTranslation();\n  const stealthCopy = STEALTH_COPY[i18n.resolvedLanguage?.split("-")[0] || "en"] || STEALTH_COPY.en;\n',
    'StatusScreen i18n'
  );

  text = replaceOnce(
    text,
    '          <div className="pip-survival-summary">\n            <div className="pip-summary-title">[ {t("vitals.title")} ]</div>\n',
    '          {form.stealthBoyState?.active && (\n            <div className="pip-survival-summary">\n              <div className="pip-summary-title">[ {stealthCopy.title} ]</div>\n              <div className="pip-inline-stats">\n                <span>{form.stealthBoyState.remainingTurns} {stealthCopy.turns}</span>\n                <span>{t("main.defense")} +{form.stealthBoyState.defenseBonus || 2}</span>\n                <span>{stealthCopy.spot} +{form.stealthBoyState.spotDifficultyBonus || 2}</span>\n              </div>\n              <div className="pip-tagrow push-top">\n                <button type="button" className="pip-btn is-primary" onClick={onStealthBoyAdvance}>{stealthCopy.next}</button>\n                <button type="button" className="pip-btn" onClick={onStealthBoyEnd}>{stealthCopy.end}</button>\n              </div>\n            </div>\n          )}\n\n          <div className="pip-survival-summary">\n            <div className="pip-summary-title">[ {t("vitals.title")} ]</div>\n',
    'Stealth Boy status panel'
  );

  fs.writeFileSync(path, text);
}

// AutoGM should know the exact active Stealth Boy state.
{
  const path = 'src/components/map/LocalGmChat.jsx';
  let text = fs.readFileSync(path, 'utf8');
  text = replaceOnce(
    text,
    '    statuses: character.statuses || null,\n',
    '    statuses: character.statuses || null,\n    stealthBoyState: character.stealthBoyState || null,\n',
    'AutoGM Stealth Boy state'
  );
  fs.writeFileSync(path, text);
}

console.log('Applied Robot Repair Kit + Stealth Boy tabletop behavior.');
