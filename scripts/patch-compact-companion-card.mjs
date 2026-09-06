import fs from "node:fs";

const path = "src/components/companion/companion.css";
let css = fs.readFileSync(path, "utf8");
const marker = "/* compact companion readonly card */";

if (!css.includes(marker)) {
  css += `

${marker}
.companion-content.is-readonly {
  gap: 0;
}

.companion-content.is-readonly .companion-identity-grid,
.companion-content.is-readonly .companion-kind-row {
  display: none;
}

.companion-content.is-readonly .push-bottom {
  margin-bottom: 7px;
}

.companion-content.is-readonly .companion-summary-row {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  margin-bottom: 7px;
}

.companion-content.is-readonly .companion-summary {
  gap: 4px 10px;
  font-size: 0.84em;
}

.companion-content.is-readonly .companion-summary-row > .pip-btn {
  width: auto;
  min-width: 86px;
  padding: 5px 9px;
  font-size: 0.72rem;
}

.companion-content.is-readonly .companion-stat-grid {
  gap: 5px;
}

.companion-content.is-readonly .companion-stat-cell {
  gap: 2px;
}

.companion-content.is-readonly .companion-stat-cell > span {
  min-height: 1.35em;
  font-size: 0.61rem;
  line-height: 1.05;
}

.companion-content.is-readonly .companion-stat-cell .pip-inline-input {
  min-height: 32px;
  padding: 4px 6px;
  font-size: 0.86rem;
}

.companion-content.is-readonly .companion-hp-section {
  gap: 5px;
  padding: 7px;
}

.companion-content.is-readonly .companion-hp-track {
  height: 6px;
}

.companion-content.is-readonly .companion-hp-controls {
  grid-template-columns: 34px minmax(48px, 1fr) auto minmax(48px, 1fr) 34px;
  gap: 4px;
}

.companion-content.is-readonly .companion-hp-controls .pip-btn {
  min-width: 34px;
  min-height: 32px;
  padding: 3px;
}

.companion-content.is-readonly .companion-hp-controls .pip-inline-input {
  min-height: 32px;
  padding: 3px 5px;
}

.companion-content.is-readonly .companion-attacks-block {
  gap: 6px;
  padding: 7px;
}

.companion-content.is-readonly .companion-section-head {
  min-height: 0;
}

.companion-content.is-readonly .companion-attack-list {
  gap: 5px;
}

.companion-content.is-readonly .companion-attack-card {
  gap: 4px;
  padding: 5px;
}

.companion-content.is-readonly .companion-attack-roll {
  gap: 3px;
  padding: 6px 8px;
}

.companion-content.is-readonly .companion-attack-roll-meta {
  gap: 2px 7px;
  font-size: 0.68em;
}

.companion-content.is-readonly .companion-attack-roll-effects {
  font-size: 0.66em;
}

.companion-content.is-readonly .companion-attack-notes {
  gap: 3px;
}

.companion-content.is-readonly .companion-attack-notes textarea {
  min-height: 38px;
  max-height: 58px;
  padding: 5px 7px;
  font-size: 0.76rem;
}

.companion-content.is-readonly .companion-long-grid {
  gap: 6px;
}

.companion-content.is-readonly .companion-long-field {
  gap: 4px;
  padding: 7px;
}

.companion-content.is-readonly .companion-long-field > span {
  font-size: 0.82rem;
}

.companion-content.is-readonly .companion-long-field textarea {
  min-height: 46px;
  max-height: 72px;
  padding: 5px 7px;
  font-size: 0.76rem;
  line-height: 1.25;
}

.companion-content.is-readonly .companion-notes-field textarea {
  min-height: 38px;
}

@media (max-width: 520px) {
  .companion-content.is-readonly .companion-summary-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .companion-content.is-readonly .companion-summary-row > .pip-btn {
    width: auto;
    min-width: 74px;
    padding-inline: 7px;
  }

  .companion-content.is-readonly .companion-main-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .companion-content.is-readonly .companion-main-stats .companion-stat-cell:last-child {
    grid-column: auto;
  }

  .companion-content.is-readonly .companion-combat-stats,
  .companion-content.is-readonly .companion-dr-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .companion-content.is-readonly .companion-hp-heading {
    font-size: 0.82rem;
  }
}
`;
  fs.writeFileSync(path, css);
}
