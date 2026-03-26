import React, { useState } from "react";
import { rollHitLocationD20 } from "../../utils/dice";

export default function HitLocationRoller() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const doRoll = () => {
    const next = rollHitLocationD20();
    setResult(next);
    setHistory((prev) => [next, ...prev].slice(0, 10));
  };

  return (
    <section className="dice-card dice-card-fullscreen">
      <div className="dice-card-header">
        <h2 className="dice-card-title">Hit Location Roller</h2>
      </div>

      <div className="dice-card-body dice-card-body-compact">
        <div className="dice-result-top dice-result-top-compact">
          <div className="dice-result-stat">
            <span className="dice-result-stat-label">Roll</span>
            <span className="dice-result-stat-value">
              {result ? result.value : "—"}
            </span>
          </div>

          <div className="dice-result-stat">
            <span className="dice-result-stat-label">Location</span>
            <span className="dice-result-stat-value">
              {result ? result.label : "—"}
            </span>
          </div>
        </div>

        <div className="dice-actions">
          <button type="button" className="dice-roll-button" onClick={doRoll}>
            Roll Hit Location
          </button>
        </div>

        <div className="dice-middle-layout">
          <div className="dice-result-panel">
            {!result ? (
              <div className="dice-empty-state">No roll yet</div>
            ) : (
              <div className="dice-hit-location-result">
                <div className="dice-hit-location-value">{result.value}</div>
                <div className="dice-hit-location-label">{result.label}</div>
              </div>
            )}
          </div>

          <div className="dice-history-panel">
            <div className="dice-history-title">Log</div>

            {history.length === 0 ? (
              <div className="dice-empty-state">No history</div>
            ) : (
              <div className="dice-history-list dice-history-list-compact">
                {history.map((entry, index) => (
                  <div
                    key={`${entry.timestamp}-${index}`}
                    className="dice-history-item"
                  >
                    d20 [{entry.value}] → {entry.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}