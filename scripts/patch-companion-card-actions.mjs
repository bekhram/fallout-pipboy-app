import fs from "node:fs";

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Anchor not found: ${label}`);
  return text.replace(from, to);
}

const jsxPath = "src/components/companion/CompanionTab.jsx";
let jsx = fs.readFileSync(jsxPath, "utf8");

jsx = replaceOnce(
  jsx,
  `        <div className="pip-inventory-actions push-bottom companion-actions">\n          <button type="button" className="pip-btn" onClick={() => add("pet")}>{copy.addPet}</button>\n          <button type="button" className="pip-btn" onClick={copyActive} disabled={!active}>{copy.copy}</button>\n          <button type="button" className="pip-btn companion-delete-btn" onClick={removeActive} disabled={!active}>{copy.remove}</button>\n        </div>`,
  `        <div className="pip-inventory-actions push-bottom companion-actions">\n          <button type="button" className="pip-btn" onClick={() => add("pet")}>{copy.addPet}</button>\n        </div>`,
  "remove copy delete text buttons"
);

jsx = replaceOnce(
  jsx,
  `          <div className={\`companion-content \${isEditingCard ? "is-editing" : "is-readonly"}\`}>\n            <div className="companion-summary-row push-bottom">\n              <div className="pip-inline-stats companion-summary">\n                <span>{active.name || copy.unnamed}</span>\n                <span>{active.creatureType || (active.kind === "pet" ? copy.pet : copy.companion)}</span>\n                <span>LV {active.level || "1"}</span>\n              </div>\n              <button\n                type="button"\n                className={\`pip-btn \${isEditingCard ? "is-primary" : ""}\`}\n                onClick={() => {\n                  setIsEditingCard((value) => !value);\n                  if (isEditingCard) setEditingAttackId(null);\n                }}\n              >\n                {isEditingCard ? copy.doneEditing : copy.editCard}\n              </button>\n            </div>`,
  `          <div className={\`companion-content \${isEditingCard ? "is-editing" : "is-readonly"}\`}>\n            <div className="companion-card-actions" aria-label={copy.title}>\n              <button\n                type="button"\n                className={\`pip-btn companion-icon-btn \${isEditingCard ? "is-primary" : ""}\`}\n                onClick={() => {\n                  setIsEditingCard((value) => !value);\n                  if (isEditingCard) setEditingAttackId(null);\n                }}\n                title={isEditingCard ? copy.doneEditing : copy.editCard}\n                aria-label={isEditingCard ? copy.doneEditing : copy.editCard}\n              >\n                {isEditingCard ? "✓" : "✎"}\n              </button>\n              <button\n                type="button"\n                className="pip-btn companion-icon-btn"\n                onClick={copyActive}\n                title={copy.copy}\n                aria-label={copy.copy}\n              >\n                ⧉\n              </button>\n              <button\n                type="button"\n                className="pip-btn companion-icon-btn companion-delete-btn"\n                onClick={removeActive}\n                title={copy.remove}\n                aria-label={copy.remove}\n              >\n                ⌫\n              </button>\n            </div>\n\n            <div className="companion-summary-row push-bottom">\n              <div className="pip-inline-stats companion-summary">\n                <span>{active.name || copy.unnamed}</span>\n                <span>{active.creatureType || (active.kind === "pet" ? copy.pet : copy.companion)}</span>\n                <span>LV {active.level || "1"}</span>\n              </div>\n            </div>`,
  "move card actions to upper right"
);

fs.writeFileSync(jsxPath, jsx);

const cssPath = "src/components/companion/companion.css";
let css = fs.readFileSync(cssPath, "utf8");
const marker = "/* companion card corner actions */";
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.companion-content {\n  position: relative;\n}\n\n.companion-card-actions {\n  position: absolute;\n  top: 0;\n  right: 0;\n  z-index: 2;\n  display: flex;\n  gap: 5px;\n  align-items: center;\n}\n\n.companion-icon-btn {\n  width: 34px;\n  min-width: 34px;\n  height: 32px;\n  min-height: 32px;\n  padding: 0;\n  display: inline-grid;\n  place-items: center;\n  font-size: 1rem;\n  line-height: 1;\n}\n\n.companion-summary-row {\n  padding-right: 112px;\n}\n\n@media (max-width: 520px) {\n  .companion-card-actions {\n    gap: 4px;\n  }\n\n  .companion-icon-btn {\n    width: 31px;\n    min-width: 31px;\n    height: 30px;\n    min-height: 30px;\n    font-size: 0.95rem;\n  }\n\n  .companion-summary-row,\n  .companion-content.is-readonly .companion-summary-row {\n    grid-template-columns: minmax(0, 1fr);\n    padding-right: 101px;\n  }\n}\n`;
}
fs.writeFileSync(cssPath, css);
