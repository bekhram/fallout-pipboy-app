const COPY = {
  en: {
    title: "USE RESULT",
    hp: "HP",
    radiation: "RADIATION",
    radiationHealed: "RADIATION HEALED",
    radiationRoll: "RAD ROLL",
    addiction: "ADDICTION",
    addictionRoll: "ADDICTION ROLL",
    noAddiction: "NO ADDICTION",
    addictionGained: "ADDICTION GAINED",
    immune: "IMMUNE",
    perk: "PERK",
    effect: "EFFECT",
    curedAddictions: "ADDICTIONS CURED",
    curedDiseases: "ILLNESSES CURED",
    reroll: "reroll applied",
    fewerDie: "1 fewer CD",
    prevented: "damage prevented",
    close: "CLOSE",
  },
  ru: {
    title: "РЕЗУЛЬТАТ ИСПОЛЬЗОВАНИЯ",
    hp: "HP",
    radiation: "РАДИАЦИЯ",
    radiationHealed: "РАДИАЦИЯ ВЫЛЕЧЕНА",
    radiationRoll: "БРОСОК RAD",
    addiction: "ЗАВИСИМОСТЬ",
    addictionRoll: "ПРОВЕРКА ЗАВИСИМОСТИ",
    noAddiction: "ЗАВИСИМОСТИ НЕТ",
    addictionGained: "ПОЛУЧЕНА ЗАВИСИМОСТЬ",
    immune: "ИММУНИТЕТ",
    perk: "ПЕРК",
    effect: "ЭФФЕКТ",
    curedAddictions: "ЗАВИСИМОСТИ ВЫЛЕЧЕНЫ",
    curedDiseases: "БОЛЕЗНИ ВЫЛЕЧЕНЫ",
    reroll: "выполнен переброс",
    fewerDie: "на 1 CD меньше",
    prevented: "урон предотвращён",
    close: "ЗАКРЫТЬ",
  },
  uk: {
    title: "РЕЗУЛЬТАТ ВИКОРИСТАННЯ",
    hp: "HP",
    radiation: "РАДІАЦІЯ",
    radiationHealed: "РАДІАЦІЮ ВИЛІКУВАНО",
    radiationRoll: "КИДОК RAD",
    addiction: "ЗАЛЕЖНІСТЬ",
    addictionRoll: "ПЕРЕВІРКА ЗАЛЕЖНОСТІ",
    noAddiction: "ЗАЛЕЖНОСТІ НЕМАЄ",
    addictionGained: "ОТРИМАНО ЗАЛЕЖНІСТЬ",
    immune: "ІМУНІТЕТ",
    perk: "ПЕРК",
    effect: "ЕФЕКТ",
    curedAddictions: "ЗАЛЕЖНОСТІ ВИЛІКУВАНО",
    curedDiseases: "ХВОРОБИ ВИЛІКУВАНО",
    reroll: "виконано перекид",
    fewerDie: "на 1 CD менше",
    prevented: "шкоду відвернено",
    close: "ЗАКРИТИ",
  },
  pl: {
    title: "WYNIK UŻYCIA",
    hp: "HP",
    radiation: "RADIACJA",
    radiationHealed: "WYLECZONA RADIACJA",
    radiationRoll: "RZUT RAD",
    addiction: "UZALEŻNIENIE",
    addictionRoll: "TEST UZALEŻNIENIA",
    noAddiction: "BRAK UZALEŻNIENIA",
    addictionGained: "UZYSKANO UZALEŻNIENIE",
    immune: "ODPORNOŚĆ",
    perk: "ATUT",
    effect: "EFEKT",
    curedAddictions: "UZALEŻNIENIA WYLECZONE",
    curedDiseases: "CHOROBY WYLECZONE",
    reroll: "wykonano przerzut",
    fewerDie: "o 1 CD mniej",
    prevented: "obrażenia zablokowane",
    close: "ZAMKNIJ",
  },
};

