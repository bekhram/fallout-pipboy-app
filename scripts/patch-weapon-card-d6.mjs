import fs from "node:fs";

const weaponPath = "src/components/weapons/WeaponCard.jsx";
const cssPath = "src/styles/screens/weapons.css";
const dicePath = "public/combat-d6.png";

const replaceOnce = (source, before, after, label) => {
  if (!source.includes(before)) {
    throw new Error(`Patch anchor not found: ${label}`);
  }
  return source.replace(before, after);
};

let weapon = fs.readFileSync(weaponPath, "utf8");

weapon = replaceOnce(
  weapon,
  `        useRate,\n`,
  `        useRate: Number(modifiedWeapon.rate || 0) > 0 && useRate,\n`,
  "disable burst for zero rate"
);

weapon = replaceOnce(
  weapon,
  `          <div className="stat-value"><span>🎲</span> {modifiedWeapon.damage || "0"}</div>`,
  `          <div className="stat-value"><img src="/combat-d6.png" alt="" aria-hidden="true" className="pip-weapon-combat-die" /> {modifiedWeapon.damage || "0"}</div>`,
  "custom combat die"
);

weapon = replaceOnce(
  weapon,
  `        <div \n          className={\`pip-stat-box is-clickable \${useRate ? 'is-active' : ''}\`}\n          onClick={(e) => { e.stopPropagation(); setUseRate((prev) => !prev); }}\n          title="Click to toggle Burst"\n        >\n          <div className="stat-label">Rate of Fire</div>\n          <div className="stat-value">{modifiedWeapon.rate || "0"}</div>\n          <div className="stat-sub">{useRate ? "ACTIVE" : "OFF"}</div>\n        </div>`,
  `        {Number(modifiedWeapon.rate || 0) > 0 && (\n          <div \n            className={\`pip-stat-box is-clickable \${useRate ? 'is-active' : ''}\`}\n            onClick={(e) => { e.stopPropagation(); setUseRate((prev) => !prev); }}\n            title="Click to toggle Burst"\n          >\n            <div className="stat-label">Rate of Fire</div>\n            <div className="stat-value">{modifiedWeapon.rate}</div>\n            <div className="stat-sub">{useRate ? "ACTIVE" : "OFF"}</div>\n          </div>\n        )}`,
  "hide zero rate of fire"
);

weapon = replaceOnce(
  weapon,
  `  const weaponMetadata = {\n    cost: modifiedWeapon.cost,\n    weight: modifiedWeapon.weight,\n    rarity: baseMetadata.rarity,\n  };\n`,
  ``,
  "remove card metadata"
);

weapon = replaceOnce(
  weapon,
  `      <footer className="pip-weapon-footer">\n        <div className="pip-weapon-meta">\n          <div className="pip-weapon-meta-item">\n            <span className="meta-label">{t("weapons.cost")}</span>\n            <span className="meta-value">{weaponMetadata.cost === "" ? "—" : weaponMetadata.cost}</span>\n          </div>\n          <div className="pip-weapon-meta-item">\n            <span className="meta-label">{t("weapons.weight")}</span>\n            <span className="meta-value">{weaponMetadata.weight === "" ? "—" : weaponMetadata.weight}</span>\n          </div>\n          <div className="pip-weapon-meta-item">\n            <span className="meta-label">{t("weapons.rarity")}</span>\n            <span className="meta-value">{weaponMetadata.rarity === "" ? "—" : weaponMetadata.rarity}</span>\n          </div>\n        </div>\n\n        <div className="pip-ammo-tab">\n          {modifiedWeapon.ammo || "NO AMMO"}\n        </div>\n      </footer>`,
  `      <footer className="pip-weapon-footer pip-weapon-footer--ammo-only">\n        <div className="pip-ammo-tab">\n          {modifiedWeapon.ammo || "NO AMMO"}\n        </div>\n      </footer>`,
  "hide cost weight rarity"
);

fs.writeFileSync(weaponPath, weapon);

let css = fs.readFileSync(cssPath, "utf8");
const cssMarker = "/* ===== CUSTOM COMBAT D6 ===== */";
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.pip-weapon-combat-die {\n  display: block;\n  flex: 0 0 auto;\n  width: 1.45em;\n  height: 1.45em;\n  object-fit: contain;\n}\n\n.pip-weapon-footer--ammo-only {\n  justify-content: flex-end;\n}\n`;
  fs.writeFileSync(cssPath, css);
}

const diceBase64 = "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";
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync(dicePath, Buffer.from(diceBase64, "base64"));

console.log("Weapon card compact metadata and custom combat d6 patch applied.");
