import React, { useState } from "react";
import { playSound } from "../../utils/soundManager";
import LockpickMiniGame from "./LockpickMiniGame";
import TerminalHackMiniGame from "./TerminalHackMiniGame";
import "./games.css";

const gameList = [
  {
    key: "lockpick",
    title: "Lockpick",
    description: "Open locks using angle control and tension.",
  },
  {
    key: "terminalHack",
    title: "Terminal Hack",
    description: "Hack RobCo terminals and find the correct password.",
  },
];

const LOCK_DIFFICULTIES = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
  { key: "veryHard", label: "Very Hard" },
];

const TERMINAL_DIFFICULTIES = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
  { key: "veryHard", label: "Very Hard" },
];

export default function GamesScreen() {
  const [activeGame, setActiveGame] = useState(null);
  const [lastResult, setLastResult] = useState("");
  const [lockpickDifficulty, setLockpickDifficulty] = useState("medium");
  const [terminalDifficulty, setTerminalDifficulty] = useState("medium");

  if (activeGame === "lockpick") {
    return (
      <div className="games-screen">
        <div className="games-header games-header-inline">
          <div>
            <div className="games-title">GAMES</div>
            <div className="games-subtitle">
              Lockpick · Difficulty:{" "}
              {LOCK_DIFFICULTIES.find((d) => d.key === lockpickDifficulty)?.label}
            </div>
          </div>

          {lastResult ? (
            <div className={`games-result-badge is-${lastResult.toLowerCase()}`}>
              {lastResult}
            </div>
          ) : null}
        </div>

        <LockpickMiniGame
          difficulty={lockpickDifficulty}
          skillBonus={0}
          perkRank={0}
          onUnlock={() => {
            setLastResult("Unlocked");
          }}
          onFail={() => {
            setLastResult("Failed");
          }}
          onExit={() => {
            playSound("uiTab");
            setActiveGame(null);
          }}
        />
      </div>
    );
  }

  if (activeGame === "terminalHack") {
    return (
      <div className="games-screen">
        <div className="games-header games-header-inline">
          <div>
            <div className="games-title">GAMES</div>
            <div className="games-subtitle">
              Terminal Hack · Difficulty:{" "}
              {TERMINAL_DIFFICULTIES.find((d) => d.key === terminalDifficulty)?.label}
            </div>
          </div>

          {lastResult ? (
            <div className={`games-result-badge is-${lastResult.toLowerCase()}`}>
              {lastResult}
            </div>
          ) : null}
        </div>

        <TerminalHackMiniGame
          difficulty={terminalDifficulty}
          onUnlock={() => {
            setLastResult("Unlocked");
          }}
          onFail={() => {
            setLastResult("Failed");
          }}
          onExit={() => {
            playSound("uiTab");
            setActiveGame(null);
          }}
        />
      </div>
    );
  }

  return (
    <section className="pip-panel games-screen">
      <div className="games-header">
        <div>
          <div className="games-title">GAMES</div>
          <div className="games-subtitle">Pip-2d20 mini games</div>
        </div>
      </div>

      <div className="games-grid">
        {gameList.map((game) => (
          <div key={game.key} className="games-card-wrap">
            <button
              type="button"
              className="games-card"
              onClick={() => {
                playSound("uiTab");
                setLastResult("");
                setActiveGame(game.key);
              }}
            >
              <div className="games-card-title">{game.title}</div>
              <div className="games-card-text">{game.description}</div>
            </button>

            {game.key === "lockpick" ? (
              <div className="games-difficulty-panel">
                <div className="games-difficulty-title">Difficulty</div>

                <div className="games-difficulty-row">
                  {LOCK_DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty.key}
                      type="button"
                      className={`games-difficulty-btn ${
                        lockpickDifficulty === difficulty.key ? "is-active" : ""
                      }`}
                      onClick={() => {
                        playSound("uiTab");
                        setLockpickDifficulty(difficulty.key);
                      }}
                    >
                      {difficulty.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {game.key === "terminalHack" ? (
              <div className="games-difficulty-panel">
                <div className="games-difficulty-title">Difficulty</div>

                <div className="games-difficulty-row">
                  {TERMINAL_DIFFICULTIES.map((difficulty) => (
                    <button
                      key={difficulty.key}
                      type="button"
                      className={`games-difficulty-btn ${
                        terminalDifficulty === difficulty.key ? "is-active" : ""
                      }`}
                      onClick={() => {
                        playSound("uiTab");
                        setTerminalDifficulty(difficulty.key);
                      }}
                    >
                      {difficulty.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}