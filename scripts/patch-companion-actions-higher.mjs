import fs from "node:fs";

const path = "src/components/companion/companion.css";
let css = fs.readFileSync(path, "utf8");

const oldBlock = `.companion-card-actions {\n  position: absolute;\n  top: 0;\n  right: 0;\n  z-index: 2;\n  display: flex;\n  gap: 5px;\n  align-items: center;\n}`;
const newBlock = `.companion-card-actions {\n  position: absolute;\n  top: -52px;\n  right: 0;\n  z-index: 2;\n  display: flex;\n  gap: 5px;\n  align-items: center;\n}`;

if (!css.includes(oldBlock)) throw new Error("companion action block not found");
css = css.replace(oldBlock, newBlock);

const oldSummary = `.companion-summary-row {\n  padding-right: 112px;\n}`;
const newSummary = `.companion-roster {\n  padding-right: 112px;\n  box-sizing: border-box;\n}\n\n.companion-summary-row {\n  padding-right: 0;\n}`;
if (!css.includes(oldSummary)) throw new Error("summary padding block not found");
css = css.replace(oldSummary, newSummary);

const oldMobile = `  .companion-summary-row,\n  .companion-content.is-readonly .companion-summary-row {\n    grid-template-columns: minmax(0, 1fr);\n    padding-right: 101px;\n  }`;
const newMobile = `  .companion-card-actions {\n    top: -50px;\n  }\n\n  .companion-roster {\n    padding-right: 101px;\n  }\n\n  .companion-summary-row,\n  .companion-content.is-readonly .companion-summary-row {\n    grid-template-columns: minmax(0, 1fr);\n    padding-right: 0;\n  }`;
if (!css.includes(oldMobile)) throw new Error("mobile summary block not found");
css = css.replace(oldMobile, newMobile);

fs.writeFileSync(path, css);