const STYLE_ID = "pip-consumable-result-style";
const POPUP_ID = "pip-consumable-result-popup";

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function ensureStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .pip-consumable-result-overlay {
      position: fixed;
      inset: 0;
      z-index: 14000;
      display: grid;
      place-items: center;
      padding: max(16px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
      box-sizing: border-box;
      background: rgba(0, 8, 2, .78);
      backdrop-filter: blur(2px);
    }
    .pip-consumable-result {
      width: min(520px, 100%);
      max-height: min(82dvh, 720px);
      overflow: auto;
      box-sizing: border-box;
      padding: 14px;
      border: 1px solid var(--pip-line-strong, #55ff77);
      background: var(--pip-bg, #06120a);
      color: var(--pip-fg, #8dff9c);
      box-shadow: 0 0 28px rgba(60, 255, 100, .2), inset 0 0 30px rgba(60, 255, 100, .035);
      font-family: inherit;
    }
    .pip-consumable-result__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--pip-line, rgba(90,255,120,.35));
    }
    .pip-consumable-result__head h3 {
      margin: 0;
      font-size: 1rem;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .pip-consumable-result__item {
      margin-top: 4px;
      opacity: .78;
      font-size: .78rem;
    }
    .pip-consumable-result__close {
      min-width: 34px;
      min-height: 30px;
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .pip-consumable-result__rows {
      display: grid;
      gap: 7px;
    }
    .pip-consumable-result__row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 9px;
      border: 1px solid var(--pip-line, rgba(90,255,120,.25));
      background: rgba(60, 255, 100, .025);
      font-size: .82rem;
      line-height: 1.25;
    }
    .pip-consumable-result__row strong {
      text-align: right;
      overflow-wrap: anywhere;
    }
    .pip-consumable-result__row.is-good strong { color: var(--pip-fg, #8dff9c); }
    .pip-consumable-result__row.is-bad strong { color: #ffc195; }
    .pip-consumable-result__effect {
      margin-top: 9px;
      padding: 9px;
      border: 1px dashed var(--pip-line, rgba(90,255,120,.35));
      font-size: .8rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .pip-consumable-result__footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 11px;
    }
    .pip-consumable-result__footer button {
      min-height: 36px;
      padding: 7px 16px;
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    @media (max-width: 520px) {
      .pip-consumable-result { padding: 11px; max-height: 86dvh; }
      .pip-consumable-result__row { font-size: .76rem; }
    }
  `;
  document.head.appendChild(style);
}

function diceText(roll) {
  const rolls = Array.isArray(roll?.rolls) ? roll.rolls : [];
  if (!rolls.length) return "—";
  return rolls.map((die) => die?.label || String(die?.value ?? "?")).join("  ");
}

function addRow(container, label, value, tone = "") {
  if (value === null || value === undefined || value === "") return;
  const row = document.createElement("div");
  row.className = `pip-consumable-result__row${tone ? ` is-${tone}` : ""}`;
  const left = document.createElement("span");
  left.textContent = label;
  const right = document.createElement("strong");
  right.textContent = String(value);
  row.append(left, right);
  container.appendChild(row);
}

export function showConsumableResultPopup({ item, plan, language = "en" } = {}) {
  if (typeof document === "undefined" || !plan) return;
  ensureStyles();

  document.getElementById(POPUP_ID)?.remove();

  const lang = languageCode(language);
  const copy = COPY[lang];
  const overlay = document.createElement("div");
  overlay.id = POPUP_ID;
  overlay.className = "pip-consumable-result-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const panel = document.createElement("div");
  panel.className = "pip-consumable-result";
  const head = document.createElement("div");
  head.className = "pip-consumable-result__head";
  const titles = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `[ ${copy.title} ]`;
  const itemName = document.createElement("div");
  itemName.className = "pip-consumable-result__item";
  itemName.textContent = String(item?.name || item?.canonicalName || "Consumable");
  titles.append(title, itemName);

  const closeTop = document.createElement("button");
  closeTop.type = "button";
  closeTop.className = "pip-consumable-result__close";
  closeTop.textContent = "×";
  closeTop.setAttribute("aria-label", copy.close);
  head.append(titles, closeTop);

  const rows = document.createElement("div");
  rows.className = "pip-consumable-result__rows";

  if (Number(plan.healingHp || 0) > 0) {
    addRow(rows, copy.hp, `+${Number(plan.healingHp || 0)}`, "good");
  }

  if (Number(plan.radiationHealing || 0) > 0) {
    addRow(rows, copy.radiationHealed, `-${Number(plan.radiationHealing || 0)}`, "good");
  }

  const radRisk = plan.radiationRisk;
  if (radRisk?.diceCount > 0 || radRisk?.baseDiceCount > 0) {
    if (radRisk.roll) addRow(rows, copy.radiationRoll, diceText(radRisk.roll));
    addRow(rows, copy.radiation, `+${Number(radRisk.damage || 0)}`, Number(radRisk.damage || 0) > 0 ? "bad" : "good");
    if (Number(radRisk.leadBellyRank || 0) >= 2) {
      addRow(rows, copy.perk, `Lead Belly ${radRisk.leadBellyRank} — ${copy.prevented}`, "good");
    } else if (radRisk.rerolled) {
      addRow(rows, copy.perk, `Lead Belly ${radRisk.leadBellyRank} — ${copy.reroll}`, "good");
    }
  }

  const addiction = plan.addictionRisk;
  if (addiction) {
    if (addiction.roll) addRow(rows, copy.addictionRoll, diceText(addiction.roll));
    if (Number(addiction.chemResistantRank || 0) >= 2) {
      addRow(rows, copy.perk, `Chem Resistant ${addiction.chemResistantRank} — ${copy.immune}`, "good");
    } else if (Number(addiction.chemResistantRank || 0) === 1) {
      addRow(rows, copy.perk, `Chem Resistant 1 — ${copy.fewerDie}`, "good");
    }
    addRow(
      rows,
      copy.addiction,
      addiction.addicted ? copy.addictionGained : copy.noAddiction,
      addiction.addicted ? "bad" : "good"
    );
  }

  if (plan.cureAddictions) addRow(rows, copy.addiction, copy.curedAddictions, "good");
  if (plan.cureDiseases) addRow(rows, copy.effect, copy.curedDiseases, "good");

  panel.append(head, rows);

  const effectText = String(plan.displayEffect || item?.effect || "").trim();
  if (effectText && effectText !== "-") {
    const effect = document.createElement("div");
    effect.className = "pip-consumable-result__effect";
    effect.textContent = `[ ${copy.effect} ] ${effectText}`;
    panel.appendChild(effect);
  }

  const footer = document.createElement("div");
  footer.className = "pip-consumable-result__footer";
  const closeBottom = document.createElement("button");
  closeBottom.type = "button";
  closeBottom.textContent = copy.close;
  footer.appendChild(closeBottom);
  panel.appendChild(footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const close = () => {
    window.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") close();
  };
  closeTop.addEventListener("click", close);
  closeBottom.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  window.addEventListener("keydown", onKeyDown);
}
